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
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Plus, Wallet, ArrowUpCircle, ArrowDownCircle, CreditCard, Banknote, Building } from "lucide-react";

const Finance = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [formData, setFormData] = useState({
    payment_type: "supplier_payment",
    related_id: "",
    related_name: "",
    amount: "",
    payment_method: "cash",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, suppliersRes, customersRes] = await Promise.all([
        axios.get(`${API}/payments`),
        axios.get(`${API}/suppliers`),
        axios.get(`${API}/customers`),
      ]);
      setPayments(paymentsRes.data);
      setSuppliers(suppliersRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleRelatedChange = (relatedId) => {
    const list = formData.payment_type === "supplier_payment" ? suppliers : customers;
    const item = list.find((i) => i.id === relatedId);
    setFormData({
      ...formData,
      related_id: relatedId,
      related_name: item?.name || "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      await axios.post(`${API}/payments`, data);
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
      payment_type: "supplier_payment",
      related_id: "",
      related_name: "",
      amount: "",
      payment_method: "cash",
      notes: "",
    });
  };

  const supplierPayments = payments.filter((p) => p.payment_type === "supplier_payment");
  const customerReceipts = payments.filter((p) => p.payment_type === "customer_receipt");
  const totalSupplierPayments = supplierPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalCustomerReceipts = customerReceipts.reduce((sum, p) => sum + (p.amount || 0), 0);

  const filteredPayments =
    activeTab === "all"
      ? payments
      : activeTab === "supplier"
      ? supplierPayments
      : customerReceipts;

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case "cash":
        return <Banknote className="w-4 h-4" />;
      case "bank_transfer":
        return <Building className="w-4 h-4" />;
      case "check":
        return <CreditCard className="w-4 h-4" />;
      default:
        return <Wallet className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="finance-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("finance")}</h1>
          <p className="text-muted-foreground">
            {language === "ar" ? "إدارة المدفوعات والمقبوضات" : "Manage payments and receipts"}
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
          className="gradient-primary text-white"
          data-testid="add-payment-btn"
        >
          <Plus className="w-4 h-4 me-2" />
          {t("add_payment")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{payments.length}</p>
              <p className="text-sm text-muted-foreground">{t("payments")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
              <ArrowUpCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalSupplierPayments.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{t("supplier_payment")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center">
              <ArrowDownCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCustomerReceipts.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{t("customer_receipt")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {(totalCustomerReceipts - totalSupplierPayments).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "صافي التدفق" : "Net Flow"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table with Tabs */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="all" data-testid="tab-all">
                {language === "ar" ? "الكل" : "All"}
              </TabsTrigger>
              <TabsTrigger value="supplier" data-testid="tab-supplier">
                {t("supplier_payment")}
              </TabsTrigger>
              <TabsTrigger value="customer" data-testid="tab-customer">
                {t("customer_receipt")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("payment_type")}</TableHead>
                  <TableHead>{language === "ar" ? "الاسم" : "Name"}</TableHead>
                  <TableHead>{t("amount")}</TableHead>
                  <TableHead>{t("payment_method")}</TableHead>
                  <TableHead>{t("notes")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t("no_data")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="table-row-hover" data-testid={`payment-row-${payment.id}`}>
                      <TableCell>
                        {new Date(payment.payment_date).toLocaleDateString(
                          language === "ar" ? "ar-SA" : "en-US"
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`flex items-center gap-1 w-fit px-2 py-1 rounded-full text-xs font-medium ${
                            payment.payment_type === "supplier_payment"
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {payment.payment_type === "supplier_payment" ? (
                            <ArrowUpCircle className="w-3 h-3" />
                          ) : (
                            <ArrowDownCircle className="w-3 h-3" />
                          )}
                          {payment.payment_type === "supplier_payment"
                            ? t("supplier_payment")
                            : t("customer_receipt")}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{payment.related_name}</TableCell>
                      <TableCell className="font-semibold">
                        {payment.amount?.toLocaleString()} {t("currency")}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          {getPaymentMethodIcon(payment.payment_method)}
                          {payment.payment_method === "cash"
                            ? t("cash")
                            : payment.payment_method === "bank_transfer"
                            ? t("bank_transfer")
                            : t("check")}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {payment.notes || "-"}
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
            <DialogTitle>{t("add_payment")}</DialogTitle>
            <DialogDescription>
              {language === "ar" ? "أدخل بيانات الدفعة" : "Enter payment details"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("payment_type")} *</Label>
              <Select
                value={formData.payment_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, payment_type: value, related_id: "", related_name: "" })
                }
              >
                <SelectTrigger data-testid="payment-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier_payment">{t("supplier_payment")}</SelectItem>
                  <SelectItem value="customer_receipt">{t("customer_receipt")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {formData.payment_type === "supplier_payment" ? t("supplier") : t("customer")} *
              </Label>
              <Select value={formData.related_id} onValueChange={handleRelatedChange}>
                <SelectTrigger data-testid="related-select">
                  <SelectValue
                    placeholder={
                      formData.payment_type === "supplier_payment" ? t("supplier") : t("customer")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(formData.payment_type === "supplier_payment" ? suppliers : customers).map(
                    (item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({t("balance")}: {item.balance?.toLocaleString()})
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">{t("amount")} *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  data-testid="payment-amount-input"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("payment_method")}</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger data-testid="payment-method-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t("cash")}</SelectItem>
                    <SelectItem value="bank_transfer">{t("bank_transfer")}</SelectItem>
                    <SelectItem value="check">{t("check")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t("notes")}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                data-testid="payment-notes-input"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="gradient-primary text-white" data-testid="submit-payment-btn">
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Finance;
