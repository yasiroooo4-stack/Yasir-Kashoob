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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Plus, Package, Thermometer, Clock, Pencil, Trash2 } from "lucide-react";

const Inventory = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    product_type: "raw_milk",
    quantity_liters: "",
    storage_tank: "",
    temperature: "",
  });
  const [editFormData, setEditFormData] = useState({
    quantity_liters: "",
    storage_tank: "",
    temperature: "",
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/api/inventory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInventory(response.data);
    } catch (error) {
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const data = {
        ...formData,
        quantity_liters: parseFloat(formData.quantity_liters),
        temperature: parseFloat(formData.temperature),
      };

      await axios.post(`${API}/api/inventory`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t("success"));
      setDialogOpen(false);
      resetForm();
      fetchInventory();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  // Edit inventory item
  const handleEdit = (item) => {
    setSelectedItem(item);
    setEditFormData({
      quantity_liters: item.quantity_liters,
      storage_tank: item.storage_tank || "",
      temperature: item.temperature || "",
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const data = {
        quantity_liters: parseFloat(editFormData.quantity_liters),
        storage_tank: editFormData.storage_tank,
        temperature: editFormData.temperature ? parseFloat(editFormData.temperature) : null,
      };
      
      await axios.put(`${API}/api/inventory/${selectedItem.id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(language === "ar" ? "تم تعديل المخزون بنجاح" : "Inventory updated");
      setEditDialogOpen(false);
      setSelectedItem(null);
      fetchInventory();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  // Delete inventory item
  const handleDelete = (item) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/api/inventory/${selectedItem.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(language === "ar" ? "تم حذف المخزون بنجاح" : "Inventory deleted");
      setDeleteDialogOpen(false);
      setSelectedItem(null);
      fetchInventory();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const resetForm = () => {
    setFormData({
      product_type: "raw_milk",
      quantity_liters: "",
      storage_tank: "",
      temperature: "",
    });
  };

  const totalStock = inventory.reduce((sum, item) => sum + (item.quantity_liters || 0), 0);
  const tankCount = inventory.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="inventory-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("inventory")}</h1>
          <p className="text-muted-foreground">
            {language === "ar" ? "إدارة المخزون وخزانات التخزين" : "Manage inventory and storage tanks"}
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
          className="gradient-accent text-white"
          data-testid="add-inventory-btn"
        >
          <Plus className="w-4 h-4 me-2" />
          {language === "ar" ? "إضافة خزان" : "Add Tank"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalStock.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{t("current_stock")} ({t("liters")})</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tankCount}</p>
              <p className="text-sm text-muted-foreground">{t("storage_tank")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center">
              <Thermometer className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {inventory.length > 0
                  ? (
                      inventory.reduce((sum, item) => sum + (item.temperature || 0), 0) /
                      inventory.length
                    ).toFixed(1)
                  : 0}
                °C
              </p>
              <p className="text-sm text-muted-foreground">{t("temperature")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("inventory")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("storage_tank")}</TableHead>
                  <TableHead>{t("product_type")}</TableHead>
                  <TableHead>{t("quantity_liters")}</TableHead>
                  <TableHead>{t("temperature")}</TableHead>
                  <TableHead>{t("last_updated")}</TableHead>
                  {user?.role === "admin" && (
                    <TableHead className="text-center">{language === "ar" ? "إجراءات" : "Actions"}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={user?.role === "admin" ? 6 : 5} className="text-center py-8 text-muted-foreground">
                      {t("no_data")}
                    </TableCell>
                  </TableRow>
                ) : (
                  inventory.map((item) => (
                    <TableRow key={item.id} className="table-row-hover" data-testid={`inventory-row-${item.id}`}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-primary" />
                          {item.storage_tank}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="badge-info">{t("raw_milk")}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-lg font-semibold text-primary">
                          {item.quantity_liters?.toLocaleString()}
                        </span>{" "}
                        {t("liters")}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Thermometer className="w-4 h-4 text-muted-foreground" />
                          {item.temperature}°C
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {new Date(item.last_updated).toLocaleString(
                            language === "ar" ? "ar-SA" : "en-US"
                          )}
                        </span>
                      </TableCell>
                      {user?.role === "admin" && (
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "إضافة خزان" : "Add Tank"}</DialogTitle>
            <DialogDescription>
              {language === "ar" ? "أدخل بيانات خزان التخزين" : "Enter storage tank details"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="storage_tank">{t("storage_tank")} *</Label>
                <Input
                  id="storage_tank"
                  value={formData.storage_tank}
                  onChange={(e) => setFormData({ ...formData, storage_tank: e.target.value })}
                  placeholder={language === "ar" ? "مثال: خزان 1" : "e.g., Tank 1"}
                  required
                  data-testid="tank-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity_liters">{t("quantity_liters")} *</Label>
                <Input
                  id="quantity_liters"
                  type="number"
                  step="0.1"
                  value={formData.quantity_liters}
                  onChange={(e) => setFormData({ ...formData, quantity_liters: e.target.value })}
                  required
                  data-testid="tank-quantity-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature">{t("temperature")} (°C) *</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  required
                  data-testid="tank-temperature-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="gradient-accent text-white" data-testid="submit-inventory-btn">
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "تعديل المخزون" : "Edit Inventory"}</DialogTitle>
            <DialogDescription>
              {language === "ar" ? "تعديل بيانات الخزان" : "Edit tank details"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("quantity_liters")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editFormData.quantity_liters}
                  onChange={(e) => setEditFormData({ ...editFormData, quantity_liters: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t("storage_tank")}</Label>
                <Input
                  value={editFormData.storage_tank}
                  onChange={(e) => setEditFormData({ ...editFormData, storage_tank: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("temperature")} (°C)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editFormData.temperature}
                  onChange={(e) => setEditFormData({ ...editFormData, temperature: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit">
                {language === "ar" ? "حفظ التعديلات" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "ar" ? "تأكيد الحذف" : "Confirm Delete"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "ar" 
                ? `هل أنت متأكد من حذف هذا المخزون؟ الخزان: ${selectedItem?.storage_tank} - الكمية: ${selectedItem?.quantity_liters?.toLocaleString()} لتر`
                : `Are you sure you want to delete this inventory? Tank: ${selectedItem?.storage_tank} - Quantity: ${selectedItem?.quantity_liters?.toLocaleString()} liters`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === "ar" ? "إلغاء" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              {language === "ar" ? "حذف" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Inventory;
