import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API, useLanguage, useAuth } from "../App";
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
import { Checkbox } from "../components/ui/checkbox";
import { Plus, Milk, Droplets, Thermometer, CheckCircle, XCircle, Search, Upload, Download, FileSpreadsheet, Pencil, Trash2 } from "lucide-react";

const MilkReception = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [receptions, setReceptions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingReception, setEditingReception] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingReception, setDeletingReception] = useState(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [supplierCode, setSupplierCode] = useState("");
  const [supplierFound, setSupplierFound] = useState(null);
  const [matchingSuppliers, setMatchingSuppliers] = useState([]);
  const [defaultPrices, setDefaultPrices] = useState({ cow: "", camel: "" });
  const [formData, setFormData] = useState({
    supplier_id: "",
    supplier_name: "",
    quantity_liters: "",
    price_per_liter: "",
    quality_test: {
      fat_percentage: "",
      protein_percentage: "",
      temperature: "",
      density: "",
      acidity: "",
      water_content: "",
      is_accepted: true,
      notes: "",
    },
  });

  // Check permissions
  const canEdit = user?.role === "admin" || userPermissions.includes("milk_reception_edit") || userPermissions.includes("all");
  const canDelete = user?.role === "admin" || userPermissions.includes("milk_reception_delete") || userPermissions.includes("all");

  useEffect(() => {
    fetchData();
    fetchPriceSettings();
    fetchUserPermissions();
  }, []);

  const fetchPriceSettings = async () => {
    try {
      const res = await axios.get(`${API}/settings/milk-prices`);
      if (res.data && Array.isArray(res.data)) {
        const cowPrice = res.data.find(p => p.id === 'cow')?.price || "";
        const camelPrice = res.data.find(p => p.id === 'camel')?.price || "";
        setDefaultPrices({
          cow: cowPrice,
          camel: camelPrice
        });
      }
    } catch (error) {
      console.log("Price settings not found");
    }
  };

  const fetchUserPermissions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/permissions/user`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserPermissions(res.data?.granted_permissions || []);
    } catch (error) {
      console.log("Could not fetch permissions");
    }
  };

  const fetchData = async () => {
    try {
      const [receptionsRes, suppliersRes] = await Promise.all([
        axios.get(`${API}/milk-receptions`),
        axios.get(`${API}/suppliers`),
      ]);
      setReceptions(receptionsRes.data);
      setSuppliers(suppliersRes.data);
    } catch (error) {
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    // Determine milk type and set price
    const milkType = supplier?.milk_type || supplier?.animal_type || "cow";
    const price = milkType === "camel" ? defaultPrices.camel : defaultPrices.cow;
    
    setFormData({
      ...formData,
      supplier_id: supplierId,
      supplier_name: supplier?.name || "",
      price_per_liter: price || formData.price_per_liter,
    });
    setSupplierCode(supplier?.supplier_code || "");
    setSupplierFound(supplier);
  };

  // Search supplier by code - show all matching suppliers
  const handleSupplierCodeChange = (code) => {
    setSupplierCode(code);
    if (code.length >= 2) {
      // Find all matching suppliers
      const matches = suppliers.filter(
        (s) => s.supplier_code?.toLowerCase() === code.toLowerCase() ||
               s.supplier_code?.toLowerCase().includes(code.toLowerCase()) ||
               s.name?.toLowerCase().includes(code.toLowerCase())
      );
      
      setMatchingSuppliers(matches);
      
      if (matches.length === 1) {
        // Auto-select if only one match
        selectSupplier(matches[0]);
      } else if (matches.length > 1) {
        setSupplierFound(null);
      } else {
        setSupplierFound(null);
      }
    } else {
      setMatchingSuppliers([]);
      setSupplierFound(null);
    }
  };

  // Select a specific supplier from matches
  const selectSupplier = (supplier) => {
    setSupplierFound(supplier);
    // Determine milk type and set price
    const milkType = supplier.milk_type || supplier.animal_type || "cow";
    const price = milkType === "camel" ? defaultPrices.camel : defaultPrices.cow;
    
    setFormData({
      ...formData,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      price_per_liter: price || formData.price_per_liter,
    });
    setMatchingSuppliers([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const data = {
        ...formData,
        quantity_liters: parseFloat(formData.quantity_liters),
        price_per_liter: parseFloat(formData.price_per_liter),
        quality_test: {
          ...formData.quality_test,
          fat_percentage: parseFloat(formData.quality_test.fat_percentage),
          protein_percentage: parseFloat(formData.quality_test.protein_percentage),
          temperature: parseFloat(formData.quality_test.temperature),
          density: formData.quality_test.density ? parseFloat(formData.quality_test.density) : null,
          acidity: formData.quality_test.acidity ? parseFloat(formData.quality_test.acidity) : null,
          water_content: formData.quality_test.water_content ? parseFloat(formData.quality_test.water_content) : null,
        },
      };

      if (editMode && editingReception) {
        // Update existing reception
        await axios.put(`${API}/milk-receptions/${editingReception.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === "ar" ? "تم تعديل الاستلام بنجاح" : "Reception updated successfully");
      } else {
        // Create new reception
        await axios.post(`${API}/milk-receptions`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(t("success"));
      }
      
      setDialogOpen(false);
      setEditMode(false);
      setEditingReception(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  // Open edit dialog
  const handleEdit = (reception) => {
    setEditMode(true);
    setEditingReception(reception);
    setFormData({
      supplier_id: reception.supplier_id || "",
      supplier_name: reception.supplier_name || "",
      quantity_liters: reception.quantity_liters?.toString() || "",
      price_per_liter: reception.price_per_liter?.toString() || "",
      quality_test: {
        fat_percentage: reception.quality_test?.fat_percentage?.toString() || "",
        protein_percentage: reception.quality_test?.protein_percentage?.toString() || "",
        temperature: reception.quality_test?.temperature?.toString() || "",
        density: reception.quality_test?.density?.toString() || "",
        acidity: reception.quality_test?.acidity?.toString() || "",
        water_content: reception.quality_test?.water_content?.toString() || "",
        is_accepted: reception.quality_test?.is_accepted ?? true,
        notes: reception.quality_test?.notes || "",
      },
    });
    setSupplierCode(reception.supplier_code || "");
    setSupplierFound(suppliers.find(s => s.id === reception.supplier_id));
    setDialogOpen(true);
  };

  // Delete reception
  const handleDelete = async () => {
    if (!deletingReception) return;
    
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/milk-receptions/${deletingReception.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === "ar" ? "تم حذف الاستلام بنجاح" : "Reception deleted successfully");
      setDeleteDialogOpen(false);
      setDeletingReception(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === "ar" ? "خطأ في الحذف" : "Delete error"));
    }
  };

  // Open delete confirmation
  const confirmDelete = (reception) => {
    setDeletingReception(reception);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setEditMode(false);
    setEditingReception(null);
    setFormData({
      supplier_id: "",
      supplier_name: "",
      quantity_liters: "",
      price_per_liter: "",
      quality_test: {
        fat_percentage: "",
        protein_percentage: "",
        temperature: "",
        density: "",
        acidity: "",
        water_content: "",
        is_accepted: true,
        notes: "",
      },
    });
    setSupplierCode("");
    setSupplierFound(null);
    setMatchingSuppliers([]);
  };

  // استيراد من ملف Excel/CSV
  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImportFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error(language === "ar" ? "يرجى اختيار ملف" : "Please select a file");
      return;
    }

    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await axios.post(`${API}/milk-receptions/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setImportResult(res.data);
      if (res.data.imported_count > 0) {
        toast.success(
          language === "ar"
            ? `تم استيراد ${res.data.imported_count} سجل بنجاح`
            : `Successfully imported ${res.data.imported_count} records`
        );
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Import failed");
    } finally {
      setImportLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await axios.get(`${API}/milk-receptions/import/template`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "milk_reception_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(language === "ar" ? "فشل تحميل القالب" : "Failed to download template");
    }
  };

  const todayReceptions = receptions.filter((r) =>
    r.reception_date?.startsWith(new Date().toISOString().split("T")[0])
  );
  const todayTotal = todayReceptions.reduce((sum, r) => sum + (r.quantity_liters || 0), 0);
  const todayValue = todayReceptions.reduce((sum, r) => sum + (r.total_amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="milk-reception-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("milk_reception")}</h1>
          <p className="text-muted-foreground">
            {language === "ar" ? "تسجيل استلام الحليب من الموردين" : "Record milk reception from suppliers"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setImportDialogOpen(true)}
            variant="outline"
            data-testid="import-btn"
          >
            <Upload className="w-4 h-4 me-2" />
            {language === "ar" ? "استيراد" : "Import"}
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
            className="gradient-primary text-white"
            data-testid="add-reception-btn"
          >
            <Plus className="w-4 h-4 me-2" />
            {t("add_reception")}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Milk className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayReceptions.length}</p>
              <p className="text-sm text-muted-foreground">{t("receptions")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayTotal.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{t("liters")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
              <Milk className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayValue.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{t("currency")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
              <Thermometer className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {todayReceptions.length > 0
                  ? (
                      todayReceptions.reduce(
                        (sum, r) => sum + (r.quality_test?.fat_percentage || 0),
                        0
                      ) / todayReceptions.length
                    ).toFixed(1)
                  : 0}
                %
              </p>
              <p className="text-sm text-muted-foreground">{t("avg_fat")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("receptions")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("reception_date")}</TableHead>
                  <TableHead>{t("supplier")}</TableHead>
                  <TableHead>{language === "ar" ? "كود المورد" : "Supplier Code"}</TableHead>
                  <TableHead>{language === "ar" ? "المركز" : "Center"}</TableHead>
                  <TableHead>{t("quantity_liters")}</TableHead>
                  <TableHead>{t("price_per_liter")}</TableHead>
                  <TableHead>{t("total")}</TableHead>
                  <TableHead>{t("fat_percentage")}</TableHead>
                  <TableHead>{language === "ar" ? "نوع الحليب" : "Milk Type"}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {t("no_data")}
                    </TableCell>
                  </TableRow>
                ) : (
                  receptions.map((reception) => (
                    <TableRow key={reception.id} className="table-row-hover" data-testid={`reception-row-${reception.id}`}>
                      <TableCell>
                        {new Date(reception.reception_date).toLocaleDateString(
                          language === "ar" ? "ar-SA" : "en-US"
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{reception.supplier_name}</TableCell>
                      <TableCell className="text-center font-mono bg-blue-50 dark:bg-blue-900/20">
                        {reception.supplier_code || "-"}
                      </TableCell>
                      <TableCell>{reception.center_name || "-"}</TableCell>
                      <TableCell>{reception.quantity_liters?.toLocaleString()} {t("liters")}</TableCell>
                      <TableCell>{reception.price_per_liter} {t("currency")}</TableCell>
                      <TableCell className="font-medium">
                        {reception.total_amount?.toLocaleString()} {t("currency")}
                      </TableCell>
                      <TableCell>{reception.quality_test?.fat_percentage}%</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          reception.milk_type === 'camel' || reception.milk_type === 'إبل' 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {reception.milk_type === 'camel' || reception.milk_type === 'إبل' ? 'إبل' : 'بقر'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {reception.quality_test?.is_accepted ? (
                          <span className="badge-success flex items-center gap-1 w-fit">
                            <CheckCircle className="w-3 h-3" />
                            {t("is_accepted")}
                          </span>
                        ) : (
                          <span className="badge-error flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3" />
                            {language === "ar" ? "مرفوض" : "Rejected"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("add_reception")}</DialogTitle>
            <DialogDescription>
              {language === "ar" ? "أدخل بيانات استلام الحليب" : "Enter milk reception details"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Supplier Code Search */}
            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <Label className="text-blue-700 font-medium">
                {language === "ar" ? "البحث بكود المورد" : "Search by Supplier Code"}
              </Label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Input
                    placeholder={language === "ar" ? "أدخل كود المورد أو الاسم..." : "Enter supplier code or name..."}
                    value={supplierCode}
                    onChange={(e) => handleSupplierCodeChange(e.target.value)}
                    className="pr-10"
                    data-testid="supplier-code-input"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                {supplierFound && (
                  <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-2 rounded-lg">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">{supplierFound.name}</span>
                  </div>
                )}
              </div>
              
              {/* Show matching suppliers list */}
              {matchingSuppliers.length > 1 && (
                <div className="bg-white border rounded-lg p-2 max-h-48 overflow-y-auto">
                  <p className="text-sm text-gray-600 mb-2 px-2">
                    {language === "ar" ? `تم العثور على ${matchingSuppliers.length} مورد - اختر واحداً:` : `Found ${matchingSuppliers.length} suppliers - select one:`}
                  </p>
                  {matchingSuppliers.map((supplier) => (
                    <button
                      key={supplier.id}
                      type="button"
                      onClick={() => selectSupplier(supplier)}
                      className="w-full text-right px-3 py-2 hover:bg-blue-50 rounded flex justify-between items-center border-b last:border-0"
                    >
                      <span className="font-medium">{supplier.name}</span>
                      <span className="text-sm text-gray-500">
                        {supplier.supplier_code} | {supplier.milk_type === "camel" ? "إبل" : "بقر"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              
              {supplierCode && matchingSuppliers.length === 0 && !supplierFound && (
                <p className="text-sm text-orange-600">
                  {language === "ar" ? "لم يتم العثور على مورد بهذا الكود" : "Supplier not found with this code"}
                </p>
              )}
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("supplier")} *</Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={handleSupplierChange}
                >
                  <SelectTrigger data-testid="supplier-select">
                    <SelectValue placeholder={t("supplier")} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.supplier_code ? `${supplier.supplier_code} - ` : ""}{supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity_liters">{t("quantity_liters")} *</Label>
                <Input
                  id="quantity_liters"
                  type="number"
                  step="0.1"
                  value={formData.quantity_liters}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity_liters: e.target.value })
                  }
                  required
                  data-testid="quantity-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_per_liter">{t("price_per_liter")} *</Label>
                <Input
                  id="price_per_liter"
                  type="number"
                  step="0.01"
                  value={formData.price_per_liter}
                  onChange={(e) =>
                    setFormData({ ...formData, price_per_liter: e.target.value })
                  }
                  required
                  data-testid="price-input"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("total")}</Label>
                <Input
                  value={
                    formData.quantity_liters && formData.price_per_liter
                      ? (
                          parseFloat(formData.quantity_liters) *
                          parseFloat(formData.price_per_liter)
                        ).toFixed(2)
                      : ""
                  }
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            {/* Quality Test Section */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-primary" />
                {t("quality_test")}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fat_percentage">{t("fat_percentage")} *</Label>
                  <Input
                    id="fat_percentage"
                    type="number"
                    step="0.1"
                    value={formData.quality_test.fat_percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quality_test: {
                          ...formData.quality_test,
                          fat_percentage: e.target.value,
                        },
                      })
                    }
                    required
                    data-testid="fat-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protein_percentage">{t("protein_percentage")} *</Label>
                  <Input
                    id="protein_percentage"
                    type="number"
                    step="0.1"
                    value={formData.quality_test.protein_percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quality_test: {
                          ...formData.quality_test,
                          protein_percentage: e.target.value,
                        },
                      })
                    }
                    required
                    data-testid="protein-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperature">{t("temperature")} *</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    value={formData.quality_test.temperature}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quality_test: {
                          ...formData.quality_test,
                          temperature: e.target.value,
                        },
                      })
                    }
                    required
                    data-testid="temperature-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="density">{t("density")}</Label>
                  <Input
                    id="density"
                    type="number"
                    step="0.001"
                    value={formData.quality_test.density}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quality_test: {
                          ...formData.quality_test,
                          density: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="acidity">{t("acidity")}</Label>
                  <Input
                    id="acidity"
                    type="number"
                    step="0.01"
                    value={formData.quality_test.acidity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quality_test: {
                          ...formData.quality_test,
                          acidity: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="water_content">{t("water_content")}</Label>
                  <Input
                    id="water_content"
                    type="number"
                    step="0.1"
                    value={formData.quality_test.water_content}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quality_test: {
                          ...formData.quality_test,
                          water_content: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Checkbox
                  id="is_accepted"
                  checked={formData.quality_test.is_accepted}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      quality_test: {
                        ...formData.quality_test,
                        is_accepted: checked,
                      },
                    })
                  }
                  data-testid="is-accepted-checkbox"
                />
                <Label htmlFor="is_accepted" className="cursor-pointer">
                  {t("is_accepted")}
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="gradient-primary text-white" data-testid="submit-reception-btn">
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              {language === "ar" ? "استيراد بيانات استلام الحليب" : "Import Milk Reception Data"}
            </DialogTitle>
            <DialogDescription>
              {language === "ar"
                ? "استيراد البيانات من ملف Excel أو CSV من النظام القديم"
                : "Import data from Excel or CSV file from the old system"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Download Template */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {language === "ar" ? "تحميل القالب" : "Download Template"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar"
                      ? "قم بتحميل قالب Excel لمعرفة تنسيق البيانات المطلوب"
                      : "Download Excel template to see the required data format"}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 me-2" />
                  {language === "ar" ? "تحميل" : "Download"}
                </Button>
              </div>
            </div>

            {/* Required Columns Info */}
            <div className="p-4 border rounded-lg">
              <p className="font-medium mb-2 text-red-600">
                {language === "ar" ? "الأعمدة المطلوبة (*):" : "Required columns (*):"}
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground grid grid-cols-2 gap-1">
                <li>• <code>supplier_name</code> - {language === "ar" ? "اسم المورد" : "Supplier name"}</li>
                <li>• <code>quantity_liters</code> - {language === "ar" ? "الكمية (لتر)" : "Quantity (L)"}</li>
                <li>• <code>price_per_liter</code> - {language === "ar" ? "سعر اللتر" : "Price per liter"}</li>
                <li>• <code>fat_percentage</code> - {language === "ar" ? "نسبة الدهون" : "Fat %"}</li>
                <li>• <code>protein_percentage</code> - {language === "ar" ? "نسبة البروتين" : "Protein %"}</li>
                <li>• <code>temperature</code> - {language === "ar" ? "درجة الحرارة" : "Temperature"}</li>
              </ul>
              <p className="font-medium mt-3 mb-2 text-gray-600">
                {language === "ar" ? "الأعمدة الاختيارية:" : "Optional columns:"}
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground grid grid-cols-2 gap-1">
                <li>• <code>density</code> - {language === "ar" ? "الكثافة" : "Density"}</li>
                <li>• <code>acidity</code> - {language === "ar" ? "الحموضة" : "Acidity"}</li>
                <li>• <code>water_content</code> - {language === "ar" ? "نسبة الماء" : "Water %"}</li>
                <li>• <code>is_accepted</code> - {language === "ar" ? "مقبول (نعم/لا)" : "Accepted"}</li>
                <li>• <code>reception_date</code> - {language === "ar" ? "التاريخ" : "Date"}</li>
                <li>• <code>notes</code> - {language === "ar" ? "ملاحظات" : "Notes"}</li>
              </ul>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "اختر الملف" : "Select File"}</Label>
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleImportFile}
                className="cursor-pointer"
              />
              {importFile && (
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "الملف المحدد:" : "Selected file:"} {importFile.name}
                </p>
              )}
            </div>

            {/* Import Result */}
            {importResult && (
              <div className={`p-4 rounded-lg ${importResult.imported_count > 0 ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"} border`}>
                <p className="font-medium">
                  {language === "ar" ? "نتيجة الاستيراد:" : "Import Result:"}
                </p>
                <ul className="text-sm mt-2 space-y-1">
                  <li className="text-green-700">
                    ✅ {language === "ar" ? `تم استيراد: ${importResult.imported_count} سجل` : `Imported: ${importResult.imported_count} records`}
                  </li>
                  {importResult.errors_count > 0 && (
                    <li className="text-red-600">
                      ❌ {language === "ar" ? `أخطاء: ${importResult.errors_count}` : `Errors: ${importResult.errors_count}`}
                    </li>
                  )}
                  {importResult.skipped_count > 0 && (
                    <li className="text-yellow-600">
                      ⚠️ {language === "ar" ? `تم تخطي: ${importResult.skipped_count}` : `Skipped: ${importResult.skipped_count}`}
                    </li>
                  )}
                </ul>
                {importResult.errors?.length > 0 && (
                  <div className="mt-2 text-xs text-red-600">
                    <p className="font-medium">{language === "ar" ? "تفاصيل الأخطاء:" : "Error details:"}</p>
                    {importResult.errors.slice(0, 5).map((err, i) => (
                      <p key={i}>• {err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setImportDialogOpen(false);
              setImportFile(null);
              setImportResult(null);
            }}>
              {language === "ar" ? "إغلاق" : "Close"}
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!importFile || importLoading}
              className="gradient-primary text-white"
            >
              {importLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent me-2" />
              ) : (
                <Upload className="w-4 h-4 me-2" />
              )}
              {language === "ar" ? "استيراد" : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MilkReception;
