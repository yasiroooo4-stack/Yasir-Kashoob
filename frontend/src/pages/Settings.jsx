import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API, useAuth, useLanguage } from "../App";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
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
import { User, Lock, Building, Activity, Settings as SettingsIcon, Plus, Pencil, Trash2, Palette, Sun, Moon, Sparkles } from "lucide-react";
import { Switch } from "../components/ui/switch";

// Theme configurations
const THEMES = [
  { 
    id: "default", 
    name: "الافتراضي", 
    name_en: "Default",
    primary: "#2563eb",
    secondary: "#64748b",
    accent: "#f59e0b",
    gradient: "from-blue-600 to-blue-800"
  },
  { 
    id: "ocean", 
    name: "المحيط", 
    name_en: "Ocean",
    primary: "#0891b2",
    secondary: "#06b6d4",
    accent: "#14b8a6",
    gradient: "from-cyan-600 to-teal-600"
  },
  { 
    id: "sunset", 
    name: "الغروب", 
    name_en: "Sunset",
    primary: "#ea580c",
    secondary: "#f97316",
    accent: "#fbbf24",
    gradient: "from-orange-500 to-amber-500"
  },
  { 
    id: "forest", 
    name: "الغابة", 
    name_en: "Forest",
    primary: "#059669",
    secondary: "#10b981",
    accent: "#34d399",
    gradient: "from-emerald-600 to-green-600"
  },
  { 
    id: "royal", 
    name: "ملكي", 
    name_en: "Royal",
    primary: "#7c3aed",
    secondary: "#8b5cf6",
    accent: "#a78bfa",
    gradient: "from-violet-600 to-purple-600"
  },
  { 
    id: "rose", 
    name: "الورد", 
    name_en: "Rose",
    primary: "#e11d48",
    secondary: "#f43f5e",
    accent: "#fb7185",
    gradient: "from-rose-500 to-pink-500"
  },
  { 
    id: "midnight", 
    name: "منتصف الليل", 
    name_en: "Midnight",
    primary: "#1e293b",
    secondary: "#334155",
    accent: "#60a5fa",
    gradient: "from-slate-800 to-slate-900"
  },
  { 
    id: "gold", 
    name: "الذهبي", 
    name_en: "Gold",
    primary: "#b45309",
    secondary: "#d97706",
    accent: "#fbbf24",
    gradient: "from-amber-600 to-yellow-500"
  },
];

const Settings = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  
  // Theme state
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem("app_theme") || "default";
  });
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("dark_mode") === "true";
  });
  
  // Profile state
  const [profileData, setProfileData] = useState({
    full_name: "",
    email: "",
    phone: "",
  });
  
  // Password state
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  
  // Centers state
  const [centers, setCenters] = useState([]);
  const [centerDialogOpen, setCenterDialogOpen] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [centerForm, setCenterForm] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    manager_name: "",
  });
  
  // Activity logs state
  const [activityLogs, setActivityLogs] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [centersRes, logsRes] = await Promise.all([
        axios.get(`${API}/centers`),
        axios.get(`${API}/activity-logs?limit=50`),
      ]);
      setCenters(centersRes.data);
      setActivityLogs(logsRes.data);
      
      if (user) {
        setProfileData({
          full_name: user.full_name || "",
          email: user.email || "",
          phone: user.phone || "",
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Apply theme
  const applyTheme = (themeId) => {
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    document.documentElement.style.setProperty('--primary', theme.primary);
    document.documentElement.style.setProperty('--theme-gradient', theme.gradient);
    
    // Update CSS variables
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.primary);
    
    // Save to localStorage
    localStorage.setItem("app_theme", themeId);
    setCurrentTheme(themeId);
    
    toast.success(language === "ar" ? "تم تغيير الثيم بنجاح" : "Theme changed successfully");
  };

  // Toggle dark mode
  const toggleDarkMode = (enabled) => {
    setDarkMode(enabled);
    localStorage.setItem("dark_mode", enabled.toString());
    
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    toast.success(language === "ar" ? "تم تغيير الوضع" : "Mode changed");
  };

  // Apply saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme");
    if (savedTheme) {
      const theme = THEMES.find(t => t.id === savedTheme);
      if (theme) {
        document.documentElement.style.setProperty('--primary', theme.primary);
      }
    }
    
    const savedDarkMode = localStorage.getItem("dark_mode") === "true";
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/auth/profile`, profileData);
      toast.success(t("success"));
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error(language === "ar" ? "كلمات المرور غير متطابقة" : "Passwords do not match");
      return;
    }
    try {
      await axios.put(`${API}/auth/password`, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      toast.success(t("success"));
      setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const handleCenterSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedCenter) {
        await axios.put(`${API}/centers/${selectedCenter.id}`, centerForm);
      } else {
        await axios.post(`${API}/centers`, centerForm);
      }
      toast.success(t("success"));
      setCenterDialogOpen(false);
      resetCenterForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const handleDeleteCenter = async (centerId) => {
    try {
      await axios.delete(`${API}/centers/${centerId}`);
      toast.success(t("success"));
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const openEditCenter = (center) => {
    setSelectedCenter(center);
    setCenterForm({
      name: center.name,
      code: center.code,
      address: center.address || "",
      phone: center.phone || "",
      manager_name: center.manager_name || "",
    });
    setCenterDialogOpen(true);
  };

  const resetCenterForm = () => {
    setCenterForm({
      name: "",
      code: "",
      address: "",
      phone: "",
      manager_name: "",
    });
    setSelectedCenter(null);
  };

  const getActionLabel = (action) => {
    const actions = {
      // Auth
      login: language === "ar" ? "تسجيل دخول" : "Login",
      logout: language === "ar" ? "تسجيل خروج" : "Logout",
      password_change: language === "ar" ? "تغيير كلمة المرور" : "Password Change",
      // Suppliers
      create_supplier: language === "ar" ? "إضافة مورد" : "Add Supplier",
      update_supplier: language === "ar" ? "تعديل مورد" : "Update Supplier",
      delete_supplier: language === "ar" ? "حذف مورد" : "Delete Supplier",
      // Milk Reception
      create_milk_reception: language === "ar" ? "استلام حليب" : "Milk Reception",
      // Customers
      create_customer: language === "ar" ? "إضافة عميل" : "Add Customer",
      update_customer: language === "ar" ? "تعديل عميل" : "Update Customer",
      delete_customer: language === "ar" ? "حذف عميل" : "Delete Customer",
      // Sales
      create_sale: language === "ar" ? "عملية بيع" : "Create Sale",
      // Payments
      create_payment: language === "ar" ? "دفعة مالية" : "Create Payment",
      // Centers
      create_center: language === "ar" ? "إضافة مركز" : "Add Center",
      update_center: language === "ar" ? "تعديل مركز" : "Update Center",
      delete_center: language === "ar" ? "حذف مركز" : "Delete Center",
      // Feed
      create_feed_purchase: language === "ar" ? "شراء علف" : "Feed Purchase",
      delete_feed_purchase: language === "ar" ? "حذف شراء علف" : "Delete Feed Purchase",
      // HR - Employees
      create_employee: language === "ar" ? "إضافة موظف" : "Add Employee",
      update_employee: language === "ar" ? "تعديل موظف" : "Update Employee",
      delete_employee: language === "ar" ? "إيقاف موظف" : "Deactivate Employee",
      // HR - Attendance
      create_attendance: language === "ar" ? "تسجيل حضور" : "Record Attendance",
      // HR - Leave Requests
      create_leave_request: language === "ar" ? "طلب إجازة" : "Leave Request",
      approve_leave_request: language === "ar" ? "الموافقة على إجازة" : "Approve Leave",
      reject_leave_request: language === "ar" ? "رفض إجازة" : "Reject Leave",
      // HR - Expense Requests
      create_expense_request: language === "ar" ? "طلب مصاريف" : "Expense Request",
      approve_expense_request: language === "ar" ? "الموافقة على مصاريف" : "Approve Expense",
      reject_expense_request: language === "ar" ? "رفض مصاريف" : "Reject Expense",
      pay_expense_request: language === "ar" ? "صرف مصاريف" : "Pay Expense",
      // HR - Car Contracts
      create_car_contract: language === "ar" ? "عقد سيارة" : "Car Contract",
      cancel_car_contract: language === "ar" ? "إلغاء عقد سيارة" : "Cancel Car Contract",
      // HR - Official Letters
      create_official_letter: language === "ar" ? "رسالة رسمية" : "Official Letter",
      issue_official_letter: language === "ar" ? "إصدار رسالة" : "Issue Letter",
      // HR - Fingerprint Devices
      create_fingerprint_device: language === "ar" ? "إضافة جهاز بصمة" : "Add Device",
      delete_fingerprint_device: language === "ar" ? "حذف جهاز بصمة" : "Delete Device",
    };
    return actions[action] || action;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("settings")}</h1>
        <p className="text-muted-foreground">
          {language === "ar" ? "إدارة إعدادات الحساب والنظام" : "Manage account and system settings"}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-3xl grid-cols-5">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            {t("profile_settings")}
          </TabsTrigger>
          <TabsTrigger value="password" className="gap-2">
            <Lock className="w-4 h-4" />
            {t("change_password")}
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="w-4 h-4" />
            {language === "ar" ? "المظهر" : "Appearance"}
          </TabsTrigger>
          <TabsTrigger value="centers" className="gap-2">
            <Building className="w-4 h-4" />
            {t("centers")}
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="w-4 h-4" />
            {t("activity_log")}
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile_settings")}</CardTitle>
              <CardDescription>
                {language === "ar" ? "تحديث معلومات حسابك الشخصية" : "Update your personal account information"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="full_name">{t("full_name")}</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("phone")}</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  />
                </div>
                <Button type="submit" className="gradient-primary text-white">
                  {t("save")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>{t("change_password")}</CardTitle>
              <CardDescription>
                {language === "ar" ? "تغيير كلمة المرور الخاصة بك" : "Change your account password"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="current_password">{t("current_password")}</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password">{t("new_password")}</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">{t("confirm_password")}</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="gradient-primary text-white">
                  {t("change_password")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Centers Tab */}
        <TabsContent value="centers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("centers")}</CardTitle>
                <CardDescription>
                  {language === "ar" ? "إدارة مراكز التجميع" : "Manage collection centers"}
                </CardDescription>
              </div>
              {user?.role === "admin" && (
                <Button
                  onClick={() => {
                    resetCenterForm();
                    setCenterDialogOpen(true);
                  }}
                  className="gradient-primary text-white"
                >
                  <Plus className="w-4 h-4 me-2" />
                  {t("add_center")}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("center_code")}</TableHead>
                    <TableHead>{t("manager_name")}</TableHead>
                    <TableHead>{t("phone")}</TableHead>
                    {user?.role === "admin" && <TableHead>{t("actions")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {centers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {t("no_data")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    centers.map((center) => (
                      <TableRow key={center.id}>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-amber-600" />
                            {center.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="badge-info">{center.code}</span>
                        </TableCell>
                        <TableCell>{center.manager_name || "-"}</TableCell>
                        <TableCell>{center.phone || "-"}</TableCell>
                        {user?.role === "admin" && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditCenter(center)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteCenter(center.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>{t("activity_log")}</CardTitle>
              <CardDescription>
                {language === "ar" ? "سجل جميع الأنشطة في النظام" : "Log of all activities in the system"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("timestamp")}</TableHead>
                      <TableHead>{t("username")}</TableHead>
                      <TableHead>{t("action")}</TableHead>
                      <TableHead>{t("entity")}</TableHead>
                      <TableHead>{t("details")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {t("no_data")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      activityLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {new Date(log.timestamp).toLocaleString(
                              language === "ar" ? "ar-SA" : "en-US"
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{log.user_name}</TableCell>
                          <TableCell>
                            <span className="badge-info">{getActionLabel(log.action)}</span>
                          </TableCell>
                          <TableCell>{log.entity_name || "-"}</TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">
                            {log.details || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Center Dialog */}
      <Dialog open={centerDialogOpen} onOpenChange={setCenterDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCenter ? t("edit") : t("add_center")}
            </DialogTitle>
            <DialogDescription>
              {language === "ar" ? "بيانات مركز التجميع" : "Collection center details"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCenterSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="center_name">{t("name")} *</Label>
                <Input
                  id="center_name"
                  value={centerForm.name}
                  onChange={(e) => setCenterForm({ ...centerForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="center_code">{t("center_code")} *</Label>
                <Input
                  id="center_code"
                  value={centerForm.code}
                  onChange={(e) => setCenterForm({ ...centerForm, code: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="center_address">{t("address")}</Label>
              <Input
                id="center_address"
                value={centerForm.address}
                onChange={(e) => setCenterForm({ ...centerForm, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="center_phone">{t("phone")}</Label>
                <Input
                  id="center_phone"
                  value={centerForm.phone}
                  onChange={(e) => setCenterForm({ ...centerForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager_name">{t("manager_name")}</Label>
                <Input
                  id="manager_name"
                  value={centerForm.manager_name}
                  onChange={(e) => setCenterForm({ ...centerForm, manager_name: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCenterDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
