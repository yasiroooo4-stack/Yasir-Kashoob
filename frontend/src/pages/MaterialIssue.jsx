import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useLanguage, API } from "../App";
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
import { Textarea } from "../components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Package,
  Plus,
  Minus,
  ShoppingCart,
  History,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Trash2,
  RefreshCw,
  Building2,
  Beaker,
  Wrench,
  Sparkles,
  HardHat,
  Wheat,
  Settings,
  Box,
} from "lucide-react";

// أيقونات تصنيفات المخازن
const categoryIcons = {
  lab: Beaker,
  cleaning: Sparkles,
  maintenance: Wrench,
  ppe: HardHat,
  feed: Wheat,
  equipment: Settings,
  supplies: Box,
};

const categoryLabels = {
  lab: { ar: "مخزن المختبر", en: "Lab Warehouse" },
  cleaning: { ar: "مخزن التنظيف", en: "Cleaning Warehouse" },
  maintenance: { ar: "مخزن الصيانة", en: "Maintenance Warehouse" },
  ppe: { ar: "معدات الحماية", en: "PPE Warehouse" },
  feed: { ar: "مخزن الأعلاف", en: "Feed Warehouse" },
  equipment: { ar: "مخزن المعدات", en: "Equipment Warehouse" },
  supplies: { ar: "مخزن المستلزمات", en: "Supplies Warehouse" },
};

const MaterialIssue = () => {
  const { language } = useLanguage();
  const t = (ar, en) => (language === "ar" ? ar : en);

  // State
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("issue");
  const [myWarehouses, setMyWarehouses] = useState([]);
  const [myStock, setMyStock] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [cart, setCart] = useState([]);
  const [purpose, setPurpose] = useState("");
  const [myRequests, setMyRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [consumptionLog, setConsumptionLog] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(false);

  // User permissions (from token)
  const [userPermissions, setUserPermissions] = useState([]);
  const [userRole, setUserRole] = useState("");

  // Fetch user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserPermissions(response.data.permissions || []);
        setUserRole(response.data.role || "");
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };
    fetchUserInfo();
  }, []);

  // Fetch warehouses available to user
  const fetchMyWarehouses = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No auth token found");
        return;
      }
      const response = await axios.get(`${API}/warehouse/my-warehouses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Fetched warehouses:", response.data);
      setMyWarehouses(response.data || []);
      if (response.data && response.data.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(response.data[0].id);
      }
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      toast.error(t("فشل في جلب المخازن", "Failed to fetch warehouses"));
    }
  }, [selectedWarehouse, t]);

  // Fetch stock for selected warehouse
  const fetchMyStock = useCallback(async () => {
    if (!selectedWarehouse) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/warehouse/my-stock`, {
        params: { warehouse_id: selectedWarehouse },
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyStock(response.data || []);
    } catch (error) {
      console.error("Error fetching stock:", error);
      toast.error(t("فشل في جلب المخزون", "Failed to fetch stock"));
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse, t]);

  // Fetch requests
  const fetchMyRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/warehouse/issue-requests`, {
        params: { my_requests: true },
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyRequests(response.data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  }, []);

  // Fetch pending requests (for supervisors)
  const fetchPendingRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/warehouse/issue-requests`, {
        params: { status: "pending" },
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingRequests(response.data || []);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  }, []);

  // Fetch consumption log
  const fetchConsumptionLog = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/api/warehouse/consumption-log`, {
        params: { warehouse_id: selectedWarehouse || undefined },
        headers: { Authorization: `Bearer ${token}` },
      });
      setConsumptionLog(response.data);
    } catch (error) {
      console.error("Error fetching consumption log:", error);
    }
  }, [selectedWarehouse]);

  useEffect(() => {
    fetchMyWarehouses();
  }, [fetchMyWarehouses]);

  useEffect(() => {
    fetchMyStock();
  }, [fetchMyStock]);

  useEffect(() => {
    fetchMyRequests();
    fetchPendingRequests();
    fetchConsumptionLog();
  }, [fetchMyRequests, fetchPendingRequests, fetchConsumptionLog]);

  // Add to cart
  const addToCart = (item) => {
    const existing = cart.find((c) => c.product_id === item.product_id);
    if (existing) {
      if (existing.quantity < item.available_quantity) {
        setCart(
          cart.map((c) =>
            c.product_id === item.product_id
              ? { ...c, quantity: c.quantity + 1 }
              : c
          )
        );
      } else {
        toast.error(t("الكمية المطلوبة غير متوفرة", "Quantity not available"));
      }
    } else {
      setCart([
        ...cart,
        {
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          quantity: 1,
          available_quantity: item.available_quantity,
          unit_price: item.unit_price,
          notes: "",
        },
      ]);
    }
  };

  // Update cart quantity
  const updateCartQuantity = (productId, delta) => {
    setCart(
      cart.map((c) => {
        if (c.product_id === productId) {
          const newQty = c.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > c.available_quantity) {
            toast.error(t("الكمية المطلوبة غير متوفرة", "Quantity not available"));
            return c;
          }
          return { ...c, quantity: newQty };
        }
        return c;
      }).filter(Boolean)
    );
  };

  // Remove from cart
  const removeFromCart = (productId) => {
    setCart(cart.filter((c) => c.product_id !== productId));
  };

  // Submit issue request
  const handleSubmitRequest = async (directIssue = false) => {
    if (cart.length === 0) {
      toast.error(t("السلة فارغة", "Cart is empty"));
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API}/api/warehouse/issue-request`,
        {
          warehouse_id: selectedWarehouse,
          items: cart.map((c) => ({
            product_id: c.product_id,
            quantity: c.quantity,
            notes: c.notes,
          })),
          purpose: purpose,
          direct_issue: directIssue,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(response.data.message);
      setCart([]);
      setPurpose("");
      setConfirmDialog(false);
      fetchMyStock();
      fetchMyRequests();
      fetchConsumptionLog();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("حدث خطأ", "An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  // Approve request
  const handleApproveRequest = async (requestId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/api/warehouse/issue-requests/${requestId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t("تم الموافقة والصرف", "Approved and issued"));
      fetchPendingRequests();
      fetchConsumptionLog();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في الموافقة", "Failed to approve"));
    }
  };

  // Reject request
  const handleRejectRequest = async (requestId) => {
    const reason = prompt(t("سبب الرفض:", "Rejection reason:"));
    if (!reason) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/api/warehouse/issue-requests/${requestId}/reject`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t("تم رفض الطلب", "Request rejected"));
      fetchPendingRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في الرفض", "Failed to reject"));
    }
  };

  // Check if user can approve
  const canApprove =
    userRole === "admin" ||
    userPermissions.includes("warehouse_approve_issue") ||
    userPermissions.includes("warehouse_issue_all");

  // Get category icon
  const getCategoryIcon = (category) => {
    const Icon = categoryIcons[category] || Package;
    return <Icon className="w-5 h-5" />;
  };

  // Calculate cart total
  const cartTotal = cart.reduce((sum, c) => sum + c.quantity * c.unit_price, 0);

  return (
    <div className="p-6 space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-7 h-7 text-primary" />
            {t("صرف المواد", "Material Issue")}
          </h1>
          <p className="text-muted-foreground">
            {t("طلب وصرف المواد من المخازن", "Request and issue materials from warehouses")}
          </p>
        </div>

        {/* Warehouse Selector */}
        <div className="flex items-center gap-2">
          <Label>{t("المخزن:", "Warehouse:")}</Label>
          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder={t("اختر المخزن", "Select warehouse")} />
            </SelectTrigger>
            <SelectContent>
              {myWarehouses.map((wh) => (
                <SelectItem key={wh.id} value={wh.id}>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(wh.warehouse_category)}
                    <span>{wh.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchMyStock}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* No warehouses message */}
      {myWarehouses.length === 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-6 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-yellow-500 opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {t("لا توجد مخازن متاحة", "No warehouses available")}
            </h3>
            <p className="text-muted-foreground">
              {t(
                "ليس لديك صلاحية الصرف من أي مخزن. تواصل مع المشرف للحصول على الصلاحيات.",
                "You don't have permission to issue from any warehouse. Contact your supervisor."
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {myWarehouses.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="issue" className="flex items-center gap-1">
              <ShoppingCart className="w-4 h-4" />
              {t("صرف مواد", "Issue Materials")}
              {cart.length > 0 && (
                <Badge className="ms-1 bg-primary">{cart.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {t("طلباتي", "My Requests")}
            </TabsTrigger>
            {canApprove && (
              <TabsTrigger value="pending" className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {t("طلبات معلقة", "Pending")}
                {pendingRequests.length > 0 && (
                  <Badge variant="destructive" className="ms-1">
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="log" className="flex items-center gap-1">
              <History className="w-4 h-4" />
              {t("سجل الاستهلاك", "Consumption Log")}
            </TabsTrigger>
          </TabsList>

          {/* Issue Materials Tab */}
          <TabsContent value="issue" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Stock List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    {t("المواد المتاحة", "Available Materials")}
                  </CardTitle>
                  <CardDescription>
                    {t("اضغط على المنتج لإضافته للسلة", "Click product to add to cart")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                    </div>
                  ) : myStock.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t("لا توجد مواد متاحة", "No materials available")}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
                      {myStock.filter(s => s.available_quantity > 0).map((item) => (
                        <Card
                          key={item.id}
                          className="cursor-pointer hover:border-primary transition-colors"
                          onClick={() => addToCart(item)}
                        >
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{item.product_name}</h4>
                                <p className="text-xs text-muted-foreground">
                                  {item.product_code}
                                </p>
                              </div>
                              <Badge variant="outline">
                                {item.available_quantity}
                              </Badge>
                            </div>
                            {item.expiry_date && (
                              <p className="text-xs text-orange-500 mt-1">
                                {t("الصلاحية:", "Expiry:")} {item.expiry_date}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cart */}
              <Card className="border-primary/50">
                <CardHeader className="bg-primary/5">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    {t("سلة الصرف", "Issue Cart")}
                    <Badge>{cart.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {cart.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      {t("السلة فارغة", "Cart is empty")}
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {cart.map((item) => (
                          <div
                            key={item.product_id}
                            className="flex items-center justify-between p-2 bg-muted rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.unit_price.toFixed(3)} × {item.quantity} ={" "}
                                {(item.unit_price * item.quantity).toFixed(3)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateCartQuantity(item.product_id, -1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center font-bold">
                                {item.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateCartQuantity(item.product_id, 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500"
                                onClick={() => removeFromCart(item.product_id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Total */}
                      <div className="border-t pt-2">
                        <div className="flex justify-between font-bold">
                          <span>{t("الإجمالي:", "Total:")}</span>
                          <span>{cartTotal.toFixed(3)} ر.ع</span>
                        </div>
                      </div>

                      {/* Purpose */}
                      <div className="space-y-2">
                        <Label>{t("الغرض من الصرف:", "Purpose:")}</Label>
                        <Textarea
                          value={purpose}
                          onChange={(e) => setPurpose(e.target.value)}
                          placeholder={t("اكتب الغرض من صرف المواد...", "Enter purpose...")}
                          rows={2}
                        />
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                        <Button
                          className="w-full"
                          onClick={() => setConfirmDialog(true)}
                          disabled={loading}
                        >
                          <Send className="w-4 h-4 me-2" />
                          {t("صرف مباشر", "Direct Issue")}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* My Requests Tab */}
          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>{t("طلباتي السابقة", "My Previous Requests")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("رقم الطلب", "Request #")}</TableHead>
                      <TableHead>{t("المخزن", "Warehouse")}</TableHead>
                      <TableHead>{t("عدد المنتجات", "Items")}</TableHead>
                      <TableHead>{t("القيمة", "Value")}</TableHead>
                      <TableHead>{t("الحالة", "Status")}</TableHead>
                      <TableHead>{t("التاريخ", "Date")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-mono">{req.request_number}</TableCell>
                        <TableCell>{req.warehouse_name}</TableCell>
                        <TableCell>{req.total_items}</TableCell>
                        <TableCell>{req.total_value?.toFixed(3)} ر.ع</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              req.status === "completed"
                                ? "default"
                                : req.status === "rejected"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {req.status === "completed"
                              ? t("مكتمل", "Completed")
                              : req.status === "rejected"
                              ? t("مرفوض", "Rejected")
                              : t("معلق", "Pending")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(req.requested_at).toLocaleDateString(
                            language === "ar" ? "ar-OM" : "en-US"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Requests Tab (for supervisors) */}
          {canApprove && (
            <TabsContent value="pending">
              <Card>
                <CardHeader>
                  <CardTitle>{t("طلبات تنتظر الموافقة", "Pending Approvals")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingRequests.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">
                      {t("لا توجد طلبات معلقة", "No pending requests")}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {pendingRequests.map((req) => (
                        <Card key={req.id} className="border-yellow-200">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <p className="font-bold">{req.request_number}</p>
                                <p className="text-sm text-muted-foreground">
                                  {req.requested_by_name} - {req.warehouse_name}
                                </p>
                                {req.purpose && (
                                  <p className="text-sm mt-1">
                                    <strong>{t("الغرض:", "Purpose:")}</strong> {req.purpose}
                                  </p>
                                )}
                              </div>
                              <Badge variant="outline">{req.total_value?.toFixed(3)} ر.ع</Badge>
                            </div>
                            
                            <div className="text-sm mb-4">
                              <strong>{t("المنتجات:", "Items:")}</strong>
                              <ul className="list-disc list-inside mt-1">
                                {req.items?.map((item, idx) => (
                                  <li key={idx}>
                                    {item.product_name} × {item.quantity}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                className="flex-1"
                                onClick={() => handleApproveRequest(req.id)}
                              >
                                <CheckCircle className="w-4 h-4 me-2" />
                                {t("موافقة وصرف", "Approve & Issue")}
                              </Button>
                              <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={() => handleRejectRequest(req.id)}
                              >
                                <XCircle className="w-4 h-4 me-2" />
                                {t("رفض", "Reject")}
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
          )}

          {/* Consumption Log Tab */}
          <TabsContent value="log">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  {t("سجل الاستهلاك", "Consumption Log")}
                </CardTitle>
                <CardDescription>
                  {t("سجل من صرف ماذا ومتى", "Record of who issued what and when")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("التاريخ", "Date")}</TableHead>
                      <TableHead>{t("المنتج", "Product")}</TableHead>
                      <TableHead>{t("الكمية", "Qty")}</TableHead>
                      <TableHead>{t("المخزن", "Warehouse")}</TableHead>
                      <TableHead>{t("بواسطة", "By")}</TableHead>
                      <TableHead>{t("ملاحظات", "Notes")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consumptionLog.slice(0, 50).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {new Date(log.created_at).toLocaleDateString(
                            language === "ar" ? "ar-OM" : "en-US"
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{log.product_name}</p>
                            <p className="text-xs text-muted-foreground">{log.product_code}</p>
                          </div>
                        </TableCell>
                        <TableCell>{log.quantity}</TableCell>
                        <TableCell>{log.from_warehouse_name}</TableCell>
                        <TableCell>{log.created_by_name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{log.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent dir={language === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t("تأكيد الصرف", "Confirm Issue")}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">
              {t(
                `هل أنت متأكد من صرف ${cart.length} منتج بقيمة ${cartTotal.toFixed(3)} ر.ع؟`,
                `Are you sure you want to issue ${cart.length} items worth ${cartTotal.toFixed(3)} OMR?`
              )}
            </p>
            <div className="bg-muted p-3 rounded-lg text-sm">
              <ul className="space-y-1">
                {cart.map((item) => (
                  <li key={item.product_id}>
                    • {item.product_name} × {item.quantity}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button onClick={() => handleSubmitRequest(true)} disabled={loading}>
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 me-2" />
                  {t("تأكيد الصرف", "Confirm Issue")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaterialIssue;
