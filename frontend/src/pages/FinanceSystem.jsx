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
  Building,
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
  CheckCircle,
  X,
  Download,
  FileSpreadsheet,
  Pencil,
  Trash2
} from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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

  // Bank Accounts - الحسابات البنكية
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankAccountDialogOpen, setBankAccountDialogOpen] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState(null);
  const [bankAccountForm, setBankAccountForm] = useState({
    account_number: "1112",
    bank_name: "",
    bank_account_number: "",
    iban: "",
    swift_code: "",
    branch_name: "",
    account_holder_name: "",
    currency: "OMR",
    opening_balance: 0,
    is_default: false,
    notes: ""
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

  const fetchBankAccounts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/finance/bank-accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBankAccounts(response.data);
    } catch (error) {
      console.log("Bank accounts error:", error);
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
    fetchBankAccounts();
  }, []);

  useEffect(() => {
    if (activeTab === "journal") fetchJournalEntries();
    if (activeTab === "assets") fetchFixedAssets();
    if (activeTab === "budgets") fetchBudgets();
    if (activeTab === "bank-accounts") fetchBankAccounts();
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

  // Bank Account CRUD functions
  const resetBankAccountForm = () => {
    setBankAccountForm({
      account_number: "1112",
      bank_name: "",
      bank_account_number: "",
      iban: "",
      swift_code: "",
      branch_name: "",
      account_holder_name: "",
      currency: "OMR",
      opening_balance: 0,
      is_default: false,
      notes: ""
    });
    setEditingBankAccount(null);
  };

  const handleOpenBankAccountDialog = (account = null) => {
    if (account) {
      setEditingBankAccount(account);
      setBankAccountForm({
        account_number: account.account_number || "1112",
        bank_name: account.bank_name || "",
        bank_account_number: account.bank_account_number || "",
        iban: account.iban || "",
        swift_code: account.swift_code || "",
        branch_name: account.branch_name || "",
        account_holder_name: account.account_holder_name || "",
        currency: account.currency || "OMR",
        opening_balance: account.opening_balance || 0,
        is_default: account.is_default || false,
        notes: account.notes || ""
      });
    } else {
      resetBankAccountForm();
    }
    setBankAccountDialogOpen(true);
  };

  const handleSaveBankAccount = async () => {
    if (!bankAccountForm.bank_name || !bankAccountForm.bank_account_number) {
      toast.error("يرجى ملء اسم البنك ورقم الحساب");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      if (editingBankAccount) {
        await axios.put(`${API}/finance/bank-accounts/${editingBankAccount.id}`, bankAccountForm, { headers });
        toast.success("تم تحديث الحساب البنكي بنجاح");
      } else {
        await axios.post(`${API}/finance/bank-accounts`, bankAccountForm, { headers });
        toast.success("تم إنشاء الحساب البنكي بنجاح");
      }
      
      setBankAccountDialogOpen(false);
      resetBankAccountForm();
      fetchBankAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBankAccount = async (accountId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الحساب البنكي؟")) return;
    
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/finance/bank-accounts/${accountId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("تم حذف الحساب البنكي");
      fetchBankAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل حذف الحساب");
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
  const formatCurrency = (amount) => `${(amount || 0).toLocaleString()} ${language === "ar" ? "ريال" : "OMR"}`;

  // ========== Export Functions ==========
  
  // Export Trial Balance to Excel
  const exportTrialBalanceToExcel = () => {
    if (!trialBalance) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    
    const data = [
      ["ميزان المراجعة", "", ""],
      ["التاريخ:", new Date().toLocaleDateString('ar-SA'), ""],
      ["", "", ""],
      ["الحساب", "المدين", "الدائن"],
      ...(trialBalance.accounts || []).map(acc => [
        acc.name || acc.account_name,
        acc.debit || 0,
        acc.credit || 0
      ]),
      ["", "", ""],
      ["الإجمالي", trialBalance.total_debit || 0, trialBalance.total_credit || 0],
      ["الحالة:", trialBalance.is_balanced ? "متوازن ✓" : "غير متوازن ✗", ""]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ميزان المراجعة");
    XLSX.writeFile(wb, `ميزان_المراجعة_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("تم تصدير ميزان المراجعة بنجاح");
  };

  // Export Income Statement to Excel
  const exportIncomeStatementToExcel = () => {
    if (!incomeStatement) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    
    const data = [
      ["قائمة الدخل", ""],
      ["التاريخ:", new Date().toLocaleDateString('ar-SA')],
      ["", ""],
      ["البند", "المبلغ"],
      ["", ""],
      ["الإيرادات:", ""],
      ...(incomeStatement.revenue_items || []).map(item => [item.name, item.amount || 0]),
      ["إجمالي الإيرادات", incomeStatement.total_revenue || 0],
      ["", ""],
      ["المصروفات:", ""],
      ...(incomeStatement.expense_items || []).map(item => [item.name, item.amount || 0]),
      ["إجمالي المصروفات", incomeStatement.total_expenses || 0],
      ["", ""],
      ["صافي الدخل", incomeStatement.net_income || 0]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "قائمة الدخل");
    XLSX.writeFile(wb, `قائمة_الدخل_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("تم تصدير قائمة الدخل بنجاح");
  };

  // Export Balance Sheet to Excel
  const exportBalanceSheetToExcel = () => {
    if (!balanceSheet) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    
    const data = [
      ["الميزانية العمومية", ""],
      ["كما في:", balanceSheet.as_of_date || new Date().toLocaleDateString('ar-SA')],
      ["", ""],
      ["البند", "المبلغ"],
      ["", ""],
      ["الأصول:", ""],
      ...(balanceSheet.assets || []).map(item => [item.name, item.balance || 0]),
      ["إجمالي الأصول", balanceSheet.total_assets || 0],
      ["", ""],
      ["الخصوم:", ""],
      ...(balanceSheet.liabilities || []).map(item => [item.name, item.balance || 0]),
      ["إجمالي الخصوم", balanceSheet.total_liabilities || 0],
      ["", ""],
      ["حقوق الملكية:", ""],
      ...(balanceSheet.equity || []).map(item => [item.name, item.balance || 0]),
      ["إجمالي حقوق الملكية", balanceSheet.total_equity || 0]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الميزانية العمومية");
    XLSX.writeFile(wb, `الميزانية_العمومية_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("تم تصدير الميزانية العمومية بنجاح");
  };

  // Export All Reports to Excel (combined workbook)
  const exportAllReportsToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Trial Balance Sheet
    if (trialBalance) {
      const tbData = [
        ["ميزان المراجعة"],
        ["الحساب", "المدين", "الدائن"],
        ...(trialBalance.accounts || []).map(acc => [acc.name || acc.account_name, acc.debit || 0, acc.credit || 0]),
        ["الإجمالي", trialBalance.total_debit || 0, trialBalance.total_credit || 0]
      ];
      const tbWs = XLSX.utils.aoa_to_sheet(tbData);
      XLSX.utils.book_append_sheet(wb, tbWs, "ميزان المراجعة");
    }
    
    // Income Statement Sheet
    if (incomeStatement) {
      const isData = [
        ["قائمة الدخل"],
        ["البند", "المبلغ"],
        ["إجمالي الإيرادات", incomeStatement.total_revenue || 0],
        ["إجمالي المصروفات", incomeStatement.total_expenses || 0],
        ["صافي الدخل", incomeStatement.net_income || 0]
      ];
      const isWs = XLSX.utils.aoa_to_sheet(isData);
      XLSX.utils.book_append_sheet(wb, isWs, "قائمة الدخل");
    }
    
    // Balance Sheet
    if (balanceSheet) {
      const bsData = [
        ["الميزانية العمومية"],
        ["البند", "المبلغ"],
        ["إجمالي الأصول", balanceSheet.total_assets || 0],
        ["إجمالي الخصوم", balanceSheet.total_liabilities || 0],
        ["حقوق الملكية", balanceSheet.total_equity || 0]
      ];
      const bsWs = XLSX.utils.aoa_to_sheet(bsData);
      XLSX.utils.book_append_sheet(wb, bsWs, "الميزانية العمومية");
    }
    
    XLSX.writeFile(wb, `التقارير_المالية_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("تم تصدير جميع التقارير بنجاح");
  };

  // Export to PDF
  const exportReportsToPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Add Arabic font support - use built-in font
    doc.setFont('helvetica');
    
    // Title
    doc.setFontSize(20);
    doc.text('Financial Reports - التقارير المالية', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
    
    let yPos = 45;
    
    // Trial Balance
    if (trialBalance) {
      doc.setFontSize(16);
      doc.text('Trial Balance - ميزان المراجعة', 14, yPos);
      yPos += 10;
      
      doc.autoTable({
        startY: yPos,
        head: [['Account', 'Debit', 'Credit']],
        body: [
          ...(trialBalance.accounts || []).slice(0, 10).map(acc => [
            acc.name || acc.account_name || '-',
            (acc.debit || 0).toLocaleString(),
            (acc.credit || 0).toLocaleString()
          ]),
          ['Total', (trialBalance.total_debit || 0).toLocaleString(), (trialBalance.total_credit || 0).toLocaleString()]
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 14, right: 14 }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    }
    
    // Income Statement
    if (incomeStatement && yPos < 200) {
      doc.setFontSize(16);
      doc.text('Income Statement - قائمة الدخل', 14, yPos);
      yPos += 10;
      
      doc.autoTable({
        startY: yPos,
        head: [['Item', 'Amount (OMR)']],
        body: [
          ['Total Revenue', (incomeStatement.total_revenue || 0).toLocaleString()],
          ['Total Expenses', (incomeStatement.total_expenses || 0).toLocaleString()],
          ['Net Income', (incomeStatement.net_income || 0).toLocaleString()]
        ],
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94] },
        margin: { left: 14, right: 14 }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    }
    
    // Balance Sheet
    if (balanceSheet && yPos < 230) {
      doc.setFontSize(16);
      doc.text('Balance Sheet - الميزانية العمومية', 14, yPos);
      yPos += 10;
      
      doc.autoTable({
        startY: yPos,
        head: [['Item', 'Amount (OMR)']],
        body: [
          ['Total Assets', (balanceSheet.total_assets || 0).toLocaleString()],
          ['Total Liabilities', (balanceSheet.total_liabilities || 0).toLocaleString()],
          ['Total Equity', (balanceSheet.total_equity || 0).toLocaleString()]
        ],
        theme: 'grid',
        headStyles: { fillColor: [168, 85, 247] },
        margin: { left: 14, right: 14 }
      });
    }
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Al Marooj Dairy - المروج للألبان | Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }
    
    doc.save(`Financial_Reports_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("تم تصدير التقارير بصيغة PDF بنجاح");
  };

  // Export Journal Entries to Excel
  const exportJournalEntriesToExcel = () => {
    if (!journalEntries || journalEntries.length === 0) {
      toast.error("لا توجد قيود للتصدير");
      return;
    }
    
    const data = [
      ["سجل القيود المحاسبية"],
      ["التاريخ:", new Date().toLocaleDateString('ar-SA')],
      [""],
      ["رقم القيد", "التاريخ", "الوصف", "المدين", "الدائن", "الحالة"],
      ...journalEntries.map(entry => [
        entry.entry_number || entry.id,
        entry.date?.split('T')[0] || '-',
        entry.description || '-',
        entry.total_debit || 0,
        entry.total_credit || 0,
        entry.status || 'draft'
      ])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "القيود المحاسبية");
    XLSX.writeFile(wb, `القيود_المحاسبية_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("تم تصدير القيود المحاسبية بنجاح");
  };

  // Export Chart of Accounts to Excel
  const exportAccountsToExcel = () => {
    if (!accounts || accounts.length === 0) {
      toast.error("لا توجد حسابات للتصدير");
      return;
    }
    
    const data = [
      ["دليل الحسابات"],
      ["التاريخ:", new Date().toLocaleDateString('ar-SA')],
      [""],
      ["رقم الحساب", "اسم الحساب", "النوع", "الرصيد", "الوصف"],
      ...accounts.map(acc => [
        acc.account_number || '-',
        acc.name || '-',
        getAccountTypeLabel(acc.account_type),
        acc.balance || 0,
        acc.description || '-'
      ])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "دليل الحسابات");
    XLSX.writeFile(wb, `دليل_الحسابات_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("تم تصدير دليل الحسابات بنجاح");
  };

  // ========== End Export Functions ==========

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
            {language === "ar" ? "النظام المالي" : "Finance System"}
          </h1>
          <p className="text-muted-foreground">
            {language === "ar" ? "إدارة الحسابات والقيود والتقارير المالية" : "Manage accounts, entries, and financial reports"}
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            <span className="hidden sm:inline">{language === "ar" ? "لوحة التحكم" : "Dashboard"}</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">{language === "ar" ? "شجرة الحسابات" : "Chart of Accounts"}</span>
          </TabsTrigger>
          <TabsTrigger value="journal" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">{language === "ar" ? "القيود" : "Journal"}</span>
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">{language === "ar" ? "الأصول" : "Assets"}</span>
          </TabsTrigger>
          <TabsTrigger value="budgets" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            <span className="hidden sm:inline">{language === "ar" ? "الميزانيات" : "Budgets"}</span>
          </TabsTrigger>
          <TabsTrigger value="bank-accounts" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            <span className="hidden sm:inline">{language === "ar" ? "الحسابات البنكية" : "Bank Accounts"}</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">{language === "ar" ? "التقارير" : "Reports"}</span>
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
                    <p className="text-sm text-muted-foreground">{language === "ar" ? "إجمالي الأصول" : "Total Assets"}</p>
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
                    <p className="text-sm text-muted-foreground">{language === "ar" ? "إجمالي الخصوم" : "Total Liabilities"}</p>
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
                    <p className="text-sm text-muted-foreground">{language === "ar" ? "إجمالي الإيرادات" : "Total Revenue"}</p>
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
                    <p className="text-sm text-muted-foreground">{language === "ar" ? "إجمالي المصروفات" : "Total Expenses"}</p>
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
                  {language === "ar" ? "الحسابات الدائنة" : "Accounts Payable"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-500">
                  {formatCurrency(dashboardData?.summary?.accounts_payable)}
                </p>
                <p className="text-sm text-muted-foreground">{language === "ar" ? "مستحقات للموردين" : "Dues to Suppliers"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  {language === "ar" ? "الحسابات المدينة" : "Accounts Receivable"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-500">
                  {formatCurrency(dashboardData?.summary?.accounts_receivable)}
                </p>
                <p className="text-sm text-muted-foreground">{language === "ar" ? "مستحقات من العملاء" : "Dues from Customers"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {language === "ar" ? "الأصول الثابتة" : "Fixed Assets"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-500">
                  {formatCurrency(dashboardData?.summary?.fixed_assets_value)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dashboardData?.summary?.fixed_assets_count || 0} {language === "ar" ? "أصل" : "assets"}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Chart of Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">{language === "ar" ? "شجرة الحسابات" : "Chart of Accounts"}</h2>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={exportAccountsToExcel}
                className="gap-2 bg-green-50 hover:bg-green-100 border-green-300"
                disabled={accounts.length === 0}
                data-testid="export-accounts-excel-btn"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                {language === "ar" ? "تصدير Excel" : "Export Excel"}
              </Button>
              {accounts.length === 0 && (
                <Button onClick={initializeAccounts} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 me-2 ${loading ? "animate-spin" : ""}`} />
                  {language === "ar" ? "تهيئة شجرة الحسابات" : "Initialize Accounts"}
                </Button>
              )}
              <Button onClick={() => setAccountDialogOpen(true)}>
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "إضافة حساب" : "Add Account"}
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "رقم الحساب" : "Account No."}</TableHead>
                    <TableHead>{language === "ar" ? "اسم الحساب" : "Account Name"}</TableHead>
                    <TableHead>{language === "ar" ? "النوع" : "Type"}</TableHead>
                    <TableHead>{language === "ar" ? "الرصيد" : "Balance"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? 'لا توجد حسابات - اضغط "تهيئة شجرة الحسابات" للبدء' : 'No accounts - Click "Initialize Accounts" to start'}
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
            <h2 className="text-lg font-bold">{language === "ar" ? "القيود اليومية" : "Journal Entries"}</h2>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={exportJournalEntriesToExcel}
                className="gap-2 bg-green-50 hover:bg-green-100 border-green-300"
                disabled={journalEntries.length === 0}
                data-testid="export-journal-excel-btn"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                {language === "ar" ? "تصدير Excel" : "Export Excel"}
              </Button>
              <Button onClick={() => setJournalDialogOpen(true)}>
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "قيد جديد" : "New Entry"}
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "رقم القيد" : "Entry No."}</TableHead>
                    <TableHead>{language === "ar" ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{language === "ar" ? "الوصف" : "Description"}</TableHead>
                    <TableHead>{language === "ar" ? "المدين" : "Debit"}</TableHead>
                    <TableHead>{language === "ar" ? "الدائن" : "Credit"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا توجد قيود يومية" : "No journal entries"}
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
                            {entry.status === "posted" ? (language === "ar" ? "مرحل" : "Posted") : (language === "ar" ? "مسودة" : "Draft")}
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
            <h2 className="text-lg font-bold">{language === "ar" ? "الأصول الثابتة" : "Fixed Assets"}</h2>
            <Button onClick={() => setAssetDialogOpen(true)}>
              <Plus className="w-4 h-4 me-2" />
              {language === "ar" ? "إضافة أصل" : "Add Asset"}
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "رقم الأصل" : "Asset No."}</TableHead>
                    <TableHead>{language === "ar" ? "الاسم" : "Name"}</TableHead>
                    <TableHead>{language === "ar" ? "التصنيف" : "Category"}</TableHead>
                    <TableHead>{language === "ar" ? "تكلفة الشراء" : "Purchase Cost"}</TableHead>
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

        {/* Bank Accounts Tab - الحسابات البنكية */}
        <TabsContent value="bank-accounts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  الحسابات البنكية
                </CardTitle>
                <p className="text-sm text-muted-foreground">إدارة الحسابات البنكية الرئيسية للشركة</p>
              </div>
              <Button onClick={() => handleOpenBankAccountDialog()} className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة حساب بنكي
              </Button>
            </CardHeader>
            <CardContent>
              {bankAccounts.length === 0 ? (
                <div className="text-center py-12">
                  <Building className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">لا توجد حسابات بنكية</p>
                  <p className="text-sm text-muted-foreground">اضغط على "إضافة حساب بنكي" لإنشاء حساب جديد</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bankAccounts.map((account) => (
                    <Card key={account.id} className={`relative ${account.is_default ? 'ring-2 ring-primary' : ''}`}>
                      {account.is_default && (
                        <Badge className="absolute top-2 left-2 bg-primary">افتراضي</Badge>
                      )}
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Building className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold">{account.bank_name}</p>
                              <p className="text-xs text-muted-foreground">{account.branch_name || 'الفرع الرئيسي'}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">رقم الحساب:</span>
                            <span className="font-mono">{account.bank_account_number}</span>
                          </div>
                          {account.iban && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">IBAN:</span>
                              <span className="font-mono text-xs">{account.iban}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">الرصيد:</span>
                            <span className="font-bold text-green-600">
                              {(account.current_balance || 0).toLocaleString()} {account.currency}
                            </span>
                          </div>
                          {account.account_holder_name && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">صاحب الحساب:</span>
                              <span>{account.account_holder_name}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 pt-2 border-t">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleOpenBankAccountDialog(account)}
                          >
                            <Pencil className="w-3 h-3 me-1" />
                            تعديل
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteBankAccount(account.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          {/* Export Buttons */}
          <div className="flex flex-wrap gap-3 justify-end">
            <Button 
              onClick={exportAllReportsToExcel} 
              variant="outline" 
              className="gap-2 bg-green-50 hover:bg-green-100 border-green-300"
              data-testid="export-all-excel-btn"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              <span>تصدير الكل Excel</span>
            </Button>
            <Button 
              onClick={exportReportsToPDF} 
              variant="outline" 
              className="gap-2 bg-red-50 hover:bg-red-100 border-red-300"
              data-testid="export-all-pdf-btn"
            >
              <Download className="w-4 h-4 text-red-600" />
              <span>تصدير PDF</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trial Balance */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    ميزان المراجعة
                  </CardTitle>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={exportTrialBalanceToExcel}
                    className="gap-1"
                    data-testid="export-trial-balance-btn"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </Button>
                </div>
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
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    قائمة الدخل
                  </CardTitle>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={exportIncomeStatementToExcel}
                    className="gap-1"
                    data-testid="export-income-statement-btn"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </Button>
                </div>
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
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    الميزانية العمومية
                  </CardTitle>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={exportBalanceSheetToExcel}
                    className="gap-1"
                    data-testid="export-balance-sheet-btn"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                  </Button>
                </div>
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

      {/* Create Journal Entry Dialog */}
      <JournalEntryDialog
        open={journalDialogOpen}
        onOpenChange={setJournalDialogOpen}
        accounts={accounts}
        onSuccess={() => {
          fetchJournalEntries();
          setJournalDialogOpen(false);
        }}
      />

      {/* Create Fixed Asset Dialog */}
      <FixedAssetDialog
        open={assetDialogOpen}
        onOpenChange={setAssetDialogOpen}
        onSuccess={() => {
          fetchFixedAssets();
          setAssetDialogOpen(false);
        }}
      />

      {/* Bank Account Dialog */}
      <Dialog open={bankAccountDialogOpen} onOpenChange={setBankAccountDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              {editingBankAccount ? "تعديل حساب بنكي" : "إضافة حساب بنكي جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>اسم البنك *</Label>
              <Input
                value={bankAccountForm.bank_name}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, bank_name: e.target.value })}
                placeholder="مثال: بنك مسقط"
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الحساب البنكي *</Label>
              <Input
                value={bankAccountForm.bank_account_number}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, bank_account_number: e.target.value })}
                placeholder="مثال: 0123456789"
              />
            </div>
            <div className="space-y-2">
              <Label>IBAN</Label>
              <Input
                value={bankAccountForm.iban}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, iban: e.target.value })}
                placeholder="مثال: OM12BANK0000001234567890"
              />
            </div>
            <div className="space-y-2">
              <Label>رمز SWIFT</Label>
              <Input
                value={bankAccountForm.swift_code}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, swift_code: e.target.value })}
                placeholder="مثال: BMSCOMAN"
              />
            </div>
            <div className="space-y-2">
              <Label>اسم الفرع</Label>
              <Input
                value={bankAccountForm.branch_name}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, branch_name: e.target.value })}
                placeholder="مثال: فرع صلالة"
              />
            </div>
            <div className="space-y-2">
              <Label>صاحب الحساب</Label>
              <Input
                value={bankAccountForm.account_holder_name}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, account_holder_name: e.target.value })}
                placeholder="مثال: شركة المروج للألبان"
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الحساب في النظام</Label>
              <Select
                value={bankAccountForm.account_number}
                onValueChange={(v) => setBankAccountForm({ ...bankAccountForm, account_number: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1111">1111 - الصندوق</SelectItem>
                  <SelectItem value="1112">1112 - البنك</SelectItem>
                  <SelectItem value="1113">1113 - بنك 2</SelectItem>
                  <SelectItem value="1114">1114 - بنك 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>العملة</Label>
              <Select
                value={bankAccountForm.currency}
                onValueChange={(v) => setBankAccountForm({ ...bankAccountForm, currency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OMR">ريال عماني (OMR)</SelectItem>
                  <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                  <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                  <SelectItem value="AED">درهم إماراتي (AED)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الرصيد الافتتاحي</Label>
              <Input
                type="number"
                step="0.001"
                value={bankAccountForm.opening_balance}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, opening_balance: parseFloat(e.target.value) || 0 })}
                placeholder="0.000"
              />
            </div>
            <div className="space-y-2 flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="is_default"
                checked={bankAccountForm.is_default}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, is_default: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="is_default" className="cursor-pointer">الحساب الافتراضي للتحويلات</Label>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={bankAccountForm.notes}
                onChange={(e) => setBankAccountForm({ ...bankAccountForm, notes: e.target.value })}
                placeholder="ملاحظات إضافية..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBankAccountDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveBankAccount} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : null}
              {editingBankAccount ? "حفظ التغييرات" : "إنشاء الحساب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Journal Entry Dialog Component
const JournalEntryDialog = ({ open, onOpenChange, accounts, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [lines, setLines] = useState([
    { account_id: "", account_number: "", account_name: "", debit: 0, credit: 0 }
  ]);

  const addLine = () => {
    setLines([...lines, { account_id: "", account_number: "", account_name: "", debit: 0, credit: 0 }]);
  };

  const removeLine = (index) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index, field, value) => {
    const newLines = [...lines];
    if (field === "account_id") {
      const account = accounts.find(a => a.id === value);
      if (account) {
        newLines[index] = {
          ...newLines[index],
          account_id: value,
          account_number: account.account_number,
          account_name: account.name
        };
      }
    } else {
      newLines[index][field] = field === "debit" || field === "credit" ? parseFloat(value) || 0 : value;
    }
    setLines(newLines);
  };

  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = async () => {
    if (!description || !isBalanced || lines.some(l => !l.account_id)) {
      toast.error("يرجى ملء جميع الحقول والتأكد من توازن القيد");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/finance/journal-entries`, {
        description,
        entry_date: entryDate,
        lines: lines.filter(l => l.account_id && (l.debit > 0 || l.credit > 0))
      });
      toast.success("تم إنشاء القيد بنجاح");
      setDescription("");
      setLines([{ account_id: "", account_number: "", account_name: "", debit: 0, credit: 0 }]);
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل إنشاء القيد");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>قيد يومية جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>التاريخ *</Label>
              <Input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف *</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="وصف القيد"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>بنود القيد</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="w-4 h-4 me-1" /> إضافة سطر
              </Button>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الحساب</TableHead>
                  <TableHead className="w-28">مدين</TableHead>
                  <TableHead className="w-28">دائن</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select
                        value={line.account_id}
                        onValueChange={(v) => updateLine(index, "account_id", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حساب" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.account_number} - {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={line.debit || ""}
                        onChange={(e) => updateLine(index, "debit", e.target.value)}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={line.credit || ""}
                        onChange={(e) => updateLine(index, "credit", e.target.value)}
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(index)}
                        disabled={lines.length <= 1}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>المجموع</TableCell>
                  <TableCell className={totalDebit !== totalCredit ? "text-red-500" : "text-green-600"}>
                    {totalDebit.toLocaleString()} ريال
                  </TableCell>
                  <TableCell className={totalDebit !== totalCredit ? "text-red-500" : "text-green-600"}>
                    {totalCredit.toLocaleString()} ريال
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {!isBalanced && totalDebit > 0 && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                القيد غير متوازن - الفرق: {Math.abs(totalDebit - totalCredit).toLocaleString()} ريال
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={loading || !isBalanced}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : null}
            إنشاء القيد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Fixed Asset Dialog Component
const FixedAssetDialog = ({ open, onOpenChange, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "equipment",
    purchase_date: new Date().toISOString().split("T")[0],
    purchase_cost: "",
    useful_life_years: 5,
    salvage_value: 0,
    location: "",
    notes: ""
  });

  const categories = [
    { value: "buildings", label: "مباني" },
    { value: "equipment", label: "معدات وآلات" },
    { value: "vehicles", label: "سيارات" },
    { value: "furniture", label: "أثاث وتجهيزات" },
    { value: "computers", label: "أجهزة كمبيوتر" },
    { value: "other", label: "أخرى" }
  ];

  const handleSubmit = async () => {
    if (!form.name || !form.purchase_cost) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/finance/fixed-assets`, {
        ...form,
        purchase_cost: parseFloat(form.purchase_cost),
        salvage_value: parseFloat(form.salvage_value) || 0
      });
      toast.success("تم إضافة الأصل بنجاح");
      setForm({
        name: "",
        category: "equipment",
        purchase_date: new Date().toISOString().split("T")[0],
        purchase_cost: "",
        useful_life_years: 5,
        salvage_value: 0,
        location: "",
        notes: ""
      });
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل إضافة الأصل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة أصل ثابت</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>اسم الأصل *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="مثال: شاحنة نقل الحليب"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>التصنيف</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>تاريخ الشراء</Label>
              <Input
                type="date"
                value={form.purchase_date}
                onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>تكلفة الشراء (ريال) *</Label>
              <Input
                type="number"
                value={form.purchase_cost}
                onChange={(e) => setForm({ ...form, purchase_cost: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>العمر الإنتاجي (سنوات)</Label>
              <Input
                type="number"
                value={form.useful_life_years}
                onChange={(e) => setForm({ ...form, useful_life_years: parseInt(e.target.value) || 5 })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>قيمة الخردة</Label>
              <Input
                type="number"
                value={form.salvage_value}
                onChange={(e) => setForm({ ...form, salvage_value: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>الموقع</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="مثال: مركز حجيف"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>ملاحظات</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="ملاحظات إضافية"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : null}
            إضافة الأصل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FinanceSystem;
