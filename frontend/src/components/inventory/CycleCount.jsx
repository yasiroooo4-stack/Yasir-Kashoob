/**
 * الجرد الدوري - Cycle Count
 */
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import {
  ClipboardList,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  FileCheck,
  ArrowUpDown,
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const CycleCount = ({ t, language, warehouses = [] }) => {
  const [cycleCounts, setCycleCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState(null);
  const [countItems, setCountItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");

  const [formData, setFormData] = useState({
    warehouse_id: "",
    warehouse_name: "",
    count_type: "full",
    scheduled_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchCycleCounts = useCallback(async () => {
    try {
      setLoading(true);
      let url = `${API}/inventory-advanced/cycle-counts`;
      if (statusFilter) url += `?status=${statusFilter}`;
      
      const response = await axios.get(url, { headers });
      setCycleCounts(response.data);
    } catch (error) {
      console.error("Error fetching cycle counts:", error);
      toast.error(t("فشل في جلب عمليات الجرد", "Failed to fetch cycle counts"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    fetchCycleCounts();
  }, [fetchCycleCounts]);

  const handleCreateCycleCount = async () => {
    if (!formData.warehouse_id) {
      toast.error(t("يرجى اختيار المستودع", "Please select a warehouse"));
      return;
    }

    try {
      const warehouse = warehouses.find(w => w.id === formData.warehouse_id);
      const response = await axios.post(`${API}/inventory-advanced/cycle-counts`, {
        ...formData,
        warehouse_name: warehouse?.name || ""
      }, { headers });
      
      toast.success(t("تم إنشاء الجرد بنجاح", "Cycle count created successfully"));
      setDialogOpen(false);
      setFormData({
        warehouse_id: "",
        warehouse_name: "",
        count_type: "full",
        scheduled_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      fetchCycleCounts();
      
      // فتح تفاصيل الجرد الجديد
      viewCountDetails(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في إنشاء الجرد", "Failed to create cycle count"));
    }
  };

  const viewCountDetails = async (count) => {
    try {
      const response = await axios.get(
        `${API}/inventory-advanced/cycle-counts/${count.id}`,
        { headers }
      );
      setSelectedCount(response.data);
      setCountItems(response.data.items || []);
      setDetailsDialogOpen(true);
    } catch (error) {
      toast.error(t("فشل في جلب تفاصيل الجرد", "Failed to fetch count details"));
    }
  };

  const updateCountItem = async (itemId, countedQuantity) => {
    try {
      await axios.put(
        `${API}/inventory-advanced/cycle-counts/${selectedCount.id}/item/${itemId}`,
        { counted_quantity: parseInt(countedQuantity) },
        { headers }
      );
      
      // تحديث العناصر محلياً
      setCountItems(items =>
        items.map(item =>
          item.id === itemId
            ? {
                ...item,
                counted_quantity: parseInt(countedQuantity),
                variance: parseInt(countedQuantity) - item.system_quantity,
                status: "counted"
              }
            : item
        )
      );
      
      toast.success(t("تم تحديث العنصر", "Item updated"));
    } catch (error) {
      toast.error(t("فشل في تحديث العنصر", "Failed to update item"));
    }
  };

  const approveCycleCount = async () => {
    try {
      await axios.put(
        `${API}/inventory-advanced/cycle-counts/${selectedCount.id}/approve?adjust_stock=true`,
        {},
        { headers }
      );
      
      toast.success(t("تم الموافقة على الجرد وتعديل المخزون", "Cycle count approved and stock adjusted"));
      setDetailsDialogOpen(false);
      fetchCycleCounts();
    } catch (error) {
      toast.error(t("فشل في الموافقة على الجرد", "Failed to approve cycle count"));
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      draft: { label: t("مسودة", "Draft"), variant: "secondary" },
      in_progress: { label: t("قيد التنفيذ", "In Progress"), variant: "default" },
      completed: { label: t("مكتمل", "Completed"), variant: "outline" },
      approved: { label: t("معتمد", "Approved"), variant: "default", className: "bg-green-600" },
    };
    const statusInfo = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={statusInfo.variant} className={statusInfo.className}>{statusInfo.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* شريط الأدوات */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                {t("الجرد الدوري", "Cycle Count")}
              </CardTitle>
              <CardDescription>
                {t("إجراء جرد دوري للمخزون ومطابقة الكميات", "Perform periodic inventory counts and quantity reconciliation")}
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {t("جرد جديد", "New Count")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* فلاتر */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t("حالة الجرد", "Count Status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("الكل", "All")}</SelectItem>
                  <SelectItem value="draft">{t("مسودة", "Draft")}</SelectItem>
                  <SelectItem value="in_progress">{t("قيد التنفيذ", "In Progress")}</SelectItem>
                  <SelectItem value="approved">{t("معتمد", "Approved")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={fetchCycleCounts}>
              <RefreshCw className="w-4 h-4 ml-2" />
              {t("تحديث", "Refresh")}
            </Button>
          </div>

          {/* جدول عمليات الجرد */}
          {loading ? (
            <div className="flex justify-center p-8">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("رقم الجرد", "Count Number")}</TableHead>
                    <TableHead>{t("المستودع", "Warehouse")}</TableHead>
                    <TableHead>{t("النوع", "Type")}</TableHead>
                    <TableHead className="text-center">{t("إجمالي العناصر", "Total Items")}</TableHead>
                    <TableHead className="text-center">{t("تم جرده", "Counted")}</TableHead>
                    <TableHead className="text-center">{t("الفروقات", "Variances")}</TableHead>
                    <TableHead>{t("الحالة", "Status")}</TableHead>
                    <TableHead>{t("التاريخ", "Date")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cycleCounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {t("لا توجد عمليات جرد", "No cycle counts found")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    cycleCounts.map((count) => (
                      <TableRow key={count.id}>
                        <TableCell className="font-medium">{count.count_number}</TableCell>
                        <TableCell>{count.warehouse_name}</TableCell>
                        <TableCell>
                          {count.count_type === "full" ? t("كامل", "Full") : t("جزئي", "Partial")}
                        </TableCell>
                        <TableCell className="text-center">{count.total_items}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={(count.items_counted / count.total_items) * 100} 
                              className="w-16 h-2"
                            />
                            <span className="text-sm">{count.items_counted}/{count.total_items}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {count.variance_count > 0 ? (
                            <Badge variant="destructive">{count.variance_count}</Badge>
                          ) : (
                            <Badge variant="outline">0</Badge>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(count.status)}</TableCell>
                        <TableCell>{count.scheduled_date}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewCountDetails(count)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* نافذة إنشاء جرد جديد */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              {t("إنشاء جرد دوري جديد", "Create New Cycle Count")}
            </DialogTitle>
            <DialogDescription>
              {t("سيتم جلب جميع المنتجات في المستودع المحدد للجرد", 
                "All products in the selected warehouse will be fetched for counting")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("المستودع *", "Warehouse *")}</Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(v) => setFormData({ ...formData, warehouse_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("اختر المستودع", "Select warehouse")} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("نوع الجرد", "Count Type")}</Label>
              <Select
                value={formData.count_type}
                onValueChange={(v) => setFormData({ ...formData, count_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">{t("جرد كامل", "Full Count")}</SelectItem>
                  <SelectItem value="partial">{t("جرد جزئي", "Partial Count")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("تاريخ الجرد", "Count Date")}</Label>
              <Input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("ملاحظات", "Notes")}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t("ملاحظات إضافية...", "Additional notes...")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button onClick={handleCreateCycleCount}>
              {t("إنشاء الجرد", "Create Count")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نافذة تفاصيل الجرد */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                {t("تفاصيل الجرد", "Count Details")} - {selectedCount?.count_number}
              </span>
              {selectedCount && getStatusBadge(selectedCount.status)}
            </DialogTitle>
            <DialogDescription>
              {selectedCount?.warehouse_name} | {selectedCount?.scheduled_date}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCount && (
            <div className="space-y-4">
              {/* إحصائيات */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="p-3">
                  <div className="text-sm text-muted-foreground">{t("إجمالي العناصر", "Total Items")}</div>
                  <div className="text-2xl font-bold">{selectedCount.total_items}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-sm text-muted-foreground">{t("تم جرده", "Counted")}</div>
                  <div className="text-2xl font-bold text-blue-600">{selectedCount.items_counted}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-sm text-muted-foreground">{t("الفروقات", "Variances")}</div>
                  <div className="text-2xl font-bold text-orange-600">{selectedCount.variance_count}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-sm text-muted-foreground">{t("قيمة الفروقات", "Variance Value")}</div>
                  <div className="text-2xl font-bold text-red-600">
                    {selectedCount.variance_value?.toFixed(2) || 0}
                  </div>
                </Card>
              </div>

              {/* جدول العناصر */}
              <div className="border rounded-lg overflow-x-auto max-h-[400px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-white">
                    <TableRow>
                      <TableHead>{t("المنتج", "Product")}</TableHead>
                      <TableHead>{t("الكود", "Code")}</TableHead>
                      <TableHead className="text-center">{t("كمية النظام", "System Qty")}</TableHead>
                      <TableHead className="text-center">{t("الكمية الفعلية", "Actual Qty")}</TableHead>
                      <TableHead className="text-center">{t("الفرق", "Variance")}</TableHead>
                      <TableHead>{t("الحالة", "Status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {countItems.map((item) => (
                      <TableRow key={item.id} className={item.variance && item.variance !== 0 ? "bg-red-50" : ""}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell>{item.product_code}</TableCell>
                        <TableCell className="text-center">{item.system_quantity}</TableCell>
                        <TableCell className="text-center">
                          {selectedCount.status !== "approved" ? (
                            <Input
                              type="number"
                              className="w-24 text-center"
                              defaultValue={item.counted_quantity || ""}
                              onBlur={(e) => {
                                if (e.target.value !== "" && parseInt(e.target.value) !== item.counted_quantity) {
                                  updateCountItem(item.id, e.target.value);
                                }
                              }}
                              placeholder="-"
                            />
                          ) : (
                            item.counted_quantity
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.variance !== null && item.variance !== undefined ? (
                            <span className={item.variance > 0 ? "text-green-600" : item.variance < 0 ? "text-red-600" : ""}>
                              {item.variance > 0 ? "+" : ""}{item.variance}
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          {item.status === "counted" ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Badge variant="secondary">{t("قيد الانتظار", "Pending")}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              {t("إغلاق", "Close")}
            </Button>
            {selectedCount?.status !== "approved" && (
              <Button 
                onClick={approveCycleCount}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 ml-2" />
                {t("اعتماد وتعديل المخزون", "Approve & Adjust Stock")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CycleCount;
