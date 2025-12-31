import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API, useLanguage } from "../App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users,
  Milk,
  DollarSign,
  ShoppingCart,
  Calendar,
  Download,
  RefreshCw,
  PiggyBank,
  Package,
  UserCheck,
  UserX,
  Clock
} from "lucide-react";

const Analytics = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  // Data states
  const [financialSummary, setFinancialSummary] = useState(null);
  const [milkReceptions, setMilkReceptions] = useState([]);
  const [sales, setSales] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const [
        summaryRes,
        receptionsRes,
        salesRes,
        suppliersRes,
        customersRes,
        employeesRes,
        attendanceRes,
        paymentsRes
      ] = await Promise.all([
        axios.get(`${API}/api/reports/financial-summary?start_date=${dateRange.start}&end_date=${dateRange.end}`, { headers }),
        axios.get(`${API}/api/milk-receptions`, { headers }),
        axios.get(`${API}/api/sales`, { headers }),
        axios.get(`${API}/api/suppliers`, { headers }),
        axios.get(`${API}/api/customers`, { headers }),
        axios.get(`${API}/api/hr/employees`, { headers }),
        axios.get(`${API}/api/hr/attendance?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`, { headers }),
        axios.get(`${API}/api/payments`, { headers }),
      ]);
      
      setFinancialSummary(summaryRes.data);
      setMilkReceptions(receptionsRes.data || []);
      setSales(salesRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setCustomers(customersRes.data || []);
      setEmployees(employeesRes.data || []);
      setAttendance(attendanceRes.data || []);
      setPayments(paymentsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error(language === "ar" ? "خطأ في جلب البيانات" : "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  // Calculate analytics
  const getSupplierAnalytics = () => {
    const activeSuppliers = suppliers.filter(s => s.is_active);
    const totalBalance = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);
    
    // Group receptions by supplier
    const supplierReceptions = {};
    milkReceptions.forEach(r => {
      if (!supplierReceptions[r.supplier_id]) {
        supplierReceptions[r.supplier_id] = { count: 0, quantity: 0, amount: 0, name: r.supplier_name };
      }
      supplierReceptions[r.supplier_id].count++;
      supplierReceptions[r.supplier_id].quantity += r.quantity_liters || 0;
      supplierReceptions[r.supplier_id].amount += r.total_amount || 0;
    });
    
    const topSuppliers = Object.entries(supplierReceptions)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
    
    return { activeSuppliers: activeSuppliers.length, totalBalance, topSuppliers };
  };

  const getCustomerAnalytics = () => {
    const activeCustomers = customers.filter(c => c.is_active);
    const totalReceivables = customers.reduce((sum, c) => sum + (c.balance || 0), 0);
    
    // Group sales by customer
    const customerSales = {};
    sales.forEach(s => {
      if (!customerSales[s.customer_id]) {
        customerSales[s.customer_id] = { count: 0, quantity: 0, amount: 0, name: s.customer_name };
      }
      customerSales[s.customer_id].count++;
      customerSales[s.customer_id].quantity += s.quantity_liters || 0;
      customerSales[s.customer_id].amount += s.total_amount || 0;
    });
    
    const topCustomers = Object.entries(customerSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    
    return { activeCustomers: activeCustomers.length, totalReceivables, topCustomers };
  };

  const getEmployeeAnalytics = () => {
    const activeEmployees = employees.filter(e => e.is_active);
    const byDepartment = {};
    employees.forEach(e => {
      const dept = e.department || 'غير محدد';
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;
    });
    
    // Attendance analysis
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;
    const leaveCount = attendance.filter(a => a.status === 'leave').length;
    
    return { 
      total: employees.length,
      active: activeEmployees.length,
      byDepartment,
      attendance: { present: presentCount, absent: absentCount, leave: leaveCount }
    };
  };

  const getMilkAnalytics = () => {
    // Daily analysis
    const dailyReceptions = {};
    milkReceptions.forEach(r => {
      const date = r.reception_date?.split('T')[0];
      if (date) {
        if (!dailyReceptions[date]) {
          dailyReceptions[date] = { quantity: 0, amount: 0, count: 0 };
        }
        dailyReceptions[date].quantity += r.quantity_liters || 0;
        dailyReceptions[date].amount += r.total_amount || 0;
        dailyReceptions[date].count++;
      }
    });
    
    // Calculate averages
    const totalQuantity = milkReceptions.reduce((sum, r) => sum + (r.quantity_liters || 0), 0);
    const totalAmount = milkReceptions.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const avgPricePerLiter = totalQuantity > 0 ? totalAmount / totalQuantity : 0;
    
    return {
      totalQuantity,
      totalAmount,
      avgPricePerLiter,
      transactionCount: milkReceptions.length,
      dailyReceptions: Object.entries(dailyReceptions)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10)
    };
  };

  const getSalesAnalytics = () => {
    // Daily analysis
    const dailySales = {};
    sales.forEach(s => {
      const date = s.sale_date?.split('T')[0];
      if (date) {
        if (!dailySales[date]) {
          dailySales[date] = { quantity: 0, amount: 0, count: 0 };
        }
        dailySales[date].quantity += s.quantity_liters || 0;
        dailySales[date].amount += s.total_amount || 0;
        dailySales[date].count++;
      }
    });
    
    const totalQuantity = sales.reduce((sum, s) => sum + (s.quantity_liters || 0), 0);
    const totalAmount = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const avgPricePerLiter = totalQuantity > 0 ? totalAmount / totalQuantity : 0;
    
    return {
      totalQuantity,
      totalAmount,
      avgPricePerLiter,
      transactionCount: sales.length,
      dailySales: Object.entries(dailySales)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10)
    };
  };

  const getPaymentAnalytics = () => {
    const supplierPayments = payments.filter(p => p.payment_type === 'supplier_payment' && p.status === 'approved');
    const customerReceipts = payments.filter(p => p.payment_type === 'customer_receipt' && p.status === 'approved');
    const pendingPayments = payments.filter(p => p.status === 'pending');
    
    return {
      supplierPayments: {
        count: supplierPayments.length,
        total: supplierPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      },
      customerReceipts: {
        count: customerReceipts.length,
        total: customerReceipts.reduce((sum, p) => sum + (p.amount || 0), 0)
      },
      pending: {
        count: pendingPayments.length,
        total: pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      }
    };
  };

  const supplierAnalytics = getSupplierAnalytics();
  const customerAnalytics = getCustomerAnalytics();
  const employeeAnalytics = getEmployeeAnalytics();
  const milkAnalytics = getMilkAnalytics();
  const salesAnalytics = getSalesAnalytics();
  const paymentAnalytics = getPaymentAnalytics();

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
            {language === "ar" ? "التحليلات والتقارير" : "Analytics & Reports"}
          </h1>
          <p className="text-muted-foreground">
            {language === "ar" ? "تحليل شامل لبيانات النظام" : "Comprehensive system data analysis"}
          </p>
        </div>
        <Button onClick={fetchAllData} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          {language === "ar" ? "تحديث" : "Refresh"}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="overview">{language === "ar" ? "نظرة عامة" : "Overview"}</TabsTrigger>
          <TabsTrigger value="milk">{language === "ar" ? "الحليب" : "Milk"}</TabsTrigger>
          <TabsTrigger value="sales">{language === "ar" ? "المبيعات" : "Sales"}</TabsTrigger>
          <TabsTrigger value="suppliers">{language === "ar" ? "الموردين" : "Suppliers"}</TabsTrigger>
          <TabsTrigger value="hr">{language === "ar" ? "الموارد البشرية" : "HR"}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">{language === "ar" ? "رصيد الخزينة" : "Treasury"}</p>
                    <p className="text-2xl font-bold mt-1">
                      {financialSummary?.balances?.treasury_balance?.toLocaleString() || 0}
                    </p>
                    <p className="text-blue-100 text-xs">{t("currency")}</p>
                  </div>
                  <PiggyBank className="w-10 h-10 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">{language === "ar" ? "إجمالي المبيعات" : "Total Sales"}</p>
                    <p className="text-2xl font-bold mt-1">
                      {salesAnalytics.totalAmount?.toLocaleString() || 0}
                    </p>
                    <p className="text-green-100 text-xs">{salesAnalytics.totalQuantity?.toLocaleString()} {language === "ar" ? "لتر" : "L"}</p>
                  </div>
                  <ShoppingCart className="w-10 h-10 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">{language === "ar" ? "إجمالي المشتريات" : "Purchases"}</p>
                    <p className="text-2xl font-bold mt-1">
                      {milkAnalytics.totalAmount?.toLocaleString() || 0}
                    </p>
                    <p className="text-orange-100 text-xs">{milkAnalytics.totalQuantity?.toLocaleString()} {language === "ar" ? "لتر" : "L"}</p>
                  </div>
                  <Milk className="w-10 h-10 text-orange-200" />
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-gradient-to-br ${(salesAnalytics.totalAmount - milkAnalytics.totalAmount) >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'} text-white`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">{language === "ar" ? "صافي الربح" : "Net Profit"}</p>
                    <p className="text-2xl font-bold mt-1">
                      {(salesAnalytics.totalAmount - milkAnalytics.totalAmount)?.toLocaleString() || 0}
                    </p>
                    <p className="text-white/80 text-xs">{t("currency")}</p>
                  </div>
                  {(salesAnalytics.totalAmount - milkAnalytics.totalAmount) >= 0 ? (
                    <TrendingUp className="w-10 h-10 text-white/50" />
                  ) : (
                    <TrendingDown className="w-10 h-10 text-white/50" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold">{supplierAnalytics.activeSuppliers}</p>
                <p className="text-xs text-muted-foreground">{language === "ar" ? "مورد نشط" : "Active Suppliers"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <ShoppingCart className="w-8 h-8 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold">{customerAnalytics.activeCustomers}</p>
                <p className="text-xs text-muted-foreground">{language === "ar" ? "عميل نشط" : "Active Customers"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <UserCheck className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                <p className="text-2xl font-bold">{employeeAnalytics.active}</p>
                <p className="text-xs text-muted-foreground">{language === "ar" ? "موظف" : "Employees"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Package className="w-8 h-8 mx-auto text-cyan-500 mb-2" />
                <p className="text-2xl font-bold">{financialSummary?.balances?.inventory_liters?.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">{language === "ar" ? "لتر مخزون" : "Liters Stock"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="w-8 h-8 mx-auto text-red-500 mb-2" />
                <p className="text-2xl font-bold">{supplierAnalytics.totalBalance?.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">{language === "ar" ? "مستحقات موردين" : "Supplier Dues"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                <p className="text-2xl font-bold">{paymentAnalytics.pending.count}</p>
                <p className="text-xs text-muted-foreground">{language === "ar" ? "دفعات معلقة" : "Pending Payments"}</p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {language === "ar" ? "دفعات الموردين" : "Supplier Payments"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">
                  {paymentAnalytics.supplierPayments.total?.toLocaleString()} {t("currency")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {paymentAnalytics.supplierPayments.count} {language === "ar" ? "عملية" : "transactions"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {language === "ar" ? "استلامات العملاء" : "Customer Receipts"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">
                  {paymentAnalytics.customerReceipts.total?.toLocaleString()} {t("currency")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {paymentAnalytics.customerReceipts.count} {language === "ar" ? "عملية" : "transactions"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {language === "ar" ? "صافي التدفق النقدي" : "Net Cash Flow"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${(paymentAnalytics.customerReceipts.total - paymentAnalytics.supplierPayments.total) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(paymentAnalytics.customerReceipts.total - paymentAnalytics.supplierPayments.total)?.toLocaleString()} {t("currency")}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Milk Tab */}
        <TabsContent value="milk" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{language === "ar" ? "إجمالي الكمية" : "Total Quantity"}</p>
                <p className="text-2xl font-bold">{milkAnalytics.totalQuantity?.toLocaleString()} {language === "ar" ? "لتر" : "L"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{language === "ar" ? "إجمالي المبلغ" : "Total Amount"}</p>
                <p className="text-2xl font-bold">{milkAnalytics.totalAmount?.toLocaleString()} {t("currency")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{language === "ar" ? "متوسط السعر/لتر" : "Avg Price/Liter"}</p>
                <p className="text-2xl font-bold">{milkAnalytics.avgPricePerLiter?.toFixed(3)} {t("currency")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{language === "ar" ? "عدد العمليات" : "Transactions"}</p>
                <p className="text-2xl font-bold">{milkAnalytics.transactionCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "آخر استلامات الحليب" : "Recent Milk Receptions"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{language === "ar" ? "عدد العمليات" : "Transactions"}</TableHead>
                    <TableHead>{language === "ar" ? "الكمية (لتر)" : "Quantity (L)"}</TableHead>
                    <TableHead>{language === "ar" ? "المبلغ" : "Amount"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {milkAnalytics.dailyReceptions.map((day, i) => (
                    <TableRow key={i}>
                      <TableCell>{new Date(day.date).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}</TableCell>
                      <TableCell>{day.count}</TableCell>
                      <TableCell className="font-medium">{day.quantity?.toLocaleString()}</TableCell>
                      <TableCell>{day.amount?.toLocaleString()} {t("currency")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{language === "ar" ? "إجمالي الكمية المباعة" : "Total Quantity Sold"}</p>
                <p className="text-2xl font-bold">{salesAnalytics.totalQuantity?.toLocaleString()} {language === "ar" ? "لتر" : "L"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{language === "ar" ? "إجمالي المبيعات" : "Total Sales"}</p>
                <p className="text-2xl font-bold">{salesAnalytics.totalAmount?.toLocaleString()} {t("currency")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{language === "ar" ? "متوسط سعر البيع/لتر" : "Avg Sell Price/L"}</p>
                <p className="text-2xl font-bold">{salesAnalytics.avgPricePerLiter?.toFixed(3)} {t("currency")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{language === "ar" ? "عدد عمليات البيع" : "Sales Count"}</p>
                <p className="text-2xl font-bold">{salesAnalytics.transactionCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "أفضل العملاء" : "Top Customers"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "العميل" : "Customer"}</TableHead>
                    <TableHead>{language === "ar" ? "عدد العمليات" : "Transactions"}</TableHead>
                    <TableHead>{language === "ar" ? "الكمية (لتر)" : "Quantity (L)"}</TableHead>
                    <TableHead>{language === "ar" ? "المبلغ" : "Amount"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerAnalytics.topCustomers.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.count}</TableCell>
                      <TableCell>{c.quantity?.toLocaleString()}</TableCell>
                      <TableCell>{c.amount?.toLocaleString()} {t("currency")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{language === "ar" ? "عدد الموردين النشطين" : "Active Suppliers"}</p>
                <p className="text-2xl font-bold">{supplierAnalytics.activeSuppliers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{language === "ar" ? "إجمالي المستحقات" : "Total Dues"}</p>
                <p className="text-2xl font-bold text-red-600">{supplierAnalytics.totalBalance?.toLocaleString()} {t("currency")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{language === "ar" ? "إجمالي الكمية المستلمة" : "Total Received"}</p>
                <p className="text-2xl font-bold">{milkAnalytics.totalQuantity?.toLocaleString()} {language === "ar" ? "لتر" : "L"}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "أفضل الموردين" : "Top Suppliers"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "المورد" : "Supplier"}</TableHead>
                    <TableHead>{language === "ar" ? "عدد العمليات" : "Transactions"}</TableHead>
                    <TableHead>{language === "ar" ? "الكمية (لتر)" : "Quantity (L)"}</TableHead>
                    <TableHead>{language === "ar" ? "المبلغ" : "Amount"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierAnalytics.topSuppliers.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.count}</TableCell>
                      <TableCell>{s.quantity?.toLocaleString()}</TableCell>
                      <TableCell>{s.amount?.toLocaleString()} {t("currency")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HR Tab */}
        <TabsContent value="hr" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{language === "ar" ? "إجمالي الموظفين" : "Total Employees"}</p>
                <p className="text-2xl font-bold">{employeeAnalytics.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{language === "ar" ? "أيام الحضور" : "Present Days"}</p>
                <p className="text-2xl font-bold text-green-600">{employeeAnalytics.attendance.present}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{language === "ar" ? "أيام الغياب" : "Absent Days"}</p>
                <p className="text-2xl font-bold text-red-600">{employeeAnalytics.attendance.absent}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{language === "ar" ? "أيام الإجازة" : "Leave Days"}</p>
                <p className="text-2xl font-bold text-yellow-600">{employeeAnalytics.attendance.leave}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "توزيع الموظفين حسب القسم" : "Employees by Department"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(employeeAnalytics.byDepartment).map(([dept, count]) => (
                  <div key={dept} className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-muted-foreground">{dept}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
