import { useState, useEffect, lazy, Suspense } from "react";
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
  Users,
  Milk,
  DollarSign,
  Wallet,
  Clock,
  Download,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Building,
  BarChart3,
  PieChart,
} from "lucide-react";

// Lazy load Advanced Reports component
const AdvancedReportsContent = lazy(() => import("./AdvancedReports"));

const Reports = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("suppliers");
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [centerFilter, setCenterFilter] = useState("all");
  const [milkTypeFilter, setMilkTypeFilter] = useState("all");
  
  // Data
  const [suppliers, setSuppliers] = useState([]);
  const [milkReceptions, setMilkReceptions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  
  // Stats
  const [stats, setStats] = useState({
    totalSuppliers: 0,
    totalMilk: 0,
    totalPayments: 0,
    totalEmployees: 0,
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  
  // Translation helper
  const t = (ar, en) => language === "ar" ? ar : en;

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [suppliersRes, receptionsRes, employeesRes, attendanceRes] = await Promise.all([
        axios.get(`${API}/api/suppliers`, { headers }),
        axios.get(`${API}/api/milk-receptions`, { headers }),
        axios.get(`${API}/api/hr/employees`, { headers }),
        axios.get(`${API}/api/hr/attendance`, { headers }),
      ]);
      
      setSuppliers(suppliersRes.data || []);
      setMilkReceptions(receptionsRes.data || []);
      setEmployees(employeesRes.data || []);
      setAttendance(attendanceRes.data || []);
      
      const totalMilk = (receptionsRes.data || []).reduce((sum, r) => sum + (r.quantity || 0), 0);
      const totalPayments = (receptionsRes.data || []).reduce((sum, r) => sum + (r.total_amount || 0), 0);
      
      setStats({
        totalSuppliers: (suppliersRes.data || []).length,
        totalMilk,
        totalPayments,
        totalEmployees: (employeesRes.data || []).length,
      });
      
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => new Intl.NumberFormat("ar-SA").format(num || 0);
  const formatCurrency = (num) => `${formatNumber(num)} ر.ع`;
  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString("ar-SA") : "-";

  const filteredSuppliers = suppliers.filter(s => {
    if (centerFilter !== "all" && s.center_name !== centerFilter) return false;
    if (milkTypeFilter !== "all" && s.milk_type !== milkTypeFilter) return false;
    return true;
  });

  const filteredReceptions = milkReceptions.filter(r => {
    if (dateFrom && new Date(r.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(r.date) > new Date(dateTo)) return false;
    if (centerFilter !== "all" && r.center_name !== centerFilter) return false;
    return true;
  });

  const suppliersByCenter = suppliers.reduce((acc, s) => {
    const center = s.center_name || "غير محدد";
    if (!acc[center]) acc[center] = { total: 0, camel: 0, cow: 0, balance: 0 };
    acc[center].total++;
    if (s.milk_type === "إبل") acc[center].camel++;
    else acc[center].cow++;
    acc[center].balance += s.balance || 0;
    return acc;
  }, {});

  const receptionsByDate = filteredReceptions.reduce((acc, r) => {
    const date = r.date?.split("T")[0] || "غير محدد";
    if (!acc[date]) acc[date] = { quantity: 0, amount: 0, count: 0 };
    acc[date].quantity += r.quantity || 0;
    acc[date].amount += r.total_amount || 0;
    acc[date].count++;
    return acc;
  }, {});

  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      toast.error(t("لا توجد بيانات للتصدير", "No data to export"));
      return;
    }
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).join(",")).join("\n");
    const csv = `\uFEFF${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success(t("تم تصدير التقرير بنجاح", "Report exported successfully"));
  };

  const centers = [...new Set(suppliers.map(s => s.center_name).filter(Boolean))];

  return (
    <div className="space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7" />
            {t("التقارير", "Reports")}
          </h1>
          <p className="text-muted-foreground">{t("تقارير شاملة للموردين والتوريدات والمالية", "Comprehensive reports for suppliers, deliveries, and finance")}</p>
        </div>
        <Button onClick={fetchAllData} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 me-2 ${loading ? "animate-spin" : ""}`} />
          {t("تحديث", "Refresh")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{t("الموردين", "Suppliers")}</p>
                <p className="text-3xl font-bold">{formatNumber(stats.totalSuppliers)}</p>
              </div>
              <Users className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{t("الحليب (لتر)", "Milk (L)")}</p>
                <p className="text-3xl font-bold">{formatNumber(stats.totalMilk)}</p>
              </div>
              <Milk className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{t("المدفوعات", "Payments")}</p>
                <p className="text-3xl font-bold">{formatCurrency(stats.totalPayments)}</p>
              </div>
              <DollarSign className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{t("الموظفين", "Employees")}</p>
                <p className="text-3xl font-bold">{formatNumber(stats.totalEmployees)}</p>
              </div>
              <Users className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>{t("من تاريخ", "From Date")}</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>{t("إلى تاريخ", "To Date")}</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>{t("المركز", "Center")}</Label>
              <Select value={centerFilter} onValueChange={setCenterFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("جميع المراكز", "All Centers")}</SelectItem>
                  {centers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("نوع الحليب", "Milk Type")}</Label>
              <Select value={milkTypeFilter} onValueChange={setMilkTypeFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("الكل", "All")}</SelectItem>
                  <SelectItem value="إبل">{t("إبل", "Camel")}</SelectItem>
                  <SelectItem value="أبقار">{t("أبقار", "Cow")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => { setDateFrom(""); setDateTo(""); setCenterFilter("all"); setMilkTypeFilter("all"); }}>
              <Filter className="w-4 h-4 me-2" />{t("إعادة تعيين", "Reset")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="suppliers"><Users className="w-4 h-4 me-1" />{t("الموردين", "Suppliers")}</TabsTrigger>
          <TabsTrigger value="receptions"><Milk className="w-4 h-4 me-1" />{t("التوريدات", "Deliveries")}</TabsTrigger>
          <TabsTrigger value="finance"><DollarSign className="w-4 h-4 me-1" />{t("المالية", "Finance")}</TabsTrigger>
          <TabsTrigger value="payroll"><Wallet className="w-4 h-4 me-1" />{t("الرواتب", "Payroll")}</TabsTrigger>
          <TabsTrigger value="attendance"><Clock className="w-4 h-4 me-1" />{t("الحضور", "Attendance")}</TabsTrigger>
          <TabsTrigger value="advanced"><PieChart className="w-4 h-4 me-1" />{t("متقدمة", "Advanced")}</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t("تقرير الموردين", "Suppliers Report")}</CardTitle>
                <Button onClick={() => exportToCSV(filteredSuppliers.map(s => ({ [t("الكود", "Code")]: s.supplier_code, [t("الاسم", "Name")]: s.name, [t("المركز", "Center")]: s.center_name, [t("النوع", "Type")]: s.milk_type, [t("الهاتف", "Phone")]: s.phone, [t("الرصيد", "Balance")]: s.balance })), "suppliers_report")}>
                  <Download className="w-4 h-4 me-2" />{t("تصدير", "Export")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {Object.entries(suppliersByCenter).map(([center, data]) => (
                  <Card key={center} className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Building className="w-5 h-5 text-primary" />
                        <h4 className="font-bold">{center}</h4>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span>{t("الإجمالي:", "Total:")}</span><Badge>{data.total}</Badge></div>
                        <div className="flex justify-between"><span>🐪 {t("إبل:", "Camel:")}</span><span>{data.camel}</span></div>
                        <div className="flex justify-between"><span>🐄 {t("أبقار:", "Cow:")}</span><span>{data.cow}</span></div>
                        <div className="flex justify-between border-t pt-2"><span>{t("الأرصدة:", "Balances:")}</span><span className="font-bold text-green-600">{formatCurrency(data.balance)}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="rounded-md border max-h-96 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>{t("الكود", "Code")}</TableHead>
                      <TableHead>{t("الاسم", "Name")}</TableHead>
                      <TableHead>{t("المركز", "Center")}</TableHead>
                      <TableHead>{t("النوع", "Type")}</TableHead>
                      <TableHead>{t("الرصيد", "Balance")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.slice(0, 100).map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono">{s.supplier_code}</TableCell>
                        <TableCell>{s.name}</TableCell>
                        <TableCell><Badge variant="outline">{s.center_name}</Badge></TableCell>
                        <TableCell>{s.milk_type === "إبل" ? "🐪" : "🐄"} {s.milk_type}</TableCell>
                        <TableCell className={s.balance > 0 ? "text-green-600" : ""}>{formatCurrency(s.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receptions">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t("تقرير التوريدات", "Deliveries Report")}</CardTitle>
                <Button onClick={() => exportToCSV(Object.entries(receptionsByDate).map(([date, data]) => ({ [t("التاريخ", "Date")]: date, [t("الكمية", "Quantity")]: data.quantity, [t("المبلغ", "Amount")]: data.amount, [t("العدد", "Count")]: data.count })), "receptions_report")}>
                  <Download className="w-4 h-4 me-2" />{t("تصدير", "Export")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-green-50 dark:bg-green-900/20">
                  <CardContent className="p-4 text-center">
                    <Milk className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <p className="text-sm text-muted-foreground">{t("إجمالي الكمية", "Total Quantity")}</p>
                    <p className="text-2xl font-bold text-green-600">{formatNumber(filteredReceptions.reduce((s, r) => s + (r.quantity || 0), 0))} {t("لتر", "L")}</p>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 dark:bg-amber-900/20">
                  <CardContent className="p-4 text-center">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                    <p className="text-sm text-muted-foreground">{t("إجمالي المبلغ", "Total Amount")}</p>
                    <p className="text-2xl font-bold text-amber-600">{formatCurrency(filteredReceptions.reduce((s, r) => s + (r.total_amount || 0), 0))}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 dark:bg-blue-900/20">
                  <CardContent className="p-4 text-center">
                    <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-muted-foreground">{t("عدد التوريدات", "Deliveries Count")}</p>
                    <p className="text-2xl font-bold text-blue-600">{formatNumber(filteredReceptions.length)}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="rounded-md border max-h-96 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>{t("التاريخ", "Date")}</TableHead>
                      <TableHead>{t("العدد", "Count")}</TableHead>
                      <TableHead>{t("الكمية (لتر)", "Quantity (L)")}</TableHead>
                      <TableHead>{t("المبلغ (ر.ع)", "Amount (OMR)")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(receptionsByDate).sort((a, b) => b[0].localeCompare(a[0])).map(([date, data]) => (
                      <TableRow key={date}>
                        <TableCell><Calendar className="w-4 h-4 inline me-2" />{date}</TableCell>
                        <TableCell>{data.count}</TableCell>
                        <TableCell className="font-bold">{formatNumber(data.quantity)}</TableCell>
                        <TableCell className="text-green-600 font-bold">{formatCurrency(data.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t("تقرير المالية", "Finance Report")}</CardTitle>
                <Button onClick={() => exportToCSV(suppliers.filter(s => s.balance !== 0).map(s => ({ [t("الكود", "Code")]: s.supplier_code, [t("الاسم", "Name")]: s.name, [t("المركز", "Center")]: s.center_name, [t("الرصيد", "Balance")]: s.balance })), "finance_report")}>
                  <Download className="w-4 h-4 me-2" />{t("تصدير", "Export")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-green-50 dark:bg-green-900/20">
                  <CardContent className="p-4">
                    <TrendingUp className="w-10 h-10 text-green-600 mb-2" />
                    <p className="text-sm text-muted-foreground">{t("مستحق للموردين", "Due to Suppliers")}</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(suppliers.filter(s => s.balance > 0).reduce((s, sup) => s + sup.balance, 0))}</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-900/20">
                  <CardContent className="p-4">
                    <TrendingDown className="w-10 h-10 text-red-600 mb-2" />
                    <p className="text-sm text-muted-foreground">{t("أرصدة دائنة", "Credit Balances")}</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(Math.abs(suppliers.filter(s => s.balance < 0).reduce((s, sup) => s + sup.balance, 0)))}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 dark:bg-blue-900/20">
                  <CardContent className="p-4">
                    <Wallet className="w-10 h-10 text-blue-600 mb-2" />
                    <p className="text-sm text-muted-foreground">{t("صافي الأرصدة", "Net Balance")}</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(suppliers.reduce((s, sup) => s + (sup.balance || 0), 0))}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="rounded-md border max-h-64 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>{t("الكود", "Code")}</TableHead>
                      <TableHead>{t("الاسم", "Name")}</TableHead>
                      <TableHead>{t("المركز", "Center")}</TableHead>
                      <TableHead>{t("الرصيد", "Balance")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.filter(s => s.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 20).map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono">{s.supplier_code}</TableCell>
                        <TableCell>{s.name}</TableCell>
                        <TableCell><Badge variant="outline">{s.center_name}</Badge></TableCell>
                        <TableCell className="text-green-600 font-bold">{formatCurrency(s.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t("تقرير الرواتب", "Payroll Report")}</CardTitle>
                <Button onClick={() => exportToCSV(employees.map(e => ({ [t("الكود", "Code")]: e.employee_id, [t("الاسم", "Name")]: e.name, [t("القسم", "Dept")]: e.department, [t("الراتب", "Salary")]: e.salary })), "payroll_report")}>
                  <Download className="w-4 h-4 me-2" />{t("تصدير", "Export")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-purple-50 dark:bg-purple-900/20">
                  <CardContent className="p-4 text-center">
                    <Users className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                    <p className="text-sm text-muted-foreground">{t("عدد الموظفين", "Employees Count")}</p>
                    <p className="text-2xl font-bold text-purple-600">{employees.length}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-900/20">
                  <CardContent className="p-4 text-center">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <p className="text-sm text-muted-foreground">{t("إجمالي الرواتب", "Total Salaries")}</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(employees.reduce((s, e) => s + (e.salary || 0), 0))}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 dark:bg-blue-900/20">
                  <CardContent className="p-4 text-center">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-muted-foreground">{t("متوسط الراتب", "Average Salary")}</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(employees.length > 0 ? employees.reduce((s, e) => s + (e.salary || 0), 0) / employees.length : 0)}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="rounded-md border max-h-96 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>{t("الكود", "Code")}</TableHead>
                      <TableHead>{t("الاسم", "Name")}</TableHead>
                      <TableHead>{t("القسم", "Dept")}</TableHead>
                      <TableHead>{t("الوظيفة", "Position")}</TableHead>
                      <TableHead>{t("الراتب", "Salary")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono">{e.employee_id}</TableCell>
                        <TableCell>{e.name}</TableCell>
                        <TableCell><Badge variant="outline">{e.department}</Badge></TableCell>
                        <TableCell>{e.job_title}</TableCell>
                        <TableCell className="text-green-600 font-bold">{formatCurrency(e.salary)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t("تقرير الحضور", "Attendance Report")}</CardTitle>
                <Button onClick={() => exportToCSV(attendance.map(a => ({ [t("التاريخ", "Date")]: a.date, [t("الموظف", "Employee")]: a.employee_name, [t("الحضور", "Check In")]: a.check_in, [t("الانصراف", "Check Out")]: a.check_out, [t("الحالة", "Status")]: a.status })), "attendance_report")}>
                  <Download className="w-4 h-4 me-2" />{t("تصدير", "Export")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-green-50 dark:bg-green-900/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">{t("حاضر", "Present")}</p>
                    <p className="text-2xl font-bold text-green-600">{attendance.filter(a => a.status === "present").length}</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-900/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">{t("غائب", "Absent")}</p>
                    <p className="text-2xl font-bold text-red-600">{attendance.filter(a => a.status === "absent").length}</p>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 dark:bg-amber-900/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">{t("متأخر", "Late")}</p>
                    <p className="text-2xl font-bold text-amber-600">{attendance.filter(a => a.status === "late").length}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 dark:bg-blue-900/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">{t("الإجمالي", "Total")}</p>
                    <p className="text-2xl font-bold text-blue-600">{attendance.length}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="rounded-md border max-h-96 overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>{t("التاريخ", "Date")}</TableHead>
                      <TableHead>{t("الموظف", "Employee")}</TableHead>
                      <TableHead>{t("الحضور", "Check In")}</TableHead>
                      <TableHead>{t("الانصراف", "Check Out")}</TableHead>
                      <TableHead>{t("الحالة", "Status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.slice(0, 100).map((a, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{formatDate(a.date)}</TableCell>
                        <TableCell>{a.employee_name || a.employee_id}</TableCell>
                        <TableCell>{a.check_in || "-"}</TableCell>
                        <TableCell>{a.check_out || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={a.status === "present" ? "default" : a.status === "absent" ? "destructive" : "secondary"}>
                            {a.status === "present" ? t("حاضر", "Present") : a.status === "absent" ? t("غائب", "Absent") : a.status === "late" ? t("متأخر", "Late") : a.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
