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
  ShoppingCart,
} from "lucide-react";
import MaterialIssue from "./MaterialIssue";

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
    parent_warehouse_id: "",
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
      const formData = { ...warehouseForm };
      // إزالة parent_warehouse_id إذا كان فارغاً
      if (!formData.parent_warehouse_id) {
        delete formData.parent_warehouse_id;
      }
      await axios.post(`${API}/warehouse/warehouses`, formData);
      toast.success(t("تم إنشاء المخزن بنجاح", "Warehouse created successfully"));
      setWarehouseDialog(false);
      setWarehouseForm({ 
        name: "", code: "", location: "", warehouse_type: "internal", 
        warehouse_category: "", center_name: "", capacity: "", 
        temperature_controlled: false, supervisor_email: "", supervisor_phone: "",
        warehouse_manager_email: "", warehouse_manager_phone: "", parent_warehouse_id: ""
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
          <TabsTrigger value="storage-locations" className="flex items-center gap-1">
            <Warehouse className="w-4 h-4" />
            {t("مواقع التخزين", "Storage Locations")}
          </TabsTrigger>
          <TabsTrigger value="fixed-assets" className="flex items-center gap-1">
            <Package className="w-4 h-4" />
            {t("الأصول الثابتة", "Fixed Assets")}
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-1">
            <Settings className="w-4 h-4" />
            {t("المنتجات", "Products")}
          </TabsTrigger>
          <TabsTrigger value="material-issue" className="flex items-center gap-1">
            <ShoppingCart className="w-4 h-4" />
            {t("صرف المواد", "Material Issue")}
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

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    {t("تنبيهات المخزون", "Stock Alerts")}
                  </CardTitle>
                  <CardDescription>
                    {t("تنبيهات نقص المخزون وانتهاء الصلاحية", "Low stock and expiry alerts")}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => { fetchAlerts(); fetchAlertsSummary(); }}
                  >
                    <RefreshCw className="w-4 h-4 me-2" />
                    {t("تحديث", "Refresh")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Alert Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-red-600">{t("حرج", "Critical")}</p>
                    <p className="text-2xl font-bold text-red-700">{alertsSummary.by_priority?.critical || 0}</p>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-orange-600">{t("عالي", "High")}</p>
                    <p className="text-2xl font-bold text-orange-700">{alertsSummary.by_priority?.high || 0}</p>
                  </CardContent>
                </Card>
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-yellow-600">{t("متوسط", "Medium")}</p>
                    <p className="text-2xl font-bold text-yellow-700">{alertsSummary.by_priority?.medium || 0}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-blue-600">{t("منخفض", "Low")}</p>
                    <p className="text-2xl font-bold text-blue-700">{alertsSummary.by_priority?.low || 0}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Alerts List */}
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">{t("لا توجد تنبيهات حالياً", "No alerts at the moment")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <Card key={alert.id} className={`border-s-4 ${
                      alert.priority === 'critical' ? 'border-s-red-500 bg-red-50/50' :
                      alert.priority === 'high' ? 'border-s-orange-500 bg-orange-50/50' :
                      alert.priority === 'medium' ? 'border-s-yellow-500 bg-yellow-50/50' :
                      'border-s-blue-500 bg-blue-50/50'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={
                                alert.priority === 'critical' ? 'bg-red-500' :
                                alert.priority === 'high' ? 'bg-orange-500' :
                                alert.priority === 'medium' ? 'bg-yellow-500' :
                                'bg-blue-500'
                              }>
                                {alert.priority === 'critical' ? t("حرج", "Critical") :
                                 alert.priority === 'high' ? t("عالي", "High") :
                                 alert.priority === 'medium' ? t("متوسط", "Medium") :
                                 t("منخفض", "Low")}
                              </Badge>
                              <Badge variant="outline">
                                {alert.alert_type === 'low_stock' ? t("نقص مخزون", "Low Stock") :
                                 alert.alert_type === 'expiry_warning' ? t("قرب انتهاء الصلاحية", "Expiry Warning") :
                                 alert.alert_type === 'expired' ? t("منتهي الصلاحية", "Expired") :
                                 alert.alert_type}
                              </Badge>
                            </div>
                            <p className="font-medium text-lg">{alert.message}</p>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                              <span>{t("المنتج:", "Product:")} {alert.product_name}</span>
                              <span>{t("المخزن:", "Warehouse:")} {alert.warehouse_name}</span>
                              {alert.center_name && <span>{t("المركز:", "Center:")} {alert.center_name}</span>}
                              <span>{t("الكمية:", "Qty:")} {alert.current_quantity} / {alert.min_quantity}</span>
                              {alert.expiry_date && <span>{t("الصلاحية:", "Expiry:")} {alert.expiry_date}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(alert.created_at).toLocaleString(language === "ar" ? "ar-OM" : "en-US")}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleResolveAlert(alert.id)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-100"
                          >
                            ✓ {t("تم الحل", "Resolved")}
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

        {/* Warehouses Tab */}
        <TabsContent value="warehouses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle>{t("المخازن", "Warehouses")}</CardTitle>
                  <CardDescription>{t("إدارة مواقع التخزين لجميع المراكز", "Manage storage locations for all centers")}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={selectedCenter} onValueChange={setSelectedCenter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t("كل المراكز", "All Centers")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("كل المراكز", "All Centers")}</SelectItem>
                      {centers.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    onClick={handleInitializeWarehouses}
                    disabled={initializingWarehouses}
                  >
                    {initializingWarehouses ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : <Building2 className="w-4 h-4 me-2" />}
                    {t("تهيئة مخازن جميع المراكز", "Initialize All Centers")}
                  </Button>
                  <Button onClick={() => setWarehouseDialog(true)}>
                    <Plus className="w-4 h-4 me-2" />
                    {t("إضافة مخزن", "Add Warehouse")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Group by Center */}
              {selectedCenter === "all" ? (
                <div className="space-y-6">
                  {centers.map((center) => {
                    const centerWarehouses = warehouses.filter(w => w.center_name === center);
                    if (centerWarehouses.length === 0) return null;
                    return (
                      <div key={center}>
                        <h3 className="text-lg font-bold mb-3 border-b pb-2">{t("مركز", "Center")} {center}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {centerWarehouses.map((w) => (
                            <Card key={w.id} className={`border-2 ${w.warehouse_type === 'internal' ? 'border-blue-200' : 'border-green-200'}`}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-bold">{w.name}</h4>
                                    <p className="text-xs text-muted-foreground">{w.code}</p>
                                  </div>
                                  <Badge variant={w.status === "active" ? "default" : "secondary"}>
                                    {w.status === "active" ? t("نشط", "Active") : t("غير نشط", "Inactive")}
                                  </Badge>
                                </div>
                                <div className="mt-3 space-y-1 text-sm">
                                  <div className="flex gap-2">
                                    <Badge variant="outline" className={w.warehouse_type === 'internal' ? 'bg-blue-50' : 'bg-green-50'}>
                                      {w.warehouse_type === 'internal' ? t("داخلي", "Internal") : t("خارجي", "External")}
                                    </Badge>
                                    {w.warehouse_category && (
                                      <Badge variant="outline">
                                        {w.warehouse_category === 'lab' ? t("مختبر", "Lab") :
                                         w.warehouse_category === 'maintenance' ? t("صيانة", "Maintenance") :
                                         w.warehouse_category === 'cleaning' ? t("تنظيف", "Cleaning") :
                                         w.warehouse_category === 'ppe' ? t("حماية", "PPE") :
                                         w.warehouse_category === 'feed' ? t("أعلاف", "Feed") :
                                         w.warehouse_category === 'equipment' ? t("معدات", "Equipment") :
                                         w.warehouse_category === 'supplies' ? t("مستلزمات", "Supplies") :
                                         w.warehouse_category}
                                      </Badge>
                                    )}
                                  </div>
                                  {w.temperature_controlled && (
                                    <Badge variant="outline" className="bg-cyan-50">{t("تحكم بالحرارة", "Temp Controlled")}</Badge>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {/* Warehouses without center */}
                  {warehouses.filter(w => !w.center_name).length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold mb-3 border-b pb-2">{t("مخازن عامة", "General Warehouses")}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {warehouses.filter(w => !w.center_name).map((w) => (
                          <Card key={w.id} className="border-2">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-bold">{w.name}</h4>
                                  <p className="text-xs text-muted-foreground">{w.code}</p>
                                </div>
                                <Badge variant={w.status === "active" ? "default" : "secondary"}>
                                  {w.status === "active" ? t("نشط", "Active") : t("غير نشط", "Inactive")}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-2">{w.location}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {warehouses.map((w) => (
                    <Card key={w.id} className={`border-2 ${w.warehouse_type === 'internal' ? 'border-blue-200' : 'border-green-200'}`}>
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
                          <div className="flex gap-2">
                            <Badge variant="outline" className={w.warehouse_type === 'internal' ? 'bg-blue-50' : 'bg-green-50'}>
                              {w.warehouse_type === 'internal' ? t("داخلي", "Internal") : t("خارجي", "External")}
                            </Badge>
                            {w.warehouse_category && (
                              <Badge variant="outline">{w.warehouse_category}</Badge>
                            )}
                          </div>
                          {w.temperature_controlled && (
                            <Badge variant="outline" className="mt-2">{t("تحكم بالحرارة", "Temperature Controlled")}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
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

        {/* Material Issue Tab */}
        <TabsContent value="material-issue">
          <MaterialIssue embedded={true} />
        </TabsContent>

        {/* Storage Locations Tab - مواقع التخزين لجميع المراكز */}
        <TabsContent value="storage-locations" className="space-y-4">
          <StorageLocationsSection 
            t={t} 
            language={language} 
            centers={centers} 
            warehousesByCenter={warehousesByCenter}
            onAddWarehouse={() => setWarehouseDialog(true)}
            onInitialize={handleInitializeWarehouses}
            initializingWarehouses={initializingWarehouses}
          />
        </TabsContent>

        {/* Fixed Assets Tab - الأصول الثابتة */}
        <TabsContent value="fixed-assets" className="space-y-4">
          <FixedAssetsSection t={t} language={language} centers={centers} warehouses={warehouses} />
        </TabsContent>
      </Tabs>

      {/* Warehouse Dialog */}
      <Dialog open={warehouseDialog} onOpenChange={setWarehouseDialog}>
        <DialogContent className="max-w-lg">
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
                  placeholder={t("مثال: مخزن المختبر", "e.g., Lab Storage")}
                />
              </div>
              <div>
                <Label>{t("الرمز", "Code")}</Label>
                <Input
                  value={warehouseForm.code}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                  placeholder={t("مثال: LAB-001", "e.g., LAB-001")}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("المركز", "Center")}</Label>
                <Select 
                  value={warehouseForm.center_name || ''} 
                  onValueChange={(v) => setWarehouseForm({ ...warehouseForm, center_name: v, parent_warehouse_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("اختر المركز", "Select Center")} />
                  </SelectTrigger>
                  <SelectContent>
                    {centers.map((center) => (
                      <SelectItem key={center} value={center}>{center}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("نوع المخزن", "Warehouse Type")}</Label>
                <Select 
                  value={warehouseForm.warehouse_type} 
                  onValueChange={(v) => setWarehouseForm({ ...warehouseForm, warehouse_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external">{t("خارجي (رئيسي)", "External (Main)")}</SelectItem>
                    <SelectItem value="internal">{t("داخلي (فرعي)", "Internal (Sub)")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Parent Warehouse - only show if center selected */}
            {warehouseForm.center_name && (
              <div>
                <Label>{t("المخزن الأب (اختياري)", "Parent Warehouse (Optional)")}</Label>
                <Select 
                  value={warehouseForm.parent_warehouse_id || 'none'} 
                  onValueChange={(v) => setWarehouseForm({ ...warehouseForm, parent_warehouse_id: v === 'none' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("بدون مخزن أب", "No Parent")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("بدون مخزن أب (مستقل)", "No Parent (Independent)")}</SelectItem>
                    {warehouses
                      .filter(w => w.center_name === warehouseForm.center_name)
                      .map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} ({w.warehouse_type === 'external' ? t('خارجي', 'External') : t('داخلي', 'Internal')})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>{t("تصنيف المخزن", "Warehouse Category")}</Label>
              <Select 
                value={warehouseForm.warehouse_category || 'general'} 
                onValueChange={(v) => setWarehouseForm({ ...warehouseForm, warehouse_category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">{t("عام", "General")}</SelectItem>
                  <SelectItem value="lab">{t("مختبر", "Lab")}</SelectItem>
                  <SelectItem value="maintenance">{t("صيانة", "Maintenance")}</SelectItem>
                  <SelectItem value="cleaning">{t("تنظيف", "Cleaning")}</SelectItem>
                  <SelectItem value="ppe">{t("معدات الحماية", "PPE")}</SelectItem>
                  <SelectItem value="feed">{t("أعلاف", "Feed")}</SelectItem>
                  <SelectItem value="equipment">{t("معدات", "Equipment")}</SelectItem>
                  <SelectItem value="supplies">{t("مستلزمات", "Supplies")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("الموقع", "Location")}</Label>
                <Input
                  value={warehouseForm.location}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
                  placeholder={t("مثال: المبنى أ", "e.g., Building A")}
                />
              </div>
              <div>
                <Label>{t("السعة", "Capacity")}</Label>
                <Input
                  type="number"
                  value={warehouseForm.capacity}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, capacity: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="temperature_controlled"
                checked={warehouseForm.temperature_controlled || false}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, temperature_controlled: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="temperature_controlled" className="cursor-pointer">
                {t("مخزن مبرد / تحكم بالحرارة", "Cold Storage / Temperature Controlled")}
              </Label>
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

// ==================== Storage Locations Section Component ====================
const StorageLocationsSection = ({ t, language, centers, warehousesByCenter, onAddWarehouse, onInitialize, initializingWarehouses }) => {
  
  // تجميع المخازن لكل مركز (external أولاً ثم internal)
  const getCenterWarehouses = (centerName) => {
    const centerData = warehousesByCenter[centerName];
    if (!centerData) return [];
    // إعطاء الأولوية للمخازن الخارجية
    return [...(centerData.external || []), ...(centerData.internal || [])];
  };
  
  // الحصول على المخازن الرئيسية (بدون parent) - الخارجية أولاً
  const getRootWarehouses = (centerName) => {
    const allWarehouses = getCenterWarehouses(centerName);
    const roots = allWarehouses.filter(w => !w.parent_warehouse_id);
    // ترتيب: الخارجية أولاً ثم الداخلية
    return roots.sort((a, b) => {
      if (a.warehouse_type === 'external' && b.warehouse_type !== 'external') return -1;
      if (a.warehouse_type !== 'external' && b.warehouse_type === 'external') return 1;
      return 0;
    });
  };
  
  // الحصول على المخازن الفرعية
  const getChildWarehouses = (centerName, parentId) => {
    return getCenterWarehouses(centerName).filter(w => w.parent_warehouse_id === parentId);
  };
  
  // الحصول على عدد المنتجات
  const getProductCount = (warehouseId) => {
    // يمكن إضافة API لجلب عدد المنتجات لكل مخزن
    return 0;
  };
  
  const getWarehouseTypeBadge = (warehouseType) => {
    if (warehouseType === "external") {
      return <Badge className="bg-blue-100 text-blue-800">{t("خارجي", "External")}</Badge>;
    } else if (warehouseType === "internal") {
      return <Badge className="bg-green-100 text-green-800">{t("داخلي", "Internal")}</Badge>;
    }
    return <Badge variant="outline">{warehouseType}</Badge>;
  };
  
  const getCategoryLabel = (category) => {
    const categories = {
      lab: t("مختبر", "Lab"),
      maintenance: t("صيانة", "Maintenance"),
      cleaning: t("تنظيف", "Cleaning"),
      ppe: t("حماية", "PPE"),
      feed: t("أعلاف", "Feed"),
      equipment: t("معدات", "Equipment"),
      supplies: t("مستلزمات", "Supplies")
    };
    return categories[category] || category || t("عام", "General");
  };
  
  const getTotalWarehouses = () => {
    return centers.reduce((total, centerName) => {
      return total + getCenterWarehouses(centerName).length;
    }, 0);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-primary" />
              {t("مواقع التخزين الهرمية", "Hierarchical Storage Locations")}
            </CardTitle>
            <CardDescription>
              {t("عرض هرمي للمخازن حسب المركز - مخزن رئيسي ← داخلي ← فرعي", 
                "Hierarchical view of warehouses by center - Main → Internal → Sub")}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-sm">
              {getTotalWarehouses()} {t("مخزن", "warehouses")}
            </Badge>
            <Button 
              variant="outline" 
              onClick={onInitialize}
              disabled={initializingWarehouses}
            >
              {initializingWarehouses ? (
                <RefreshCw className="w-4 h-4 animate-spin me-2" />
              ) : (
                <Building2 className="w-4 h-4 me-2" />
              )}
              {t("تهيئة المخازن", "Initialize Warehouses")}
            </Button>
            <Button onClick={onAddWarehouse}>
              <Plus className="w-4 h-4 me-2" />
              {t("إضافة مخزن", "Add Warehouse")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {centers.map((centerName) => {
            const centerWarehouses = getCenterWarehouses(centerName);
            const rootWarehouses = getRootWarehouses(centerName);
            
            return (
              <div key={centerName} className="border rounded-lg overflow-hidden">
                {/* Center Header */}
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{t("مركز", "Center")} {centerName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {centerWarehouses.length} {t("مخزن", "warehouses")}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Center Warehouses */}
                <div className="p-4">
                  {rootWarehouses.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Warehouse className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>{t("لا توجد مخازن في هذا المركز", "No warehouses in this center")}</p>
                      <p className="text-sm mt-1">
                        {t("انقر على 'تهيئة المخازن' لإنشاء الهيكل الافتراضي", 
                          "Click 'Initialize Warehouses' to create default structure")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rootWarehouses.map((rootWh) => (
                        <div key={rootWh.id} className="border rounded-lg overflow-hidden">
                          {/* Root/External Warehouse */}
                          <div className={`flex items-center gap-3 p-3 ${
                            rootWh.warehouse_type === 'external' ? 'bg-blue-50' : 'bg-green-50'
                          }`}>
                            <div className={`p-1.5 rounded ${
                              rootWh.warehouse_type === 'external' ? 'bg-blue-200' : 'bg-green-200'
                            }`}>
                              <Warehouse className={`w-4 h-4 ${
                                rootWh.warehouse_type === 'external' ? 'text-blue-700' : 'text-green-700'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{rootWh.name}</span>
                                {getWarehouseTypeBadge(rootWh.warehouse_type)}
                                {rootWh.temperature_controlled && (
                                  <Badge variant="outline" className="bg-cyan-50 text-cyan-700">
                                    {t("تبريد", "Cold")}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{rootWh.code}</p>
                            </div>
                            <Badge variant="secondary">
                              {getChildWarehouses(centerName, rootWh.id).length} {t("فرعي", "sub")}
                            </Badge>
                          </div>
                          
                          {/* Internal/Child Warehouses - Level 2 */}
                          {getChildWarehouses(centerName, rootWh.id).length > 0 && (
                            <div className="border-t">
                              {getChildWarehouses(centerName, rootWh.id).map((childWh) => (
                                <div key={childWh.id}>
                                  <div className="flex items-center gap-3 p-3 ps-8 bg-gray-50/50 border-b last:border-b-0">
                                    <div className="w-6 flex justify-center">
                                      <div className="w-px h-4 bg-gray-300"></div>
                                    </div>
                                    <div className="p-1.5 rounded bg-gray-200">
                                      <Package className="w-3.5 h-3.5 text-gray-600" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm">{childWh.name}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {getCategoryLabel(childWh.warehouse_category)}
                                        </Badge>
                                        {childWh.temperature_controlled && (
                                          <Badge variant="outline" className="text-xs bg-cyan-50 text-cyan-700">
                                            {t("تبريد", "Cold")}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground">{childWh.code}</p>
                                    </div>
                                  </div>
                                  
                                  {/* Sub-warehouses - Level 3 (Bins/Locations) */}
                                  {getChildWarehouses(centerName, childWh.id).length > 0 && (
                                    <div className="bg-gray-50/30">
                                      {getChildWarehouses(centerName, childWh.id).map((subWh) => (
                                        <div key={subWh.id} className="flex items-center gap-3 p-2 ps-14 border-b last:border-b-0">
                                          <div className="w-4 flex justify-center">
                                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                                          </div>
                                          <span className="text-sm text-muted-foreground">{subWh.name}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {getCategoryLabel(subWh.warehouse_category)}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== Fixed Assets Section Component ====================
const FixedAssetsSection = ({ t, language, centers, warehouses }) => {
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  
  const [formData, setFormData] = useState({
    name: "",
    asset_type: "equipment",
    category: "fixed_assets",
    brand: "",
    model: "",
    serial_number: "",
    purchase_date: "",
    purchase_price: 0,
    current_value: 0,
    warehouse_id: "",
    warehouse_name: "",
    center_id: "",
    center_name: "",
    location_details: "",
    condition: "good",
    notes: ""
  });

  const [transferData, setTransferData] = useState({
    to_warehouse_id: "",
    to_location: "",
    reason: ""
  });

  const API = process.env.REACT_APP_BACKEND_URL + "/api";
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/warehouse/fixed-assets`;
      const params = [];
      if (filterCategory !== "all") params.push(`category=${filterCategory}`);
      if (filterStatus !== "all") params.push(`status=${filterStatus}`);
      if (searchQuery) params.push(`search=${searchQuery}`);
      if (params.length > 0) url += `?${params.join("&")}`;
      
      const response = await axios.get(url, { headers });
      setAssets(response.data);
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterStatus, searchQuery, API, headers]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/warehouse/fixed-assets/stats`, { headers });
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [API, headers]);

  useEffect(() => {
    fetchAssets();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [filterCategory, filterStatus, searchQuery]);

  const handleCreateAsset = async () => {
    try {
      await axios.post(`${API}/warehouse/fixed-assets`, formData, { headers });
      toast.success(t("تم إضافة الأصل بنجاح", "Asset added successfully"));
      setShowAddDialog(false);
      setFormData({
        name: "", asset_type: "equipment", category: "fixed_assets",
        brand: "", model: "", serial_number: "", purchase_date: "",
        purchase_price: 0, current_value: 0, warehouse_id: "",
        warehouse_name: "", center_id: "", center_name: "",
        location_details: "", condition: "good", notes: ""
      });
      fetchAssets();
      fetchStats();
    } catch (error) {
      toast.error(t("خطأ في إضافة الأصل", "Error adding asset"));
    }
  };

  const handleTransferAsset = async () => {
    if (!selectedAsset) return;
    try {
      await axios.post(`${API}/warehouse/fixed-assets/${selectedAsset.id}/transfer`, transferData, { headers });
      toast.success(t("تم تحويل الأصل بنجاح", "Asset transferred successfully"));
      setShowTransferDialog(false);
      setTransferData({ to_warehouse_id: "", to_location: "", reason: "" });
      fetchAssets();
    } catch (error) {
      toast.error(t("خطأ في تحويل الأصل", "Error transferring asset"));
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      in_maintenance: "bg-yellow-100 text-yellow-800",
      disposed: "bg-red-100 text-red-800",
      transferred: "bg-blue-100 text-blue-800"
    };
    const labels = {
      active: t("نشط", "Active"),
      in_maintenance: t("في الصيانة", "In Maintenance"),
      disposed: t("مُتلف", "Disposed"),
      transferred: t("محوّل", "Transferred")
    };
    return <Badge className={colors[status] || "bg-gray-100"}>{labels[status] || status}</Badge>;
  };

  const getConditionBadge = (condition) => {
    const colors = {
      excellent: "bg-green-500",
      good: "bg-blue-500",
      fair: "bg-yellow-500",
      poor: "bg-red-500"
    };
    const labels = {
      excellent: t("ممتاز", "Excellent"),
      good: t("جيد", "Good"),
      fair: t("مقبول", "Fair"),
      poor: t("سيء", "Poor")
    };
    return <Badge className={colors[condition] || "bg-gray-500"}>{labels[condition] || condition}</Badge>;
  };

  const assetTypes = [
    { id: "equipment", label: t("معدات", "Equipment") },
    { id: "vehicle", label: t("مركبة", "Vehicle") },
    { id: "machinery", label: t("آلة", "Machinery") },
    { id: "furniture", label: t("أثاث", "Furniture") },
    { id: "electronics", label: t("إلكترونيات", "Electronics") }
  ];

  const categoryOptions = [
    { id: "fixed_assets", label: t("أصول ثابتة", "Fixed Assets") },
    { id: "consumables", label: t("مواد استهلاكية", "Consumables") },
    { id: "spare_parts", label: t("قطع غيار", "Spare Parts") }
  ];

  return (
    <>
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("إجمالي الأصول", "Total Assets")}</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("نشطة", "Active")}</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("في الصيانة", "In Maintenance")}</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.in_maintenance}</p>
                </div>
                <Settings className="h-8 w-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("تحتاج صيانة", "Needs Maintenance")}</p>
                  <p className="text-2xl font-bold text-red-600">{stats.needs_maintenance}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>{t("الأصول الثابتة", "Fixed Assets")}</CardTitle>
              <CardDescription>{t("إدارة وتتبع الأصول الثابتة والمعدات", "Manage and track fixed assets and equipment")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => { fetchAssets(); fetchStats(); }}>
                <RefreshCw className="w-4 h-4 ml-1" />
                {t("تحديث", "Refresh")}
              </Button>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 ml-1" />
                {t("إضافة أصل", "Add Asset")}
              </Button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("بحث بالاسم أو الرمز...", "Search by name or code...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t("الفئة", "Category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("الكل", "All")}</SelectItem>
                {categoryOptions.map(opt => (
                  <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t("الحالة", "Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("الكل", "All")}</SelectItem>
                <SelectItem value="active">{t("نشط", "Active")}</SelectItem>
                <SelectItem value="in_maintenance">{t("في الصيانة", "In Maintenance")}</SelectItem>
                <SelectItem value="disposed">{t("مُتلف", "Disposed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t("لا توجد أصول", "No assets found")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("رمز الأصل", "Asset Code")}</TableHead>
                  <TableHead>{t("الاسم", "Name")}</TableHead>
                  <TableHead>{t("النوع", "Type")}</TableHead>
                  <TableHead>{t("الموقع", "Location")}</TableHead>
                  <TableHead>{t("الحالة", "Status")}</TableHead>
                  <TableHead>{t("الحالة الفنية", "Condition")}</TableHead>
                  <TableHead>{t("إجراءات", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-mono">{asset.asset_code}</TableCell>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{assetTypes.find(t => t.id === asset.asset_type)?.label || asset.asset_type}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{asset.warehouse_name || "-"}</div>
                        <div className="text-xs text-muted-foreground">{asset.location_details}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(asset.status)}</TableCell>
                    <TableCell>{getConditionBadge(asset.condition)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedAsset(asset); setShowDetailsDialog(true); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedAsset(asset); setShowTransferDialog(true); }}
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Asset Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("إضافة أصل جديد", "Add New Asset")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("اسم الأصل", "Asset Name")}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("نوع الأصل", "Asset Type")}</Label>
              <Select value={formData.asset_type} onValueChange={(v) => setFormData({ ...formData, asset_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assetTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("الفئة", "Category")}</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("الماركة", "Brand")}</Label>
              <Input
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("الموديل", "Model")}</Label>
              <Input
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("الرقم التسلسلي", "Serial Number")}</Label>
              <Input
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("المخزن", "Warehouse")}</Label>
              <Select
                value={formData.warehouse_id}
                onValueChange={(v) => {
                  const wh = warehouses.find(w => w.id === v);
                  setFormData({
                    ...formData,
                    warehouse_id: v,
                    warehouse_name: wh?.name || "",
                    center_id: wh?.center_id || "",
                    center_name: wh?.center_name || ""
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("اختر المخزن", "Select warehouse")} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(wh => (
                    <SelectItem key={wh.id} value={wh.id}>{wh.name} - {wh.center_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("تفاصيل الموقع", "Location Details")}</Label>
              <Input
                value={formData.location_details}
                onChange={(e) => setFormData({ ...formData, location_details: e.target.value })}
                placeholder={t("مثال: مبنى أ، طابق 2، غرفة 15", "e.g., Building A, Floor 2, Room 15")}
              />
            </div>
            <div>
              <Label>{t("سعر الشراء", "Purchase Price")}</Label>
              <Input
                type="number"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>{t("الحالة الفنية", "Condition")}</Label>
              <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">{t("ممتاز", "Excellent")}</SelectItem>
                  <SelectItem value="good">{t("جيد", "Good")}</SelectItem>
                  <SelectItem value="fair">{t("مقبول", "Fair")}</SelectItem>
                  <SelectItem value="poor">{t("سيء", "Poor")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>{t("ملاحظات", "Notes")}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button onClick={handleCreateAsset}>{t("إضافة", "Add")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Asset Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("تحويل الأصل", "Transfer Asset")}</DialogTitle>
            <DialogDescription>
              {selectedAsset && `${selectedAsset.name} (${selectedAsset.asset_code})`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("المخزن الجديد", "New Warehouse")}</Label>
              <Select
                value={transferData.to_warehouse_id}
                onValueChange={(v) => setTransferData({ ...transferData, to_warehouse_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("اختر المخزن", "Select warehouse")} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(wh => (
                    <SelectItem key={wh.id} value={wh.id}>{wh.name} - {wh.center_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("الموقع الجديد", "New Location")}</Label>
              <Input
                value={transferData.to_location}
                onChange={(e) => setTransferData({ ...transferData, to_location: e.target.value })}
                placeholder={t("مثال: مبنى ب، طابق 1", "e.g., Building B, Floor 1")}
              />
            </div>
            <div>
              <Label>{t("سبب التحويل", "Transfer Reason")}</Label>
              <Textarea
                value={transferData.reason}
                onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button onClick={handleTransferAsset}>{t("تحويل", "Transfer")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asset Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("تفاصيل الأصل", "Asset Details")}</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t("رمز الأصل", "Asset Code")}</p>
                  <p className="font-mono font-medium">{selectedAsset.asset_code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("الاسم", "Name")}</p>
                  <p className="font-medium">{selectedAsset.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("النوع", "Type")}</p>
                  <p>{assetTypes.find(t => t.id === selectedAsset.asset_type)?.label}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("الفئة", "Category")}</p>
                  <p>{categoryOptions.find(c => c.id === selectedAsset.category)?.label}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("الماركة/الموديل", "Brand/Model")}</p>
                  <p>{selectedAsset.brand} {selectedAsset.model}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("الرقم التسلسلي", "Serial Number")}</p>
                  <p className="font-mono">{selectedAsset.serial_number || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("المخزن", "Warehouse")}</p>
                  <p>{selectedAsset.warehouse_name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("الموقع", "Location")}</p>
                  <p>{selectedAsset.location_details || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("الحالة", "Status")}</p>
                  {getStatusBadge(selectedAsset.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("الحالة الفنية", "Condition")}</p>
                  {getConditionBadge(selectedAsset.condition)}
                </div>
              </div>
              {selectedAsset.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">{t("ملاحظات", "Notes")}</p>
                  <p className="bg-muted p-2 rounded">{selectedAsset.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WarehouseManagement;
