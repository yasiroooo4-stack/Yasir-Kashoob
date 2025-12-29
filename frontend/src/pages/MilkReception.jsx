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
import { Checkbox } from "../components/ui/checkbox";
import { Plus, Milk, Droplets, Thermometer, CheckCircle, XCircle } from "lucide-react";

const MilkReception = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [receptions, setReceptions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
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

  useEffect(() => {
    fetchData();
  }, []);

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
    setFormData({
      ...formData,
      supplier_id: supplierId,
      supplier_name: supplier?.name || "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
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

      await axios.post(`${API}/milk-receptions`, data);
      toast.success(t("success"));
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const resetForm = () => {
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
                  <TableHead>{t("quantity_liters")}</TableHead>
                  <TableHead>{t("price_per_liter")}</TableHead>
                  <TableHead>{t("total")}</TableHead>
                  <TableHead>{t("fat_percentage")}</TableHead>
                  <TableHead>{t("protein_percentage")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                      <TableCell>{reception.quantity_liters?.toLocaleString()} {t("liters")}</TableCell>
                      <TableCell>{reception.price_per_liter} {t("currency")}</TableCell>
                      <TableCell className="font-medium">
                        {reception.total_amount?.toLocaleString()} {t("currency")}
                      </TableCell>
                      <TableCell>{reception.quality_test?.fat_percentage}%</TableCell>
                      <TableCell>{reception.quality_test?.protein_percentage}%</TableCell>
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
                        {supplier.name}
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
    </div>
  );
};

export default MilkReception;
