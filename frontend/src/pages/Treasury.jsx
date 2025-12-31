import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API, useLanguage, useAuth } from "../App";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
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
import { Badge } from "../components/ui/badge";
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
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  TrendingUp, 
  TrendingDown,
  Plus,
  Calendar,
  DollarSign,
  PiggyBank,
  Receipt,
  ShoppingCart,
  Milk,
  Users,
  Pencil,
  Trash2
} from "lucide-react";

const Treasury = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [formData, setFormData] = useState({
    transaction_type: "deposit",
    amount: "",
    source_type: "other",
    description: "",
  });
  const [editFormData, setEditFormData] = useState({
    amount: "",
    description: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const [balanceRes, transactionsRes, summaryRes] = await Promise.all([
        axios.get(`${API}/api/treasury/balance`, { headers }),
        axios.get(`${API}/api/treasury/transactions?limit=50`, { headers }),
        axios.get(`${API}/api/reports/financial-summary`, { headers }),
      ]);
      
      setBalance(balanceRes.data);
      setTransactions(transactionsRes.data);
      setFinancialSummary(summaryRes.data);
    } catch (error) {
      console.error("Error fetching treasury data:", error);
      toast.error(language === "ar" ? "خطأ في جلب البيانات" : "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/api/treasury/transaction`,
        null,
        {
          params: formData,
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      toast.success(language === "ar" ? "تمت العملية بنجاح" : "Transaction successful");
      setDialogOpen(false);
      setFormData({
        transaction_type: "deposit",
        amount: "",
        source_type: "other",
        description: "",
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === "ar" ? "حدث خطأ" : "Error occurred"));
    }
  };

  // Edit transaction
  const handleEdit = (tx) => {
    setSelectedTransaction(tx);
    setEditFormData({
      amount: tx.amount,
      description: tx.description,
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/api/treasury/transaction/${selectedTransaction.id}`,
        null,
        {
          params: editFormData,
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      toast.success(language === "ar" ? "تم تعديل العملية بنجاح" : "Transaction updated");
      setEditDialogOpen(false);
      setSelectedTransaction(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === "ar" ? "حدث خطأ" : "Error occurred"));
    }
  };

  // Delete transaction
  const handleDelete = (tx) => {
    setSelectedTransaction(tx);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API}/api/treasury/transaction/${selectedTransaction.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(language === "ar" ? "تم حذف العملية بنجاح" : "Transaction deleted");
      setDeleteDialogOpen(false);
      setSelectedTransaction(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === "ar" ? "حدث خطأ" : "Error occurred"));
    }
  };

  const getSourceTypeLabel = (type) => {
    const labels = {
      milk_sale: language === "ar" ? "بيع حليب" : "Milk Sale",
      supplier_payment: language === "ar" ? "دفعة مورد" : "Supplier Payment",
      customer_receipt: language === "ar" ? "استلام عميل" : "Customer Receipt",
      expense: language === "ar" ? "مصروف" : "Expense",
      other: language === "ar" ? "أخرى" : "Other",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === "ar" ? "الخزينة والتقارير المالية" : "Treasury & Financial Reports"}
          </h1>
          <p className="text-muted-foreground">
            {language === "ar" ? "إدارة الخزينة والتقارير المالية المتكاملة" : "Integrated treasury and financial reports"}
          </p>
        </div>
        {user?.role === "admin" && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            {language === "ar" ? "عملية جديدة" : "New Transaction"}
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Treasury Balance */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">
                  {language === "ar" ? "رصيد الخزينة" : "Treasury Balance"}
                </p>
                <p className="text-3xl font-bold mt-2">
                  {balance?.current_balance?.toLocaleString() || 0}
                </p>
                <p className="text-blue-100 text-sm">{t("currency")}</p>
              </div>
              <PiggyBank className="w-12 h-12 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        {/* Total Sales */}
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">
                  {language === "ar" ? "إجمالي المبيعات" : "Total Sales"}
                </p>
                <p className="text-3xl font-bold mt-2">
                  {financialSummary?.sales?.total_amount?.toLocaleString() || 0}
                </p>
                <p className="text-green-100 text-sm">
                  {financialSummary?.sales?.total_liters?.toLocaleString() || 0} {language === "ar" ? "لتر" : "L"}
                </p>
              </div>
              <ShoppingCart className="w-12 h-12 text-green-200" />
            </div>
          </CardContent>
        </Card>

        {/* Total Purchases */}
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">
                  {language === "ar" ? "إجمالي المشتريات" : "Total Purchases"}
                </p>
                <p className="text-3xl font-bold mt-2">
                  {financialSummary?.purchases?.total_amount?.toLocaleString() || 0}
                </p>
                <p className="text-orange-100 text-sm">
                  {financialSummary?.purchases?.total_liters?.toLocaleString() || 0} {language === "ar" ? "لتر" : "L"}
                </p>
              </div>
              <Milk className="w-12 h-12 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        {/* Profit/Loss */}
        <Card className={`bg-gradient-to-br ${financialSummary?.profit_loss?.gross_profit >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'} text-white`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">
                  {language === "ar" ? "صافي الربح/الخسارة" : "Net Profit/Loss"}
                </p>
                <p className="text-3xl font-bold mt-2">
                  {financialSummary?.profit_loss?.gross_profit?.toLocaleString() || 0}
                </p>
                <p className="text-white/80 text-sm">
                  {financialSummary?.profit_loss?.profit_margin_percentage || 0}%
                </p>
              </div>
              {financialSummary?.profit_loss?.gross_profit >= 0 ? (
                <TrendingUp className="w-12 h-12 text-white/50" />
              ) : (
                <TrendingDown className="w-12 h-12 text-white/50" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balances Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Supplier Dues */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "مستحقات الموردين" : "Supplier Dues"}
                </p>
                <p className="text-xl font-bold text-red-600">
                  {financialSummary?.balances?.supplier_dues?.toLocaleString() || 0} {t("currency")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Receivables */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "ذمم العملاء" : "Customer Receivables"}
                </p>
                <p className="text-xl font-bold text-green-600">
                  {financialSummary?.balances?.customer_receivables?.toLocaleString() || 0} {t("currency")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Milk className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "المخزون الحالي" : "Current Inventory"}
                </p>
                <p className="text-xl font-bold text-blue-600">
                  {financialSummary?.balances?.inventory_liters?.toLocaleString() || 0} {language === "ar" ? "لتر" : "L"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>{language === "ar" ? "حركات الخزينة" : "Treasury Transactions"}</CardTitle>
          <CardDescription>
            {language === "ar" ? "آخر 50 حركة في الخزينة" : "Last 50 treasury transactions"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "ar" ? "التاريخ" : "Date"}</TableHead>
                  <TableHead>{language === "ar" ? "النوع" : "Type"}</TableHead>
                  <TableHead>{language === "ar" ? "المصدر" : "Source"}</TableHead>
                  <TableHead>{language === "ar" ? "المبلغ" : "Amount"}</TableHead>
                  <TableHead>{language === "ar" ? "الرصيد بعد" : "Balance After"}</TableHead>
                  <TableHead>{language === "ar" ? "الوصف" : "Description"}</TableHead>
                  <TableHead>{language === "ar" ? "بواسطة" : "By"}</TableHead>
                  {user?.role === "admin" && (
                    <TableHead className="text-center">{language === "ar" ? "إجراءات" : "Actions"}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={user?.role === "admin" ? 8 : 7} className="text-center py-8 text-muted-foreground">
                      {language === "ar" ? "لا توجد حركات" : "No transactions"}
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {new Date(tx.created_at).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}
                      </TableCell>
                      <TableCell>
                        <Badge className={tx.transaction_type === "deposit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {tx.transaction_type === "deposit" ? (
                            <><ArrowDownCircle className="w-3 h-3 mr-1" />{language === "ar" ? "إيداع" : "Deposit"}</>
                          ) : (
                            <><ArrowUpCircle className="w-3 h-3 mr-1" />{language === "ar" ? "سحب" : "Withdrawal"}</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>{getSourceTypeLabel(tx.source_type)}</TableCell>
                      <TableCell className={`font-bold ${tx.transaction_type === "deposit" ? "text-green-600" : "text-red-600"}`}>
                        {tx.transaction_type === "deposit" ? "+" : "-"}{tx.amount?.toLocaleString()} {t("currency")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {tx.balance_after?.toLocaleString()} {t("currency")}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>
                      <TableCell className="text-muted-foreground">{tx.created_by_name || "-"}</TableCell>
                      {user?.role === "admin" && (
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(tx)}
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(tx)}
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

      {/* Add Transaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "عملية خزينة جديدة" : "New Treasury Transaction"}</DialogTitle>
            <DialogDescription>
              {language === "ar" ? "إضافة إيداع أو سحب من الخزينة" : "Add deposit or withdrawal"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "نوع العملية" : "Transaction Type"}</Label>
              <Select
                value={formData.transaction_type}
                onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">{language === "ar" ? "إيداع" : "Deposit"}</SelectItem>
                  <SelectItem value="withdrawal">{language === "ar" ? "سحب" : "Withdrawal"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{language === "ar" ? "المبلغ" : "Amount"} ({t("currency")})</Label>
              <Input
                type="number"
                step="0.001"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{language === "ar" ? "مصدر العملية" : "Source Type"}</Label>
              <Select
                value={formData.source_type}
                onValueChange={(value) => setFormData({ ...formData, source_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="milk_sale">{language === "ar" ? "بيع حليب" : "Milk Sale"}</SelectItem>
                  <SelectItem value="supplier_payment">{language === "ar" ? "دفعة مورد" : "Supplier Payment"}</SelectItem>
                  <SelectItem value="customer_receipt">{language === "ar" ? "استلام عميل" : "Customer Receipt"}</SelectItem>
                  <SelectItem value="expense">{language === "ar" ? "مصروف" : "Expense"}</SelectItem>
                  <SelectItem value="other">{language === "ar" ? "أخرى" : "Other"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{language === "ar" ? "الوصف" : "Description"}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={language === "ar" ? "أدخل وصف العملية..." : "Enter description..."}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit">
                {language === "ar" ? "تأكيد" : "Confirm"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "تعديل العملية" : "Edit Transaction"}</DialogTitle>
            <DialogDescription>
              {language === "ar" ? "تعديل بيانات عملية الخزينة" : "Edit treasury transaction details"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "المبلغ" : "Amount"} ({t("currency")})</Label>
              <Input
                type="number"
                step="0.001"
                value={editFormData.amount}
                onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{language === "ar" ? "الوصف" : "Description"}</Label>
              <Textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder={language === "ar" ? "أدخل وصف العملية..." : "Enter description..."}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
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
                ? `هل أنت متأكد من حذف هذه العملية؟ سيتم عكس تأثيرها على رصيد الخزينة. المبلغ: ${selectedTransaction?.amount?.toLocaleString()} ر.ع`
                : `Are you sure you want to delete this transaction? Its effect on treasury balance will be reversed. Amount: ${selectedTransaction?.amount?.toLocaleString()} OMR`}
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

export default Treasury;
