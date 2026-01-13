import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { API, useLanguage } from "../App";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Building2,
  AlertTriangle,
  Mail,
  RefreshCw,
  Download,
  BarChart3,
  PieChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Bell,
  Package,
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const AdvancedReports = () => {
  const { language } = useLanguage();
  const t = (ar, en) => language === "ar" ? ar : en;
  const [activeTab, setActiveTab] = useState("payroll-comparison");
  const [loading, setLoading] = useState(false);
  
  // Payroll comparison
  const [periods, setPeriods] = useState([]);
  const [period1, setPeriod1] = useState("");
  const [period2, setPeriod2] = useState("");
  const [comparisonData, setComparisonData] = useState(null);
  
  // Monthly financial report
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [financialReport, setFinancialReport] = useState(null);
  
  // Centers performance
  const [centersReport, setCentersReport] = useState(null);
  
  // Inventory alerts
  const [inventoryAlerts, setInventoryAlerts] = useState(null);
  const [alertEmail, setAlertEmail] = useState("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchPayrollPeriods();
  }, []);

  const fetchPayrollPeriods = async () => {
    try {
      const response = await axios.get(`${API}/api/hr/payroll/periods`, { headers });
      setPeriods(response.data || []);
    } catch (error) {
      console.error("Error fetching periods:", error);
    }
  };

  const fetchPayrollComparison = async () => {
    if (!period1 || !period2) {
      toast.error("يرجى اختيار الفترتين للمقارنة");
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/api/reports/payroll/comparison?period1_id=${period1}&period2_id=${period2}`,
        { headers }
      );
      setComparisonData(response.data);
    } catch (error) {
      toast.error("فشل في جلب تقرير المقارنة");
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/api/reports/financial/monthly?year=${selectedYear}&month=${selectedMonth}`,
        { headers }
      );
      setFinancialReport(response.data);
    } catch (error) {
      toast.error("فشل في جلب التقرير المالي");
    } finally {
      setLoading(false);
    }
  };

  const fetchCentersReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/reports/centers/performance`, { headers });
      setCentersReport(response.data);
    } catch (error) {
      toast.error("فشل في جلب تقرير المراكز");
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryAlerts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/reports/inventory/alerts`, { headers });
      setInventoryAlerts(response.data);
    } catch (error) {
      toast.error("فشل في جلب تنبيهات المخزون");
    } finally {
      setLoading(false);
    }
  };

  const sendInventoryAlerts = async () => {
    if (!alertEmail) {
      toast.error("يرجى إدخال البريد الإلكتروني");
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/api/reports/inventory/send-alerts`,
        { email: alertEmail },
        { headers }
      );
      
      if (response.data.sent) {
        toast.success(response.data.message);
      } else {
        toast.warning(response.data.message);
      }
      setEmailDialogOpen(false);
    } catch (error) {
      toast.error("فشل في إرسال التنبيهات");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (num) => `${(num || 0).toLocaleString()} ر.ع`;
  const formatNumber = (num) => (num || 0).toLocaleString();

  const getChangeIcon = (change) => {
    if (change > 0) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    if (change < 0) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getChangeColor = (change) => {
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-500";
  };

  const months = [
    { value: 1, label: "يناير" },
    { value: 2, label: "فبراير" },
    { value: 3, label: "مارس" },
    { value: 4, label: "أبريل" },
    { value: 5, label: "مايو" },
    { value: 6, label: "يونيو" },
    { value: 7, label: "يوليو" },
    { value: 8, label: "أغسطس" },
    { value: 9, label: "سبتمبر" },
    { value: 10, label: "أكتوبر" },
    { value: 11, label: "نوفمبر" },
    { value: 12, label: "ديسمبر" },
  ];

  return (
    <div className="space-y-6 p-6" data-testid="advanced-reports-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">التقارير المتقدمة</h1>
          <p className="text-gray-600">تقارير مالية وتشغيلية مفصلة</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="payroll-comparison" data-testid="payroll-comparison-tab">
            <Users className="w-4 h-4 me-2" />
            مقارنة الرواتب
          </TabsTrigger>
          <TabsTrigger value="financial" data-testid="financial-tab">
            <DollarSign className="w-4 h-4 me-2" />
            التقرير المالي
          </TabsTrigger>
          <TabsTrigger value="centers" data-testid="centers-tab">
            <Building2 className="w-4 h-4 me-2" />
            أداء المراكز
          </TabsTrigger>
          <TabsTrigger value="inventory" data-testid="inventory-tab">
            <Package className="w-4 h-4 me-2" />
            تنبيهات المخزون
          </TabsTrigger>
        </TabsList>

        {/* Payroll Comparison Tab */}
        <TabsContent value="payroll-comparison">
          <Card>
            <CardHeader>
              <CardTitle>تقرير مقارنة الرواتب</CardTitle>
              <CardDescription>قارن بين فترتين لمعرفة التغييرات في الرواتب والبدلات</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="space-y-2">
                  <Label>الفترة الأولى</Label>
                  <Select value={period1} onValueChange={setPeriod1}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="اختر الفترة الأولى" />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الفترة الثانية</Label>
                  <Select value={period2} onValueChange={setPeriod2}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="اختر الفترة الثانية" />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={fetchPayrollComparison} disabled={loading}>
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : <BarChart3 className="w-4 h-4 me-2" />}
                    عرض المقارنة
                  </Button>
                </div>
              </div>

              {comparisonData && (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-blue-50">
                      <CardContent className="pt-4">
                        <p className="text-sm text-blue-600">إجمالي الفترة 1</p>
                        <p className="text-xl font-bold">{formatCurrency(comparisonData.summary.period1_total_net)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50">
                      <CardContent className="pt-4">
                        <p className="text-sm text-green-600">إجمالي الفترة 2</p>
                        <p className="text-xl font-bold">{formatCurrency(comparisonData.summary.period2_total_net)}</p>
                      </CardContent>
                    </Card>
                    <Card className={comparisonData.summary.net_change >= 0 ? "bg-green-50" : "bg-red-50"}>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-600">التغيير</p>
                        <p className={`text-xl font-bold ${getChangeColor(comparisonData.summary.net_change)}`}>
                          {formatCurrency(comparisonData.summary.net_change)}
                          <span className="text-sm ms-1">({comparisonData.summary.percentage_change}%)</span>
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-green-600 font-bold">{comparisonData.summary.employees_with_increase}</p>
                            <p className="text-xs">زيادة</p>
                          </div>
                          <div>
                            <p className="text-red-600 font-bold">{comparisonData.summary.employees_with_decrease}</p>
                            <p className="text-xs">نقص</p>
                          </div>
                          <div>
                            <p className="text-gray-600 font-bold">{comparisonData.summary.employees_unchanged}</p>
                            <p className="text-xs">ثابت</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Comparison Table */}
                  <div className="max-h-[500px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>الموظف</TableHead>
                          <TableHead>القسم</TableHead>
                          <TableHead className="text-center">الفترة 1</TableHead>
                          <TableHead className="text-center">الفترة 2</TableHead>
                          <TableHead className="text-center">التغيير</TableHead>
                          <TableHead className="text-center">الحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparisonData.comparisons.slice(0, 50).map((comp) => (
                          <TableRow key={comp.employee_id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{comp.employee_name}</p>
                                <p className="text-sm text-gray-500">{comp.employee_code}</p>
                              </div>
                            </TableCell>
                            <TableCell>{comp.department || "-"}</TableCell>
                            <TableCell className="text-center">{formatCurrency(comp.period1.net_salary)}</TableCell>
                            <TableCell className="text-center">{formatCurrency(comp.period2.net_salary)}</TableCell>
                            <TableCell className="text-center">
                              <div className={`flex items-center justify-center gap-1 ${getChangeColor(comp.changes.net_salary)}`}>
                                {getChangeIcon(comp.changes.net_salary)}
                                <span>{formatCurrency(comp.changes.net_salary)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={
                                comp.status === "increase" ? "bg-green-100 text-green-700" :
                                comp.status === "decrease" ? "bg-red-100 text-red-700" :
                                comp.status === "new" ? "bg-blue-100 text-blue-700" :
                                comp.status === "removed" ? "bg-orange-100 text-orange-700" :
                                "bg-gray-100 text-gray-700"
                              }>
                                {comp.status === "increase" ? "زيادة" :
                                 comp.status === "decrease" ? "نقص" :
                                 comp.status === "new" ? "جديد" :
                                 comp.status === "removed" ? "محذوف" : "ثابت"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Report Tab */}
        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>التقرير المالي الشهري</CardTitle>
              <CardDescription>ملخص الإيرادات والمصروفات والأرباح</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="space-y-2">
                  <Label>السنة</Label>
                  <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026].map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الشهر</Label>
                  <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={fetchFinancialReport} disabled={loading}>
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : <PieChart className="w-4 h-4 me-2" />}
                    عرض التقرير
                  </Button>
                </div>
              </div>

              {financialReport && (
                <div className="space-y-6">
                  {/* Revenue */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-green-50 border-green-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-green-700 text-lg flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          الإيرادات
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-green-700">{formatCurrency(financialReport.revenue.total_sales)}</p>
                        <div className="mt-2 text-sm text-green-600">
                          <p>نقدي: {formatCurrency(financialReport.revenue.cash_sales)}</p>
                          <p>آجل: {formatCurrency(financialReport.revenue.credit_sales)}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-red-50 border-red-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-red-700 text-lg flex items-center gap-2">
                          <TrendingDown className="w-5 h-5" />
                          تكلفة البضاعة
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-red-700">{formatCurrency(financialReport.cost_of_goods.total_purchases)}</p>
                        <div className="mt-2 text-sm text-red-600">
                          <p>الكمية: {formatNumber(financialReport.cost_of_goods.quantity_purchased_liters)} لتر</p>
                          <p>عدد الاستلامات: {financialReport.cost_of_goods.purchases_count}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-blue-700 text-lg flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          المصاريف التشغيلية
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold text-blue-700">{formatCurrency(financialReport.operating_expenses.salaries_and_wages)}</p>
                        <div className="mt-2 text-sm text-blue-600">
                          <p>عدد الموظفين: {financialReport.operating_expenses.employee_count}</p>
                          <p>البدلات: {formatCurrency(financialReport.operating_expenses.allowances)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Profitability */}
                  <Card className={financialReport.profitability.net_profit >= 0 ? "bg-green-50" : "bg-red-50"}>
                    <CardHeader>
                      <CardTitle>الربحية</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">إجمالي الربح</p>
                          <p className={`text-2xl font-bold ${financialReport.profitability.gross_profit >= 0 ? "text-green-700" : "text-red-700"}`}>
                            {formatCurrency(financialReport.profitability.gross_profit)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">هامش الربح الإجمالي</p>
                          <p className="text-2xl font-bold">{financialReport.profitability.gross_margin_percentage}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">صافي الربح</p>
                          <p className={`text-2xl font-bold ${financialReport.profitability.net_profit >= 0 ? "text-green-700" : "text-red-700"}`}>
                            {formatCurrency(financialReport.profitability.net_profit)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">هامش صافي الربح</p>
                          <p className="text-2xl font-bold">{financialReport.profitability.net_margin_percentage}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Centers Performance Tab */}
        <TabsContent value="centers">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>تقرير أداء مراكز التجميع</CardTitle>
                  <CardDescription>مقارنة الأداء بين المراكز المختلفة</CardDescription>
                </div>
                <Button onClick={fetchCentersReport} disabled={loading}>
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : <Building2 className="w-4 h-4 me-2" />}
                  تحديث
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {centersReport && (
                <>
                  {/* Totals */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">إجمالي الكمية</p>
                        <p className="text-xl font-bold">{formatNumber(centersReport.totals.total_quantity)} لتر</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">إجمالي المبلغ</p>
                        <p className="text-xl font-bold">{formatCurrency(centersReport.totals.total_amount)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">عدد الاستلامات</p>
                        <p className="text-xl font-bold">{centersReport.totals.total_receptions}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-sm text-gray-500">عدد المراكز</p>
                        <p className="text-xl font-bold">{centersReport.totals.centers_count}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Centers Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>المركز</TableHead>
                        <TableHead>الكمية (لتر)</TableHead>
                        <TableHead>المبلغ (ر.ع)</TableHead>
                        <TableHead>عدد الموردين</TableHead>
                        <TableHead>حليب الإبل %</TableHead>
                        <TableHead>متوسط السعر</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {centersReport.centers.map((center) => (
                        <TableRow key={center.center_name}>
                          <TableCell>
                            <Badge className={center.rank === 1 ? "bg-yellow-400" : "bg-gray-200"}>
                              {center.rank}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{center.center_name}</TableCell>
                          <TableCell>{formatNumber(center.total_quantity)}</TableCell>
                          <TableCell>{formatCurrency(center.total_amount)}</TableCell>
                          <TableCell>{center.suppliers_count}</TableCell>
                          <TableCell>{center.camel_percentage}%</TableCell>
                          <TableCell>{center.avg_price_per_liter?.toFixed(3)} ر.ع</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Alerts Tab */}
        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>تنبيهات المخزون المنخفض</CardTitle>
                  <CardDescription>المنتجات التي تحتاج إعادة تخزين</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={fetchInventoryAlerts} disabled={loading} variant="outline">
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : <RefreshCw className="w-4 h-4 me-2" />}
                    تحديث
                  </Button>
                  <Button onClick={() => setEmailDialogOpen(true)} disabled={!inventoryAlerts?.alerts?.length}>
                    <Mail className="w-4 h-4 me-2" />
                    إرسال تنبيه
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {inventoryAlerts && (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <Card className="bg-red-50">
                      <CardContent className="pt-4 text-center">
                        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-red-600">{inventoryAlerts.critical_count}</p>
                        <p className="text-sm text-red-500">تنبيهات حرجة</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-yellow-50">
                      <CardContent className="pt-4 text-center">
                        <Bell className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-yellow-600">{inventoryAlerts.warning_count}</p>
                        <p className="text-sm text-yellow-500">تنبيهات تحذيرية</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 text-center">
                        <Package className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold">{inventoryAlerts.alerts_count}</p>
                        <p className="text-sm text-gray-500">إجمالي التنبيهات</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Alerts Table */}
                  {inventoryAlerts.alerts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg">لا توجد تنبيهات - المخزون في حالة جيدة</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>المنتج</TableHead>
                          <TableHead>الكمية الحالية</TableHead>
                          <TableHead>الحد الأدنى</TableHead>
                          <TableHead>النقص</TableHead>
                          <TableHead>الحالة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryAlerts.alerts.map((alert, index) => (
                          <TableRow key={index} className={alert.severity === "critical" ? "bg-red-50" : "bg-yellow-50"}>
                            <TableCell className="font-medium">
                              {alert.product_name || alert.product_type}
                            </TableCell>
                            <TableCell>
                              {alert.current_quantity} {alert.unit || "وحدة"}
                            </TableCell>
                            <TableCell>{alert.threshold}</TableCell>
                            <TableCell className="font-bold text-red-600">-{alert.deficit}</TableCell>
                            <TableCell>
                              <Badge className={alert.severity === "critical" ? "bg-red-500" : "bg-yellow-500"}>
                                {alert.severity === "critical" ? "🔴 حرج" : "🟡 تحذير"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إرسال تنبيهات المخزون</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input
                type="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                placeholder="example@company.com"
              />
            </div>
            <p className="text-sm text-gray-500">
              سيتم إرسال {inventoryAlerts?.alerts_count || 0} تنبيه إلى البريد المحدد
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>إلغاء</Button>
            <Button onClick={sendInventoryAlerts} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : <Mail className="w-4 h-4 me-2" />}
              إرسال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvancedReports;
