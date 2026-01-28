/**
 * تقييم المخزون ومعدل الدوران - Inventory Valuation & Turnover
 */
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  DollarSign,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Package,
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const InventoryValuation = ({ t, language, warehouses = [] }) => {
  const [valuation, setValuation] = useState(null);
  const [turnover, setTurnover] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [valuationMethod, setValuationMethod] = useState("all");
  const [turnoverMonths, setTurnoverMonths] = useState(12);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchValuation = useCallback(async () => {
    try {
      let url = `${API}/inventory-advanced/valuation`;
      const params = new URLSearchParams();
      if (selectedWarehouse && selectedWarehouse !== "all") params.append("warehouse_id", selectedWarehouse);
      if (valuationMethod && valuationMethod !== "all") params.append("method", valuationMethod);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await axios.get(url, { headers });
      setValuation(response.data);
    } catch (error) {
      console.error("Error fetching valuation:", error);
    }
  }, [selectedWarehouse, valuationMethod]);

  const fetchTurnover = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API}/inventory-advanced/turnover?months=${turnoverMonths}`,
        { headers }
      );
      setTurnover(response.data);
    } catch (error) {
      console.error("Error fetching turnover:", error);
    }
  }, [turnoverMonths]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchValuation(), fetchTurnover()]);
      setLoading(false);
    };
    fetchData();
  }, [fetchValuation, fetchTurnover]);

  const getMethodLabel = (method) => {
    const methods = {
      fifo: { ar: "الوارد أولاً صادر أولاً (FIFO)", en: "First In First Out (FIFO)" },
      lifo: { ar: "الوارد أخيراً صادر أولاً (LIFO)", en: "Last In First Out (LIFO)" },
      weighted_average: { ar: "المتوسط المرجح", en: "Weighted Average" },
      standard_cost: { ar: "التكلفة المعيارية", en: "Standard Cost" },
    };
    return methods[method]?.[language === "ar" ? "ar" : "en"] || method;
  };

  const getTurnoverRating = (rate) => {
    if (rate > 6) return { label: t("ممتاز", "Excellent"), color: "text-green-600", bg: "bg-green-100" };
    if (rate > 4) return { label: t("جيد", "Good"), color: "text-blue-600", bg: "bg-blue-100" };
    if (rate > 2) return { label: t("متوسط", "Average"), color: "text-yellow-600", bg: "bg-yellow-100" };
    return { label: t("منخفض", "Low"), color: "text-red-600", bg: "bg-red-100" };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const turnoverRating = turnover ? getTurnoverRating(turnover.turnover_rate) : null;

  return (
    <div className="space-y-6">
      {/* تقييم المخزون */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                {t("تقييم المخزون", "Inventory Valuation")}
              </CardTitle>
              <CardDescription>
                {t("قيمة المخزون الحالي حسب طريقة التقييم", "Current inventory value by valuation method")}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t("كل المستودعات", "All Warehouses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("كل المستودعات", "All Warehouses")}</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={valuationMethod} onValueChange={setValuationMethod}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t("طريقة التقييم", "Valuation Method")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("الافتراضية", "Default")}</SelectItem>
                  <SelectItem value="weighted_average">{t("المتوسط المرجح", "Weighted Average")}</SelectItem>
                  <SelectItem value="fifo">FIFO</SelectItem>
                  <SelectItem value="lifo">LIFO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {valuation && (
            <div className="space-y-6">
              {/* ملخص التقييم */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500 rounded-lg">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-sm text-blue-700">{t("إجمالي قيمة المخزون", "Total Inventory Value")}</div>
                      <div className="text-2xl font-bold text-blue-900">
                        {valuation.total_value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-sm font-normal mr-1">{t("ر.ع", "OMR")}</span>
                      </div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-500 rounded-lg">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-sm text-green-700">{t("عدد المنتجات", "Products Count")}</div>
                      <div className="text-2xl font-bold text-green-900">{valuation.items_count}</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-500 rounded-lg">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-sm text-purple-700">{t("طريقة التقييم", "Valuation Method")}</div>
                      <div className="text-lg font-bold text-purple-900">{getMethodLabel(valuation.method)}</div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* جدول أعلى المنتجات قيمة */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <PieChart className="w-4 h-4" />
                  {t("أعلى 10 منتجات قيمة", "Top 10 Products by Value")}
                </h4>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>{t("المنتج", "Product")}</TableHead>
                        <TableHead>{t("المستودع", "Warehouse")}</TableHead>
                        <TableHead className="text-center">{t("الكمية", "Quantity")}</TableHead>
                        <TableHead className="text-center">{t("تكلفة الوحدة", "Unit Cost")}</TableHead>
                        <TableHead className="text-center">{t("القيمة الإجمالية", "Total Value")}</TableHead>
                        <TableHead>{t("النسبة", "Percentage")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {valuation.items?.slice(0, 10).map((item, index) => {
                        const percentage = valuation.total_value > 0 
                          ? ((item.total_value / valuation.total_value) * 100).toFixed(1)
                          : 0;
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell>{item.warehouse_name}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-center">{item.unit_cost?.toFixed(2)}</TableCell>
                            <TableCell className="text-center font-semibold">{item.total_value?.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={parseFloat(percentage)} className="w-16 h-2" />
                                <span className="text-sm">{percentage}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* معدل دوران المخزون */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {t("معدل دوران المخزون", "Inventory Turnover Rate")}
              </CardTitle>
              <CardDescription>
                {t("تحليل سرعة بيع واستبدال المخزون", "Analysis of how quickly inventory is sold and replaced")}
              </CardDescription>
            </div>
            <Select value={turnoverMonths.toString()} onValueChange={(v) => setTurnoverMonths(parseInt(v))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">{t("3 أشهر", "3 Months")}</SelectItem>
                <SelectItem value="6">{t("6 أشهر", "6 Months")}</SelectItem>
                <SelectItem value="12">{t("12 شهر", "12 Months")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {turnover && (
            <div className="space-y-6">
              {/* مؤشرات الدوران */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className={`p-4 ${turnoverRating?.bg}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">{t("معدل الدوران", "Turnover Rate")}</div>
                      <div className={`text-3xl font-bold ${turnoverRating?.color}`}>
                        {turnover.turnover_rate}x
                      </div>
                    </div>
                    {turnover.turnover_rate > 4 ? (
                      <ArrowUpRight className={`w-8 h-8 ${turnoverRating?.color}`} />
                    ) : (
                      <ArrowDownRight className={`w-8 h-8 ${turnoverRating?.color}`} />
                    )}
                  </div>
                  <Badge variant="outline" className={`mt-2 ${turnoverRating?.color}`}>
                    {turnoverRating?.label}
                  </Badge>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-8 h-8 text-blue-500" />
                    <div>
                      <div className="text-sm text-muted-foreground">{t("أيام المخزون", "Days of Inventory")}</div>
                      <div className="text-2xl font-bold">{turnover.days_of_inventory}</div>
                      <div className="text-xs text-muted-foreground">{t("يوم", "days")}</div>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <TrendingDown className="w-8 h-8 text-orange-500" />
                    <div>
                      <div className="text-sm text-muted-foreground">{t("تكلفة البضاعة المباعة", "Cost of Goods Sold")}</div>
                      <div className="text-2xl font-bold">{turnover.cost_of_goods_sold?.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{t("ر.ع", "OMR")}</div>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <Package className="w-8 h-8 text-green-500" />
                    <div>
                      <div className="text-sm text-muted-foreground">{t("متوسط المخزون", "Average Inventory")}</div>
                      <div className="text-2xl font-bold">{turnover.average_inventory?.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{t("ر.ع", "OMR")}</div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* التوصيات */}
              <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900">{t("التحليل والتوصيات", "Analysis & Recommendations")}</h4>
                    <p className="text-blue-700 mt-1">
                      {turnover.analysis?.recommendation}
                    </p>
                    <div className="mt-3 text-sm text-blue-600">
                      <strong>{t("الفترة:", "Period:")}</strong> {turnover.period_months} {t("شهر", "months")}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryValuation;
