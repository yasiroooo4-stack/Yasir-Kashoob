import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useLanguage } from "../App";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import {
  Package,
  Warehouse,
  ArrowRightLeft,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Plus,
  Search,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  FileSpreadsheet,
  Beaker,
  BarChart3,
  Calendar,
  Building2,
  PackagePlus,
  PackageMinus,
  History,
  Settings,
  Filter,
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const WarehouseManagement = () => {
  const { language } = useLanguage();
  const t = (ar, en) => (language === "ar" ? ar : en);

  // State
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Data state
  const [summary, setSummary] = useState({});
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stock, setStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [solutions, setSolutions] = useState([]);
  const [consumption, setConsumption] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertsSummary, setAlertsSummary] = useState({});
  const [centers, setCenters] = useState([]);
  const [warehousesByCenter, setWarehousesByCenter] = useState({});

  // Filters
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [selectedCenter, setSelectedCenter] = useState("all");
  const [movementType, setMovementType] = useState("all");
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  // Dialogs
  const [warehouseDialog, setWarehouseDialog] = useState(false);
  const [productDialog, setProductDialog] = useState(false);
  const [receiveDialog, setReceiveDialog] = useState(false);
  const [issueDialog, setIssueDialog] = useState(false);
  const [transferDialog, setTransferDialog] = useState(false);
  const [solutionDialog, setSolutionDialog] = useState(false);
  const [consumptionDialog, setConsumptionDialog] = useState(false);
  const [adjustDialog, setAdjustDialog] = useState(false);

  // Forms
  const [warehouseForm, setWarehouseForm] = useState({
    name: "",
    code: "",
    location: "",
    warehouse_type: "internal",
    warehouse_category: "",
    center_name: "",
    capacity: "",
    temperature_controlled: false,
    supervisor_email: "",
    supervisor_phone: "",
    warehouse_manager_email: "",
    warehouse_manager_phone: "",
  });

  const [productForm, setProductForm] = useState({
    name: "",
    code: "",
    category_id: "",
    unit: "piece",
    unit_price: 0,
    cost_price: 0,
    min_quantity: 0,
    expiry_tracking: false,
    batch_tracking: false,
  });

  const [receiveForm, setReceiveForm] = useState({
    product_id: "",
    warehouse_id: "",
    quantity: 0,
    unit_price: 0,
    supplier_name: "",
    batch_number: "",
    expiry_date: "",
    reference_number: "",
    notes: "",
  });

  const [issueForm, setIssueForm] = useState({
    product_id: "",
    warehouse_id: "",
    quantity: 0,
    unit_price: 0,
    customer_name: "",
    reference_number: "",
    notes: "",
  });

  const [transferForm, setTransferForm] = useState({
    product_id: "",
    from_warehouse_id: "",
    to_warehouse_id: "",
    quantity: 0,
    notes: "",
  });

  const [solutionForm, setSolutionForm] = useState({
    name: "",
    code: "",
    solution_type: "reagent",
    unit: "ml",
    current_quantity: 0,
    min_quantity: 0,
    warehouse_id: "",
    expiry_date: "",
    batch_number: "",
    supplier_name: "",
    cost_per_unit: 0,
  });

  const [consumptionForm, setConsumptionForm] = useState({
    solution_id: "",
    consumption_date: new Date().toISOString().split("T")[0],
    quantity_consumed: 0,
    test_type: "",
    test_count: 0,
    notes: "",
  });

  const [adjustForm, setAdjustForm] = useState({
    product_id: "",
    warehouse_id: "",
    new_quantity: 0,
    reason: "",
  });

  const [editingItem, setEditingItem] = useState(null);
  const [initializingWarehouses, setInitializingWarehouses] = useState(false);

  // Fetch functions
  const fetchSummary = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/warehouse/stock/summary`);
      setSummary(response.data);
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    try {
      const params = {};
      if (selectedCenter !== "all") params.center_name = selectedCenter;
      const response = await axios.get(`${API}/warehouse/warehouses`, { params });
      setWarehouses(response.data);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
    }
  }, [selectedCenter]);

  const fetchWarehousesByCenter = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/warehouse/warehouses/by-center`);
      setWarehousesByCenter(response.data);
    } catch (error) {
      console.error("Error fetching warehouses by center:", error);
    }
  }, []);

  const fetchCenters = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/warehouse/centers`);
      setCenters(response.data);
    } catch (error) {
      console.error("Error fetching centers:", error);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/warehouse/alerts`, {
        params: { is_resolved: false }
      });
      setAlerts(response.data);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  }, []);

  const fetchAlertsSummary = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/warehouse/alerts/summary`);
      setAlertsSummary(response.data);
    } catch (error) {
      console.error("Error fetching alerts summary:", error);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/warehouse/products`);
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/warehouse/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }, []);

  const fetchStock = useCallback(async () => {
    try {
      const params = {};
      if (selectedWarehouse !== "all") params.warehouse_id = selectedWarehouse;
      if (searchQuery) params.search = searchQuery;
      const response = await axios.get(`${API}/warehouse/stock`, { params });
      setStock(response.data);
    } catch (error) {
      console.error("Error fetching stock:", error);
    }
  }, [selectedWarehouse, searchQuery]);

  const fetchMovements = useCallback(async () => {
    try {
      const params = {
        start_date: dateRange.start,
        end_date: dateRange.end,
        limit: 200,
      };
      if (movementType !== "all") params.movement_type = movementType;
      if (selectedWarehouse !== "all") params.warehouse_id = selectedWarehouse;
      const response = await axios.get(`${API}/warehouse/movements`, { params });
      setMovements(response.data);
    } catch (error) {
      console.error("Error fetching movements:", error);
    }
  }, [dateRange, movementType, selectedWarehouse]);

  const fetchSolutions = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/warehouse/solutions`);
      setSolutions(response.data);
    } catch (error) {
      console.error("Error fetching solutions:", error);
    }
  }, []);

  const fetchConsumption = useCallback(async () => {
    try {
      const params = {
        start_date: dateRange.start,
        end_date: dateRange.end,
      };
      const response = await axios.get(`${API}/warehouse/solutions/consumption`, { params });
      setConsumption(response.data);
    } catch (error) {
      console.error("Error fetching consumption:", error);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchSummary();
    fetchWarehouses();
    fetchProducts();
    fetchCategories();
    fetchSolutions();
    fetchCenters();
    fetchAlerts();
    fetchAlertsSummary();
    fetchWarehousesByCenter();
  }, [fetchSummary, fetchWarehouses, fetchProducts, fetchCategories, fetchSolutions, fetchCenters, fetchAlerts, fetchAlertsSummary, fetchWarehousesByCenter]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  useEffect(() => {
    fetchConsumption();
  }, [fetchConsumption]);

  // Initialize all warehouses for all centers
  const handleInitializeWarehouses = async () => {
    try {
      setInitializingWarehouses(true);
      const response = await axios.post(`${API}/warehouse/warehouses/initialize-all`);
      toast.success(
        t(
          `تم إنشاء ${response.data.created} مخزن بنجاح`,
          `Created ${response.data.created} warehouses successfully`
        )
      );
      fetchWarehouses();
      fetchWarehousesByCenter();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في إنشاء المخازن", "Failed to initialize warehouses"));
    } finally {
      setInitializingWarehouses(false);
    }
  };

  // Resolve alert
  const handleResolveAlert = async (alertId) => {
    try {
      await axios.post(`${API}/warehouse/alerts/${alertId}/resolve`);
      toast.success(t("تم حل التنبيه", "Alert resolved"));
      fetchAlerts();
      fetchAlertsSummary();
    } catch (error) {
      toast.error(t("فشل في حل التنبيه", "Failed to resolve alert"));
    }
  };

  // Handlers
  const handleCreateWarehouse = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/warehouse/warehouses`, warehouseForm);
      toast.success(t("تم إنشاء المخزن بنجاح", "Warehouse created successfully"));
      setWarehouseDialog(false);
      setWarehouseForm({ 
        name: "", code: "", location: "", warehouse_type: "internal", 
        warehouse_category: "", center_name: "", capacity: "", 
        temperature_controlled: false, supervisor_email: "", supervisor_phone: "",
        warehouse_manager_email: "", warehouse_manager_phone: ""
      });
      fetchWarehouses();
      fetchWarehousesByCenter();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في إنشاء المخزن", "Failed to create warehouse"));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/warehouse/products`, productForm);
      toast.success(t("تم إنشاء المنتج بنجاح", "Product created successfully"));
      setProductDialog(false);
      setProductForm({ name: "", code: "", category_id: "", unit: "piece", unit_price: 0, cost_price: 0, min_quantity: 0, expiry_tracking: false, batch_tracking: false });
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في إنشاء المنتج", "Failed to create product"));
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveStock = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/warehouse/movements/receive`, receiveForm);
      toast.success(t("تم استلام البضاعة بنجاح", "Stock received successfully"));
      setReceiveDialog(false);
      setReceiveForm({ product_id: "", warehouse_id: "", quantity: 0, unit_price: 0, supplier_name: "", batch_number: "", expiry_date: "", reference_number: "", notes: "" });
      fetchStock();
      fetchMovements();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في استلام البضاعة", "Failed to receive stock"));
    } finally {
      setLoading(false);
    }
  };

  const handleIssueStock = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/warehouse/movements/issue`, issueForm);
      toast.success(t("تم صرف البضاعة بنجاح", "Stock issued successfully"));
      setIssueDialog(false);
      setIssueForm({ product_id: "", warehouse_id: "", quantity: 0, unit_price: 0, customer_name: "", reference_number: "", notes: "" });
      fetchStock();
      fetchMovements();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في صرف البضاعة", "Failed to issue stock"));
    } finally {
      setLoading(false);
    }
  };

  const handleTransferStock = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/warehouse/movements/transfer`, transferForm);
      toast.success(t("تم تحويل البضاعة بنجاح", "Stock transferred successfully"));
      setTransferDialog(false);
      setTransferForm({ product_id: "", from_warehouse_id: "", to_warehouse_id: "", quantity: 0, notes: "" });
      fetchStock();
      fetchMovements();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في تحويل البضاعة", "Failed to transfer stock"));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSolution = async () => {
    try {
      setLoading(true);
      const warehouse = warehouses.find(w => w.id === solutionForm.warehouse_id);
      const dataToSend = {
        ...solutionForm,
        warehouse_name: warehouse?.name || "",
      };
      await axios.post(`${API}/warehouse/solutions`, dataToSend);
      toast.success(t("تم إنشاء المحلول بنجاح", "Solution created successfully"));
      setSolutionDialog(false);
      setSolutionForm({ name: "", code: "", solution_type: "reagent", unit: "ml", current_quantity: 0, min_quantity: 0, warehouse_id: "", expiry_date: "", batch_number: "", supplier_name: "", cost_per_unit: 0 });
      fetchSolutions();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في إنشاء المحلول", "Failed to create solution"));
    } finally {
      setLoading(false);
    }
  };

  const handleRecordConsumption = async () => {
    try {
      setLoading(true);
      const solution = solutions.find(s => s.id === consumptionForm.solution_id);
      const dataToSend = {
        ...consumptionForm,
        solution_name: solution?.name || "",
        solution_code: solution?.code || "",
      };
      await axios.post(`${API}/warehouse/solutions/consumption`, dataToSend);
      toast.success(t("تم تسجيل الاستهلاك بنجاح", "Consumption recorded successfully"));
      setConsumptionDialog(false);
      setConsumptionForm({ solution_id: "", consumption_date: new Date().toISOString().split("T")[0], quantity_consumed: 0, test_type: "", test_count: 0, notes: "" });
      fetchSolutions();
      fetchConsumption();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في تسجيل الاستهلاك", "Failed to record consumption"));
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/warehouse/stock/adjust`, adjustForm);
      toast.success(t("تم تعديل المخزون بنجاح", "Stock adjusted successfully"));
      setAdjustDialog(false);
      setAdjustForm({ product_id: "", warehouse_id: "", new_quantity: 0, reason: "" });
      fetchStock();
      fetchMovements();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في تعديل المخزون", "Failed to adjust stock"));
    } finally {
      setLoading(false);
    }
  };

  const handleExportStock = async () => {
    try {
      const params = {};
      if (selectedWarehouse !== "all") params.warehouse_id = selectedWarehouse;
      const response = await axios.get(`${API}/warehouse/export/stock/excel`, {
        params,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `stock_report_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(t("تم التصدير بنجاح", "Exported successfully"));
    } catch (error) {
      toast.error(t("فشل في التصدير", "Export failed"));
    }
  };

  const handleExportMovements = async () => {
    try {
      const params = {
        start_date: dateRange.start,
        end_date: dateRange.end,
      };
      if (movementType !== "all") params.movement_type = movementType;
      const response = await axios.get(`${API}/warehouse/export/movements/excel`, {
        params,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `movements_${dateRange.start}_to_${dateRange.end}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(t("تم التصدير بنجاح", "Exported successfully"));
    } catch (error) {
      toast.error(t("فشل في التصدير", "Export failed"));
    }
  };

  const handleExportSolutions = async () => {
    try {
      const response = await axios.get(`${API}/warehouse/export/solutions/excel`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `solutions_report_${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(t("تم التصدير بنجاح", "Exported successfully"));
    } catch (error) {
      toast.error(t("فشل في التصدير", "Export failed"));
    }
  };

  const getMovementTypeBadge = (type) => {
    const types = {
      receive: { label: t("استلام", "Receive"), color: "bg-green-500" },
      issue: { label: t("صرف", "Issue"), color: "bg-red-500" },
      transfer: { label: t("تحويل", "Transfer"), color: "bg-blue-500" },
      adjust: { label: t("تعديل", "Adjust"), color: "bg-yellow-500" },
      return: { label: t("إرجاع", "Return"), color: "bg-purple-500" },
    };
    const typeInfo = types[type] || { label: type, color: "bg-gray-500" };
    return <Badge className={typeInfo.color}>{typeInfo.label}</Badge>;
  };

  const getSolutionTypeBadge = (type) => {
    const types = {
      reagent: { label: t("كاشف", "Reagent"), color: "bg-blue-500" },
      buffer: { label: t("منظم", "Buffer"), color: "bg-green-500" },
      standard: { label: t("قياسي", "Standard"), color: "bg-purple-500" },
      cleaning: { label: t("تنظيف", "Cleaning"), color: "bg-orange-500" },
    };
    const typeInfo = types[type] || { label: type, color: "bg-gray-500" };
    return <Badge className={typeInfo.color}>{typeInfo.label}</Badge>;
  };

  return (
    <div className="p-4 md:p-6 space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Warehouse className="w-8 h-8 text-primary" />
            {t("إدارة المخازن", "Warehouse Management")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("إدارة شاملة للمخزون والمحاليل والحركات", "Comprehensive inventory, solutions and movements management")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setReceiveDialog(true)} className="bg-green-600 hover:bg-green-700">
            <PackagePlus className="w-4 h-4 me-2" />
            {t("استلام", "Receive")}
          </Button>
          <Button onClick={() => setIssueDialog(true)} className="bg-red-600 hover:bg-red-700">
            <PackageMinus className="w-4 h-4 me-2" />
            {t("صرف", "Issue")}
          </Button>
          <Button onClick={() => setTransferDialog(true)} variant="outline">
            <ArrowRightLeft className="w-4 h-4 me-2" />
            {t("تحويل", "Transfer")}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("المخازن", "Warehouses")}</p>
                <p className="text-2xl font-bold">{summary.total_warehouses || 0}</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("المنتجات", "Products")}</p>
                <p className="text-2xl font-bold">{summary.total_products || 0}</p>
              </div>
              <Package className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("منخفض المخزون", "Low Stock")}</p>
                <p className="text-2xl font-bold text-orange-500">{summary.low_stock_count || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("منتهي الصلاحية", "Expired")}</p>
                <p className="text-2xl font-bold text-red-500">{summary.expired_count || 0}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("حركات اليوم", "Today Moves")}</p>
                <p className="text-2xl font-bold">{summary.today_movements || 0}</p>
              </div>
              <History className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("قيمة المخزون", "Stock Value")}</p>
                <p className="text-xl font-bold text-green-600">{(summary.total_value || 0).toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4" />
            {t("نظرة عامة", "Overview")}
          </TabsTrigger>
          <TabsTrigger value="stock" className="flex items-center gap-1">
            <Package className="w-4 h-4" />
            {t("المخزون", "Stock")}
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center gap-1">
            <History className="w-4 h-4" />
            {t("الحركات", "Movements")}
          </TabsTrigger>
          <TabsTrigger value="solutions" className="flex items-center gap-1">
            <Beaker className="w-4 h-4" />
            {t("المحاليل", "Solutions")}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-1 relative">
            <AlertTriangle className="w-4 h-4" />
            {t("التنبيهات", "Alerts")}
            {alertsSummary.total_unresolved > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {alertsSummary.total_unresolved}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="warehouses" className="flex items-center gap-1">
            <Building2 className="w-4 h-4" />
            {t("المخازن", "Warehouses")}
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-1">
            <Settings className="w-4 h-4" />
            {t("المنتجات", "Products")}
          </TabsTrigger>
        </TabsList>

        {/* Stock Tab */}
        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle>{t("مخزون المنتجات", "Product Stock")}</CardTitle>
                  <CardDescription>{t("عرض وإدارة مخزون المنتجات في جميع المخازن", "View and manage product stock across all warehouses")}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t("بحث...", "Search...")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-9 w-48"
                    />
                  </div>
                  <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder={t("جميع المخازن", "All Warehouses")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("جميع المخازن", "All Warehouses")}</SelectItem>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => setAdjustDialog(true)}>
                    <Edit className="w-4 h-4 me-2" />
                    {t("جرد", "Adjust")}
                  </Button>
                  <Button variant="outline" onClick={handleExportStock}>
                    <FileSpreadsheet className="w-4 h-4 me-2" />
                    {t("تصدير", "Export")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("رمز المنتج", "Product Code")}</TableHead>
                      <TableHead>{t("اسم المنتج", "Product Name")}</TableHead>
                      <TableHead>{t("المخزن", "Warehouse")}</TableHead>
                      <TableHead className="text-center">{t("الكمية", "Quantity")}</TableHead>
                      <TableHead className="text-center">{t("المتاح", "Available")}</TableHead>
                      <TableHead>{t("رقم الدفعة", "Batch No.")}</TableHead>
                      <TableHead>{t("الصلاحية", "Expiry")}</TableHead>
                      <TableHead>{t("الحالة", "Status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stock.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {t("لا يوجد مخزون", "No stock found")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      stock.map((item) => {
                        const product = products.find(p => p.id === item.product_id);
                        const isLowStock = item.quantity <= (product?.min_quantity || 0);
                        const isExpired = item.expiry_date && new Date(item.expiry_date) < new Date();
                        return (
                          <TableRow key={item.id} className={isExpired ? "bg-red-50" : isLowStock ? "bg-orange-50" : ""}>
                            <TableCell className="font-mono">{item.product_code}</TableCell>
                            <TableCell className="font-medium">{item.product_name}</TableCell>
                            <TableCell>{item.warehouse_name}</TableCell>
                            <TableCell className="text-center font-bold">{item.quantity}</TableCell>
                            <TableCell className="text-center">{item.available_quantity}</TableCell>
                            <TableCell>{item.batch_number || "-"}</TableCell>
                            <TableCell>{item.expiry_date || "-"}</TableCell>
                            <TableCell>
                              {isExpired ? (
                                <Badge variant="destructive">{t("منتهي", "Expired")}</Badge>
                              ) : isLowStock ? (
                                <Badge className="bg-orange-500">{t("منخفض", "Low")}</Badge>
                              ) : (
                                <Badge className="bg-green-500">{t("متوفر", "Available")}</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle>{t("حركات المخزون", "Stock Movements")}</CardTitle>
                  <CardDescription>{t("تتبع جميع حركات المخزون", "Track all stock movements")}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="w-40"
                  />
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="w-40"
                  />
                  <Select value={movementType} onValueChange={setMovementType}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("الكل", "All")}</SelectItem>
                      <SelectItem value="receive">{t("استلام", "Receive")}</SelectItem>
                      <SelectItem value="issue">{t("صرف", "Issue")}</SelectItem>
                      <SelectItem value="transfer">{t("تحويل", "Transfer")}</SelectItem>
                      <SelectItem value="adjust">{t("تعديل", "Adjust")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={handleExportMovements}>
                    <Download className="w-4 h-4 me-2" />
                    {t("تصدير", "Export")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("رقم الحركة", "Movement No.")}</TableHead>
                      <TableHead>{t("التاريخ", "Date")}</TableHead>
                      <TableHead>{t("النوع", "Type")}</TableHead>
                      <TableHead>{t("المنتج", "Product")}</TableHead>
                      <TableHead className="text-center">{t("الكمية", "Qty")}</TableHead>
                      <TableHead>{t("من", "From")}</TableHead>
                      <TableHead>{t("إلى", "To")}</TableHead>
                      <TableHead>{t("المسؤول", "By")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {t("لا توجد حركات", "No movements found")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      movements.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-mono text-xs">{m.movement_number}</TableCell>
                          <TableCell>{m.movement_date?.split("T")[0]}</TableCell>
                          <TableCell>{getMovementTypeBadge(m.movement_type)}</TableCell>
                          <TableCell>{m.product_name}</TableCell>
                          <TableCell className="text-center font-bold">{m.quantity}</TableCell>
                          <TableCell>{m.from_warehouse_name || m.supplier_name || "-"}</TableCell>
                          <TableCell>{m.to_warehouse_name || m.customer_name || "-"}</TableCell>
                          <TableCell className="text-sm">{m.created_by_name}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Solutions Tab */}
        <TabsContent value="solutions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle>{t("المحاليل والفحوصات", "Solutions & Tests")}</CardTitle>
                  <CardDescription>{t("إدارة المحاليل وتتبع الاستهلاك اليومي", "Manage solutions and track daily consumption")}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setSolutionDialog(true)}>
                    <Plus className="w-4 h-4 me-2" />
                    {t("إضافة محلول", "Add Solution")}
                  </Button>
                  <Button variant="outline" onClick={() => setConsumptionDialog(true)}>
                    <Beaker className="w-4 h-4 me-2" />
                    {t("تسجيل استهلاك", "Record Consumption")}
                  </Button>
                  <Button variant="outline" onClick={handleExportSolutions}>
                    <FileSpreadsheet className="w-4 h-4 me-2" />
                    {t("تصدير", "Export")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("الرمز", "Code")}</TableHead>
                      <TableHead>{t("اسم المحلول", "Solution Name")}</TableHead>
                      <TableHead>{t("النوع", "Type")}</TableHead>
                      <TableHead className="text-center">{t("الكمية", "Qty")}</TableHead>
                      <TableHead className="text-center">{t("الحد الأدنى", "Min")}</TableHead>
                      <TableHead>{t("الصلاحية", "Expiry")}</TableHead>
                      <TableHead>{t("الحالة", "Status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {solutions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t("لا توجد محاليل", "No solutions found")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      solutions.map((sol) => {
                        const isLow = sol.current_quantity <= sol.min_quantity;
                        const isExpired = sol.expiry_date && new Date(sol.expiry_date) < new Date();
                        return (
                          <TableRow key={sol.id} className={isExpired ? "bg-red-50" : isLow ? "bg-orange-50" : ""}>
                            <TableCell className="font-mono">{sol.code}</TableCell>
                            <TableCell className="font-medium">{sol.name}</TableCell>
                            <TableCell>{getSolutionTypeBadge(sol.solution_type)}</TableCell>
                            <TableCell className="text-center font-bold">{sol.current_quantity} {sol.unit}</TableCell>
                            <TableCell className="text-center">{sol.min_quantity}</TableCell>
                            <TableCell>{sol.expiry_date || "-"}</TableCell>
                            <TableCell>
                              {isExpired ? (
                                <Badge variant="destructive">{t("منتهي", "Expired")}</Badge>
                              ) : isLow ? (
                                <Badge className="bg-orange-500">{t("منخفض", "Low")}</Badge>
                              ) : (
                                <Badge className="bg-green-500">{t("متوفر", "OK")}</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Consumption History */}
          <Card>
            <CardHeader>
              <CardTitle>{t("سجل الاستهلاك", "Consumption History")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("التاريخ", "Date")}</TableHead>
                      <TableHead>{t("المحلول", "Solution")}</TableHead>
                      <TableHead className="text-center">{t("الكمية", "Qty")}</TableHead>
                      <TableHead>{t("نوع الفحص", "Test Type")}</TableHead>
                      <TableHead className="text-center">{t("عدد الفحوصات", "Tests")}</TableHead>
                      <TableHead>{t("المسؤول", "By")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consumption.slice(0, 20).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.consumption_date}</TableCell>
                        <TableCell>{c.solution_name}</TableCell>
                        <TableCell className="text-center font-bold">{c.quantity_consumed}</TableCell>
                        <TableCell>{c.test_type || "-"}</TableCell>
                        <TableCell className="text-center">{c.test_count || "-"}</TableCell>
                        <TableCell>{c.created_by_name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t("المخازن", "Warehouses")}</CardTitle>
                  <CardDescription>{t("إدارة مواقع التخزين", "Manage storage locations")}</CardDescription>
                </div>
                <Button onClick={() => setWarehouseDialog(true)}>
                  <Plus className="w-4 h-4 me-2" />
                  {t("إضافة مخزن", "Add Warehouse")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {warehouses.map((w) => (
                  <Card key={w.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-lg">{w.name}</h3>
                          <p className="text-sm text-muted-foreground">{w.code}</p>
                        </div>
                        <Badge variant={w.status === "active" ? "default" : "secondary"}>
                          {w.status === "active" ? t("نشط", "Active") : t("غير نشط", "Inactive")}
                        </Badge>
                      </div>
                      <div className="mt-4 space-y-2 text-sm">
                        <p><span className="text-muted-foreground">{t("الموقع:", "Location:")}</span> {w.location}</p>
                        <p><span className="text-muted-foreground">{t("النوع:", "Type:")}</span> {w.warehouse_type}</p>
                        {w.capacity && <p><span className="text-muted-foreground">{t("السعة:", "Capacity:")}</span> {w.capacity}</p>}
                        {w.temperature_controlled && (
                          <Badge variant="outline" className="mt-2">{t("تحكم بالحرارة", "Temperature Controlled")}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t("المنتجات", "Products")}</CardTitle>
                  <CardDescription>{t("إدارة الأصناف والمنتجات", "Manage items and products")}</CardDescription>
                </div>
                <Button onClick={() => setProductDialog(true)}>
                  <Plus className="w-4 h-4 me-2" />
                  {t("إضافة منتج", "Add Product")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("الرمز", "Code")}</TableHead>
                      <TableHead>{t("الاسم", "Name")}</TableHead>
                      <TableHead>{t("الوحدة", "Unit")}</TableHead>
                      <TableHead className="text-center">{t("سعر البيع", "Price")}</TableHead>
                      <TableHead className="text-center">{t("التكلفة", "Cost")}</TableHead>
                      <TableHead className="text-center">{t("الحد الأدنى", "Min Qty")}</TableHead>
                      <TableHead>{t("الحالة", "Status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono">{p.code}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{p.unit}</TableCell>
                        <TableCell className="text-center">{p.unit_price}</TableCell>
                        <TableCell className="text-center">{p.cost_price}</TableCell>
                        <TableCell className="text-center">{p.min_quantity}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "active" ? "default" : "secondary"}>
                            {p.status === "active" ? t("نشط", "Active") : t("غير نشط", "Inactive")}
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

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Low Stock Alert */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="w-5 h-5" />
                  {t("تنبيهات المخزون المنخفض", "Low Stock Alerts")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stock.filter(s => {
                  const product = products.find(p => p.id === s.product_id);
                  return s.quantity <= (product?.min_quantity || 0);
                }).slice(0, 5).map(s => (
                  <div key={s.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span>{s.product_name}</span>
                    <Badge className="bg-orange-500">{s.quantity}</Badge>
                  </div>
                ))}
                {stock.filter(s => {
                  const product = products.find(p => p.id === s.product_id);
                  return s.quantity <= (product?.min_quantity || 0);
                }).length === 0 && (
                  <p className="text-muted-foreground text-center py-4">{t("لا توجد تنبيهات", "No alerts")}</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Movements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  {t("آخر الحركات", "Recent Movements")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {movements.slice(0, 5).map(m => (
                  <div key={m.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{m.product_name}</p>
                      <p className="text-xs text-muted-foreground">{m.movement_date?.split("T")[0]}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getMovementTypeBadge(m.movement_type)}
                      <span className="font-bold">{m.quantity}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Warehouse Dialog */}
      <Dialog open={warehouseDialog} onOpenChange={setWarehouseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("إضافة مخزن جديد", "Add New Warehouse")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("اسم المخزن", "Warehouse Name")}</Label>
                <Input
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("الرمز", "Code")}</Label>
                <Input
                  value={warehouseForm.code}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>{t("الموقع", "Location")}</Label>
              <Input
                value={warehouseForm.location}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("النوع", "Type")}</Label>
                <Select value={warehouseForm.warehouse_type} onValueChange={(v) => setWarehouseForm({ ...warehouseForm, warehouse_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">{t("رئيسي", "Main")}</SelectItem>
                    <SelectItem value="branch">{t("فرعي", "Branch")}</SelectItem>
                    <SelectItem value="cold">{t("مبرد", "Cold Storage")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("السعة", "Capacity")}</Label>
                <Input
                  type="number"
                  value={warehouseForm.capacity}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, capacity: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarehouseDialog(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button onClick={handleCreateWarehouse} disabled={loading}>{t("حفظ", "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("إضافة منتج جديد", "Add New Product")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("اسم المنتج", "Product Name")}</Label>
                <Input
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("الرمز", "Code")}</Label>
                <Input
                  value={productForm.code}
                  onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("الوحدة", "Unit")}</Label>
                <Select value={productForm.unit} onValueChange={(v) => setProductForm({ ...productForm, unit: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piece">{t("قطعة", "Piece")}</SelectItem>
                    <SelectItem value="kg">{t("كيلو", "KG")}</SelectItem>
                    <SelectItem value="liter">{t("لتر", "Liter")}</SelectItem>
                    <SelectItem value="box">{t("صندوق", "Box")}</SelectItem>
                    <SelectItem value="pack">{t("علبة", "Pack")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("الحد الأدنى", "Min Quantity")}</Label>
                <Input
                  type="number"
                  value={productForm.min_quantity}
                  onChange={(e) => setProductForm({ ...productForm, min_quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("سعر البيع", "Selling Price")}</Label>
                <Input
                  type="number"
                  value={productForm.unit_price}
                  onChange={(e) => setProductForm({ ...productForm, unit_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>{t("سعر التكلفة", "Cost Price")}</Label>
                <Input
                  type="number"
                  value={productForm.cost_price}
                  onChange={(e) => setProductForm({ ...productForm, cost_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialog(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button onClick={handleCreateProduct} disabled={loading}>{t("حفظ", "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Dialog */}
      <Dialog open={receiveDialog} onOpenChange={setReceiveDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <PackagePlus className="w-5 h-5" />
              {t("استلام بضاعة", "Receive Stock")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("المنتج", "Product")}</Label>
              <Select value={receiveForm.product_id} onValueChange={(v) => setReceiveForm({ ...receiveForm, product_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("اختر المنتج", "Select Product")} />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("المخزن", "Warehouse")}</Label>
              <Select value={receiveForm.warehouse_id} onValueChange={(v) => setReceiveForm({ ...receiveForm, warehouse_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("اختر المخزن", "Select Warehouse")} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("الكمية", "Quantity")}</Label>
                <Input
                  type="number"
                  value={receiveForm.quantity}
                  onChange={(e) => setReceiveForm({ ...receiveForm, quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>{t("سعر الوحدة", "Unit Price")}</Label>
                <Input
                  type="number"
                  value={receiveForm.unit_price}
                  onChange={(e) => setReceiveForm({ ...receiveForm, unit_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <Label>{t("المورد", "Supplier")}</Label>
              <Input
                value={receiveForm.supplier_name}
                onChange={(e) => setReceiveForm({ ...receiveForm, supplier_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("رقم الدفعة", "Batch Number")}</Label>
                <Input
                  value={receiveForm.batch_number}
                  onChange={(e) => setReceiveForm({ ...receiveForm, batch_number: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("تاريخ الصلاحية", "Expiry Date")}</Label>
                <Input
                  type="date"
                  value={receiveForm.expiry_date}
                  onChange={(e) => setReceiveForm({ ...receiveForm, expiry_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>{t("ملاحظات", "Notes")}</Label>
              <Textarea
                value={receiveForm.notes}
                onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveDialog(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button onClick={handleReceiveStock} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {t("استلام", "Receive")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Dialog */}
      <Dialog open={issueDialog} onOpenChange={setIssueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <PackageMinus className="w-5 h-5" />
              {t("صرف بضاعة", "Issue Stock")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("المنتج", "Product")}</Label>
              <Select value={issueForm.product_id} onValueChange={(v) => setIssueForm({ ...issueForm, product_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("اختر المنتج", "Select Product")} />
                </SelectTrigger>
                <SelectContent>
                  {stock.map((s) => (
                    <SelectItem key={s.id} value={s.product_id}>
                      {s.product_name} - {t("متوفر:", "Available:")} {s.available_quantity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("المخزن", "Warehouse")}</Label>
              <Select value={issueForm.warehouse_id} onValueChange={(v) => setIssueForm({ ...issueForm, warehouse_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("اختر المخزن", "Select Warehouse")} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("الكمية", "Quantity")}</Label>
                <Input
                  type="number"
                  value={issueForm.quantity}
                  onChange={(e) => setIssueForm({ ...issueForm, quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>{t("العميل", "Customer")}</Label>
                <Input
                  value={issueForm.customer_name}
                  onChange={(e) => setIssueForm({ ...issueForm, customer_name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>{t("ملاحظات", "Notes")}</Label>
              <Textarea
                value={issueForm.notes}
                onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIssueDialog(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button onClick={handleIssueStock} disabled={loading} className="bg-red-600 hover:bg-red-700">
              {t("صرف", "Issue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialog} onOpenChange={setTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <ArrowRightLeft className="w-5 h-5" />
              {t("تحويل بضاعة", "Transfer Stock")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("المنتج", "Product")}</Label>
              <Select value={transferForm.product_id} onValueChange={(v) => setTransferForm({ ...transferForm, product_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("اختر المنتج", "Select Product")} />
                </SelectTrigger>
                <SelectContent>
                  {stock.map((s) => (
                    <SelectItem key={s.id} value={s.product_id}>
                      {s.product_name} ({s.warehouse_name}) - {s.available_quantity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("من مخزن", "From Warehouse")}</Label>
                <Select value={transferForm.from_warehouse_id} onValueChange={(v) => setTransferForm({ ...transferForm, from_warehouse_id: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("إلى مخزن", "To Warehouse")}</Label>
                <Select value={transferForm.to_warehouse_id} onValueChange={(v) => setTransferForm({ ...transferForm, to_warehouse_id: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.filter(w => w.id !== transferForm.from_warehouse_id).map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t("الكمية", "Quantity")}</Label>
              <Input
                type="number"
                value={transferForm.quantity}
                onChange={(e) => setTransferForm({ ...transferForm, quantity: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>{t("ملاحظات", "Notes")}</Label>
              <Textarea
                value={transferForm.notes}
                onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialog(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button onClick={handleTransferStock} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {t("تحويل", "Transfer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Solution Dialog */}
      <Dialog open={solutionDialog} onOpenChange={setSolutionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("إضافة محلول", "Add Solution")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("اسم المحلول", "Solution Name")}</Label>
                <Input
                  value={solutionForm.name}
                  onChange={(e) => setSolutionForm({ ...solutionForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("الرمز", "Code")}</Label>
                <Input
                  value={solutionForm.code}
                  onChange={(e) => setSolutionForm({ ...solutionForm, code: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("النوع", "Type")}</Label>
                <Select value={solutionForm.solution_type} onValueChange={(v) => setSolutionForm({ ...solutionForm, solution_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reagent">{t("كاشف", "Reagent")}</SelectItem>
                    <SelectItem value="buffer">{t("محلول منظم", "Buffer")}</SelectItem>
                    <SelectItem value="standard">{t("محلول قياسي", "Standard")}</SelectItem>
                    <SelectItem value="cleaning">{t("محلول تنظيف", "Cleaning")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("الوحدة", "Unit")}</Label>
                <Select value={solutionForm.unit} onValueChange={(v) => setSolutionForm({ ...solutionForm, unit: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="L">L</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("الكمية الحالية", "Current Quantity")}</Label>
                <Input
                  type="number"
                  value={solutionForm.current_quantity}
                  onChange={(e) => setSolutionForm({ ...solutionForm, current_quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>{t("الحد الأدنى", "Min Quantity")}</Label>
                <Input
                  type="number"
                  value={solutionForm.min_quantity}
                  onChange={(e) => setSolutionForm({ ...solutionForm, min_quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <Label>{t("المخزن", "Warehouse")}</Label>
              <Select value={solutionForm.warehouse_id} onValueChange={(v) => setSolutionForm({ ...solutionForm, warehouse_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("اختر المخزن", "Select Warehouse")} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("تاريخ الصلاحية", "Expiry Date")}</Label>
                <Input
                  type="date"
                  value={solutionForm.expiry_date}
                  onChange={(e) => setSolutionForm({ ...solutionForm, expiry_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("رقم الدفعة", "Batch Number")}</Label>
                <Input
                  value={solutionForm.batch_number}
                  onChange={(e) => setSolutionForm({ ...solutionForm, batch_number: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSolutionDialog(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button onClick={handleCreateSolution} disabled={loading}>{t("حفظ", "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consumption Dialog */}
      <Dialog open={consumptionDialog} onOpenChange={setConsumptionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("تسجيل استهلاك", "Record Consumption")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("المحلول", "Solution")}</Label>
              <Select value={consumptionForm.solution_id} onValueChange={(v) => setConsumptionForm({ ...consumptionForm, solution_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("اختر المحلول", "Select Solution")} />
                </SelectTrigger>
                <SelectContent>
                  {solutions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} - {t("متوفر:", "Available:")} {s.current_quantity} {s.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("تاريخ الاستهلاك", "Consumption Date")}</Label>
                <Input
                  type="date"
                  value={consumptionForm.consumption_date}
                  onChange={(e) => setConsumptionForm({ ...consumptionForm, consumption_date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("الكمية المستهلكة", "Quantity Consumed")}</Label>
                <Input
                  type="number"
                  value={consumptionForm.quantity_consumed}
                  onChange={(e) => setConsumptionForm({ ...consumptionForm, quantity_consumed: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("نوع الفحص", "Test Type")}</Label>
                <Input
                  value={consumptionForm.test_type}
                  onChange={(e) => setConsumptionForm({ ...consumptionForm, test_type: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("عدد الفحوصات", "Test Count")}</Label>
                <Input
                  type="number"
                  value={consumptionForm.test_count}
                  onChange={(e) => setConsumptionForm({ ...consumptionForm, test_count: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <Label>{t("ملاحظات", "Notes")}</Label>
              <Textarea
                value={consumptionForm.notes}
                onChange={(e) => setConsumptionForm({ ...consumptionForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConsumptionDialog(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button onClick={handleRecordConsumption} disabled={loading}>{t("تسجيل", "Record")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialog} onOpenChange={setAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("تعديل مخزون (جرد)", "Adjust Stock (Inventory)")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("المخزن", "Warehouse")}</Label>
              <Select value={adjustForm.warehouse_id} onValueChange={(v) => setAdjustForm({ ...adjustForm, warehouse_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("اختر المخزن", "Select Warehouse")} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("المنتج", "Product")}</Label>
              <Select value={adjustForm.product_id} onValueChange={(v) => setAdjustForm({ ...adjustForm, product_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("اختر المنتج", "Select Product")} />
                </SelectTrigger>
                <SelectContent>
                  {stock.filter(s => !adjustForm.warehouse_id || s.warehouse_id === adjustForm.warehouse_id).map((s) => (
                    <SelectItem key={s.id} value={s.product_id}>
                      {s.product_name} - {t("الكمية الحالية:", "Current:")} {s.quantity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("الكمية الجديدة", "New Quantity")}</Label>
              <Input
                type="number"
                value={adjustForm.new_quantity}
                onChange={(e) => setAdjustForm({ ...adjustForm, new_quantity: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>{t("السبب", "Reason")}</Label>
              <Textarea
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                placeholder={t("مثال: جرد شهري، تلف، فقدان...", "Example: Monthly inventory, damage, loss...")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button onClick={handleAdjustStock} disabled={loading}>{t("تعديل", "Adjust")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WarehouseManagement;
