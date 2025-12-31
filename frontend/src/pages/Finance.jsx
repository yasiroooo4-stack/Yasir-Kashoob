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
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Badge } from "../components/ui/badge";
import { Plus, Wallet, ArrowUpCircle, ArrowDownCircle, CreditCard, Banknote, Building, Users, FileText, Download, Check, X, Clock } from "lucide-react";

const Finance = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [filterMode, setFilterMode] = useState("all"); // "all" or "supplier"
  const [selectedFilterSupplier, setSelectedFilterSupplier] = useState("");
  const [formData, setFormData] = useState({
    payment_type: "supplier_payment",
    related_id: "",
    related_name: "",
    amount: "",
    payment_method: "cash",
    bank_account: "",
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
      bank_account: item?.bank_account || "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        payment_type: formData.payment_type,
        related_id: formData.related_id,
        related_name: formData.related_name,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        notes: formData.notes,
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
      bank_account: "",
      notes: "",
    });
  };

  // Download payment receipt PDF
  const downloadReceipt = async (paymentId, supplierName) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/payments/${paymentId}/receipt`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt_${supplierName}_${paymentId.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(language === "ar" ? "تم تحميل الإيصال" : "Receipt downloaded");
    } catch (error) {
      toast.error(language === "ar" ? "فشل تحميل الإيصال" : "Failed to download receipt");
    }
  };

  const supplierPayments = payments.filter((p) => p.payment_type === "supplier_payment");
  const customerReceipts = payments.filter((p) => p.payment_type === "customer_receipt");
  const totalSupplierPayments = supplierPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalCustomerReceipts = customerReceipts.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Apply tab filter first
  let filteredPayments =
    activeTab === "all"
      ? payments
      : activeTab === "supplier"
      ? supplierPayments
      : customerReceipts;

  // Apply supplier filter if in supplier mode
  if (filterMode === "supplier" && selectedFilterSupplier) {
    filteredPayments = filteredPayments.filter(
      (p) => p.related_id === selectedFilterSupplier
    );
  }

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

      {/* Filter Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Label className="font-medium">{language === "ar" ? "تصفية حسب:" : "Filter by:"}</Label>
              <RadioGroup
                value={filterMode}
                onValueChange={(value) => {
                  setFilterMode(value);
                  if (value === "all") setSelectedFilterSupplier("");
                }}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <RadioGroupItem value="all" id="filter-all" data-testid="filter-all-radio" />
                  <Label htmlFor="filter-all" className="cursor-pointer">{t("select_all")}</Label>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <RadioGroupItem value="supplier" id="filter-supplier" data-testid="filter-supplier-radio" />
                  <Label htmlFor="filter-supplier" className="cursor-pointer">{t("select_supplier")}</Label>
                </div>
              </RadioGroup>
            </div>
            {filterMode === "supplier" && (
              <div className="flex-1 max-w-xs">
                <Select value={selectedFilterSupplier} onValueChange={setSelectedFilterSupplier}>
                  <SelectTrigger data-testid="filter-supplier-select">
                    <SelectValue placeholder={t("supplier")} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.supplier_code ? `(${s.supplier_code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
                  <TableHead className="text-center">{language === "ar" ? "إيصال" : "Receipt"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                      <TableCell className="text-center">
                        {payment.payment_type === "supplier_payment" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadReceipt(payment.id, payment.related_name)}
                            title={language === "ar" ? "تحميل الإيصال" : "Download Receipt"}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
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
                  setFormData({ ...formData, payment_type: value, related_id: "", related_name: "", bank_account: "" })
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
                        {item.name} {item.supplier_code ? `(${item.supplier_code})` : ""} - {t("balance")}: {item.balance?.toLocaleString()}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Bank Account Display for Suppliers */}
            {formData.payment_type === "supplier_payment" && formData.bank_account && (
              <div className="p-3 bg-muted rounded-lg">
                <Label className="text-sm text-muted-foreground">{t("bank_account")}</Label>
                <p className="font-medium text-foreground flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  {formData.bank_account}
                </p>
              </div>
            )}

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
