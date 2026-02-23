import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API, useLanguage } from "../App";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, Users, Phone, MapPin, Building, ArrowRightLeft, AlertCircle } from "lucide-react";
import { Checkbox } from "../components/ui/checkbox";

const Suppliers = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [suppliers, setSuppliers] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCenter, setFilterCenter] = useState("all");
  const [filterMilkType, setFilterMilkType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [newCenterId, setNewCenterId] = useState("");
  
  // Bulk Selection States
  const [selectedSuppliers, setSelectedSuppliers] = useState([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    supplier_code: "",
    bank_account: "",
    bank_name: "",
    center_id: "",
    center_name: "",
    national_id: "",
    farm_size: "",
    cattle_count: "",
    milk_type: "cow",
  });

  const MILK_TYPES = [
    { id: "cow", name: "أبقار", name_en: "Cow" },
    { id: "camel", name: "إبل", name_en: "Camel" },
    { id: "goat", name: "ماعز", name_en: "Goat" },
    { id: "mixed", name: "مختلط", name_en: "Mixed" },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [suppliersRes, centersRes] = await Promise.all([
        axios.get(`${API}/suppliers`),
        axios.get(`${API}/centers`),
      ]);
      setSuppliers(suppliersRes.data);
      setCenters(centersRes.data);
    } catch (error) {
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleCenterChange = (centerId) => {
    const center = centers.find((c) => c.id === centerId);
    setFormData({
      ...formData,
      center_id: centerId,
      center_name: center?.name || "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        farm_size: formData.farm_size ? parseFloat(formData.farm_size) : null,
        cattle_count: formData.cattle_count ? parseInt(formData.cattle_count) : null,
      };

      if (selectedSupplier) {
        await axios.put(`${API}/suppliers/${selectedSupplier.id}`, data);
        toast.success(t("success"));
      } else {
        await axios.post(`${API}/suppliers`, data);
        toast.success(t("success"));
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/suppliers/${selectedSupplier.id}`);
      toast.success(t("success"));
      setDeleteDialogOpen(false);
      setSelectedSupplier(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const handleTransfer = async () => {
    if (!newCenterId) {
      toast.error(language === "ar" ? "يرجى اختيار المركز الجديد" : "Please select new center");
      return;
    }
    const newCenter = centers.find(c => c.id === newCenterId);
    if (!newCenter) return;

    try {
      await axios.put(`${API}/suppliers/${selectedSupplier.id}/transfer-center?new_center=${encodeURIComponent(newCenter.name)}`);
      toast.success(language === "ar" ? "تم نقل المورد بنجاح" : "Supplier transferred successfully");
      setTransferDialogOpen(false);
      setSelectedSupplier(null);
      setNewCenterId("");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const openTransferDialog = (supplier) => {
    setSelectedSupplier(supplier);
    setNewCenterId("");
    setTransferDialogOpen(true);
  };

  const openEditDialog = (supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone,
      address: supplier.address,
      supplier_code: supplier.supplier_code || "",
      bank_account: supplier.bank_account || "",
      bank_name: supplier.bank_name || "",
      center_id: supplier.center_id || "",
      center_name: supplier.center_name || "",
      national_id: supplier.national_id || "",
      farm_size: supplier.farm_size || "",
      cattle_count: supplier.cattle_count || "",
      milk_type: supplier.milk_type || "cow",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      address: "",
      supplier_code: "",
      bank_account: "",
      bank_name: "",
      center_id: "",
      center_name: "",
      national_id: "",
      farm_size: "",
      cattle_count: "",
      milk_type: "cow",
    });
    setSelectedSupplier(null);
  };

  const getMilkTypeName = (type) => {
    const milkType = MILK_TYPES.find(t => t.id === type);
    // Also handle Arabic milk type values directly
    if (type === 'إبل') return language === "ar" ? "إبل" : "Camel";
    if (type === 'بقر' || type === 'أبقار') return language === "ar" ? "أبقار" : "Cow";
    if (type === 'ماعز') return language === "ar" ? "ماعز" : "Goat";
    return milkType ? (language === "ar" ? milkType.name : milkType.name_en) : type || '-';
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (s.name?.toLowerCase() || '').includes(searchLower) ||
      (s.phone || '').includes(searchTerm) ||
      (s.supplier_code || '').includes(searchTerm) ||
      (s.address?.toLowerCase() || '').includes(searchLower);
    
    const matchesCenter = filterCenter === "all" || s.center_id === filterCenter;
    
    // Handle milk type filtering - check both English IDs and Arabic values
    const matchesMilkType = filterMilkType === "all" || 
      s.milk_type === filterMilkType ||
      (filterMilkType === "camel" && s.milk_type === "إبل") ||
      (filterMilkType === "cow" && (s.milk_type === "بقر" || s.milk_type === "أبقار")) ||
      (filterMilkType === "goat" && s.milk_type === "ماعز") ||
      (filterMilkType === "إبل" && s.milk_type === "إبل") ||
      (filterMilkType === "أبقار" && (s.milk_type === "cow" || s.milk_type === "بقر" || s.milk_type === "أبقار"));
    
    return matchesSearch && matchesCenter && matchesMilkType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="suppliers-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("suppliers")}</h1>
          <p className="text-muted-foreground">
            {language === "ar" ? "إدارة الموردين والمزارعين" : "Manage suppliers and farmers"}
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
          className="gradient-primary text-white"
          data-testid="add-supplier-btn"
        >
          <Plus className="w-4 h-4 me-2" />
          {t("add_supplier")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{suppliers.length}</p>
              <p className="text-sm text-muted-foreground">{t("total_suppliers")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {suppliers.filter(s => s.national_id).length}
              </p>
              <p className="text-sm text-muted-foreground">{language === "ar" ? "برقم مدني" : "With ID"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {suppliers.reduce((sum, s) => sum + (s.balance || 0), 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">{t("supplier_dues")} ({t("currency")})</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">
                {suppliers.reduce((sum, s) => sum + (s.pending_balance || 0), 0).toLocaleString(undefined, {maximumFractionDigits: 2})}
              </p>
              <p className="text-sm text-muted-foreground">{language === "ar" ? "الرصيد المتبقي" : "Pending Balance"} ({t("currency")})</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">{t("suppliers")} ({filteredSuppliers.length})</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <Select value={filterCenter} onValueChange={setFilterCenter}>
                <SelectTrigger className="w-full sm:w-40" data-testid="filter-center">
                  <SelectValue placeholder={t("center")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "ar" ? "جميع المراكز" : "All Centers"}</SelectItem>
                  {centers.map((center) => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterMilkType} onValueChange={setFilterMilkType}>
                <SelectTrigger className="w-full sm:w-40" data-testid="filter-milk-type">
                  <SelectValue placeholder={language === "ar" ? "نوع الحليب" : "Milk Type"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "ar" ? "جميع الأنواع" : "All Types"}</SelectItem>
                  <SelectItem value="إبل">{language === "ar" ? "إبل" : "Camel"}</SelectItem>
                  <SelectItem value="cow">{language === "ar" ? "أبقار" : "Cow"}</SelectItem>
                  <SelectItem value="goat">{language === "ar" ? "ماعز" : "Goat"}</SelectItem>
                  <SelectItem value="mixed">{language === "ar" ? "مختلط" : "Mixed"}</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={language === "ar" ? "بحث بالاسم أو الكود أو الهاتف..." : "Search by name, code, or phone..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="ps-9"
                  data-testid="search-suppliers"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("supplier_name")}</TableHead>
                  <TableHead>{t("supplier_code")}</TableHead>
                  <TableHead>{language === "ar" ? "الرقم المدني" : "National ID"}</TableHead>
                  <TableHead>{language === "ar" ? "نوع الحليب" : "Milk Type"}</TableHead>
                  <TableHead>{t("center")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("bank_account")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{language === "ar" ? "البنك" : "Bank"}</TableHead>
                  <TableHead>{t("balance")}</TableHead>
                  <TableHead>{language === "ar" ? "الرصيد المتبقي" : "Pending"}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {t("no_data")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id} className="table-row-hover" data-testid={`supplier-row-${supplier.id}`}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>
                        <span className="badge-info">{supplier.supplier_code || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono">{supplier.national_id || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          supplier.milk_type === 'camel' || supplier.milk_type === 'إبل' ? 'bg-amber-100 text-amber-700' :
                          supplier.milk_type === 'goat' || supplier.milk_type === 'ماعز' ? 'bg-green-100 text-green-700' :
                          supplier.milk_type === 'mixed' ? 'bg-purple-100 text-purple-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {getMilkTypeName(supplier.milk_type || 'cow')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3 text-amber-600" />
                          {supplier.center_name || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs font-mono">{supplier.bank_account || "-"}</span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs">{supplier.bank_name || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <span className={supplier.balance > 0 ? "text-red-600 font-medium" : ""}>
                          {(supplier.balance || 0).toLocaleString()} {t("currency")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={supplier.pending_balance > 0 ? "text-orange-600 font-medium" : "text-muted-foreground"}>
                          {(supplier.pending_balance || 0).toFixed(2)} {t("currency")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(supplier)}
                            data-testid={`edit-supplier-${supplier.id}`}
                            title={language === "ar" ? "تعديل" : "Edit"}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openTransferDialog(supplier)}
                            data-testid={`transfer-supplier-${supplier.id}`}
                            title={language === "ar" ? "نقل لمركز آخر" : "Transfer to another center"}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedSupplier(supplier);
                              setDeleteDialogOpen(true);
                            }}
                            data-testid={`delete-supplier-${supplier.id}`}
                            title={language === "ar" ? "حذف" : "Delete"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedSupplier ? t("edit_supplier") : t("add_supplier")}
            </DialogTitle>
            <DialogDescription>
              {language === "ar" ? "أدخل بيانات المورد" : "Enter supplier details"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("supplier_name")} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="supplier-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier_code">{t("supplier_code")}</Label>
                <Input
                  id="supplier_code"
                  value={formData.supplier_code}
                  onChange={(e) => setFormData({ ...formData, supplier_code: e.target.value })}
                  data-testid="supplier-code-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("center")} *</Label>
                <Select value={formData.center_id} onValueChange={handleCenterChange}>
                  <SelectTrigger data-testid="supplier-center-select">
                    <SelectValue placeholder={t("center")} />
                  </SelectTrigger>
                  <SelectContent>
                    {centers.map((center) => (
                      <SelectItem key={center.id} value={center.id}>
                        {center.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("phone")} *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  data-testid="supplier-phone-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_account">{t("bank_account")}</Label>
                <Input
                  id="bank_account"
                  value={formData.bank_account}
                  onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                  data-testid="supplier-bank-account-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_name">{language === "ar" ? "اسم البنك" : "Bank Name"}</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  data-testid="supplier-bank-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{t("address")} *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  data-testid="supplier-address-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="national_id">{t("national_id")}</Label>
                <Input
                  id="national_id"
                  value={formData.national_id}
                  onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                  data-testid="supplier-national-id-input"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "نوع الحليب" : "Milk Type"} *</Label>
                <Select value={formData.milk_type} onValueChange={(v) => setFormData({ ...formData, milk_type: v })}>
                  <SelectTrigger data-testid="supplier-milk-type-select">
                    <SelectValue placeholder={language === "ar" ? "نوع الحليب" : "Milk Type"} />
                  </SelectTrigger>
                  <SelectContent>
                    {MILK_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {language === "ar" ? type.name : type.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="farm_size">{t("farm_size")}</Label>
                <Input
                  id="farm_size"
                  type="number"
                  step="0.1"
                  value={formData.farm_size}
                  onChange={(e) => setFormData({ ...formData, farm_size: e.target.value })}
                  data-testid="supplier-farm-size-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cattle_count">{t("cattle_count")}</Label>
                <Input
                  id="cattle_count"
                  type="number"
                  value={formData.cattle_count}
                  onChange={(e) => setFormData({ ...formData, cattle_count: e.target.value })}
                  data-testid="supplier-cattle-count-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="gradient-primary text-white" data-testid="submit-supplier-btn">
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "ar" ? "تأكيد الحذف" : "Confirm Delete"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "ar"
                ? `هل أنت متأكد من حذف المورد "${selectedSupplier?.name}"؟`
                : `Are you sure you want to delete supplier "${selectedSupplier?.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-btn"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Supplier Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === "ar" ? "نقل المورد لمركز آخر" : "Transfer Supplier to Another Center"}
            </DialogTitle>
            <DialogDescription>
              {language === "ar" 
                ? `نقل المورد "${selectedSupplier?.name}" من "${selectedSupplier?.center_name || 'غير محدد'}" إلى مركز جديد`
                : `Transfer supplier "${selectedSupplier?.name}" from "${selectedSupplier?.center_name || 'Not specified'}" to a new center`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "المركز الحالي" : "Current Center"}</Label>
              <Input 
                value={selectedSupplier?.center_name || (language === "ar" ? "غير محدد" : "Not specified")} 
                disabled 
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "المركز الجديد" : "New Center"} *</Label>
              <Select value={newCenterId} onValueChange={setNewCenterId}>
                <SelectTrigger data-testid="transfer-center-select">
                  <SelectValue placeholder={language === "ar" ? "اختر المركز الجديد" : "Select new center"} />
                </SelectTrigger>
                <SelectContent>
                  {centers.filter(c => c.name !== selectedSupplier?.center_name).map((center) => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTransferDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button 
              onClick={handleTransfer} 
              className="gradient-primary text-white"
              data-testid="confirm-transfer-btn"
            >
              <ArrowRightLeft className="w-4 h-4 me-2" />
              {language === "ar" ? "نقل المورد" : "Transfer Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Suppliers;
