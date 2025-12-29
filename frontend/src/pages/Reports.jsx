import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API, useLanguage } from "../App";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  BarChart3,
  Calendar,
  FileText,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  Milk,
  ShoppingCart,
  Wallet,
  FileSpreadsheet,
  Users,
  Building2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

const Reports = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [dailyReport, setDailyReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [supplierReport, setSupplierReport] = useState(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${API}/suppliers`);
      setSuppliers(response.data);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    }
  };

  const fetchDailyReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/reports/daily?date=${selectedDate}`);
      setDailyReport(response.data);
    } catch (error) {
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/reports/monthly?year=${selectedYear}&month=${selectedMonth}`
      );
      setMonthlyReport(response.data);
    } catch (error) {
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierReport = async () => {
    if (!selectedSupplier) {
      toast.error(language === "ar" ? "اختر مورداً" : "Select a supplier");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${API}/reports/supplier/${selectedSupplier}`);
      setSupplierReport(response.data);
    } catch (error) {
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = () => {
    switch (activeTab) {
      case "daily":
        fetchDailyReport();
        break;
      case "monthly":
        fetchMonthlyReport();
        break;
      case "supplier":
        fetchSupplierReport();
        break;
    }
  };

  const months = [
    { value: 1, label: language === "ar" ? "يناير" : "January" },
    { value: 2, label: language === "ar" ? "فبراير" : "February" },
    { value: 3, label: language === "ar" ? "مارس" : "March" },
    { value: 4, label: language === "ar" ? "أبريل" : "April" },
    { value: 5, label: language === "ar" ? "مايو" : "May" },
    { value: 6, label: language === "ar" ? "يونيو" : "June" },
    { value: 7, label: language === "ar" ? "يوليو" : "July" },
    { value: 8, label: language === "ar" ? "أغسطس" : "August" },
    { value: 9, label: language === "ar" ? "سبتمبر" : "September" },
    { value: 10, label: language === "ar" ? "أكتوبر" : "October" },
    { value: 11, label: language === "ar" ? "نوفمبر" : "November" },
    { value: 12, label: language === "ar" ? "ديسمبر" : "December" },
  ];

  return (
    <div className="space-y-6" data-testid="reports-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("reports")}</h1>
          <p className="text-muted-foreground">
            {language === "ar" ? "عرض وتصدير التقارير" : "View and export reports"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="daily" className="gap-2" data-testid="tab-daily">
            <Calendar className="w-4 h-4" />
            {t("daily_report")}
          </TabsTrigger>
          <TabsTrigger value="monthly" className="gap-2" data-testid="tab-monthly">
            <BarChart3 className="w-4 h-4" />
            {t("monthly_report")}
          </TabsTrigger>
          <TabsTrigger value="supplier" className="gap-2" data-testid="tab-supplier">
            <FileText className="w-4 h-4" />
            {t("supplier_report")}
          </TabsTrigger>
        </TabsList>

        {/* Daily Report Tab */}
        <TabsContent value="daily" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("select_date")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    data-testid="date-input"
                  />
                </div>
                <Button
                  onClick={handleGenerateReport}
                  className="gradient-primary text-white"
                  disabled={loading}
                  data-testid="generate-daily-btn"
                >
                  {loading ? t("loading") : t("generate_report")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {dailyReport && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="stat-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("receptions")}</p>
                        <p className="text-2xl font-bold">
                          {dailyReport.receptions?.total_quantity?.toLocaleString() || 0} {t("liters")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {dailyReport.receptions?.count || 0} {language === "ar" ? "عملية" : "operations"}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="stat-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("sales")}</p>
                        <p className="text-2xl font-bold">
                          {dailyReport.sales?.total_quantity?.toLocaleString() || 0} {t("liters")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {dailyReport.sales?.total_value?.toLocaleString() || 0} {t("currency")}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center">
                        <ShoppingCart className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="stat-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("payments")}</p>
                        <p className="text-2xl font-bold">
                          {dailyReport.payments?.total_value?.toLocaleString() || 0} {t("currency")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {dailyReport.payments?.count || 0} {language === "ar" ? "عملية" : "operations"}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Monthly Report Tab */}
        <TabsContent value="monthly" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("select_month")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(v) => setSelectedMonth(parseInt(v))}
                  >
                    <SelectTrigger data-testid="month-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value.toString()}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(v) => setSelectedYear(parseInt(v))}
                  >
                    <SelectTrigger data-testid="year-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2023, 2024, 2025, 2026].map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleGenerateReport}
                  className="gradient-primary text-white"
                  disabled={loading}
                  data-testid="generate-monthly-btn"
                >
                  {loading ? t("loading") : t("generate_report")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {monthlyReport && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="stat-card">
                  <CardContent className="p-4 text-center">
                    <Milk className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold">
                      {monthlyReport.summary?.total_reception_quantity?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">{t("receptions")} ({t("liters")})</p>
                  </CardContent>
                </Card>
                <Card className="stat-card">
                  <CardContent className="p-4 text-center">
                    <ShoppingCart className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">
                      {monthlyReport.summary?.total_sales_quantity?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">{t("sales")} ({t("liters")})</p>
                  </CardContent>
                </Card>
                <Card className="stat-card">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">
                      {monthlyReport.summary?.total_sales_value?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">{t("sales")} ({t("currency")})</p>
                  </CardContent>
                </Card>
                <Card className="stat-card">
                  <CardContent className="p-4 text-center">
                    <Wallet className="w-8 h-8 text-violet-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">
                      {monthlyReport.summary?.total_payments?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">{t("payments")} ({t("currency")})</p>
                  </CardContent>
                </Card>
              </div>

              {/* Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {language === "ar" ? "الرسم البياني" : "Chart"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyReport.daily_data || []}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => value.slice(-2)}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="reception_qty"
                          name={t("receptions")}
                          stroke="#0EA5E9"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="sales_qty"
                          name={t("sales")}
                          stroke="#10B981"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Supplier Report Tab */}
        <TabsContent value="supplier" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("supplier")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger data-testid="supplier-select">
                      <SelectValue placeholder={t("supplier")} />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleGenerateReport}
                  className="gradient-primary text-white"
                  disabled={loading}
                  data-testid="generate-supplier-btn"
                >
                  {loading ? t("loading") : t("generate_report")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {supplierReport && (
            <div className="space-y-4">
              {/* Supplier Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{supplierReport.supplier?.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-sky-50 rounded-xl">
                      <p className="text-2xl font-bold text-primary">
                        {supplierReport.summary?.total_supplied?.toLocaleString() || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">{t("total_supplied")} ({t("liters")})</p>
                    </div>
                    <div className="text-center p-4 bg-emerald-50 rounded-xl">
                      <p className="text-2xl font-bold text-emerald-600">
                        {supplierReport.summary?.reception_count || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">{t("receptions")}</p>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-xl">
                      <p className="text-2xl font-bold text-amber-600">
                        {supplierReport.summary?.current_balance?.toLocaleString() || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">{t("balance")} ({t("currency")})</p>
                    </div>
                    <div className="text-center p-4 bg-violet-50 rounded-xl">
                      <p className="text-2xl font-bold text-violet-600">
                        {supplierReport.payments?.length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">{t("payments")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Receptions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("receptions")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {supplierReport.receptions?.slice(0, 5).map((r, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            {r.quantity_liters?.toLocaleString()} {t("liters")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(r.reception_date).toLocaleDateString(
                              language === "ar" ? "ar-SA" : "en-US"
                            )}
                          </p>
                        </div>
                        <p className="font-semibold text-primary">
                          {r.total_amount?.toLocaleString()} {t("currency")}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
