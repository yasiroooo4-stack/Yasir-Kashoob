import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth, useLanguage, API } from "../App";
import axios from "axios";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  Milk,
  ShoppingCart,
  Package,
  Wallet,
  BarChart3,
  Menu,
  X,
  LogOut,
  Globe,
  ChevronLeft,
  ChevronRight,
  User,
  Wheat,
  Settings,
  Building2,
  Scale,
  FolderKanban,
  Activity,
  Megaphone,
  Calculator,
  Image,
  PiggyBank,
  PackageSearch,
  CalendarClock,
  Landmark,
  DollarSign,
  Shield,
  KeyRound,
  UserCog,
  Car,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Avatar, AvatarFallback } from "./ui/avatar";
import LetterRequestButton from "./LetterRequestButton";
import LeaveRequestButton from "./LeaveRequestButton";
import ExcuseRequestButton from "./ExcuseRequestButton";
import AdvanceRequestButton from "./AdvanceRequestButton";
import EmployeeStatsWidget from "./EmployeeStatsWidget";

const Layout = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [backgrounds, setBackgrounds] = useState([]);
  const [backgroundDialogOpen, setBackgroundDialogOpen] = useState(false);
  
  // Account Settings State
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    full_name: "",
    email: "",
    phone: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Fetch user settings and backgrounds
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        
        const headers = { Authorization: `Bearer ${token}` };
        
        // Fetch user settings
        const settingsRes = await axios.get(`${API}/user/settings`, { headers });
        const settings = settingsRes.data;
        
        if (settings?.background_url) {
          setBackgroundUrl(settings.background_url);
        }
        
        // Apply theme settings from backend
        if (settings?.app_theme) {
          const THEMES = [
            { id: "default", primary: "#2563eb", secondary: "#64748b" },
            { id: "ocean", primary: "#0ea5e9", secondary: "#0284c7" },
            { id: "forest", primary: "#16a34a", secondary: "#15803d" },
            { id: "sunset", primary: "#f97316", secondary: "#ea580c" },
            { id: "royal", primary: "#7c3aed", secondary: "#6d28d9" },
            { id: "rose", primary: "#e11d48", secondary: "#be123c" },
            { id: "dark", primary: "#6366f1", secondary: "#4f46e5" },
            { id: "slate", primary: "#475569", secondary: "#334155" }
          ];
          
          const theme = THEMES.find(t => t.id === settings.app_theme);
          if (theme) {
            document.documentElement.setAttribute('data-theme', settings.app_theme);
            document.documentElement.style.setProperty('--theme-primary', theme.primary);
            document.documentElement.style.setProperty('--theme-primary-dark', theme.secondary);
            
            // Convert to HSL for shadcn
            const hexToHSL = (hex) => {
              let r = parseInt(hex.slice(1, 3), 16) / 255;
              let g = parseInt(hex.slice(3, 5), 16) / 255;
              let b = parseInt(hex.slice(5, 7), 16) / 255;
              let max = Math.max(r, g, b), min = Math.min(r, g, b);
              let h, s, l = (max + min) / 2;
              if (max === min) { h = s = 0; }
              else {
                let d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                  case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                  case g: h = ((b - r) / d + 2) / 6; break;
                  case b: h = ((r - g) / d + 4) / 6; break;
                  default: h = 0;
                }
              }
              return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
            };
            document.documentElement.style.setProperty('--primary', hexToHSL(theme.primary));
            
            // Save to localStorage as backup
            localStorage.setItem("app_theme", settings.app_theme);
          }
        }
        
        // Apply dark mode setting from backend
        if (settings?.dark_mode) {
          document.documentElement.classList.add('dark');
          localStorage.setItem("dark_mode", "true");
        } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem("dark_mode", "false");
        }
        
        // Fetch available backgrounds
        const bgRes = await axios.get(`${API}/system/backgrounds`, { headers });
        setBackgrounds(bgRes.data || []);
      } catch (error) {
        console.log("Could not fetch settings");
      }
    };
    
    fetchSettings();
  }, []);

  // Update background
  const updateBackground = async (bgId, bgUrl) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/user/settings`,
        { background_id: bgId, background_url: bgUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBackgroundUrl(bgUrl);
      setBackgroundDialogOpen(false);
    } catch (error) {
      console.log("Could not update background");
    }
  };

  // Open profile dialog and fill with current user data
  const openProfileDialog = () => {
    setProfileForm({
      full_name: user?.full_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
    setProfileDialogOpen(true);
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/auth/profile`,
        profileForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(language === "ar" ? "تم تحديث الملف الشخصي بنجاح" : "Profile updated successfully");
      setProfileDialogOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === "ar" ? "خطأ في تحديث الملف الشخصي" : "Error updating profile"));
    } finally {
      setSavingProfile(false);
    }
  };

  // Save password changes
  const handleSavePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error(language === "ar" ? "كلمات المرور غير متطابقة" : "Passwords do not match");
      return;
    }
    if (passwordForm.new_password.length < 6) {
      toast.error(language === "ar" ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }

    setSavingPassword(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/user/change-password`,
        {
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(language === "ar" ? "تم تغيير كلمة المرور بنجاح" : "Password changed successfully");
      setPasswordDialogOpen(false);
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === "ar" ? "كلمة المرور الحالية غير صحيحة" : "Current password is incorrect"));
    } finally {
      setSavingPassword(false);
    }
  };

  const navItems = [
    // لوحة التحكم
    { path: "/dashboard", icon: LayoutDashboard, label: "dashboard" },
    
    // الموردين واستلام الحليب
    { path: "/suppliers", icon: Users, label: "suppliers", departments: ["purchasing", "milk_reception", "admin", "it"] },
    { path: "/supplier-management", icon: PackageSearch, label: "supplier_management", departments: ["purchasing", "admin", "it"] },
    { path: "/milk-reception", icon: Milk, label: "milk_reception" },
    
    // العملاء والمبيعات
    { path: "/customers", icon: ShoppingCart, label: "customers" },
    { path: "/sales", icon: ShoppingCart, label: "sales" },
    
    // المشتريات والمخازن
    { path: "/feed-purchases", icon: Wheat, label: "feed_purchases" },
    { path: "/procurement", icon: ShoppingCart, label: "procurement" },
    { path: "/warehouse", icon: Package, label: "warehouse_management" },
    
    // المالية
    { path: "/finance", icon: Wallet, label: "finance" },
    { path: "/finance-system", icon: Landmark, label: "finance_system" },
    { path: "/treasury", icon: PiggyBank, label: "treasury" },
    
    // الموارد البشرية (تم دمج البدلات الإضافية هنا)
    { path: "/hr", icon: Building2, label: "hr" },
    { path: "/employee-scheduling", icon: CalendarClock, label: "employee_scheduling" },
    { path: "/driver-schedule", icon: Car, label: "driver_schedule" },
    { path: "/payroll", icon: Calculator, label: "payroll" },
    { path: "/salary-structures", icon: DollarSign, label: "salary_structures" },
    
    // التحليلات والتقارير (تم دمج التقارير المتقدمة هنا)
    { path: "/analytics", icon: BarChart3, label: "analytics" },
    { path: "/reports", icon: BarChart3, label: "reports" },
    
    // الأقسام الأخرى
    { path: "/legal", icon: Scale, label: "legal" },
    { path: "/projects", icon: FolderKanban, label: "projects" },
    { path: "/operations", icon: Activity, label: "operations" },
    { path: "/marketing", icon: Megaphone, label: "marketing" },
    
    // إعدادات النظام (تم دمج إعدادات المظهر والإشعارات والكاميرات هنا)
    { path: "/system-settings", icon: Settings, label: "system_settings" },
    { path: "/permissions", icon: Shield, label: "permissions_management", roles: ["admin"], departments: ["admin", "it", "الإدارة العامة", "تقنية المعلومات"] },
  ];

  // Filter nav items based on role, department, and permissions
  const filteredNavItems = navItems.filter((item) => {
    // Admin and IT have access to everything
    if (user?.role === 'admin' || user?.department === 'it' || user?.department === 'admin') {
      return true;
    }
    
    // Check user permissions for specific pages
    const userPermissions = user?.permissions || [];
    const pathToPermission = {
      '/dashboard': ['dashboard_view', 'dashboard_stats'],
      '/analysis': ['analysis_view', 'analysis_reports', 'analysis_export'],
      '/analytics': ['analysis_view', 'analysis_reports', 'analysis_export'],
      '/reports': ['reports', 'reports_view', 'reports_operational', 'reports_financial', 'reports_export'],
      '/hr': ['hr', 'hr_employees_view', 'hr_attendance_view', 'hr_leaves_view', 'hr_employee_schedule_view', 'hr_letters_view', 'hr_extra_pay_view', 'hr_documents_view'],
      '/payroll': ['hr_payroll_view', 'hr_payroll_edit', 'hr_payroll_approve_hr', 'hr_payroll_approve_finance', 'hr_payroll_approve_gm'],
      '/employee-scheduling': ['hr_employee_schedule_view', 'hr_employee_schedule_edit'],
      '/driver-schedule': ['hr_driver_schedule_view', 'hr_driver_schedule_edit'],
      '/salary-structures': ['hr_payroll_view', 'hr_payroll_edit'],
      '/extra-pay-approvals': ['hr_extra_pay_view', 'hr_extra_pay_approve'],
      '/finance': ['finance', 'finance_view', 'treasury_view', 'treasury_transactions'],
      '/finance-system': ['finance', 'finance_view', 'finance_transactions'],
      '/treasury': ['finance', 'treasury_view', 'treasury_transactions'],
      '/suppliers': ['suppliers', 'suppliers_view', 'suppliers_create', 'suppliers_edit'],
      '/supplier-management': ['suppliers', 'suppliers_view', 'suppliers_edit'],
      '/milk-reception': ['milk_reception', 'milk_reception_view', 'milk_reception_create', 'milk_reception_edit'],
      '/legal': ['legal', 'legal_view', 'legal_create', 'legal_contracts_view', 'legal_cases_view'],
      '/projects': ['projects', 'projects_view', 'projects_create', 'projects_edit'],
      '/operations': ['operations', 'operations_view', 'operations_edit'],
      '/marketing': ['marketing', 'marketing_view', 'marketing_create'],
      '/warehouse': ['warehouse', 'warehouse_view', 'inventory_view', 'inventory_edit', 'warehouse_products_view', 'warehouse_stock_receive', 'warehouse_stock_issue'],
      '/customers': ['customers', 'customers_view', 'customers_create'],
      '/sales': ['sales', 'sales_view', 'sales_create', 'sales_edit'],
      '/procurement': ['purchases_view', 'purchases_create', 'purchases_edit', 'purchases_approve'],
      '/feed-purchases': ['purchases_view', 'purchases_create', 'purchases_edit'],
      '/supplier-portal': ['supplier_portal_view', 'supplier_portal_messages', 'supplier_portal_feed_requests'],
      '/system-settings': [], // متاح للجميع
    };
    
    // Pages always available
    const alwaysAvailablePages = ['/system-settings'];
    if (alwaysAvailablePages.includes(item.path)) {
      return true;
    }
    
    // FIRST: Check if user has permission for this page
    const requiredPermissions = pathToPermission[item.path] || [];
    if (requiredPermissions.length > 0 && requiredPermissions.some(perm => userPermissions.includes(perm))) {
      return true; // User has permission, show the page regardless of role/department
    }
    
    // HR Manager special access
    if (user?.role === 'hr_manager') {
      const hrPaths = ['/hr', '/payroll', '/dashboard', '/settings', '/reports', '/analysis', '/employee-scheduling', '/driver-schedule', '/salary-structures'];
      if (hrPaths.includes(item.path)) return true;
    }
    
    // If page has permission requirements but user doesn't have them, deny
    if (requiredPermissions.length > 0) {
      return false;
    }
    
    // Check role access
    if (item.roles && !item.roles.includes(user?.role)) {
      return false;
    }
    
    // Check department access
    if (item.departments && !item.departments.includes(user?.department)) {
      return false;
    }
    
    // For regular employees, deny access to unspecified pages
    if (user?.role === 'employee') {
      return false;
    }
    
    return false;
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getRoleLabel = (role, position) => {
    // إذا كان هناك منصب، أعرضه
    if (position) {
      return position;
    }
    // وإلا أعرض الدور
    const roles = {
      admin: t("admin"),
      employee: t("employee"),
      accountant: t("accountant"),
    };
    return roles[role] || role;
  };

  // Scroll to top when route changes
  const location = useLocation();
  const mainRef = useRef(null);
  
  useEffect(() => {
    // Reset scroll position when route changes
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 ${
          language === "ar" ? "right-0" : "left-0"
        } z-50 bg-white dark:bg-slate-800 border-e border-border shadow-lg lg:shadow-none transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-20"
        } ${mobileMenuOpen ? "translate-x-0" : language === "ar" ? "translate-x-full lg:translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_dairy-collect-sys/artifacts/gjkguf5p_almoroojdairy.png" 
                alt="المروج للألبان"
                className="w-10 h-10 rounded-xl object-contain"
              />
              <span className="font-bold text-lg text-foreground">
                {language === "ar" ? "المروج للألبان" : "Al-Morooj Dairy"}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex"
            data-testid="sidebar-toggle-btn"
          >
            {language === "ar" ? (
              sidebarOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />
            ) : (
              sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden"
            data-testid="mobile-menu-close-btn"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? "active" : ""} ${!sidebarOpen ? "justify-center px-2" : ""}`
              }
              data-testid={`nav-${item.label}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{t(item.label)}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 header-brown border-b border-amber-600/30 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden"
              data-testid="mobile-menu-open-btn"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground hidden sm:block">
              {t("welcome")}, {user?.full_name}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Employee Stats Widget */}
            <EmployeeStatsWidget currentUser={user} />

            {/* Excuse Request Button */}
            <ExcuseRequestButton currentUser={user} />

            {/* Advance Request Button */}
            <AdvanceRequestButton />

            {/* Leave Request Button */}
            <LeaveRequestButton />

            {/* Letter Request Button */}
            <LetterRequestButton currentUser={user} />

            {/* Language Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="gap-2"
              data-testid="language-toggle-btn"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{language === "ar" ? "English" : "العربية"}</span>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2" data-testid="user-menu-btn">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {user?.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium">{user?.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {getRoleLabel(user?.role, user?.position)}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={language === "ar" ? "start" : "end"} className="w-56">
                <DropdownMenuLabel>{t("settings")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2">
                  <User className="w-4 h-4" />
                  {user?.username}
                </DropdownMenuItem>
                
                {/* Profile Settings */}
                <DropdownMenuItem 
                  className="gap-2 cursor-pointer"
                  onClick={openProfileDialog}
                >
                  <UserCog className="w-4 h-4" />
                  {language === "ar" ? "تعديل الملف الشخصي" : "Edit Profile"}
                </DropdownMenuItem>
                
                {/* Change Password */}
                <DropdownMenuItem 
                  className="gap-2 cursor-pointer"
                  onClick={() => setPasswordDialogOpen(true)}
                >
                  <KeyRound className="w-4 h-4" />
                  {language === "ar" ? "تغيير كلمة المرور" : "Change Password"}
                </DropdownMenuItem>
                
                {/* Change Background */}
                <DropdownMenuItem 
                  className="gap-2 cursor-pointer"
                  onClick={() => setBackgroundDialogOpen(true)}
                >
                  <Image className="w-4 h-4" />
                  {language === "ar" ? "تغيير الخلفية" : "Change Background"}
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 text-destructive focus:text-destructive"
                  onClick={handleLogout}
                  data-testid="logout-btn"
                >
                  <LogOut className="w-4 h-4" />
                  {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content with Background */}
        <main 
          ref={mainRef}
          className="flex-1 p-4 lg:p-6 overflow-auto relative"
          style={{
            backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          {backgroundUrl && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          )}
          <div className="animate-fade-in relative z-10 min-h-[calc(100vh-200px)]">
            <Outlet />
          </div>
          
          {/* Footer */}
          <footer className="relative z-10 mt-8 py-4 text-center text-sm text-gray-500 border-t border-gray-200/50 bg-white/80 backdrop-blur-sm rounded-t-lg">
            <p>
              © {new Date().getFullYear()} المروج للألبان - Al Marooj Dairy
            </p>
            <p className="text-xs mt-1 text-gray-400">
              Developed by <span className="font-semibold text-blue-600">Yasir Ahmed Hassan Kashoob</span> - IT Department
            </p>
          </footer>
        </main>
      </div>

      {/* Background Selection Dialog */}
      <Dialog open={backgroundDialogOpen} onOpenChange={setBackgroundDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {language === "ar" ? "اختيار خلفية النظام" : "Select System Background"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4">
            {/* No background option */}
            <div
              onClick={() => updateBackground("none", "")}
              className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                !backgroundUrl ? "border-primary ring-2 ring-primary/50" : "border-muted"
              }`}
            >
              <div className="aspect-video bg-gradient-to-br from-background to-muted flex items-center justify-center">
                <X className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-center text-sm py-2 font-medium">
                {language === "ar" ? "بدون خلفية" : "No Background"}
              </p>
            </div>
            
            {/* Background options */}
            {backgrounds.map((bg) => (
              <div
                key={bg.id}
                onClick={() => updateBackground(bg.id, bg.url)}
                className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                  backgroundUrl === bg.url ? "border-primary ring-2 ring-primary/50" : "border-muted"
                }`}
              >
                <div className="aspect-video">
                  <img
                    src={bg.url}
                    alt={bg.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-center text-sm py-2 font-medium">{bg.name}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBackgroundDialogOpen(false)}>
              {language === "ar" ? "إغلاق" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Edit Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              {language === "ar" ? "تعديل الملف الشخصي" : "Edit Profile"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "الاسم الكامل" : "Full Name"}</Label>
              <Input
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                placeholder={language === "ar" ? "أدخل الاسم الكامل" : "Enter full name"}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "البريد الإلكتروني" : "Email"}</Label>
              <Input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                placeholder={language === "ar" ? "أدخل البريد الإلكتروني" : "Enter email"}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "رقم الهاتف" : "Phone"}</Label>
              <Input
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder={language === "ar" ? "أدخل رقم الهاتف" : "Enter phone number"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
              {language === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? (
                <>{language === "ar" ? "جاري الحفظ..." : "Saving..."}</>
              ) : (
                <>{language === "ar" ? "حفظ" : "Save"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              {language === "ar" ? "تغيير كلمة المرور" : "Change Password"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "كلمة المرور الحالية" : "Current Password"}</Label>
              <Input
                type="password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                placeholder={language === "ar" ? "أدخل كلمة المرور الحالية" : "Enter current password"}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "كلمة المرور الجديدة" : "New Password"}</Label>
              <Input
                type="password"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                placeholder={language === "ar" ? "أدخل كلمة المرور الجديدة" : "Enter new password"}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "تأكيد كلمة المرور" : "Confirm Password"}</Label>
              <Input
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                placeholder={language === "ar" ? "أعد إدخال كلمة المرور الجديدة" : "Re-enter new password"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              {language === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSavePassword} disabled={savingPassword}>
              {savingPassword ? (
                <>{language === "ar" ? "جاري الحفظ..." : "Saving..."}</>
              ) : (
                <>{language === "ar" ? "تغيير" : "Change"}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Layout;
