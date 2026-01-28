/**
 * إدارة المرتجعات - Returns Management
 */
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
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
  RotateCcw,
  Plus,
  RefreshCw,
  CheckCircle,
  Package,
  User,
  Building,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const RETURN_REASONS = [
  { id: "defective", name_ar: "منتج معيب", name_en: "Defective" },
  { id: "damaged", name_ar: "تالف", name_en: "Damaged" },
  { id: "expired", name_ar: "منتهي الصلاحية", name_en: "Expired" },
  { id: "wrong_item", name_ar: "منتج خاطئ", name_en: "Wrong Item" },
  { id: "excess_quantity", name_ar: "كمية زائدة", name_en: "Excess Quantity" },
  { id: "quality_issue", name_ar: "مشكلة جودة", name_en: "Quality Issue" },
  { id: "other", name_ar: "أخرى", name_en: "Other" },
];

const ReturnsManagement = ({ t, language, warehouses = [], products = [] }) => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [returnTypeFilter, setReturnTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [formData, setFormData] = useState({
    return_type: "customer", // customer or supplier
    party_type: "customer",
    party_id: "",
    party_name: "",
    product_id: "",
    product_name: "",
    quantity: "",
    unit_price: "",
    return_reason: "",
    reason_notes: "",
    warehouse_id: "",
    warehouse_name: "",
    notes: "",
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      let url = `${API}/inventory-advanced/returns`;
      const params = new URLSearchParams();
      if (returnTypeFilter) params.append("return_type", returnTypeFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await axios.get(url, { headers });
      setReturns(response.data);
    } catch (error) {
      console.error("Error fetching returns:", error);
      toast.error(t("فشل في جلب المرتجعات", "Failed to fetch returns"));
    } finally {
      setLoading(false);
    }
  }, [returnTypeFilter, statusFilter, t]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const handleCreateReturn = async () => {
    if (!formData.product_id || !formData.warehouse_id || !formData.quantity || !formData.return_reason) {
      toast.error(t("يرجى ملء جميع الحقول المطلوبة", "Please fill all required fields"));
      return;
    }

    try {
      await axios.post(`${API}/inventory-advanced/returns`, formData, { headers });
      toast.success(t("تم إنشاء المرتجع بنجاح", "Return created successfully"));
      setDialogOpen(false);
      setFormData({
        return_type: "customer",
        party_type: "customer",
        party_id: "",
        party_name: "",
        product_id: "",
        product_name: "",
        quantity: "",
        unit_price: "",
        return_reason: "",
        reason_notes: "",
        warehouse_id: "",
        warehouse_name: "",
        notes: "",
      });
      fetchReturns();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في إنشاء المرتجع", "Failed to create return"));
    }
  };

  const handleApproveReturn = async (returnId) => {
    try {
      await axios.put(`${API}/inventory-advanced/returns/${returnId}/approve`, {}, { headers });
      toast.success(t("تم الموافقة على المرتجع وتعديل المخزون", "Return approved and stock adjusted"));
      fetchReturns();
    } catch (error) {
      toast.error(t("فشل في الموافقة على المرتجع", "Failed to approve return"));
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: t("قيد الانتظار", "Pending"), variant: "secondary" },
      approved: { label: t("معتمد", "Approved"), variant: "default" },
      completed: { label: t("مكتمل", "Completed"), variant: "default", className: "bg-green-600" },
      rejected: { label: t("مرفوض", "Rejected"), variant: "destructive" },
    };
    const statusInfo = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={statusInfo.variant} className={statusInfo.className}>{statusInfo.label}</Badge>;
  };

  const getReturnTypeBadge = (type) => {
    if (type === "customer") {
      return (
        <Badge variant="outline" className="flex items-center gap-1 bg-blue-50">
          <ArrowDownToLine className="w-3 h-3" />
          {t("من عميل", "From Customer")}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="flex items-center gap-1 bg-orange-50">
        <ArrowUpFromLine className="w-3 h-3" />
        {t("إلى مورد", "To Supplier")}
      </Badge>
    );
  };

  // حساب الإحصائيات
  const stats = {
    total: returns.length,
    pending: returns.filter(r => r.status === "pending").length,
    customerReturns: returns.filter(r => r.return_type === "customer").length,
    supplierReturns: returns.filter(r => r.return_type === "supplier").length,
    totalValue: returns.reduce((sum, r) => sum + (r.total_value || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* إحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">{t("إجمالي المرتجعات", "Total Returns")}</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">{t("قيد الانتظار", "Pending")}</div>
          <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">{t("من العملاء", "From Customers")}</div>
          <div className="text-2xl font-bold text-blue-600">{stats.customerReturns}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">{t("إلى الموردين", "To Suppliers")}</div>
          <div className="text-2xl font-bold text-purple-600">{stats.supplierReturns}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">{t("إجمالي القيمة", "Total Value")}</div>
          <div className="text-2xl font-bold">{stats.totalValue.toFixed(2)}</div>
        </Card>
      </div>

      {/* شريط الأدوات */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                {t("إدارة المرتجعات", "Returns Management")}
              </CardTitle>
              <CardDescription>
                {t("إدارة مرتجعات العملاء والموردين", "Manage customer and supplier returns")}
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {t("مرتجع جديد", "New Return")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* فلاتر */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="w-48">
              <Select value={returnTypeFilter} onValueChange={setReturnTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t("نوع المرتجع", "Return Type")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("الكل", "All")}</SelectItem>
                  <SelectItem value="customer">{t("من عميل", "From Customer")}</SelectItem>
                  <SelectItem value="supplier">{t("إلى مورد", "To Supplier")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t("الحالة", "Status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("الكل", "All")}</SelectItem>
                  <SelectItem value="pending">{t("قيد الانتظار", "Pending")}</SelectItem>
                  <SelectItem value="completed">{t("مكتمل", "Completed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={fetchReturns}>
              <RefreshCw className="w-4 h-4 ml-2" />
              {t("تحديث", "Refresh")}
            </Button>
          </div>

          {/* جدول المرتجعات */}
          {loading ? (
            <div className="flex justify-center p-8">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("رقم المرتجع", "Return Number")}</TableHead>
                    <TableHead>{t("النوع", "Type")}</TableHead>
                    <TableHead>{t("الطرف", "Party")}</TableHead>
                    <TableHead>{t("المنتج", "Product")}</TableHead>
                    <TableHead className="text-center">{t("الكمية", "Quantity")}</TableHead>
                    <TableHead className="text-center">{t("القيمة", "Value")}</TableHead>
                    <TableHead>{t("السبب", "Reason")}</TableHead>
                    <TableHead>{t("الحالة", "Status")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {t("لا توجد مرتجعات", "No returns found")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    returns.map((ret) => (
                      <TableRow key={ret.id}>
                        <TableCell className="font-medium">{ret.return_number}</TableCell>
                        <TableCell>{getReturnTypeBadge(ret.return_type)}</TableCell>
                        <TableCell>{ret.party_name || "-"}</TableCell>
                        <TableCell>{ret.product_name}</TableCell>
                        <TableCell className="text-center">{ret.quantity}</TableCell>
                        <TableCell className="text-center">{ret.total_value?.toFixed(2) || 0}</TableCell>
                        <TableCell>
                          {RETURN_REASONS.find(r => r.id === ret.return_reason)?.[language === "ar" ? "name_ar" : "name_en"] || ret.return_reason}
                        </TableCell>
                        <TableCell>{getStatusBadge(ret.status)}</TableCell>
                        <TableCell>
                          {ret.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleApproveReturn(ret.id)}
                              className="text-green-600"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
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

      {/* نافذة إضافة مرتجع */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              {t("إنشاء مرتجع جديد", "Create New Return")}
            </DialogTitle>
            <DialogDescription>
              {t("أدخل بيانات المرتجع", "Enter return information")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2">
              <Label>{t("نوع المرتجع *", "Return Type *")}</Label>
              <Select
                value={formData.return_type}
                onValueChange={(v) => setFormData({ ...formData, return_type: v, party_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">
                    <span className="flex items-center gap-2">
                      <ArrowDownToLine className="w-4 h-4" />
                      {t("مرتجع من عميل", "Return from Customer")}
                    </span>
                  </SelectItem>
                  <SelectItem value="supplier">
                    <span className="flex items-center gap-2">
                      <ArrowUpFromLine className="w-4 h-4" />
                      {t("مرتجع إلى مورد", "Return to Supplier")}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{formData.return_type === "customer" ? t("اسم العميل", "Customer Name") : t("اسم المورد", "Supplier Name")}</Label>
              <Input
                value={formData.party_name}
                onChange={(e) => setFormData({ ...formData, party_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("المنتج *", "Product *")}</Label>
              <Select
                value={formData.product_id}
                onValueChange={(v) => {
                  const product = products.find(p => p.id === v);
                  setFormData({
                    ...formData,
                    product_id: v,
                    product_name: product?.name || "",
                    product_code: product?.code || ""
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("اختر المنتج", "Select product")} />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("المستودع *", "Warehouse *")}</Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(v) => {
                  const warehouse = warehouses.find(w => w.id === v);
                  setFormData({
                    ...formData,
                    warehouse_id: v,
                    warehouse_name: warehouse?.name || ""
                  });
                }}
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
              <Label>{t("الكمية *", "Quantity *")}</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || "" })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("سعر الوحدة", "Unit Price")}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || "" })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("سبب الإرجاع *", "Return Reason *")}</Label>
              <Select
                value={formData.return_reason}
                onValueChange={(v) => setFormData({ ...formData, return_reason: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("اختر السبب", "Select reason")} />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {language === "ar" ? r.name_ar : r.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>{t("ملاحظات السبب", "Reason Notes")}</Label>
              <Textarea
                value={formData.reason_notes}
                onChange={(e) => setFormData({ ...formData, reason_notes: e.target.value })}
                placeholder={t("تفاصيل إضافية عن سبب الإرجاع...", "Additional details about the reason...")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button onClick={handleCreateReturn}>
              {t("إنشاء المرتجع", "Create Return")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReturnsManagement;
