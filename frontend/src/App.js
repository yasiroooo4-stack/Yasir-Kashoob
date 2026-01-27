import { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useTranslation } from "react-i18next";
import "./i18n";
import "./App.css";
import { Toaster, toast } from "sonner";

// Theme configurations for App-wide use
const THEMES = {
  default: { primary: "#2563eb", secondary: "#1d4ed8" },
  ocean: { primary: "#0891b2", secondary: "#0e7490" },
  sunset: { primary: "#ea580c", secondary: "#c2410c" },
  forest: { primary: "#059669", secondary: "#047857" },
  royal: { primary: "#7c3aed", secondary: "#6d28d9" },
  rose: { primary: "#e11d48", secondary: "#be123c" },
  midnight: { primary: "#1e293b", secondary: "#0f172a" },
  gold: { primary: "#b45309", secondary: "#92400e" },
};

// Apply saved theme on app load
const initTheme = () => {
  const savedTheme = localStorage.getItem("app_theme") || "default";
  const theme = THEMES[savedTheme] || THEMES.default;
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.documentElement.style.setProperty('--theme-primary', theme.primary);
  document.documentElement.style.setProperty('--theme-primary-dark', theme.secondary);
  
  const darkMode = localStorage.getItem("dark_mode") === "true";
  if (darkMode) {
    document.documentElement.classList.add('dark');
  }
};
initTheme();

// Pages
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Suppliers from "./pages/Suppliers";
import MilkReception from "./pages/MilkReception";
import Customers from "./pages/Customers";
import Sales from "./pages/Sales";
import Finance from "./pages/Finance";
import FinanceSystem from "./pages/FinanceSystem";
import Employees from "./pages/Employees";
import Reports from "./pages/Reports";
import FeedPurchases from "./pages/FeedPurchases";
import Settings from "./pages/Settings";
import HR from "./pages/HR";
import Legal from "./pages/Legal";
import Projects from "./pages/Projects";
import Operations from "./pages/Operations";
import Marketing from "./pages/Marketing";
import Payroll from "./pages/Payroll";
import Treasury from "./pages/Treasury";
import Analytics from "./pages/Analytics";
import SupplierPortal from "./pages/SupplierPortal";
import SupplierManagement from "./pages/SupplierManagement";
import SystemSettings from "./pages/SystemSettings";
import EmployeeScheduling from "./pages/EmployeeScheduling";
import DriverSchedule from "./pages/DriverSchedule";
import SupplierApp from "./pages/SupplierApp";
import SalaryStructures from "./pages/SalaryStructures";
import AdvancedReports from "./pages/AdvancedReports";
import NotificationSettings from "./pages/NotificationSettings";
import CCTVSystem from "./pages/CCTVSystem";
import Procurement from "./pages/Procurement";
import PermissionsManagement from "./pages/PermissionsManagement";
import WarehouseManagement from "./pages/WarehouseManagement";
import ExtraPayApprovals from "./pages/ExtraPayApprovals";
import TasksManagement from "./pages/TasksManagement";

// Layout
import Layout from "./components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Language Context
export const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

// Protected Route Component with Department-based permissions
const ProtectedRoute = ({ children, allowedRoles, allowedDepartments, allowedPermissions }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Check for token in localStorage as backup (handles race conditions)
  const hasToken = localStorage.getItem("token");
  
  if (!user && !hasToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If we have a token but no user yet, show loading (auth check in progress)
  if (!user && hasToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Check user permissions first (if user has specific permission, allow access)
  const userPermissions = user.permissions || [];
  if (allowedPermissions && allowedPermissions.some(p => userPermissions.includes(p))) {
    return children;
  }

  // Admin role (role: admin) has access to everything
  if (user.role === 'admin') {
    return children;
  }

  // Check role-based access
  if (allowedRoles && allowedRoles.includes(user.role)) {
    return children;
  }

  // Check department-based access (IT and admin departments have broad access, but still respect allowedPermissions)
  if (allowedDepartments && allowedDepartments.includes(user.department)) {
    // If allowedPermissions is defined and user doesn't have them, deny for system-admin pages
    if (allowedPermissions && allowedPermissions.some(p => ['permissions_grant', 'users_manage'].includes(p))) {
      // This is a system-admin page, department alone is not enough
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  }

  // If no restrictions defined, allow access
  if (!allowedRoles && !allowedDepartments && !allowedPermissions) {
    return children;
  }

  // If no access granted, redirect to dashboard
  return <Navigate to="/dashboard" replace />;
};

function App() {
  const { i18n } = useTranslation();
  
  // Initialize user from localStorage to prevent flash of login page
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");
      if (savedUser && token) {
        return JSON.parse(savedUser);
      }
    } catch (e) {
      console.error("Error parsing saved user:", e);
    }
    return null;
  });
  
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [language, setLanguage] = useState(localStorage.getItem("language") || "ar");

  // Setup axios interceptor
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
          delete axios.defaults.headers.common["Authorization"];
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  // Check auth on mount - verify token is still valid
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");

      if (token) {
        try {
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          const response = await axios.get(`${API}/auth/me`);
          setUser(response.data);
          // Update saved user with fresh data
          localStorage.setItem("user", JSON.stringify(response.data));
        } catch (error) {
          console.error("Auth check failed:", error);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          delete axios.defaults.headers.common["Authorization"];
          setUser(null);
        }
      } else {
        // No token - clean up any stale data
        localStorage.removeItem("user");
        setUser(null);
      }
      setLoading(false);
      setAuthChecked(true);
    };

    checkAuth();
  }, []);

  // Handle language change
  useEffect(() => {
    i18n.changeLanguage(language);
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
    localStorage.setItem("language", language);
  }, [language, i18n]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(userData));
      axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      setUser(userData);
      
      // Welcome toast with large logo
      toast.success(
        <div className="flex flex-col items-center gap-4 p-4">
          <img src="/logo.png" alt="المروج للألبان" className="w-32 h-32 object-contain" />
          <div className="text-center">
            <p className="font-bold text-xl">{language === "ar" ? "مرحباً بك في المروج للألبان" : "Welcome to Al Marooj Dairy"}</p>
            <p className="text-base opacity-80 mt-1">{userData.full_name || userData.name}</p>
          </div>
        </div>,
        { duration: 5000, className: "welcome-toast" }
      );
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || (language === "ar" ? "فشل تسجيل الدخول" : "Login failed");
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API}/auth/register`, userData);
      const { access_token, user: newUser } = response.data;
      
      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(newUser));
      axios.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
      setUser(newUser);
      
      toast.success(language === "ar" ? "تم إنشاء الحساب بنجاح" : "Account created successfully");
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || (language === "ar" ? "فشل إنشاء الحساب" : "Registration failed");
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
    toast.success(language === "ar" ? "تم تسجيل الخروج" : "Logged out successfully");
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "ar" ? "en" : "ar"));
  };

  return (
    <ErrorBoundary>
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      <LanguageContext.Provider value={{ language, toggleLanguage }}>
        <div className="min-h-screen bg-background" dir={language === "ar" ? "rtl" : "ltr"}>
          <Toaster 
            position={language === "ar" ? "top-left" : "top-right"} 
            richColors 
            closeButton
          />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
              <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
              <Route path="/reset-password" element={user ? <Navigate to="/dashboard" replace /> : <ResetPassword />} />
              
              {/* Supplier Portal - Public Route */}
              <Route path="/supplier-portal" element={<SupplierPortal />} />
              
              {/* Supplier App (PWA) - Public Route */}
              <Route path="/supplier-app" element={<SupplierApp />} />
              
              <Route path="/" element={
                user ? (
                  <ErrorBoundary>
                    <Layout />
                  </ErrorBoundary>
                ) : (
                  <Navigate to="/login" replace />
                )
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                <Route path="suppliers" element={
                  <ProtectedRoute allowedDepartments={["purchasing", "milk_reception", "admin", "it"]} allowedPermissions={["suppliers", "suppliers_view", "suppliers_create", "suppliers_edit"]}>
                    <Suppliers />
                  </ProtectedRoute>
                } />
                <Route path="milk-reception" element={
                  <ProtectedRoute allowedDepartments={["milk_reception", "admin", "it"]} allowedPermissions={["milk_reception", "milk_reception_view", "milk_reception_create", "milk_reception_edit"]}>
                    <MilkReception />
                  </ProtectedRoute>
                } />
                <Route path="customers" element={
                  <ProtectedRoute allowedDepartments={["sales", "admin", "it"]} allowedPermissions={["customers", "customers_view", "customers_create", "sales_view"]}>
                    <Customers />
                  </ProtectedRoute>
                } />
                <Route path="sales" element={
                  <ProtectedRoute allowedDepartments={["sales", "admin", "it"]} allowedPermissions={["sales", "sales_view", "sales_create", "sales_edit"]}>
                    <Sales />
                  </ProtectedRoute>
                } />
                <Route path="feed-purchases" element={
                  <ProtectedRoute allowedDepartments={["purchasing", "admin", "it"]} allowedPermissions={["purchases_view", "purchases_create", "purchases_edit"]}>
                    <FeedPurchases />
                  </ProtectedRoute>
                } />
                <Route path="finance" element={
                  <ProtectedRoute allowedRoles={["admin", "accountant"]} allowedDepartments={["finance", "admin", "it"]} allowedPermissions={["finance", "finance_view", "finance_transactions"]}>
                    <Finance />
                  </ProtectedRoute>
                } />
                <Route path="finance-system" element={
                  <ProtectedRoute allowedRoles={["admin", "accountant"]} allowedDepartments={["finance", "admin", "it"]} allowedPermissions={["finance", "finance_view", "finance_transactions"]}>
                    <FinanceSystem />
                  </ProtectedRoute>
                } />
                <Route path="treasury" element={
                  <ProtectedRoute allowedRoles={["admin", "accountant"]} allowedDepartments={["finance", "admin", "it"]} allowedPermissions={["finance", "treasury_view", "treasury_transactions"]}>
                    <Treasury />
                  </ProtectedRoute>
                } />
                <Route path="employees" element={
                  <ProtectedRoute allowedRoles={["admin", "hr_manager"]} allowedDepartments={["hr", "admin", "it"]} allowedPermissions={["hr", "hr_employees_view", "hr_employees_edit"]}>
                    <Employees />
                  </ProtectedRoute>
                } />
                <Route path="reports" element={
                  <ProtectedRoute allowedPermissions={["reports", "reports_view", "reports_operational", "reports_financial"]}>
                    <Reports />
                  </ProtectedRoute>
                } />
                <Route path="advanced-reports" element={
                  <ProtectedRoute allowedRoles={["admin", "hr_manager", "accountant"]} allowedDepartments={["hr", "finance", "admin", "it"]} allowedPermissions={["reports", "reports_view", "reports_financial"]}>
                    <AdvancedReports />
                  </ProtectedRoute>
                } />
                <Route path="settings" element={
                  <ProtectedRoute allowedRoles={["admin"]} allowedDepartments={["admin", "it"]}>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="system-settings" element={
                  <ProtectedRoute>
                    <SystemSettings />
                  </ProtectedRoute>
                } />
                <Route path="notification-settings" element={
                  <ProtectedRoute allowedRoles={["admin"]} allowedDepartments={["admin", "it"]}>
                    <NotificationSettings />
                  </ProtectedRoute>
                } />
                <Route path="cctv" element={
                  <ProtectedRoute allowedRoles={["admin"]} allowedDepartments={["admin", "it", "operations"]}>
                    <CCTVSystem />
                  </ProtectedRoute>
                } />
                <Route path="hr" element={
                  <ProtectedRoute allowedRoles={["admin", "hr_manager"]} allowedDepartments={["hr", "admin", "it"]} allowedPermissions={["hr", "hr_employees_view", "hr_attendance_view", "hr_leaves_view"]}>
                    <HR />
                  </ProtectedRoute>
                } />
                <Route path="legal" element={
                  <ProtectedRoute allowedRoles={["admin"]} allowedDepartments={["legal", "admin", "it"]} allowedPermissions={["legal", "legal_view", "legal_contracts_view", "legal_cases_view"]}>
                    <Legal />
                  </ProtectedRoute>
                } />
                <Route path="procurement" element={
                  <ProtectedRoute allowedDepartments={["procurement", "purchasing", "admin", "it", "finance"]} allowedPermissions={["purchases_view", "purchases_create", "purchases_edit", "purchases_approve"]}>
                    <Procurement />
                  </ProtectedRoute>
                } />
                <Route path="permissions" element={
                  <ProtectedRoute allowedRoles={["admin"]} allowedDepartments={["admin", "it", "الإدارة العامة", "تقنية المعلومات"]} allowedPermissions={["permissions_grant", "users_manage"]}>
                    <PermissionsManagement />
                  </ProtectedRoute>
                } />
                <Route path="warehouse" element={
                  <ProtectedRoute allowedDepartments={["inventory", "warehouse", "operations", "admin", "it", "المخازن", "العمليات"]} allowedPermissions={["warehouse", "warehouse_view", "inventory_view", "inventory_edit"]}>
                    <WarehouseManagement />
                  </ProtectedRoute>
                } />
                <Route path="projects" element={
                  <ProtectedRoute allowedDepartments={["projects", "admin", "it"]} allowedPermissions={["projects", "projects_view", "projects_create", "projects_edit"]}>
                    <Projects />
                  </ProtectedRoute>
                } />
                <Route path="operations" element={
                  <ProtectedRoute allowedDepartments={["operations", "admin", "it"]} allowedPermissions={["operations", "operations_view", "operations_edit"]}>
                    <Operations />
                  </ProtectedRoute>
                } />
                <Route path="marketing" element={
                  <ProtectedRoute allowedDepartments={["marketing", "admin", "it"]} allowedPermissions={["marketing", "marketing_view", "marketing_create"]}>
                    <Marketing />
                  </ProtectedRoute>
                } />
                <Route path="payroll" element={
                  <ProtectedRoute allowedRoles={["admin", "hr_manager"]} allowedDepartments={["hr", "finance", "admin", "it"]} allowedPermissions={["hr_payroll_view", "hr_payroll_edit"]}>
                    <Payroll />
                  </ProtectedRoute>
                } />
                <Route path="salary-structures" element={
                  <ProtectedRoute allowedRoles={["admin", "hr_manager"]} allowedDepartments={["hr", "finance", "admin", "it"]} allowedPermissions={["hr_payroll_view", "hr_payroll_edit"]}>
                    <SalaryStructures />
                  </ProtectedRoute>
                } />
                <Route path="extra-pay-approvals" element={
                  <ProtectedRoute allowedRoles={["admin", "hr_manager"]} allowedDepartments={["hr", "finance", "admin", "it"]} allowedPermissions={["hr_extra_pay_view", "hr_extra_pay_approve"]}>
                    <ExtraPayApprovals />
                  </ProtectedRoute>
                } />
                <Route path="analytics" element={
                  <ProtectedRoute allowedPermissions={["analysis_view", "analysis_reports"]}>
                    <Analytics />
                  </ProtectedRoute>
                } />
                <Route path="supplier-management" element={
                  <ProtectedRoute allowedPermissions={["suppliers", "suppliers_view", "suppliers_edit"]}>
                    <SupplierManagement />
                  </ProtectedRoute>
                } />
                <Route path="employee-scheduling" element={
                  <ProtectedRoute allowedRoles={["admin", "hr_manager"]} allowedDepartments={["hr", "admin", "it"]} allowedPermissions={["hr_employee_schedule_view", "hr_employee_schedule_edit"]}>
                    <EmployeeScheduling />
                  </ProtectedRoute>
                } />
                <Route path="driver-schedule" element={
                  <ProtectedRoute allowedRoles={["admin", "hr_manager"]} allowedDepartments={["hr", "operations", "admin", "it"]} allowedPermissions={["hr_driver_schedule_view", "hr_driver_schedule_edit"]}>
                    <DriverSchedule />
                  </ProtectedRoute>
                } />
              </Route>
              
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </div>
      </LanguageContext.Provider>
    </AuthContext.Provider>
    </ErrorBoundary>
  );
}

export default App;
