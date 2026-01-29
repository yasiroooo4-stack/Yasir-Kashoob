/**
 * تتبع الدفعات واللوتات - Batch/Lot Tracking
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
import {
  Package,
  Plus,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Search,
  Filter,
  Box,
  Clock,
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const BatchTracking = ({ t, language, warehouses = [], products = [] }) => {
  const [batches, setBatches] = useState([]);
  const [expiringBatches, setExpiringBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [expiryDays, setExpiryDays] = useState(30);
  
  const [formData, setFormData] = useState({
    product_id: "",
    product_name: "",
    warehouse_id: "",
    warehouse_name: "",
    batch_number: "",
    quantity: "",
    unit_cost: "",
    production_date: "",
    expiry_date: "",
    supplier_name: "",
    supplier_batch_number: "",
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      let url = `${API}/inventory-advanced/batches`;
      const params = new URLSearchParams();
      if (selectedWarehouse && selectedWarehouse !== "all") params.append("warehouse_id", selectedWarehouse);
      if (selectedProduct && selectedProduct !== "all") params.append("product_id", selectedProduct);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await axios.get(url, { headers });
      setBatches(response.data);
    } catch (error) {
      console.error("Error fetching batches:", error);
      toast.error(t("فشل في جلب الدفعات", "Failed to fetch batches"));
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, selectedProduct, t]);

  const fetchExpiringBatches = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API}/inventory-advanced/batches/expiring?days=${expiryDays}`,
        { headers }
      );
      setExpiringBatches(response.data || []);
    } catch (error) {
      console.error("Error fetching expiring batches:", error);
    }
  }, [expiryDays]);

  useEffect(() => {
    fetchBatches();
    fetchExpiringBatches();
  }, [fetchBatches, fetchExpiringBatches]);

  const handleCreateBatch = async () => {
    if (!formData.product_id || !formData.warehouse_id || !formData.quantity) {
      toast.error(t("يرجى ملء جميع الحقول المطلوبة", "Please fill all required fields"));
      return;
    }

    try {
      await axios.post(`${API}/inventory-advanced/batches`, formData, { headers });
      toast.success(t("تم إنشاء الدفعة بنجاح", "Batch created successfully"));
      setDialogOpen(false);
      setFormData({
        product_id: "",
        product_name: "",
        warehouse_id: "",
        warehouse_name: "",
        batch_number: "",
        quantity: "",
        unit_cost: "",
        production_date: "",
        expiry_date: "",
        supplier_name: "",
        supplier_batch_number: "",
      });
      fetchBatches();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في إنشاء الدفعة", "Failed to create batch"));
    }
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { label: t("منتهي الصلاحية", "Expired"), variant: "destructive" };
    } else if (daysUntilExpiry <= 7) {
      return { label: t("قريب جداً", "Very Soon"), variant: "destructive" };
    } else if (daysUntilExpiry <= 30) {
      return { label: t("قريب", "Soon"), variant: "secondary" };
    }
    return { label: t("صالح", "Valid"), variant: "outline" };
  };

  return (
    <div className="space-y-6">
      {/* تنبيهات الصلاحية */}
      {expiringBatches.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" />
              {t("تنبيه: دفعات قريبة من انتهاء الصلاحية", "Alert: Batches Expiring Soon")}
              <Badge variant="secondary" className="mr-2">{expiringBatches.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {expiringBatches.slice(0, 5).map((batch) => (
                <Badge key={batch.id} variant="outline" className="bg-white">
                  {batch.product_name} - {batch.batch_number} ({batch.expiry_date})
                </Badge>
              ))}
              {expiringBatches.length > 5 && (
                <Badge variant="secondary">+{expiringBatches.length - 5} {t("أخرى", "more")}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* شريط الأدوات */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Box className="w-5 h-5" />
                {t("تتبع الدفعات واللوتات", "Batch/Lot Tracking")}
              </CardTitle>
              <CardDescription>
                {t("تتبع الدفعات مع تواريخ الإنتاج والصلاحية", "Track batches with production and expiry dates")}
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {t("دفعة جديدة", "New Batch")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* فلاتر */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <Label>{t("المستودع", "Warehouse")}</Label>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger>
                  <SelectValue placeholder={t("الكل", "All")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("الكل", "All")}</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("المنتج", "Product")}</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder={t("الكل", "All")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("الكل", "All")}</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("تنتهي خلال (أيام)", "Expires within (days)")}</Label>
              <Input
                type="number"
                value={expiryDays}
                onChange={(e) => setExpiryDays(parseInt(e.target.value) || 30)}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => { fetchBatches(); fetchExpiringBatches(); }}>
                <RefreshCw className="w-4 h-4 ml-2" />
                {t("تحديث", "Refresh")}
              </Button>
            </div>
          </div>

          {/* جدول الدفعات */}
          {loading ? (
            <div className="flex justify-center p-8">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("رقم الدفعة", "Batch Number")}</TableHead>
                    <TableHead>{t("المنتج", "Product")}</TableHead>
                    <TableHead>{t("المستودع", "Warehouse")}</TableHead>
                    <TableHead className="text-center">{t("الكمية", "Quantity")}</TableHead>
                    <TableHead>{t("تاريخ الإنتاج", "Production Date")}</TableHead>
                    <TableHead>{t("تاريخ الصلاحية", "Expiry Date")}</TableHead>
                    <TableHead>{t("الحالة", "Status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {t("لا توجد دفعات", "No batches found")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    batches.map((batch) => {
                      const expiryStatus = getExpiryStatus(batch.expiry_date);
                      return (
                        <TableRow key={batch.id}>
                          <TableCell className="font-medium">{batch.batch_number}</TableCell>
                          <TableCell>{batch.product_name}</TableCell>
                          <TableCell>{batch.warehouse_name}</TableCell>
                          <TableCell className="text-center">{batch.quantity}</TableCell>
                          <TableCell>{batch.production_date || "-"}</TableCell>
                          <TableCell>{batch.expiry_date || "-"}</TableCell>
                          <TableCell>
                            {expiryStatus && (
                              <Badge variant={expiryStatus.variant}>{expiryStatus.label}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* نافذة إضافة دفعة */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {t("إضافة دفعة جديدة", "Add New Batch")}
            </DialogTitle>
            <DialogDescription>
              {t("أدخل بيانات الدفعة الجديدة", "Enter new batch information")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
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
              <Label>{t("رقم الدفعة", "Batch Number")}</Label>
              <Input
                value={formData.batch_number}
                onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                placeholder={t("سيتم إنشاؤه تلقائياً", "Auto-generated")}
              />
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
              <Label>{t("تكلفة الوحدة", "Unit Cost")}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || "" })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("المورد", "Supplier")}</Label>
              <Input
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("تاريخ الإنتاج", "Production Date")}</Label>
              <Input
                type="date"
                value={formData.production_date}
                onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("تاريخ الصلاحية", "Expiry Date")}</Label>
              <Input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button onClick={handleCreateBatch}>
              {t("إنشاء الدفعة", "Create Batch")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BatchTracking;
