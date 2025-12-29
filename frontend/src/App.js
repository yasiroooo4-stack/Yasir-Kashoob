import { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useTranslation } from "react-i18next";
import "./i18n";
import "./App.css";
import { Toaster, toast } from "sonner";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Suppliers from "./pages/Suppliers";
import MilkReception from "./pages/MilkReception";
import Customers from "./pages/Customers";
import Sales from "./pages/Sales";
import Inventory from "./pages/Inventory";
import Finance from "./pages/Finance";
import Employees from "./pages/Employees";
import Reports from "./pages/Reports";
import FeedPurchases from "./pages/FeedPurchases";
import Settings from "./pages/Settings";

// Layout
import Layout from "./components/Layout";

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

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const { i18n } = useTranslation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (token && savedUser) {
        try {
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          const response = await axios.get(`${API}/auth/me`);
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          delete axios.defaults.headers.common["Authorization"];
        }
      }
      setLoading(false);
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
      
      toast.success(language === "ar" ? "تم تسجيل الدخول بنجاح" : "Login successful");
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
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
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
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="suppliers" element={<Suppliers />} />
                <Route path="milk-reception" element={<MilkReception />} />
                <Route path="customers" element={<Customers />} />
                <Route path="sales" element={<Sales />} />
                <Route path="feed-purchases" element={<FeedPurchases />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="finance" element={
                  <ProtectedRoute allowedRoles={["admin", "accountant"]}>
                    <Finance />
                  </ProtectedRoute>
                } />
                <Route path="employees" element={
                  <ProtectedRoute allowedRoles={["admin"]}>
                    <Employees />
                  </ProtectedRoute>
                } />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </div>
      </LanguageContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;
