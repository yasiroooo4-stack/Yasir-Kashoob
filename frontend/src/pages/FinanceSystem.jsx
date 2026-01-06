import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API, useLanguage } from "../App";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
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
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { 
  BookOpen, 
  Building2, 
  Calculator, 
  CreditCard, 
  DollarSign,
  FileText,
  Landmark,
  PieChart,
  Plus,
  Receipt,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
  BarChart3,
  AlertCircle,
  CheckCircle
} from "lucide-react";

const FinanceSystem = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);

  // Dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  
  // Chart of Accounts
  const [accounts, setAccounts] = useState([]);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({
    account_number: "",
    name: "",
    account_type: "asset",
    description: ""
  });

  // Journal Entries
  const [journalEntries, setJournalEntries] = useState([]);
  const [journalDialogOpen, setJournalDialogOpen] = useState(false);
  
  // Fixed Assets
  const [fixedAssets, setFixedAssets] = useState([]);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  
  // Budgets
  const [budgets, setBudgets] = useState([]);
  
  // Reports
  const [trialBalance, setTrialBalance] = useState(null);
  const [incomeStatement, setIncomeStatement] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);

  // Fetch functions
  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/finance/dashboard`);
      setDashboardData(response.data);
    } catch (error) {
      console.log("Dashboard error:", error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API}/finance/accounts`);
      setAccounts(response.data);
    } catch (error) {
      console.log("Accounts error:", error);
    }
  };

  const fetchJournalEntries = async () => {
    try {
      const response = await axios.get(`${API}/finance/journal-entries`);
      setJournalEntries(response.data);
    } catch (error) {
      console.log("Journal entries error:", error);
    }
  };

  const fetchFixedAssets = async () => {
    try {
      const response = await axios.get(`${API}/finance/fixed-assets`);
      setFixedAssets(response.data);
    } catch (error) {
      console.log("Fixed assets error:", error);
    }
  };

  const fetchBudgets = async () => {
    try {
      const response = await axios.get(`${API}/finance/budgets`);
      setBudgets(response.data);
    } catch (error) {
      console.log("Budgets error:", error);
    }
  };

  const fetchTrialBalance = async () => {
    try {
      const response = await axios.get(`${API}/finance/reports/trial-balance`);
      setTrialBalance(response.data);
    } catch (error) {
      console.log("Trial balance error:", error);
    }
  };

  const fetchIncomeStatement = async () => {
    try {
      const response = await axios.get(`${API}/finance/reports/income-statement`);
      setIncomeStatement(response.data);
    } catch (error) {
      console.log("Income statement error:", error);
    }
  };

  const fetchBalanceSheet = async () => {
    try {
      const response = await axios.get(`${API}/finance/reports/balance-sheet`);
      setBalanceSheet(response.data);
    } catch (error) {
      console.log("Balance sheet error:", error);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (activeTab === "journal") fetchJournalEntries();
    if (activeTab === "assets") fetchFixedAssets();
    if (activeTab === "budgets") fetchBudgets();
    if (activeTab === "reports") {
      fetchTrialBalance();
      fetchIncomeStatement();
      fetchBalanceSheet();
    }
  }, [activeTab]);

  // Initialize chart of accounts
  const initializeAccounts = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/finance/accounts/initialize`);
      toast.success(response.data.message);
      fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل تهيئة شجرة الحسابات");
    } finally {
      setLoading(false);
    }
  };

  // Create account
  const handleCreateAccount = async () => {
    if (!accountForm.account_number || !accountForm.name) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/finance/accounts`, accountForm);
      toast.success("تم إنشاء الحساب بنجاح");
      setAccountDialogOpen(false);
      setAccountForm({ account_number: "", name: "", account_type: "asset", description: "" });
      fetchAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل إنشاء الحساب");
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => `${(amount || 0).toLocaleString()} ريال`;

  // Account type labels
  const getAccountTypeLabel = (type) => {
    const types = {
      asset: "أصول",
      liability: "خصوم",
      equity: "حقوق ملكية",
      revenue: "إيرادات",
      expense: "مصروفات"
    };
    return types[type] || type;
  };

  const getAccountTypeColor = (type) => {
    const colors = {
      asset: "bg-blue-100 text-blue-700",
      liability: "bg-red-100 text-red-700",
      equity: "bg-purple-100 text-purple-700",
      revenue: "bg-green-100 text-green-700",
      expense: "bg-orange-100 text-orange-700"
    };
    return colors[type] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6" data-testid="finance-system-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Landmark className="w-7 h-7 text-primary" />
            النظام المالي
          </h1>
          <p className="text-muted-foreground">
            إدارة الحسابات والقيود والتقارير المالية
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            <span className="hidden sm:inline">لوحة التحكم</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">شجرة الحسابات</span>
          </TabsTrigger>
          <TabsTrigger value="journal" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">القيود</span>
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">الأصول</span>
          </TabsTrigger>
          <TabsTrigger value="budgets" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            <span className="hidden sm:inline">الميزانيات</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">التقارير</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="stat-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(dashboardData?.summary?.total_assets)}</p>
                    <p className="text-sm text-muted-foreground">إجمالي الأصول</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(dashboardData?.summary?.total_liabilities)}</p>
                    <p className="text-sm text-muted-foreground">إجمالي الخصوم</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(dashboardData?.summary?.total_revenue)}</p>
                    <p className="text-sm text-muted-foreground">إجمالي الإيرادات</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="stat-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(dashboardData?.summary?.total_expenses)}</p>
                    <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  الحسابات الدائنة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-500">
                  {formatCurrency(dashboardData?.summary?.accounts_payable)}
                </p>
                <p className="text-sm text-muted-foreground">مستحقات للموردين</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  الحسابات المدينة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-500">
                  {formatCurrency(dashboardData?.summary?.accounts_receivable)}
                </p>
                <p className="text-sm text-muted-foreground">مستحقات من العملاء</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  الأصول الثابتة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-500">
                  {formatCurrency(dashboardData?.summary?.fixed_assets_value)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dashboardData?.summary?.fixed_assets_count || 0} أصل
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Chart of Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">شجرة الحسابات</h2>
            <div className="flex gap-2">
              {accounts.length === 0 && (
                <Button onClick={initializeAccounts} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 me-2 ${loading ? "animate-spin" : ""}`} />
                  تهيئة شجرة الحسابات
                </Button>
              )}
              <Button onClick={() => setAccountDialogOpen(true)}>
                <Plus className="w-4 h-4 me-2" />
                إضافة حساب
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الحساب</TableHead>
                    <TableHead>اسم الحساب</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الرصيد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        لا توجد حسابات - اضغط "تهيئة شجرة الحسابات" للبدء
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-mono">{account.account_number}</TableCell>
                        <TableCell className="font-medium">{account.name}</TableCell>
                        <TableCell>
                          <Badge className={getAccountTypeColor(account.account_type)}>
                            {getAccountTypeLabel(account.account_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className={account.balance >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(Math.abs(account.balance))}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Journal Entries Tab */}
        <TabsContent value="journal" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">القيود اليومية</h2>
            <Button onClick={() => setJournalDialogOpen(true)}>
              <Plus className="w-4 h-4 me-2" />
              قيد جديد
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم القيد</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>المدين</TableHead>
                    <TableHead>الدائن</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        لا توجد قيود يومية
                      </TableCell>
                    </TableRow>
                  ) : (
                    journalEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono">{entry.entry_number}</TableCell>
                        <TableCell>{entry.entry_date}</TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell>{formatCurrency(entry.total_debit)}</TableCell>
                        <TableCell>{formatCurrency(entry.total_credit)}</TableCell>
                        <TableCell>
                          <Badge variant={entry.status === "posted" ? "default" : "secondary"}>
                            {entry.status === "posted" ? "مرحل" : "مسودة"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fixed Assets Tab */}
        <TabsContent value="assets" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">الأصول الثابتة</h2>
            <Button onClick={() => setAssetDialogOpen(true)}>
              <Plus className="w-4 h-4 me-2" />
              إضافة أصل
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الأصل</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>التصنيف</TableHead>
                    <TableHead>تكلفة الشراء</TableHead>
                    <TableHead>الإهلاك المتراكم</TableHead>
                    <TableHead>القيمة الحالية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fixedAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        لا توجد أصول ثابتة
                      </TableCell>
                    </TableRow>
                  ) : (
                    fixedAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-mono">{asset.asset_number}</TableCell>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell>{asset.category}</TableCell>
                        <TableCell>{formatCurrency(asset.purchase_cost)}</TableCell>
                        <TableCell className="text-red-500">{formatCurrency(asset.accumulated_depreciation)}</TableCell>
                        <TableCell className="text-green-600 font-bold">{formatCurrency(asset.current_value)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budgets Tab */}
        <TabsContent value="budgets" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">الميزانيات</h2>
            <Button>
              <Plus className="w-4 h-4 me-2" />
              ميزانية جديدة
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم الميزانية</TableHead>
                    <TableHead>السنة المالية</TableHead>
                    <TableHead>المبلغ المخطط</TableHead>
                    <TableHead>المبلغ الفعلي</TableHead>
                    <TableHead>الفرق</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        لا توجد ميزانيات
                      </TableCell>
                    </TableRow>
                  ) : (
                    budgets.map((budget) => (
                      <TableRow key={budget.id}>
                        <TableCell className="font-medium">{budget.name}</TableCell>
                        <TableCell>{budget.fiscal_year}</TableCell>
                        <TableCell>{formatCurrency(budget.total_budgeted)}</TableCell>
                        <TableCell>{formatCurrency(budget.total_actual)}</TableCell>
                        <TableCell className={budget.total_budgeted - budget.total_actual >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(budget.total_budgeted - budget.total_actual)}
                        </TableCell>
                        <TableCell>
                          <Badge>{budget.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trial Balance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  ميزان المراجعة
                </CardTitle>
                <CardDescription>
                  {trialBalance?.is_balanced ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      متوازن
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      غير متوازن
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">إجمالي المدين</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(trialBalance?.total_debit)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">إجمالي الدائن</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(trialBalance?.total_credit)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Income Statement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  قائمة الدخل
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-2xl font-bold text-green-600">
                      {formatCurrency(incomeStatement?.total_revenue)}
                    </span>
                    <span className="text-sm text-muted-foreground">إجمالي الإيرادات</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="text-2xl font-bold text-orange-600">
                      {formatCurrency(incomeStatement?.total_expenses)}
                    </span>
                    <span className="text-sm text-muted-foreground">إجمالي المصروفات</span>
                  </div>
                  <div className={`flex justify-between items-center p-3 rounded-lg ${
                    (incomeStatement?.net_income || 0) >= 0 ? "bg-green-100" : "bg-red-100"
                  }`}>
                    <span className={`text-2xl font-bold ${
                      (incomeStatement?.net_income || 0) >= 0 ? "text-green-700" : "text-red-700"
                    }`}>
                      {formatCurrency(incomeStatement?.net_income)}
                    </span>
                    <span className="text-sm font-medium">صافي الدخل</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Balance Sheet */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  الميزانية العمومية
                </CardTitle>
                <CardDescription>
                  كما في {balanceSheet?.as_of_date}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">إجمالي الأصول</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(balanceSheet?.total_assets)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">إجمالي الخصوم</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(balanceSheet?.total_liabilities)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">حقوق الملكية</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(balanceSheet?.total_equity)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Account Dialog */}
      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة حساب جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>رقم الحساب *</Label>
              <Input
                value={accountForm.account_number}
                onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                placeholder="مثال: 1111"
              />
            </div>
            <div className="space-y-2">
              <Label>اسم الحساب *</Label>
              <Input
                value={accountForm.name}
                onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                placeholder="مثال: الصندوق"
              />
            </div>
            <div className="space-y-2">
              <Label>نوع الحساب</Label>
              <Select
                value={accountForm.account_type}
                onValueChange={(v) => setAccountForm({ ...accountForm, account_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset">أصول</SelectItem>
                  <SelectItem value="liability">خصوم</SelectItem>
                  <SelectItem value="equity">حقوق ملكية</SelectItem>
                  <SelectItem value="revenue">إيرادات</SelectItem>
                  <SelectItem value="expense">مصروفات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea
                value={accountForm.description}
                onChange={(e) => setAccountForm({ ...accountForm, description: e.target.value })}
                placeholder="وصف اختياري للحساب"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreateAccount} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : null}
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanceSystem;
