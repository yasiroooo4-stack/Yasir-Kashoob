import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API, useLanguage } from "../App";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Milk,
  Users,
  ShoppingCart,
  Package,
  Wallet,
  TrendingUp,
  Droplets,
  Thermometer,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const Dashboard = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState([]);
  const [centralDashboard, setCentralDashboard] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, monthlyRes, centralRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/reports/monthly?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`),
        axios.get(`${API}/dashboard/central`),
      ]);
      setStats(statsRes.data);
      setMonthlyData(monthlyRes.data.daily_data || []);
      setCentralDashboard(centralRes.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: t("today_milk"),
      value: stats?.today_milk_quantity || 0,
      unit: t("liters"),
      icon: Milk,
      color: "bg-sky-500",
      gradient: "gradient-primary",
    },
    {
      title: t("today_sales"),
      value: stats?.today_sales_value || 0,
      unit: t("currency"),
      icon: ShoppingCart,
      color: "bg-emerald-500",
      gradient: "gradient-secondary",
    },
    {
      title: t("current_stock"),
      value: stats?.current_stock || 0,
      unit: t("liters"),
      icon: Package,
      color: "bg-amber-500",
      gradient: "gradient-accent",
    },
    {
      title: t("total_suppliers"),
      value: stats?.suppliers_count || 0,
      unit: "",
      icon: Users,
      color: "bg-violet-500",
      gradient: "bg-gradient-to-br from-violet-400 to-purple-600",
    },
    {
      title: t("total_customers"),
      value: stats?.customers_count || 0,
      unit: "",
      icon: ShoppingCart,
      color: "bg-pink-500",
      gradient: "bg-gradient-to-br from-pink-400 to-rose-600",
    },
    {
      title: t("supplier_dues"),
      value: stats?.total_supplier_dues || 0,
      unit: t("currency"),
      icon: Wallet,
      color: "bg-red-500",
      gradient: "bg-gradient-to-br from-red-400 to-red-600",
    },
  ];

  const qualityCards = [
    {
      title: t("avg_fat"),
      value: stats?.avg_fat_percentage || 0,
      unit: "%",
      icon: Droplets,
      color: "text-sky-500",
      bgColor: "bg-sky-50",
    },
    {
      title: t("avg_protein"),
      value: stats?.avg_protein_percentage || 0,
      unit: "%",
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t("dashboard")}</h1>
        <span className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, index) => (
          <Card
            key={index}
            className="stat-card card-hover stagger-item"
            data-testid={`stat-card-${index}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`stat-card-icon ${card.gradient}`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
                  {card.unit && <span className="text-sm font-normal text-muted-foreground ms-1">{card.unit}</span>}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{card.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2" data-testid="main-chart">
          <CardHeader>
            <CardTitle className="text-lg">
              {language === "ar" ? "إحصائيات الشهر" : "Monthly Statistics"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorReception" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                  <Area
                    type="monotone"
                    dataKey="reception_qty"
                    name={t("receptions")}
                    stroke="#0EA5E9"
                    fillOpacity={1}
                    fill="url(#colorReception)"
                  />
                  <Area
                    type="monotone"
                    dataKey="sales_qty"
                    name={t("sales")}
                    stroke="#10B981"
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quality Stats */}
        <Card data-testid="quality-stats">
          <CardHeader>
            <CardTitle className="text-lg">{t("quality_test")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {qualityCards.map((card, index) => (
              <div
                key={index}
                className={`${card.bgColor} rounded-xl p-4 flex items-center gap-4`}
              >
                <div className={`w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {card.value}
                    <span className="text-sm font-normal text-muted-foreground ms-1">
                      {card.unit}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                </div>
              </div>
            ))}

            {/* Additional Stats */}
            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("customer_dues")}</span>
                <span className="font-semibold text-emerald-600">
                  {(stats?.total_customer_dues || 0).toLocaleString()} {t("currency")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t("today_sales")}</span>
                <span className="font-semibold">
                  {(stats?.today_sales_quantity || 0).toLocaleString()} {t("liters")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions / Recent Activity could go here */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="value-chart">
          <CardHeader>
            <CardTitle className="text-lg">
              {language === "ar" ? "قيمة المعاملات" : "Transaction Values"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData.slice(-7)}>
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
                  <Bar
                    dataKey="reception_value"
                    name={language === "ar" ? "قيمة الاستلام" : "Reception Value"}
                    fill="#0EA5E9"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="sales_value"
                    name={language === "ar" ? "قيمة المبيعات" : "Sales Value"}
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="summary-card">
          <CardHeader>
            <CardTitle className="text-lg">
              {language === "ar" ? "ملخص سريع" : "Quick Summary"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-sky-50 rounded-xl">
                <Milk className="w-8 h-8 text-sky-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">
                  {(stats?.today_milk_quantity || 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">{t("today_milk")}</p>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-xl">
                <TrendingUp className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">
                  {(stats?.today_sales_value || 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">{t("today_sales")}</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-xl">
                <Package className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">
                  {(stats?.current_stock || 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">{t("current_stock")}</p>
              </div>
              <div className="text-center p-4 bg-violet-50 rounded-xl">
                <Users className="w-8 h-8 text-violet-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">
                  {stats?.suppliers_count || 0}
                </p>
                <p className="text-sm text-muted-foreground">{t("total_suppliers")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
