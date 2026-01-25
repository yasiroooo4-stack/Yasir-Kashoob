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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import {
  Settings,
  Building,
  DollarSign,
  Package,
  Bell,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Save,
  MapPin,
  Phone,
  AlertTriangle,
  CheckCircle,
  Palette,
  Video,
  Database,
  Shield,
  Users,
  Calendar,
  Warehouse,
  ClipboardList,
  ShoppingCart,
  Wallet,
  Fingerprint,
  Download,
  Clock,
  Monitor,
  Activity,
} from "lucide-react";

// Lazy load additional settings components
const AppearanceSettings = lazy(() => import("./Settings"));
const NotificationSettings = lazy(() => import("./NotificationSettings"));
const CCTVSystem = lazy(() => import("./CCTVSystem"));

// Fingerprint Sync Settings Component
const FingerprintSyncSettings = ({ language, t }) => {
  const [syncLogs, setSyncLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total_devices: 0,
    last_sync: null,
    total_records_synced: 0,
    active_devices: 0
  });
  
  const token = localStorage.getItem("token");
  
  useEffect(() => {
    fetchSyncData();
  }, []);
  
  const fetchSyncData = async () => {
    setLoading(true);
    try {
      // Fetch sync logs and stats
      const [logsRes, statsRes] = await Promise.all([
        axios.get(`${API}/fingerprint/sync-logs`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API}/fingerprint/sync-stats`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: {} }))
      ]);
      
      setSyncLogs(logsRes.data || []);
      setStats(statsRes.data || {});
    } catch (error) {
      console.error("Error fetching sync data:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadProgram = () => {
    // Trigger download of the sync program
    window.open(`${API}/fingerprint/download-program`, '_blank');
    toast.success(t("جاري تحميل البرنامج...", "Downloading program..."));
  };
  
  return (
    <div className="space-y-6">
      {/* Program Download Card */}
      <Card className="border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Fingerprint className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-blue-800">{t("برنامج مزامنة البصمة", "Fingerprint Sync Program")}</CardTitle>
              <CardDescription>{t("برنامج سطح المكتب لمزامنة بيانات الحضور من أجهزة ZKTeco", "Desktop program to sync attendance from ZKTeco devices")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Download Section */}
            <div className="space-y-4">
              <h4 className="font-bold flex items-center gap-2">
                <Download className="w-4 h-4" />
                {t("تحميل البرنامج", "Download Program")}
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Monitor className="w-10 h-10 text-gray-400" />
                  <div>
                    <p className="font-medium">{t("برنامج مزامنة ZKTeco", "ZKTeco Sync Manager")}</p>
                    <p className="text-sm text-muted-foreground">{t("نسخة ويندوز", "Windows Version")}</p>
                  </div>
                </div>
                <Button onClick={downloadProgram} className="w-full bg-blue-600 hover:bg-blue-700">
                  <Download className="w-4 h-4 me-2" />
                  {t("تحميل البرنامج", "Download Program")}
                </Button>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <h5 className="font-bold text-yellow-800 text-sm mb-2">{t("متطلبات التشغيل:", "Requirements:")}</h5>
                <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                  <li>{t("نظام ويندوز 7 أو أحدث", "Windows 7 or later")}</li>
                  <li>{t("Python 3.8+ (اختياري)", "Python 3.8+ (optional)")}</li>
                  <li>{t("اتصال بالشبكة المحلية", "Local network connection")}</li>
                </ul>
              </div>
            </div>
            
            {/* Instructions Section */}
            <div className="space-y-4">
              <h4 className="font-bold flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                {t("تعليمات الاستخدام", "Usage Instructions")}
              </h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                  <div>
                    <p className="font-medium">{t("قم بتحميل وفك ضغط البرنامج", "Download and extract the program")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                  <div>
                    <p className="font-medium">{t("ثبّت المتطلبات (مرة واحدة فقط)", "Install requirements (once only)")}</p>
                    <code className="block mt-1 bg-gray-800 text-green-400 px-2 py-1 rounded text-xs font-mono">
                      pip install requests pyzk
                    </code>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                  <div>
                    <p className="font-medium">{t("شغّل البرنامج", "Run the program")}</p>
                    <code className="block mt-1 bg-gray-800 text-green-400 px-2 py-1 rounded text-xs font-mono">
                      python sync_manager_gui.py
                    </code>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
                  <p>{t("أضف أجهزة البصمة (IP وPort) وأدخل بيانات تسجيل الدخول", "Add devices (IP and Port) and enter login credentials")}</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0">5</div>
                  <p>{t("اضغط على 'مزامنة الآن' أو فعّل المزامنة التلقائية", "Click 'Sync Now' or enable auto-sync")}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Stats Card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Monitor className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.total_devices || 0}</p>
            <p className="text-sm text-muted-foreground">{t("إجمالي الأجهزة", "Total Devices")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.active_devices || 0}</p>
            <p className="text-sm text-muted-foreground">{t("أجهزة نشطة", "Active Devices")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.total_records_synced || 0}</p>
            <p className="text-sm text-muted-foreground">{t("سجلات تمت مزامنتها", "Records Synced")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-sm font-bold">{stats.last_sync ? new Date(stats.last_sync).toLocaleDateString('ar-OM') : t("لم تتم", "Never")}</p>
            <p className="text-sm text-muted-foreground">{t("آخر مزامنة", "Last Sync")}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Sync Logs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t("سجل المزامنة", "Sync Log")}</CardTitle>
              <CardDescription>{t("آخر عمليات المزامنة", "Recent sync operations")}</CardDescription>
            </div>
            <Button variant="outline" onClick={fetchSyncData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 me-2 ${loading ? 'animate-spin' : ''}`} />
              {t("تحديث", "Refresh")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {syncLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Fingerprint className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t("لا توجد سجلات مزامنة بعد", "No sync logs yet")}</p>
              <p className="text-sm mt-1">{t("قم بتشغيل برنامج المزامنة لبدء نقل البيانات", "Run the sync program to start transferring data")}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("التاريخ", "Date")}</TableHead>
                    <TableHead>{t("الجهاز", "Device")}</TableHead>
                    <TableHead>{t("سجلات جديدة", "New Records")}</TableHead>
                    <TableHead>{t("سجلات محدثة", "Updated")}</TableHead>
                    <TableHead>{t("الحالة", "Status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.slice(0, 10).map((log, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{new Date(log.timestamp).toLocaleString('ar-OM')}</TableCell>
                      <TableCell>{log.device_ip || '-'}</TableCell>
                      <TableCell className="text-green-600 font-medium">+{log.imported || 0}</TableCell>
                      <TableCell className="text-blue-600 font-medium">{log.updated || 0}</TableCell>
                      <TableCell>
                        {log.success ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 me-1" />
                            {t("نجاح", "Success")}
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3 me-1" />
                            {t("فشل", "Failed")}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Data Reset Settings Component - Admin Only
const DataResetSettings = ({ language, t }) => {
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: "", name: "" });
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);
  
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : {};
  const isAdmin = user.role === "admin";
  
  const resetSections = [
    { 
      id: "attendance", 
      name: t("الحضور", "Attendance"), 
      nameAr: "الحضور",
      icon: Calendar, 
      color: "text-blue-600 bg-blue-100",
      description: t("حذف جميع سجلات الحضور والانصراف", "Delete all attendance records"),
      collection: "hr_attendance"
    },
    { 
      id: "projects", 
      name: t("المشاريع", "Projects"), 
      nameAr: "المشاريع",
      icon: ClipboardList, 
      color: "text-purple-600 bg-purple-100",
      description: t("حذف جميع المشاريع والمهام", "Delete all projects and tasks"),
      collection: "projects"
    },
    { 
      id: "inventory", 
      name: t("المخزون", "Inventory"), 
      nameAr: "المخزون",
      icon: Package, 
      color: "text-green-600 bg-green-100",
      description: t("حذف جميع بيانات المخزون والمحاليل", "Delete all inventory data and solutions"),
      collection: "inventory"
    },
    { 
      id: "warehouse_movements", 
      name: t("حركات المخازن", "Warehouse Movements"), 
      nameAr: "حركات المخازن",
      icon: Warehouse, 
      color: "text-orange-600 bg-orange-100",
      description: t("حذف جميع حركات المستودعات والتحويلات", "Delete all warehouse movements and transfers"),
      collection: "warehouse_movements"
    },
    { 
      id: "products", 
      name: t("المنتجات", "Products"), 
      nameAr: "المنتجات",
      icon: ShoppingCart, 
      color: "text-pink-600 bg-pink-100",
      description: t("حذف جميع المنتجات", "Delete all products"),
      collection: "products"
    },
    { 
      id: "messages", 
      name: t("الرسائل", "Messages"), 
      nameAr: "الرسائل",
      icon: Bell, 
      color: "text-indigo-600 bg-indigo-100",
      description: t("حذف جميع الرسائل والإشعارات", "Delete all messages and notifications"),
      collection: "messages"
    },
    { 
      id: "advances", 
      name: t("السلف والمصاريف", "Advances & Expenses"), 
      nameAr: "السلف والمصاريف",
      icon: Wallet, 
      color: "text-cyan-600 bg-cyan-100",
      description: t("حذف جميع طلبات السلف والمصاريف", "Delete all advance and expense requests"),
      collection: "hr_advance_requests"
    },
    { 
      id: "leaves", 
      name: t("الإجازات", "Leaves"), 
      nameAr: "الإجازات",
      icon: Calendar, 
      color: "text-teal-600 bg-teal-100",
      description: t("حذف جميع طلبات الإجازات", "Delete all leave requests"),
      collection: "hr_leave_requests"
    },
    { 
      id: "warehouse_management", 
      name: t("إدارة المخازن", "Warehouse Management"), 
      nameAr: "إدارة المخازن",
      icon: Warehouse, 
      color: "text-amber-600 bg-amber-100",
      description: t("حذف بيانات إدارة المخازن الشاملة", "Delete all warehouse management data"),
      collection: "warehouses"
    },
  ];
  
  const handleReset = async () => {
    if (confirmText !== confirmDialog.nameAr) {
      toast.error(t("يرجى كتابة اسم القسم للتأكيد", "Please type the section name to confirm"));
      return;
    }
    
    setResetting(true);
    try {
      const res = await axios.post(
        `${API}/admin/reset-data/${confirmDialog.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(t(`تم تصفير ${confirmDialog.name} بنجاح`, `${confirmDialog.name} reset successfully`));
      setConfirmDialog({ open: false, type: "", name: "" });
      setConfirmText("");
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في التصفير", "Reset failed"));
    } finally {
      setResetting(false);
    }
  };
  
  if (!isAdmin) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-8 text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-red-700 mb-2">
            {t("غير مصرح", "Unauthorized")}
          </h3>
          <p className="text-red-600">
            {t("هذه الصفحة متاحة لمدير النظام فقط", "This page is only available for system administrators")}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card className="border-red-200">
        <CardHeader className="bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <Database className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-red-700">{t("تصفير البيانات", "Data Reset")}</CardTitle>
              <CardDescription className="text-red-600">
                {t("حذف البيانات من الأقسام المحددة - للمدير فقط", "Delete data from selected sections - Admin only")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-yellow-800">{t("تحذير مهم", "Important Warning")}</h4>
                <p className="text-yellow-700 text-sm mt-1">
                  {t(
                    "تصفير البيانات عملية لا يمكن التراجع عنها. سيتم حذف جميع البيانات المحددة نهائياً.",
                    "Data reset is irreversible. All selected data will be permanently deleted."
                  )}
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resetSections.map((section) => {
              const Icon = section.icon;
              return (
                <Card key={section.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg ${section.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold">{section.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
                      </div>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="w-full mt-4"
                      onClick={() => setConfirmDialog({ open: true, id: section.id, name: section.name, nameAr: section.nameAr })}
                      data-testid={`reset-${section.id}-btn`}
                    >
                      <Trash2 className="w-4 h-4 me-2" />
                      {t("تصفير", "Reset")}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => { setConfirmDialog({ ...confirmDialog, open }); setConfirmText(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {t("تأكيد التصفير", "Confirm Reset")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">
              {t(
                `هل أنت متأكد من تصفير قسم "${confirmDialog.name}"؟ سيتم حذف جميع البيانات نهائياً.`,
                `Are you sure you want to reset "${confirmDialog.name}"? All data will be permanently deleted.`
              )}
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <Label className="text-red-700">
                {t(`للتأكيد، اكتب "${confirmDialog.nameAr}"`, `To confirm, type "${confirmDialog.nameAr}"`)}
              </Label>
              <Input 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={confirmDialog.nameAr}
                className="mt-2"
                data-testid="reset-confirm-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmDialog({ open: false, type: "", name: "" }); setConfirmText(""); }}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReset}
              disabled={confirmText !== confirmDialog.nameAr || resetting}
              data-testid="reset-confirm-btn"
            >
              {resetting ? <RefreshCw className="w-4 h-4 me-2 animate-spin" /> : <Trash2 className="w-4 h-4 me-2" />}
              {t("تصفير نهائي", "Permanently Reset")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const SystemSettings = () => {
  const { language } = useLanguage();
  const t = (ar, en) => language === "ar" ? ar : en;
  
  const [activeTab, setActiveTab] = useState("centers");
  const [loading, setLoading] = useState(false);
  
  // Centers
  const [centers, setCenters] = useState([]);
  const [centerDialogOpen, setCenterDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [centerForm, setCenterForm] = useState({ name: "", code: "", location: "", phone: "", is_active: true });
  
  // Milk Prices
  const [milkPrices, setMilkPrices] = useState([]);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);
  
  // Feed Types
  const [feedTypes, setFeedTypes] = useState([]);
  const [feedDialogOpen, setFeedDialogOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState(null);
  const [feedForm, setFeedForm] = useState({ name: "", price: "", unit: "كجم", stock: 0, min_stock: 100 });
  
  // Alerts Settings
  const [alertSettings, setAlertSettings] = useState({
    low_balance_threshold: 100,
    low_stock_threshold: 50,
    enable_sms: false,
    enable_email: false,
    alert_recipients: "",
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch centers from API
      try {
        const centersRes = await axios.get(`${API}/centers`, { headers });
        const suppliersRes = await axios.get(`${API}/suppliers`, { headers });
        const centersWithCount = (centersRes.data || []).map(center => ({
          ...center,
          suppliers_count: (suppliersRes.data || []).filter(s => s.center_name === center.name).length,
        }));
        setCenters(centersWithCount);
      } catch {
        setCenters([]);
      }
      
      // Fetch milk prices
      try {
        const pricesRes = await axios.get(`${API}/settings/milk-prices`, { headers });
        if (pricesRes.data && pricesRes.data.length > 0) {
          setMilkPrices(pricesRes.data);
        } else {
          setMilkPrices([
            { id: "camel", name: t("حليب الإبل", "Camel Milk"), price: 0.350, is_active: true },
            { id: "cow", name: t("حليب الأبقار", "Cow Milk"), price: 0.250, is_active: true },
          ]);
        }
      } catch {
        setMilkPrices([
          { id: "camel", name: t("حليب الإبل", "Camel Milk"), price: 0.350, is_active: true },
          { id: "cow", name: t("حليب الأبقار", "Cow Milk"), price: 0.250, is_active: true },
        ]);
      }
      
      // Fetch feed types
      try {
        const feedRes = await axios.get(`${API}/feed-types`, { headers });
        setFeedTypes(feedRes.data || []);
      } catch {
        // Use default feed types
        setFeedTypes([
          { id: "barley", name: "شعير", price: 85, unit: "كجم", stock: 1000, min_stock: 100 },
          { id: "wheat_bran", name: "نخالة قمح", price: 70, unit: "كجم", stock: 800, min_stock: 100 },
          { id: "corn", name: "ذرة", price: 95, unit: "كجم", stock: 500, min_stock: 100 },
          { id: "alfalfa", name: "برسيم", price: 120, unit: "كجم", stock: 300, min_stock: 100 },
          { id: "mixed", name: "علف مخلوط", price: 100, unit: "كجم", stock: 600, min_stock: 100 },
        ]);
      }
      
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Center Functions
  const openCenterDialog = (center = null) => {
    if (center) {
      setEditingCenter(center);
      setCenterForm({ name: center.name, code: center.code, location: center.location, phone: center.phone || "", is_active: center.is_active });
    } else {
      setEditingCenter(null);
      setCenterForm({ name: "", code: "", location: "", phone: "", is_active: true });
    }
    setCenterDialogOpen(true);
  };

  const saveCenter = async () => {
    if (!centerForm.name) {
      toast.error(t("الرجاء إدخال اسم المركز", "Please enter center name"));
      return;
    }
    
    try {
      if (editingCenter) {
        // Update existing center via API
        await axios.put(`${API}/centers/${editingCenter.id}`, centerForm, { headers });
        toast.success(t("تم تحديث المركز بنجاح", "Center updated successfully"));
      } else {
        // Add new center via API
        await axios.post(`${API}/centers`, centerForm, { headers });
        toast.success(t("تم إضافة المركز بنجاح", "Center added successfully"));
      }
      setCenterDialogOpen(false);
      fetchAllData(); // Refresh data
    } catch (error) {
      toast.error(t("فشل في حفظ المركز", "Failed to save center"));
    }
  };

  const deleteCenter = async (centerId) => {
    if (!window.confirm(t("هل أنت متأكد من حذف هذا المركز؟", "Are you sure you want to delete this center?"))) {
      return;
    }
    try {
      await axios.delete(`${API}/centers/${centerId}`, { headers });
      toast.success(t("تم حذف المركز", "Center deleted"));
      fetchAllData();
    } catch (error) {
      toast.error(t("فشل في حذف المركز", "Failed to delete center"));
    }
  };

  // Price Functions
  const openPriceDialog = (price) => {
    setEditingPrice({ ...price });
    setPriceDialogOpen(true);
  };

  const savePrice = async () => {
    if (!editingPrice) return;
    
    try {
      // Save to backend
      await axios.post(`${API}/settings/milk-prices`, {
        milk_type: editingPrice.id,
        name: editingPrice.name,
        price: editingPrice.price,
        is_active: editingPrice.is_active
      }, { headers });
      
      // Update local state
      const updatedPrices = milkPrices.map(p => 
        p.id === editingPrice.id ? editingPrice : p
      );
      setMilkPrices(updatedPrices);
      setPriceDialogOpen(false);
      toast.success("تم حفظ السعر بنجاح");
    } catch (error) {
      console.error("Error saving price:", error);
      toast.error("فشل في حفظ السعر");
    }
  };

  // Feed Functions
  const openFeedDialog = (feed = null) => {
    if (feed) {
      setEditingFeed(feed);
      setFeedForm({ name: feed.name, price: feed.price, unit: feed.unit, stock: feed.stock, min_stock: feed.min_stock });
    } else {
      setEditingFeed(null);
      setFeedForm({ name: "", price: "", unit: "كجم", stock: 0, min_stock: 100 });
    }
    setFeedDialogOpen(true);
  };

  const saveFeed = () => {
    if (!feedForm.name || !feedForm.price) {
      toast.error("الرجاء إدخال جميع البيانات");
      return;
    }
    
    if (editingFeed) {
      const updatedFeeds = feedTypes.map(f => 
        f.id === editingFeed.id ? { ...f, ...feedForm, price: parseFloat(feedForm.price) } : f
      );
      setFeedTypes(updatedFeeds);
      toast.success("تم تحديث نوع العلف بنجاح");
    } else {
      const newFeed = {
        id: `feed_${Date.now()}`,
        ...feedForm,
        price: parseFloat(feedForm.price),
      };
      setFeedTypes([...feedTypes, newFeed]);
      toast.success("تم إضافة نوع العلف بنجاح");
    }
    setFeedDialogOpen(false);
  };

  const deleteFeed = (feedId) => {
    setFeedTypes(feedTypes.filter(f => f.id !== feedId));
    toast.success("تم حذف نوع العلف");
  };

  // Save Alert Settings
  const saveAlertSettings = () => {
    toast.success("تم حفظ إعدادات التنبيهات");
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-7 h-7" />
            {t("إعدادات النظام", "System Settings")}
          </h1>
          <p className="text-muted-foreground">{t("إدارة المراكز والأسعار والأعلاف والتنبيهات", "Manage centers, prices, feeds, and alerts")}</p>
        </div>
        <Button onClick={fetchAllData} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 me-2 ${loading ? "animate-spin" : ""}`} />
          {t("تحديث", "Refresh")}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 max-w-4xl">
          <TabsTrigger value="centers" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
            <Building className="w-4 h-4" /><span className="hidden sm:inline">{t("المراكز", "Centers")}</span>
          </TabsTrigger>
          <TabsTrigger value="prices" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
            <DollarSign className="w-4 h-4" /><span className="hidden sm:inline">{t("الأسعار", "Prices")}</span>
          </TabsTrigger>
          <TabsTrigger value="feeds" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
            <Package className="w-4 h-4" /><span className="hidden sm:inline">{t("الأعلاف", "Feeds")}</span>
          </TabsTrigger>
          <TabsTrigger value="locations" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
            <MapPin className="w-4 h-4" /><span className="hidden sm:inline">{t("المواقع", "Locations")}</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
            <Bell className="w-4 h-4" /><span className="hidden sm:inline">{t("التنبيهات", "Alerts")}</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
            <Palette className="w-4 h-4" /><span className="hidden sm:inline">{t("المظهر", "Theme")}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
            <Bell className="w-4 h-4" /><span className="hidden sm:inline">{t("الإشعارات", "Notif.")}</span>
          </TabsTrigger>
          <TabsTrigger value="cctv" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
            <Video className="w-4 h-4" /><span className="hidden sm:inline">{t("الكاميرات", "CCTV")}</span>
          </TabsTrigger>
          <TabsTrigger value="fingerprint" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5">
            <Fingerprint className="w-4 h-4" /><span className="hidden sm:inline">{t("البصمة", "Fingerprint")}</span>
          </TabsTrigger>
          <TabsTrigger value="reset" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 py-1.5 text-red-600 data-[state=active]:bg-red-100">
            <Database className="w-4 h-4" /><span className="hidden sm:inline">{t("تصفير", "Reset")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Centers Tab */}
        <TabsContent value="centers">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t("مراكز التجميع", "Collection Centers")}</CardTitle>
                  <CardDescription>{t("إدارة مراكز تجميع الحليب", "Manage milk collection centers")}</CardDescription>
                </div>
                <Button onClick={() => openCenterDialog()}>
                  <Plus className="w-4 h-4 me-2" />
                  {t("إضافة مركز", "Add Center")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {centers.map((center) => (
                  <Card key={center.id} className={`${center.is_active ? "" : "opacity-60"}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <Building className="w-5 h-5 text-primary" />
                          <h4 className="font-bold">{center.name}</h4>
                        </div>
                        <Badge variant={center.is_active ? "default" : "secondary"}>
                          {center.is_active ? t("نشط", "Active") : t("معطل", "Inactive")}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {center.location || t("غير محدد", "Not specified")}
                        </div>
                        {center.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {center.phone}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{center.suppliers_count} {t("مورد", "suppliers")}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => openCenterDialog(center)}>
                          <Pencil className="w-4 h-4 me-2" />
                          {t("تعديل", "Edit")}
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600" onClick={() => deleteCenter(center.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600" onClick={() => deleteCenter(center.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Prices Tab */}
        <TabsContent value="prices">
          <Card>
            <CardHeader>
              <CardTitle>{t("أسعار الحليب", "Milk Prices")}</CardTitle>
              <CardDescription>{t("تحديد سعر الشراء لكل نوع حليب", "Set purchase price for each milk type")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {milkPrices.map((price) => (
                  <Card key={price.id} className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{price.id === "camel" ? "🐪" : "🐄"}</span>
                          <div>
                            <h4 className="font-bold">{price.name}</h4>
                            <p className="text-sm text-muted-foreground">{t("سعر اللتر", "Price per liter")}</p>
                          </div>
                        </div>
                        <Badge variant={price.is_active ? "default" : "secondary"}>
                          {price.is_active ? t("نشط", "Active") : t("معطل", "Inactive")}
                        </Badge>
                      </div>
                      <div className="text-center mb-4">
                        <p className="text-4xl font-bold text-primary">{price.price.toFixed(3)}</p>
                        <p className="text-sm text-muted-foreground">{t("ريال عماني / لتر", "OMR / Liter")}</p>
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => openPriceDialog(price)}>
                        <Pencil className="w-4 h-4 me-2" />
                        {t("تعديل السعر", "Edit Price")}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feeds Tab */}
        <TabsContent value="feeds">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{t("أنواع الأعلاف", "Feed Types")}</CardTitle>
                  <CardDescription>{t("إدارة أنواع وأسعار الأعلاف", "Manage feed types and prices")}</CardDescription>
                </div>
                <Button onClick={() => openFeedDialog()}>
                  <Plus className="w-4 h-4 me-2" />
                  {t("إضافة نوع", "Add Type")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("النوع", "Type")}</TableHead>
                      <TableHead>{t("السعر", "Price")}</TableHead>
                      <TableHead>{t("الوحدة", "Unit")}</TableHead>
                      <TableHead>{t("المخزون", "Stock")}</TableHead>
                      <TableHead>{t("الحد الأدنى", "Min Stock")}</TableHead>
                      <TableHead>{t("الحالة", "Status")}</TableHead>
                      <TableHead>{t("الإجراءات", "Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedTypes.map((feed) => (
                      <TableRow key={feed.id}>
                        <TableCell className="font-medium">{feed.name}</TableCell>
                        <TableCell className="text-green-600 font-bold">{feed.price} {t("ر.ع", "OMR")}</TableCell>
                        <TableCell>{feed.unit}</TableCell>
                        <TableCell>
                          <span className={feed.stock < feed.min_stock ? "text-red-600 font-bold" : ""}>
                            {feed.stock}
                          </span>
                        </TableCell>
                        <TableCell>{feed.min_stock}</TableCell>
                        <TableCell>
                          {feed.stock < feed.min_stock ? (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" />
                              {t("منخفض", "Low")}
                            </Badge>
                          ) : (
                            <Badge variant="default" className="flex items-center gap-1 w-fit">
                              <CheckCircle className="w-3 h-3" />
                              {t("متوفر", "Available")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openFeedDialog(feed)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteFeed(feed.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>{t("إعدادات التنبيهات", "Alert Settings")}</CardTitle>
              <CardDescription>{t("تكوين التنبيهات والإشعارات", "Configure alerts and notifications")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-bold">{t("حدود التنبيه", "Alert Thresholds")}</h4>
                  <div className="space-y-2">
                    <Label>{t("حد الرصيد المنخفض (ر.ع)", "Low Balance Threshold (OMR)")}</Label>
                    <Input
                      type="number"
                      value={alertSettings.low_balance_threshold}
                      onChange={(e) => setAlertSettings({ ...alertSettings, low_balance_threshold: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">{t("تنبيه عند انخفاض رصيد المورد عن هذا المبلغ", "Alert when supplier balance falls below this amount")}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("حد المخزون المنخفض", "Low Stock Threshold")}</Label>
                    <Input
                      type="number"
                      value={alertSettings.low_stock_threshold}
                      onChange={(e) => setAlertSettings({ ...alertSettings, low_stock_threshold: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">{t("تنبيه عند انخفاض مخزون الأعلاف", "Alert when feed stock is low")}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-bold">{t("قنوات الإشعار", "Notification Channels")}</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{t("إشعارات SMS", "SMS Notifications")}</Label>
                      <p className="text-xs text-muted-foreground">{t("إرسال رسائل نصية", "Send text messages")}</p>
                    </div>
                    <Switch
                      checked={alertSettings.enable_sms}
                      onCheckedChange={(checked) => setAlertSettings({ ...alertSettings, enable_sms: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{t("إشعارات البريد", "Email Notifications")}</Label>
                      <p className="text-xs text-muted-foreground">{t("إرسال بريد إلكتروني", "Send emails")}</p>
                    </div>
                    <Switch
                      checked={alertSettings.enable_email}
                      onCheckedChange={(checked) => setAlertSettings({ ...alertSettings, enable_email: checked })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("مستلمي التنبيهات", "Alert Recipients")}</Label>
                    <Input
                      placeholder="email@example.com, +968XXXXXXXX"
                      value={alertSettings.alert_recipients}
                      onChange={(e) => setAlertSettings({ ...alertSettings, alert_recipients: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              
              <Button onClick={saveAlertSettings} className="w-full md:w-auto">
                <Save className="w-4 h-4 me-2" />
                {t("حفظ الإعدادات", "Save Settings")}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Allowed Locations Tab */}
        <TabsContent value="locations">
          <AllowedLocationsSettings language={language} t={t} />
        </TabsContent>

        {/* Appearance Settings Tab */}
        <TabsContent value="appearance">
          <Suspense fallback={
            <div className="flex justify-center items-center p-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          }>
            <AppearanceSettings embedded={true} />
          </Suspense>
        </TabsContent>

        {/* Notification Settings Tab */}
        <TabsContent value="notifications">
          <Suspense fallback={
            <div className="flex justify-center items-center p-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          }>
            <NotificationSettings embedded={true} />
          </Suspense>
        </TabsContent>

        {/* CCTV System Tab */}
        <TabsContent value="cctv">
          <Suspense fallback={
            <div className="flex justify-center items-center p-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          }>
            <CCTVSystem embedded={true} />
          </Suspense>
        </TabsContent>

        {/* Fingerprint Sync Tab */}
        <TabsContent value="fingerprint">
          <FingerprintSyncSettings language={language} t={t} />
        </TabsContent>

        {/* Data Reset Tab - Admin Only */}
        <TabsContent value="reset">
          <DataResetSettings language={language} t={t} />
        </TabsContent>
      </Tabs>

      {/* Center Dialog */}
      <Dialog open={centerDialogOpen} onOpenChange={setCenterDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCenter ? t("تعديل المركز", "Edit Center") : t("إضافة مركز جديد", "Add New Center")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("اسم المركز", "Center Name")} *</Label>
              <Input value={centerForm.name} onChange={(e) => setCenterForm({ ...centerForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("الكود", "Code")}</Label>
              <Input value={centerForm.code} onChange={(e) => setCenterForm({ ...centerForm, code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("الموقع", "Location")}</Label>
              <Input value={centerForm.location} onChange={(e) => setCenterForm({ ...centerForm, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("رقم الهاتف", "Phone")}</Label>
              <Input value={centerForm.phone} onChange={(e) => setCenterForm({ ...centerForm, phone: e.target.value })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("نشط", "Active")}</Label>
              <Switch checked={centerForm.is_active} onCheckedChange={(checked) => setCenterForm({ ...centerForm, is_active: checked })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCenterDialogOpen(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button onClick={saveCenter}><Save className="w-4 h-4 me-2" />{t("حفظ", "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Dialog */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("تعديل سعر", "Edit Price")} {editingPrice?.name}</DialogTitle>
          </DialogHeader>
          {editingPrice && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <span className="text-5xl">{editingPrice.id === "camel" ? "🐪" : "🐄"}</span>
              </div>
              <div className="space-y-2">
                <Label>{t("السعر (ر.ع / لتر)", "Price (OMR / Liter)")}</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={editingPrice.price}
                  onChange={(e) => setEditingPrice({ ...editingPrice, price: parseFloat(e.target.value) })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>{t("نشط", "Active")}</Label>
                <Switch
                  checked={editingPrice.is_active}
                  onCheckedChange={(checked) => setEditingPrice({ ...editingPrice, is_active: checked })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceDialogOpen(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button onClick={savePrice}><Save className="w-4 h-4 me-2" />{t("حفظ", "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feed Dialog */}
      <Dialog open={feedDialogOpen} onOpenChange={setFeedDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFeed ? t("تعديل نوع العلف", "Edit Feed Type") : t("إضافة نوع علف جديد", "Add New Feed Type")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("اسم العلف", "Feed Name")} *</Label>
              <Input value={feedForm.name} onChange={(e) => setFeedForm({ ...feedForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("السعر (ر.ع)", "Price (OMR)")} *</Label>
              <Input type="number" value={feedForm.price} onChange={(e) => setFeedForm({ ...feedForm, price: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("الوحدة", "Unit")}</Label>
              <Select value={feedForm.unit} onValueChange={(v) => setFeedForm({ ...feedForm, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="كجم">{t("كجم", "KG")}</SelectItem>
                  <SelectItem value="طن">{t("طن", "Ton")}</SelectItem>
                  <SelectItem value="كيس">{t("كيس", "Bag")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("المخزون الحالي", "Current Stock")}</Label>
                <Input type="number" value={feedForm.stock} onChange={(e) => setFeedForm({ ...feedForm, stock: parseInt(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>{t("الحد الأدنى", "Min Stock")}</Label>
                <Input type="number" value={feedForm.min_stock} onChange={(e) => setFeedForm({ ...feedForm, min_stock: parseInt(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedDialogOpen(false)}>{t("إلغاء", "Cancel")}</Button>
            <Button onClick={saveFeed}><Save className="w-4 h-4 me-2" />{t("حفظ", "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Allowed Locations Settings Component
const AllowedLocationsSettings = ({ language, t }) => {
  const [locations, setLocations] = useState([]);
  const [loginRecords, setLoginRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [geofenceSettings, setGeofenceSettings] = useState({
    enabled: false,
    block_unauthorized: false,
    allow_without_location: true,
  });
  const [locationForm, setLocationForm] = useState({
    name: "",
    latitude: "",
    longitude: "",
    radius: 5,
  });

  useEffect(() => {
    fetchLocations();
    fetchLoginRecords();
    fetchGeofenceSettings();
  }, []);

  const fetchGeofenceSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/system/geofence-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGeofenceSettings(res.data || {
        enabled: false,
        block_unauthorized: false,
        allow_without_location: true,
      });
    } catch (error) {
      console.log("Error fetching geofence settings");
    }
  };

  const saveGeofenceSettings = async (newSettings) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/system/geofence-settings`, newSettings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGeofenceSettings(newSettings);
      toast.success(t("تم حفظ الإعدادات", "Settings saved"));
    } catch (error) {
      toast.error(t("خطأ في حفظ الإعدادات", "Error saving settings"));
    }
  };

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/system/allowed-login-locations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLocations(res.data || []);
    } catch (error) {
      console.log("Error fetching locations");
    }
  };

  const fetchLoginRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/auth/login-records`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLoginRecords(res.data || []);
    } catch (error) {
      console.log("Error fetching login records");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = async () => {
    if (!locationForm.name || !locationForm.latitude || !locationForm.longitude) {
      toast.error(t("يرجى ملء جميع الحقول", "Please fill all fields"));
      return;
    }

    const newLocations = [...locations, {
      name: locationForm.name,
      latitude: parseFloat(locationForm.latitude),
      longitude: parseFloat(locationForm.longitude),
      radius: parseFloat(locationForm.radius) || 5,
    }];

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/system/allowed-login-locations`, newLocations, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t("تمت إضافة الموقع", "Location added"));
      setLocations(newLocations);
      setDialogOpen(false);
      setLocationForm({ name: "", latitude: "", longitude: "", radius: 5 });
    } catch (error) {
      toast.error(t("خطأ في حفظ الموقع", "Error saving location"));
    }
  };

  const handleDeleteLocation = async (index) => {
    const newLocations = locations.filter((_, i) => i !== index);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/system/allowed-login-locations`, newLocations, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t("تم حذف الموقع", "Location deleted"));
      setLocations(newLocations);
    } catch (error) {
      toast.error(t("خطأ في الحذف", "Error deleting"));
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationForm(prev => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6),
          }));
          toast.success(t("تم تحديد موقعك الحالي", "Current location detected"));
        },
        (error) => {
          toast.error(t("تعذر تحديد الموقع", "Could not get location"));
        }
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Geofence Settings Card */}
      <Card className="border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-blue-800">{t("إعدادات تحديد الموقع الجغرافي", "Geofencing Settings")}</CardTitle>
              <CardDescription>{t("تحكم في تسجيل الدخول بناءً على الموقع الجغرافي", "Control login based on geographic location")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Enable Geofencing */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label className="text-base font-medium">{t("تفعيل تحديد الموقع", "Enable Geofencing")}</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {t("تتبع موقع المستخدم عند تسجيل الدخول", "Track user location on login")}
              </p>
            </div>
            <Switch
              checked={geofenceSettings.enabled}
              onCheckedChange={(checked) => saveGeofenceSettings({ ...geofenceSettings, enabled: checked })}
            />
          </div>

          {geofenceSettings.enabled && (
            <>
              {/* Block Unauthorized */}
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <Label className="text-base font-medium text-red-800">{t("منع الدخول من مواقع غير مصرحة", "Block Unauthorized Locations")}</Label>
                  <p className="text-sm text-red-600 mt-1">
                    {t("⚠️ تحذير: سيتم رفض تسجيل الدخول من خارج المواقع المحددة", "⚠️ Warning: Login will be rejected from outside defined locations")}
                  </p>
                </div>
                <Switch
                  checked={geofenceSettings.block_unauthorized}
                  onCheckedChange={(checked) => saveGeofenceSettings({ ...geofenceSettings, block_unauthorized: checked })}
                />
              </div>

              {/* Allow Without Location */}
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div>
                  <Label className="text-base font-medium text-yellow-800">{t("السماح بالدخول بدون موقع", "Allow Login Without Location")}</Label>
                  <p className="text-sm text-yellow-600 mt-1">
                    {t("السماح للمستخدمين الذين رفضوا مشاركة موقعهم بالدخول", "Allow users who declined location sharing to login")}
                  </p>
                </div>
                <Switch
                  checked={geofenceSettings.allow_without_location}
                  onCheckedChange={(checked) => saveGeofenceSettings({ ...geofenceSettings, allow_without_location: checked })}
                />
              </div>

              {/* Status Summary */}
              <div className={`p-4 rounded-lg ${geofenceSettings.block_unauthorized ? 'bg-red-100 border border-red-300' : 'bg-green-100 border border-green-300'}`}>
                <div className="flex items-center gap-2">
                  {geofenceSettings.block_unauthorized ? (
                    <>
                      <Shield className="w-5 h-5 text-red-600" />
                      <span className="font-medium text-red-800">
                        {t("وضع الحماية: مفعّل - سيتم منع الدخول من المواقع غير المصرحة", "Protection Mode: ON - Unauthorized locations will be blocked")}
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800">
                        {t("وضع المراقبة: سيتم تسجيل جميع محاولات الدخول دون منعها", "Monitoring Mode: All login attempts logged but not blocked")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Allowed Locations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              {t("المواقع المسموح بالدخول منها", "Allowed Login Locations")}
            </CardTitle>
            <CardDescription>
              {t("حدد المواقع الجغرافية المسموح للموظفين بتسجيل الدخول منها", "Define geographic locations where employees can login")}
            </CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gradient-primary text-white">
            <Plus className="w-4 h-4 me-2" />
            {t("إضافة موقع", "Add Location")}
          </Button>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t("لم يتم تحديد أي مواقع - الدخول مسموح من أي مكان", "No locations defined - Login allowed from anywhere")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("اسم الموقع", "Location Name")}</TableHead>
                  <TableHead>{t("خط العرض", "Latitude")}</TableHead>
                  <TableHead>{t("خط الطول", "Longitude")}</TableHead>
                  <TableHead>{t("نصف القطر (كم)", "Radius (km)")}</TableHead>
                  <TableHead>{t("الإجراءات", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((loc, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{loc.name}</TableCell>
                    <TableCell className="font-mono text-sm">{loc.latitude}</TableCell>
                    <TableCell className="font-mono text-sm">{loc.longitude}</TableCell>
                    <TableCell>{loc.radius} km</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteLocation(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Login Records */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              {t("سجل تسجيلات الدخول", "Login Records")}
            </CardTitle>
            <CardDescription>
              {t("آخر 50 عملية تسجيل دخول مع تفاصيل الموقع", "Last 50 login attempts with location details")}
            </CardDescription>
          </div>
          <Button variant="outline" onClick={fetchLoginRecords}>
            <RefreshCw className={`w-4 h-4 me-2 ${loading ? "animate-spin" : ""}`} />
            {t("تحديث", "Refresh")}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : loginRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("لا توجد سجلات", "No records found")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("المستخدم", "User")}</TableHead>
                    <TableHead>{t("التاريخ والوقت", "Date & Time")}</TableHead>
                    <TableHead>{t("الموقع", "Location")}</TableHead>
                    <TableHead>{t("عنوان IP", "IP Address")}</TableHead>
                    <TableHead>{t("الحالة", "Status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginRecords.slice(0, 50).map((record) => (
                    <TableRow key={record.id} className={!record.is_within_allowed_area ? "bg-red-50" : ""}>
                      <TableCell className="font-medium">{record.username}</TableCell>
                      <TableCell>
                        {new Date(record.login_time).toLocaleString(language === "ar" ? "ar-SA" : "en-US")}
                      </TableCell>
                      <TableCell>
                        {record.latitude && record.longitude ? (
                          <a
                            href={`https://maps.google.com/?q=${record.latitude},${record.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3" />
                            {record.latitude?.toFixed(4)}, {record.longitude?.toFixed(4)}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">{t("غير متوفر", "N/A")}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{record.ip_address || "-"}</TableCell>
                      <TableCell>
                        {record.is_within_allowed_area ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 me-1" />
                            {t("مصرح", "Allowed")}
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3 me-1" />
                            {t("غير مصرح", "Unauthorized")}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Location Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              {t("إضافة موقع مسموح", "Add Allowed Location")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("اسم الموقع", "Location Name")} *</Label>
              <Input
                value={locationForm.name}
                onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                placeholder={t("مثال: المقر الرئيسي", "Example: Main Office")}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("خط العرض", "Latitude")} *</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={locationForm.latitude}
                  onChange={(e) => setLocationForm({ ...locationForm, latitude: e.target.value })}
                  placeholder="23.5880"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("خط الطول", "Longitude")} *</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={locationForm.longitude}
                  onChange={(e) => setLocationForm({ ...locationForm, longitude: e.target.value })}
                  placeholder="58.3829"
                />
              </div>
            </div>

            <Button variant="outline" onClick={getCurrentLocation} className="w-full">
              <MapPin className="w-4 h-4 me-2" />
              {t("استخدام موقعي الحالي", "Use My Current Location")}
            </Button>

            <div className="space-y-2">
              <Label>{t("نصف القطر المسموح (كم)", "Allowed Radius (km)")}</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={locationForm.radius}
                onChange={(e) => setLocationForm({ ...locationForm, radius: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                {t("المسافة المسموحة من مركز الموقع", "Allowed distance from location center")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button onClick={handleAddLocation} className="gradient-primary text-white">
              <Save className="w-4 h-4 me-2" />
              {t("حفظ", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SystemSettings;
