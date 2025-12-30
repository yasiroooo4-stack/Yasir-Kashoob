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
import { Plus, Pencil, Trash2, Search, Users, Phone, MapPin, Building } from "lucide-react";

const Suppliers = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [suppliers, setSuppliers] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCenter, setFilterCenter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    supplier_code: "",
    bank_account: "",
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

  const openEditDialog = (supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone,
      address: supplier.address,
      supplier_code: supplier.supplier_code || "",
      bank_account: supplier.bank_account || "",
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
    return milkType ? (language === "ar" ? milkType.name : milkType.name_en) : type;
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      (s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm)) &&
      (filterCenter === "all" || s.center_id === filterCenter)
  );

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                {suppliers.reduce((sum, s) => sum + (s.total_supplied || 0), 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">{t("total_supplied")} ({t("liters")})</p>
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
      </div>

      {/* Search & Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">{t("suppliers")}</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3">
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
              <div className="relative w-full sm:w-64">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("search")}
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
                  <TableHead>{language === "ar" ? "نوع الحليب" : "Milk Type"}</TableHead>
                  <TableHead>{t("center")}</TableHead>
                  <TableHead>{t("phone")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("bank_account")}</TableHead>
                  <TableHead>{t("total_supplied")}</TableHead>
                  <TableHead>{t("balance")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          supplier.milk_type === 'camel' ? 'bg-amber-100 text-amber-700' :
                          supplier.milk_type === 'goat' ? 'bg-green-100 text-green-700' :
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
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {supplier.phone}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {supplier.bank_account || "-"}
                      </TableCell>
                      <TableCell>
                        {(supplier.total_supplied || 0).toLocaleString()} {t("liters")}
                      </TableCell>
                      <TableCell>
                        <span className={supplier.balance > 0 ? "text-red-600 font-medium" : ""}>
                          {(supplier.balance || 0).toLocaleString()} {t("currency")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(supplier)}
                            data-testid={`edit-supplier-${supplier.id}`}
                          >
                            <Pencil className="w-4 h-4" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
    </div>
  );
};

export default Suppliers;
