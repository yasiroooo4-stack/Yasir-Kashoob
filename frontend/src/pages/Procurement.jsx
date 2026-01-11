import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API, useLanguage } from "../App";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  ShoppingCart,
  FileText,
  Package,
  Truck,
  Users,
  BarChart3,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  Eye,
  Star,
  Building,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

const Procurement = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [summary, setSummary] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [inventoryAlerts, setInventoryAlerts] = useState([]);
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  
  // Dialog states
  const [vendorDialog, setVendorDialog] = useState(false);
  const [requisitionDialog, setRequisitionDialog] = useState(false);
  const [poDialog, setPoDialog] = useState(false);
  const [inventoryDialog, setInventoryDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  
  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: "bank_transfer",
    reference: ""
  });
  
  // Form states
  const [vendorForm, setVendorForm] = useState({
    name: "", name_ar: "", category: "supplies", contact_person: "",
    phone: "", email: "", address: "", payment_terms: "net_30", notes: ""
  });
  
  const [requisitionForm, setRequisitionForm] = useState({
    title: "", department: "", priority: "medium", required_date: "",
    justification: "", items: [{ item_name: "", quantity: 1, unit: "piece", estimated_price: 0 }]
  });
  
  const [poForm, setPoForm] = useState({
    vendor_id: "", vendor_name: "", delivery_date: "", payment_terms: "net_30",
    notes: "", items: [{ item_name: "", quantity: 1, unit: "piece", unit_price: 0 }]
  });
  
  const [inventoryForm, setInventoryForm] = useState({
    name: "", name_ar: "", category: "supplies", unit: "piece",
    min_quantity: 0, reorder_point: 0, location: "", notes: ""
  });
  
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const [summaryRes, vendorsRes, reqRes, poRes, invRes, alertsRes] = await Promise.all([
        axios.get(`${API}/procurement/analytics/summary`, { headers }),
        axios.get(`${API}/procurement/vendors`, { headers }),
        axios.get(`${API}/procurement/requisitions`, { headers }),
        axios.get(`${API}/procurement/purchase-orders`, { headers }),
        axios.get(`${API}/procurement/inventory`, { headers }),
        axios.get(`${API}/procurement/inventory/alerts`, { headers }),
      ]);
      
      setSummary(summaryRes.data);
      setVendors(vendorsRes.data);
      setRequisitions(reqRes.data);
      setPurchaseOrders(poRes.data);
      setInventory(invRes.data);
      setInventoryAlerts(alertsRes.data);
    } catch (error) {
      console.error("Error fetching procurement data:", error);
      toast.error(language === "ar" ? "حدث خطأ في جلب البيانات" : "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  // Vendor handlers
  const handleCreateVendor = async () => {
    try {
      await axios.post(`${API}/procurement/vendors`, vendorForm);
      toast.success(language === "ar" ? "تم إضافة المورد بنجاح" : "Vendor added successfully");
      setVendorDialog(false);
      setVendorForm({ name: "", name_ar: "", category: "supplies", contact_person: "", phone: "", email: "", address: "", payment_terms: "net_30", notes: "" });
      fetchData();
    } catch (error) {
      toast.error(language === "ar" ? "حدث خطأ" : "Error occurred");
    }
  };

  // Requisition handlers
  const handleCreateRequisition = async () => {
    try {
      await axios.post(`${API}/procurement/requisitions`, requisitionForm);
      toast.success(language === "ar" ? "تم إنشاء طلب الشراء بنجاح" : "Requisition created successfully");
      setRequisitionDialog(false);
      setRequisitionForm({ title: "", department: "", priority: "medium", required_date: "", justification: "", items: [{ item_name: "", quantity: 1, unit: "piece", estimated_price: 0 }] });
      fetchData();
    } catch (error) {
      toast.error(language === "ar" ? "حدث خطأ" : "Error occurred");
    }
  };

  const handleSubmitRequisition = async (id) => {
    try {
      await axios.post(`${API}/procurement/requisitions/${id}/submit`);
      toast.success(language === "ar" ? "تم تقديم الطلب للموافقة" : "Requisition submitted for approval");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  const handleApproveRequisition = async (id) => {
    try {
      await axios.post(`${API}/procurement/requisitions/${id}/approve`);
      toast.success(language === "ar" ? "تمت الموافقة" : "Approved");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  // PO handlers
  const handleCreatePO = async () => {
    try {
      await axios.post(`${API}/procurement/purchase-orders`, poForm);
      toast.success(language === "ar" ? "تم إنشاء أمر الشراء بنجاح" : "Purchase order created successfully");
      setPoDialog(false);
      setPoForm({ vendor_id: "", vendor_name: "", delivery_date: "", payment_terms: "net_30", notes: "", items: [{ item_name: "", quantity: 1, unit: "piece", unit_price: 0 }] });
      fetchData();
    } catch (error) {
      toast.error(language === "ar" ? "حدث خطأ" : "Error occurred");
    }
  };

  const handleSendPO = async (id) => {
    try {
      await axios.post(`${API}/procurement/purchase-orders/${id}/send`);
      toast.success(language === "ar" ? "تم إرسال أمر الشراء" : "Purchase order sent");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  // Inventory handlers
  const handleCreateInventoryItem = async () => {
    try {
      await axios.post(`${API}/procurement/inventory`, inventoryForm);
      toast.success(language === "ar" ? "تم إضافة الصنف بنجاح" : "Item added successfully");
      setInventoryDialog(false);
      setInventoryForm({ name: "", name_ar: "", category: "supplies", unit: "piece", min_quantity: 0, reorder_point: 0, location: "", notes: "" });
      fetchData();
    } catch (error) {
      toast.error(language === "ar" ? "حدث خطأ" : "Error occurred");
    }
  };

  // Add item to requisition
  const addRequisitionItem = () => {
    setRequisitionForm({
      ...requisitionForm,
      items: [...requisitionForm.items, { item_name: "", quantity: 1, unit: "piece", estimated_price: 0 }]
    });
  };

  // Add item to PO
  const addPOItem = () => {
    setPoForm({
      ...poForm,
      items: [...poForm.items, { item_name: "", quantity: 1, unit: "piece", unit_price: 0 }]
    });
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-700", icon: Clock, label: "مسودة" },
      pending_dept_approval: { color: "bg-yellow-100 text-yellow-700", icon: Clock, label: "بانتظار موافقة القسم" },
      pending_finance_approval: { color: "bg-orange-100 text-orange-700", icon: Clock, label: "بانتظار موافقة المالية" },
      approved: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "موافق عليه" },
      rejected: { color: "bg-red-100 text-red-700", icon: XCircle, label: "مرفوض" },
      sent: { color: "bg-blue-100 text-blue-700", icon: Send, label: "تم الإرسال" },
      confirmed: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle, label: "مؤكد" },
      completed: { color: "bg-green-100 text-green-700", icon: CheckCircle, label: "مكتمل" },
      partially_received: { color: "bg-amber-100 text-amber-700", icon: Package, label: "استلام جزئي" },
    };
    
    const config = statusConfig[status] || { color: "bg-gray-100 text-gray-700", icon: Clock, label: status };
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="procurement-loading">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            {language === "ar" ? "جاري تحميل البيانات..." : "Loading data..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="procurement-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">
            {language === "ar" ? "إدارة المشتريات" : "Procurement Management"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === "ar" ? "إدارة طلبات الشراء والموردين والمخزون" : "Manage purchase requests, vendors and inventory"}
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          {language === "ar" ? "تحديث" : "Refresh"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-6 gap-2 h-auto p-1 bg-muted/50">
          <TabsTrigger value="dashboard" className="flex items-center gap-2 py-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">{language === "ar" ? "لوحة التحكم" : "Dashboard"}</span>
          </TabsTrigger>
          <TabsTrigger value="requisitions" className="flex items-center gap-2 py-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">{language === "ar" ? "طلبات الشراء" : "Requisitions"}</span>
          </TabsTrigger>
          <TabsTrigger value="purchase-orders" className="flex items-center gap-2 py-2">
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">{language === "ar" ? "أوامر الشراء" : "POs"}</span>
          </TabsTrigger>
          <TabsTrigger value="vendors" className="flex items-center gap-2 py-2">
            <Building className="w-4 h-4" />
            <span className="hidden sm:inline">{language === "ar" ? "الموردين" : "Vendors"}</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2 py-2">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">{language === "ar" ? "المخزون" : "Inventory"}</span>
          </TabsTrigger>
          <TabsTrigger value="receiving" className="flex items-center gap-2 py-2">
            <Truck className="w-4 h-4" />
            <span className="hidden sm:inline">{language === "ar" ? "الاستلام" : "Receiving"}</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-blue-100 text-sm">{language === "ar" ? "الموردين" : "Vendors"}</p>
                    <p className="text-3xl font-bold mt-1">{summary?.vendors?.total || 0}</p>
                  </div>
                  <Building className="w-8 h-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-amber-100 text-sm">{language === "ar" ? "طلبات معلقة" : "Pending Requests"}</p>
                    <p className="text-3xl font-bold mt-1">{summary?.requisitions?.pending || 0}</p>
                  </div>
                  <Clock className="w-8 h-8 text-amber-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-green-100 text-sm">{language === "ar" ? "أوامر الشراء" : "Purchase Orders"}</p>
                    <p className="text-3xl font-bold mt-1">{summary?.purchase_orders?.total || 0}</p>
                  </div>
                  <ShoppingCart className="w-8 h-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-purple-100 text-sm">{language === "ar" ? "إجمالي الإنفاق" : "Total Spending"}</p>
                    <p className="text-2xl font-bold mt-1">{(summary?.spending?.total || 0).toLocaleString()} {language === "ar" ? "ر.ع" : "OMR"}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-red-100 text-sm">{language === "ar" ? "تنبيهات المخزون" : "Stock Alerts"}</p>
                    <p className="text-3xl font-bold mt-1">{summary?.inventory_alerts || 0}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts Section */}
          {inventoryAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  {language === "ar" ? "تنبيهات المخزون" : "Inventory Alerts"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {inventoryAlerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className={`p-3 rounded-lg flex justify-between items-center ${
                      alert.severity === "critical" ? "bg-red-50 border border-red-200" :
                      alert.severity === "high" ? "bg-orange-50 border border-orange-200" :
                      "bg-yellow-50 border border-yellow-200"
                    }`}>
                      <div>
                        <p className="font-medium">{alert.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {language === "ar" ? "الكمية الحالية:" : "Current:"} {alert.current_quantity} | 
                          {language === "ar" ? " نقطة إعادة الطلب:" : " Reorder:"} {alert.reorder_point}
                        </p>
                      </div>
                      <Badge variant={alert.severity === "critical" ? "destructive" : "warning"}>
                        {alert.alert_type === "out_of_stock" ? (language === "ar" ? "نفذ" : "Out of Stock") :
                         alert.alert_type === "below_minimum" ? (language === "ar" ? "أقل من الحد" : "Below Min") :
                         (language === "ar" ? "يحتاج إعادة طلب" : "Reorder Needed")}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "آخر طلبات الشراء" : "Recent Requisitions"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {requisitions.slice(0, 5).map((req) => (
                    <div key={req.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{req.requisition_number}</p>
                        <p className="text-sm text-muted-foreground">{req.title}</p>
                      </div>
                      <StatusBadge status={req.status} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>{language === "ar" ? "آخر أوامر الشراء" : "Recent Purchase Orders"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {purchaseOrders.slice(0, 5).map((po) => (
                    <div key={po.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{po.po_number}</p>
                        <p className="text-sm text-muted-foreground">{po.vendor_name}</p>
                      </div>
                      <StatusBadge status={po.status} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Requisitions Tab */}
        <TabsContent value="requisitions" className="space-y-4">
          <div className="flex justify-between items-center">
            <Input
              placeholder={language === "ar" ? "بحث..." : "Search..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={() => setRequisitionDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {language === "ar" ? "طلب شراء جديد" : "New Requisition"}
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "رقم الطلب" : "Req #"}</TableHead>
                    <TableHead>{language === "ar" ? "العنوان" : "Title"}</TableHead>
                    <TableHead>{language === "ar" ? "القسم" : "Department"}</TableHead>
                    <TableHead>{language === "ar" ? "الأولوية" : "Priority"}</TableHead>
                    <TableHead>{language === "ar" ? "المبلغ التقديري" : "Est. Amount"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requisitions.filter(r => 
                    r.requisition_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.title?.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono">{req.requisition_number}</TableCell>
                      <TableCell>{req.title}</TableCell>
                      <TableCell>{req.department}</TableCell>
                      <TableCell>
                        <Badge variant={req.priority === "urgent" ? "destructive" : req.priority === "high" ? "warning" : "default"}>
                          {req.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{req.total_estimated?.toLocaleString()} {language === "ar" ? "ر.ع" : "OMR"}</TableCell>
                      <TableCell><StatusBadge status={req.status} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {req.status === "draft" && (
                            <Button size="sm" variant="outline" onClick={() => handleSubmitRequisition(req.id)}>
                              <Send className="w-3 h-3 mr-1" />
                              {language === "ar" ? "تقديم" : "Submit"}
                            </Button>
                          )}
                          {(req.status === "pending_dept_approval" || req.status === "pending_finance_approval") && (
                            <Button size="sm" variant="default" onClick={() => handleApproveRequisition(req.id)}>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {language === "ar" ? "موافقة" : "Approve"}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedItem(req); setViewDialog(true); }}>
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders" className="space-y-4">
          <div className="flex justify-between items-center">
            <Input
              placeholder={language === "ar" ? "بحث..." : "Search..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={() => setPoDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {language === "ar" ? "أمر شراء جديد" : "New PO"}
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "رقم الأمر" : "PO #"}</TableHead>
                    <TableHead>{language === "ar" ? "المورد" : "Vendor"}</TableHead>
                    <TableHead>{language === "ar" ? "تاريخ التسليم" : "Delivery Date"}</TableHead>
                    <TableHead>{language === "ar" ? "المبلغ" : "Amount"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.filter(po => 
                    po.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    po.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono">{po.po_number}</TableCell>
                      <TableCell>{po.vendor_name}</TableCell>
                      <TableCell>{po.delivery_date || "-"}</TableCell>
                      <TableCell>{po.total_amount?.toLocaleString()} {language === "ar" ? "ر.ع" : "OMR"}</TableCell>
                      <TableCell><StatusBadge status={po.status} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {po.status === "draft" && (
                            <Button size="sm" variant="outline" onClick={() => handleSendPO(po.id)}>
                              <Send className="w-3 h-3 mr-1" />
                              {language === "ar" ? "إرسال" : "Send"}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedItem(po); setViewDialog(true); }}>
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-4">
          <div className="flex justify-between items-center">
            <Input
              placeholder={language === "ar" ? "بحث..." : "Search..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={() => setVendorDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {language === "ar" ? "مورد جديد" : "New Vendor"}
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.filter(v => 
              v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              v.name_ar?.includes(searchTerm)
            ).map((vendor) => (
              <Card key={vendor.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{vendor.name}</h3>
                      {vendor.name_ar && <p className="text-sm text-muted-foreground">{vendor.name_ar}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < vendor.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">{language === "ar" ? "الفئة:" : "Category:"}</span> {vendor.category}</p>
                    <p><span className="text-muted-foreground">{language === "ar" ? "جهة الاتصال:" : "Contact:"}</span> {vendor.contact_person || "-"}</p>
                    <p><span className="text-muted-foreground">{language === "ar" ? "الهاتف:" : "Phone:"}</span> {vendor.phone || "-"}</p>
                    <p><span className="text-muted-foreground">{language === "ar" ? "إجمالي الطلبات:" : "Total Orders:"}</span> {vendor.total_orders}</p>
                    <p><span className="text-muted-foreground">{language === "ar" ? "إجمالي المبالغ:" : "Total Amount:"}</span> {vendor.total_amount?.toLocaleString()} {language === "ar" ? "ر.ع" : "OMR"}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="flex justify-between items-center">
            <Input
              placeholder={language === "ar" ? "بحث..." : "Search..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={() => setInventoryDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {language === "ar" ? "صنف جديد" : "New Item"}
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "اسم الصنف" : "Item Name"}</TableHead>
                    <TableHead>{language === "ar" ? "الفئة" : "Category"}</TableHead>
                    <TableHead>{language === "ar" ? "الكمية الحالية" : "Current Qty"}</TableHead>
                    <TableHead>{language === "ar" ? "الحد الأدنى" : "Min Qty"}</TableHead>
                    <TableHead>{language === "ar" ? "نقطة إعادة الطلب" : "Reorder Point"}</TableHead>
                    <TableHead>{language === "ar" ? "الموقع" : "Location"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.filter(i => 
                    i.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    i.name_ar?.includes(searchTerm)
                  ).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.name_ar && <p className="text-sm text-muted-foreground">{item.name_ar}</p>}
                        </div>
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="font-semibold">{item.current_quantity} {item.unit}</TableCell>
                      <TableCell>{item.min_quantity}</TableCell>
                      <TableCell>{item.reorder_point}</TableCell>
                      <TableCell>{item.location || "-"}</TableCell>
                      <TableCell>
                        {item.current_quantity <= 0 ? (
                          <Badge variant="destructive">{language === "ar" ? "نفذ" : "Out of Stock"}</Badge>
                        ) : item.current_quantity <= item.min_quantity ? (
                          <Badge variant="warning">{language === "ar" ? "منخفض" : "Low"}</Badge>
                        ) : item.current_quantity <= item.reorder_point ? (
                          <Badge variant="outline">{language === "ar" ? "إعادة طلب" : "Reorder"}</Badge>
                        ) : (
                          <Badge variant="success">{language === "ar" ? "متوفر" : "In Stock"}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receiving Tab */}
        <TabsContent value="receiving" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "أوامر الشراء في انتظار الاستلام" : "POs Pending Receipt"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "رقم الأمر" : "PO #"}</TableHead>
                    <TableHead>{language === "ar" ? "المورد" : "Vendor"}</TableHead>
                    <TableHead>{language === "ar" ? "تاريخ التسليم" : "Delivery Date"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.filter(po => 
                    po.status === "sent" || po.status === "confirmed" || po.status === "partially_received"
                  ).map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono">{po.po_number}</TableCell>
                      <TableCell>{po.vendor_name}</TableCell>
                      <TableCell>{po.delivery_date || "-"}</TableCell>
                      <TableCell><StatusBadge status={po.status} /></TableCell>
                      <TableCell>
                        <Button size="sm" variant="default">
                          <Package className="w-3 h-3 mr-1" />
                          {language === "ar" ? "تسجيل استلام" : "Record Receipt"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Vendor Dialog */}
      <Dialog open={vendorDialog} onOpenChange={setVendorDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "إضافة مورد جديد" : "Add New Vendor"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{language === "ar" ? "اسم المورد (إنجليزي)" : "Vendor Name (English)"}</Label>
              <Input value={vendorForm.name} onChange={(e) => setVendorForm({...vendorForm, name: e.target.value})} />
            </div>
            <div>
              <Label>{language === "ar" ? "اسم المورد (عربي)" : "Vendor Name (Arabic)"}</Label>
              <Input value={vendorForm.name_ar} onChange={(e) => setVendorForm({...vendorForm, name_ar: e.target.value})} />
            </div>
            <div>
              <Label>{language === "ar" ? "الفئة" : "Category"}</Label>
              <Select value={vendorForm.category} onValueChange={(v) => setVendorForm({...vendorForm, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equipment">{language === "ar" ? "معدات" : "Equipment"}</SelectItem>
                  <SelectItem value="supplies">{language === "ar" ? "مستلزمات" : "Supplies"}</SelectItem>
                  <SelectItem value="services">{language === "ar" ? "خدمات" : "Services"}</SelectItem>
                  <SelectItem value="feed">{language === "ar" ? "أعلاف" : "Feed"}</SelectItem>
                  <SelectItem value="spare_parts">{language === "ar" ? "قطع غيار" : "Spare Parts"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{language === "ar" ? "جهة الاتصال" : "Contact Person"}</Label>
              <Input value={vendorForm.contact_person} onChange={(e) => setVendorForm({...vendorForm, contact_person: e.target.value})} />
            </div>
            <div>
              <Label>{language === "ar" ? "الهاتف" : "Phone"}</Label>
              <Input value={vendorForm.phone} onChange={(e) => setVendorForm({...vendorForm, phone: e.target.value})} />
            </div>
            <div>
              <Label>{language === "ar" ? "البريد الإلكتروني" : "Email"}</Label>
              <Input type="email" value={vendorForm.email} onChange={(e) => setVendorForm({...vendorForm, email: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label>{language === "ar" ? "العنوان" : "Address"}</Label>
              <Textarea value={vendorForm.address} onChange={(e) => setVendorForm({...vendorForm, address: e.target.value})} />
            </div>
            <div>
              <Label>{language === "ar" ? "شروط الدفع" : "Payment Terms"}</Label>
              <Select value={vendorForm.payment_terms} onValueChange={(v) => setVendorForm({...vendorForm, payment_terms: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{language === "ar" ? "نقدي" : "Cash"}</SelectItem>
                  <SelectItem value="net_15">Net 15</SelectItem>
                  <SelectItem value="net_30">Net 30</SelectItem>
                  <SelectItem value="net_60">Net 60</SelectItem>
                  <SelectItem value="net_90">Net 90</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVendorDialog(false)}>{language === "ar" ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleCreateVendor}>{language === "ar" ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Requisition Dialog */}
      <Dialog open={requisitionDialog} onOpenChange={setRequisitionDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "طلب شراء جديد" : "New Purchase Requisition"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === "ar" ? "العنوان" : "Title"} *</Label>
                <Input value={requisitionForm.title} onChange={(e) => setRequisitionForm({...requisitionForm, title: e.target.value})} />
              </div>
              <div>
                <Label>{language === "ar" ? "القسم" : "Department"} *</Label>
                <Select value={requisitionForm.department} onValueChange={(v) => setRequisitionForm({...requisitionForm, department: v})}>
                  <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر القسم" : "Select Department"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operations">{language === "ar" ? "العمليات" : "Operations"}</SelectItem>
                    <SelectItem value="maintenance">{language === "ar" ? "الصيانة" : "Maintenance"}</SelectItem>
                    <SelectItem value="admin">{language === "ar" ? "الإدارة" : "Admin"}</SelectItem>
                    <SelectItem value="it">{language === "ar" ? "تقنية المعلومات" : "IT"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === "ar" ? "الأولوية" : "Priority"}</Label>
                <Select value={requisitionForm.priority} onValueChange={(v) => setRequisitionForm({...requisitionForm, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{language === "ar" ? "منخفضة" : "Low"}</SelectItem>
                    <SelectItem value="medium">{language === "ar" ? "متوسطة" : "Medium"}</SelectItem>
                    <SelectItem value="high">{language === "ar" ? "عالية" : "High"}</SelectItem>
                    <SelectItem value="urgent">{language === "ar" ? "عاجلة" : "Urgent"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === "ar" ? "تاريخ الحاجة" : "Required Date"}</Label>
                <Input type="date" value={requisitionForm.required_date} onChange={(e) => setRequisitionForm({...requisitionForm, required_date: e.target.value})} />
              </div>
            </div>
            
            <div>
              <Label>{language === "ar" ? "المبررات" : "Justification"}</Label>
              <Textarea value={requisitionForm.justification} onChange={(e) => setRequisitionForm({...requisitionForm, justification: e.target.value})} />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>{language === "ar" ? "الأصناف" : "Items"}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addRequisitionItem}>
                  <Plus className="w-3 h-3 mr-1" />
                  {language === "ar" ? "إضافة صنف" : "Add Item"}
                </Button>
              </div>
              <div className="space-y-2">
                {requisitionForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 p-2 bg-muted/50 rounded">
                    <Input placeholder={language === "ar" ? "اسم الصنف" : "Item Name"} value={item.item_name} onChange={(e) => {
                      const newItems = [...requisitionForm.items];
                      newItems[idx].item_name = e.target.value;
                      setRequisitionForm({...requisitionForm, items: newItems});
                    }} />
                    <Input type="number" placeholder={language === "ar" ? "الكمية" : "Qty"} value={item.quantity} onChange={(e) => {
                      const newItems = [...requisitionForm.items];
                      newItems[idx].quantity = parseFloat(e.target.value) || 0;
                      setRequisitionForm({...requisitionForm, items: newItems});
                    }} />
                    <Input placeholder={language === "ar" ? "الوحدة" : "Unit"} value={item.unit} onChange={(e) => {
                      const newItems = [...requisitionForm.items];
                      newItems[idx].unit = e.target.value;
                      setRequisitionForm({...requisitionForm, items: newItems});
                    }} />
                    <Input type="number" placeholder={language === "ar" ? "السعر التقديري" : "Est. Price"} value={item.estimated_price} onChange={(e) => {
                      const newItems = [...requisitionForm.items];
                      newItems[idx].estimated_price = parseFloat(e.target.value) || 0;
                      setRequisitionForm({...requisitionForm, items: newItems});
                    }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequisitionDialog(false)}>{language === "ar" ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleCreateRequisition}>{language === "ar" ? "إنشاء الطلب" : "Create Requisition"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PO Dialog */}
      <Dialog open={poDialog} onOpenChange={setPoDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "أمر شراء جديد" : "New Purchase Order"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === "ar" ? "المورد" : "Vendor"} *</Label>
                <Select value={poForm.vendor_id} onValueChange={(v) => {
                  const vendor = vendors.find(vd => vd.id === v);
                  setPoForm({...poForm, vendor_id: v, vendor_name: vendor?.name || ""});
                }}>
                  <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر المورد" : "Select Vendor"} /></SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === "ar" ? "تاريخ التسليم" : "Delivery Date"}</Label>
                <Input type="date" value={poForm.delivery_date} onChange={(e) => setPoForm({...poForm, delivery_date: e.target.value})} />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>{language === "ar" ? "الأصناف" : "Items"}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addPOItem}>
                  <Plus className="w-3 h-3 mr-1" />
                  {language === "ar" ? "إضافة صنف" : "Add Item"}
                </Button>
              </div>
              <div className="space-y-2">
                {poForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 p-2 bg-muted/50 rounded">
                    <Input placeholder={language === "ar" ? "اسم الصنف" : "Item Name"} value={item.item_name} onChange={(e) => {
                      const newItems = [...poForm.items];
                      newItems[idx].item_name = e.target.value;
                      setPoForm({...poForm, items: newItems});
                    }} />
                    <Input type="number" placeholder={language === "ar" ? "الكمية" : "Qty"} value={item.quantity} onChange={(e) => {
                      const newItems = [...poForm.items];
                      newItems[idx].quantity = parseFloat(e.target.value) || 0;
                      setPoForm({...poForm, items: newItems});
                    }} />
                    <Input placeholder={language === "ar" ? "الوحدة" : "Unit"} value={item.unit} onChange={(e) => {
                      const newItems = [...poForm.items];
                      newItems[idx].unit = e.target.value;
                      setPoForm({...poForm, items: newItems});
                    }} />
                    <Input type="number" placeholder={language === "ar" ? "سعر الوحدة" : "Unit Price"} value={item.unit_price} onChange={(e) => {
                      const newItems = [...poForm.items];
                      newItems[idx].unit_price = parseFloat(e.target.value) || 0;
                      setPoForm({...poForm, items: newItems});
                    }} />
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label>{language === "ar" ? "ملاحظات" : "Notes"}</Label>
              <Textarea value={poForm.notes} onChange={(e) => setPoForm({...poForm, notes: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPoDialog(false)}>{language === "ar" ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleCreatePO}>{language === "ar" ? "إنشاء أمر الشراء" : "Create PO"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inventory Dialog */}
      <Dialog open={inventoryDialog} onOpenChange={setInventoryDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "إضافة صنف جديد" : "Add New Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === "ar" ? "اسم الصنف (إنجليزي)" : "Item Name (English)"} *</Label>
                <Input value={inventoryForm.name} onChange={(e) => setInventoryForm({...inventoryForm, name: e.target.value})} />
              </div>
              <div>
                <Label>{language === "ar" ? "اسم الصنف (عربي)" : "Item Name (Arabic)"}</Label>
                <Input value={inventoryForm.name_ar} onChange={(e) => setInventoryForm({...inventoryForm, name_ar: e.target.value})} />
              </div>
              <div>
                <Label>{language === "ar" ? "الفئة" : "Category"}</Label>
                <Select value={inventoryForm.category} onValueChange={(v) => setInventoryForm({...inventoryForm, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="supplies">{language === "ar" ? "مستلزمات" : "Supplies"}</SelectItem>
                    <SelectItem value="equipment">{language === "ar" ? "معدات" : "Equipment"}</SelectItem>
                    <SelectItem value="spare_parts">{language === "ar" ? "قطع غيار" : "Spare Parts"}</SelectItem>
                    <SelectItem value="consumables">{language === "ar" ? "مستهلكات" : "Consumables"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === "ar" ? "الوحدة" : "Unit"}</Label>
                <Input value={inventoryForm.unit} onChange={(e) => setInventoryForm({...inventoryForm, unit: e.target.value})} />
              </div>
              <div>
                <Label>{language === "ar" ? "الحد الأدنى" : "Min Quantity"}</Label>
                <Input type="number" value={inventoryForm.min_quantity} onChange={(e) => setInventoryForm({...inventoryForm, min_quantity: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label>{language === "ar" ? "نقطة إعادة الطلب" : "Reorder Point"}</Label>
                <Input type="number" value={inventoryForm.reorder_point} onChange={(e) => setInventoryForm({...inventoryForm, reorder_point: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="col-span-2">
                <Label>{language === "ar" ? "الموقع" : "Location"}</Label>
                <Input value={inventoryForm.location} onChange={(e) => setInventoryForm({...inventoryForm, location: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInventoryDialog(false)}>{language === "ar" ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleCreateInventoryItem}>{language === "ar" ? "حفظ" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Procurement;
