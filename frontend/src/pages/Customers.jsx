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
import { Plus, Pencil, Trash2, Search, ShoppingCart, Phone, MapPin } from "lucide-react";

const Customers = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    customer_type: "retail",
    credit_limit: "",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/api/customers`);
      setCustomers(response.data);
    } catch (error) {
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : 0,
      };

      if (selectedCustomer) {
        await axios.put(`${API}/api/customers/${selectedCustomer.id}`, data);
        toast.success(t("success"));
      } else {
        await axios.post(`${API}/api/customers`, data);
        toast.success(t("success"));
      }
      setDialogOpen(false);
      resetForm();
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/api/customers/${selectedCustomer.id}`);
      toast.success(t("success"));
      setDeleteDialogOpen(false);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const openEditDialog = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      customer_type: customer.customer_type,
      credit_limit: customer.credit_limit || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      address: "",
      customer_type: "retail",
      credit_limit: "",
    });
    setSelectedCustomer(null);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  const getCustomerTypeLabel = (type) => {
    const types = {
      retail: t("retail"),
      wholesale: t("wholesale"),
      factory: t("factory"),
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="customers-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("customers")}</h1>
          <p className="text-muted-foreground">
            {language === "ar" ? "إدارة العملاء والمشترين" : "Manage customers and buyers"}
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
          className="gradient-secondary text-white"
          data-testid="add-customer-btn"
        >
          <Plus className="w-4 h-4 me-2" />
          {t("add_customer")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{customers.length}</p>
              <p className="text-sm text-muted-foreground">{t("total_customers")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {customers.reduce((sum, c) => sum + (c.total_purchases || 0), 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">{t("total_purchases")} ({t("currency")})</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {customers.reduce((sum, c) => sum + (c.balance || 0), 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">{t("customer_dues")} ({t("currency")})</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">{t("customers")}</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-9"
                data-testid="search-customers"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("customer_name")}</TableHead>
                  <TableHead>{t("phone")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("address")}</TableHead>
                  <TableHead>{t("customer_type")}</TableHead>
                  <TableHead>{t("total_purchases")}</TableHead>
                  <TableHead>{t("balance")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t("no_data")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="table-row-hover" data-testid={`customer-row-${customer.id}`}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {customer.phone}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          {customer.address}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            customer.customer_type === "factory"
                              ? "bg-violet-100 text-violet-700"
                              : customer.customer_type === "wholesale"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {getCustomerTypeLabel(customer.customer_type)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(customer.total_purchases || 0).toLocaleString()} {t("currency")}
                      </TableCell>
                      <TableCell>
                        <span className={customer.balance > 0 ? "text-emerald-600 font-medium" : ""}>
                          {(customer.balance || 0).toLocaleString()} {t("currency")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(customer)}
                            data-testid={`edit-customer-${customer.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setDeleteDialogOpen(true);
                            }}
                            data-testid={`delete-customer-${customer.id}`}
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
              {selectedCustomer ? t("edit_customer") : t("add_customer")}
            </DialogTitle>
            <DialogDescription>
              {language === "ar" ? "أدخل بيانات العميل" : "Enter customer details"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("customer_name")} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="customer-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("phone")} *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  data-testid="customer-phone-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">{t("address")} *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                data-testid="customer-address-input"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("customer_type")}</Label>
                <Select
                  value={formData.customer_type}
                  onValueChange={(value) => setFormData({ ...formData, customer_type: value })}
                >
                  <SelectTrigger data-testid="customer-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">{t("retail")}</SelectItem>
                    <SelectItem value="wholesale">{t("wholesale")}</SelectItem>
                    <SelectItem value="factory">{t("factory")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="credit_limit">{t("credit_limit")}</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  step="0.01"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                  data-testid="customer-credit-limit-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="gradient-secondary text-white" data-testid="submit-customer-btn">
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
                ? `هل أنت متأكد من حذف العميل "${selectedCustomer?.name}"؟`
                : `Are you sure you want to delete customer "${selectedCustomer?.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-customer-btn"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Customers;
