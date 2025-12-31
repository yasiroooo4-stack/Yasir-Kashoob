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
import { Plus, ShoppingCart, CreditCard, Banknote, CheckCircle, Clock } from "lucide-react";

const Sales = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: "",
    customer_name: "",
    quantity_liters: "",
    price_per_liter: "",
    sale_type: "cash",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [salesRes, customersRes] = await Promise.all([
        axios.get(`${API}/api/sales`),
        axios.get(`${API}/api/customers`),
      ]);
      setSales(salesRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerChange = (customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    setFormData({
      ...formData,
      customer_id: customerId,
      customer_name: customer?.name || "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        quantity_liters: parseFloat(formData.quantity_liters),
        price_per_liter: parseFloat(formData.price_per_liter),
      };

      await axios.post(`${API}/api/sales`, data);
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
      customer_id: "",
      customer_name: "",
      quantity_liters: "",
      price_per_liter: "",
      sale_type: "cash",
    });
  };

  const todaySales = sales.filter((s) =>
    s.sale_date?.startsWith(new Date().toISOString().split("T")[0])
  );
  const todayTotal = todaySales.reduce((sum, s) => sum + (s.quantity_liters || 0), 0);
  const todayValue = todaySales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const cashSales = todaySales.filter((s) => s.sale_type === "cash");
  const creditSales = todaySales.filter((s) => s.sale_type === "credit");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="sales-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("sales")}</h1>
          <p className="text-muted-foreground">
            {language === "ar" ? "تسجيل مبيعات الحليب للعملاء" : "Record milk sales to customers"}
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
          className="gradient-secondary text-white"
          data-testid="add-sale-btn"
        >
          <Plus className="w-4 h-4 me-2" />
          {t("add_sale")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todaySales.length}</p>
              <p className="text-sm text-muted-foreground">{t("sales")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
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
              <Banknote className="w-6 h-6 text-white" />
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
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {creditSales.reduce((sum, s) => sum + (s.total_amount || 0), 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">{t("credit")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("sales")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("sale_date")}</TableHead>
                  <TableHead>{t("customer")}</TableHead>
                  <TableHead>{t("quantity_liters")}</TableHead>
                  <TableHead>{t("price_per_liter")}</TableHead>
                  <TableHead>{t("total")}</TableHead>
                  <TableHead>{t("sale_type")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t("no_data")}
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((sale) => (
                    <TableRow key={sale.id} className="table-row-hover" data-testid={`sale-row-${sale.id}`}>
                      <TableCell>
                        {new Date(sale.sale_date).toLocaleDateString(
                          language === "ar" ? "ar-SA" : "en-US"
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{sale.customer_name}</TableCell>
                      <TableCell>{sale.quantity_liters?.toLocaleString()} {t("liters")}</TableCell>
                      <TableCell>{sale.price_per_liter} {t("currency")}</TableCell>
                      <TableCell className="font-medium">
                        {sale.total_amount?.toLocaleString()} {t("currency")}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            sale.sale_type === "cash"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {sale.sale_type === "cash" ? t("cash") : t("credit")}
                        </span>
                      </TableCell>
                      <TableCell>
                        {sale.is_paid ? (
                          <span className="badge-success flex items-center gap-1 w-fit">
                            <CheckCircle className="w-3 h-3" />
                            {t("is_paid")}
                          </span>
                        ) : (
                          <span className="badge-warning flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" />
                            {language === "ar" ? "غير مدفوع" : "Unpaid"}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("add_sale")}</DialogTitle>
            <DialogDescription>
              {language === "ar" ? "أدخل بيانات المبيعة" : "Enter sale details"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("customer")} *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={handleCustomerChange}
                >
                  <SelectTrigger data-testid="customer-select">
                    <SelectValue placeholder={t("customer")} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
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
                  data-testid="sale-quantity-input"
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
                  data-testid="sale-price-input"
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
              <div className="space-y-2">
                <Label>{t("sale_type")}</Label>
                <Select
                  value={formData.sale_type}
                  onValueChange={(value) => setFormData({ ...formData, sale_type: value })}
                >
                  <SelectTrigger data-testid="sale-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("cash")}</SelectItem>
                    <SelectItem value="credit">{t("credit")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="gradient-secondary text-white" data-testid="submit-sale-btn">
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sales;
