import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
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
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Milk,
  Wallet,
  Package,
  MessageSquare,
  LogIn,
  Send,
  History,
  User,
  RefreshCw,
  Plus,
  ArrowLeftRight,
  Key,
  Phone,
  Eye,
  EyeOff,
  Lock,
  Settings,
  Globe,
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

// سيتم جلب أنواع الأعلاف من API
const DEFAULT_FEED_TYPES = [
  { id: "barley", name: "شعير", name_en: "Barley", price: 85 },
  { id: "wheat_bran", name: "نخالة قمح", name_en: "Wheat Bran", price: 70 },
  { id: "corn", name: "ذرة", name_en: "Corn", price: 95 },
  { id: "alfalfa", name: "برسيم", name_en: "Alfalfa", price: 120 },
  { id: "mixed", name: "علف مخلوط", name_en: "Mixed Feed", price: 100 },
];

// أنواع الحليب
const MILK_TYPES = [
  { id: "cow", name: "حليب بقر", name_en: "Cow Milk" },
  { id: "camel", name: "حليب إبل", name_en: "Camel Milk" },
  { id: "goat", name: "حليب ماعز", name_en: "Goat Milk" },
  { id: "sheep", name: "حليب غنم", name_en: "Sheep Milk" },
];

const MESSAGE_TYPES = [
  { id: "increase_quantity", name: "طلب زيادة كمية", name_en: "Request Quantity Increase" },
  { id: "general", name: "استفسار عام", name_en: "General Inquiry" },
  { id: "complaint", name: "شكوى", name_en: "Complaint" },
  { id: "inquiry", name: "استفسار مالي", name_en: "Financial Inquiry" },
];

const SupplierPortal = () => {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState(localStorage.getItem("supplier_language") || "ar");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [supplierCode, setSupplierCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Language toggle
  const toggleLanguage = () => {
    const newLang = language === "ar" ? "en" : "ar";
    setLanguage(newLang);
    localStorage.setItem("supplier_language", newLang);
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLang;
  };
  
  // Initialize language on mount
  useEffect(() => {
    const savedLang = localStorage.getItem("supplier_language") || "ar";
    setLanguage(savedLang);
    i18n.changeLanguage(savedLang);
    document.documentElement.dir = savedLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = savedLang;
  }, [i18n]);
  
  // Helper function for translations
  const txt = (ar, en) => language === "ar" ? ar : en;
  
  // Recovery states
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [recoveredPassword, setRecoveredPassword] = useState("");
  
  // Change password states
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Data states
  const [milkReceptions, setMilkReceptions] = useState([]);
  const [feedRequests, setFeedRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const [feedTypes, setFeedTypes] = useState(DEFAULT_FEED_TYPES);
  const [centers, setCenters] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Dialog states
  const [feedDialogOpen, setFeedDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  
  // Form states
  const [feedForm, setFeedForm] = useState({
    feed_type: "",
    quantity: "",
    amount_to_deduct: "",
    notes: "",
  });
  
  const [messageForm, setMessageForm] = useState({
    message_type: "general",
    subject: "",
    message: "",
  });

  // Check if supplier is logged in (from localStorage)
  useEffect(() => {
    const token = localStorage.getItem("supplier_token");
    const savedCode = localStorage.getItem("supplier_code");
    if (token && savedCode) {
      // Verify token is still valid
      verifyToken(token, savedCode);
    }
  }, []);

  const verifyToken = async (token, code) => {
    try {
      const response = await axios.get(`${API}/api/supplier-portal/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSupplier(response.data);
      setSupplierCode(code);
      setIsLoggedIn(true);
      fetchFeedTypesAndCenters();
      fetchData(code);
    } catch (error) {
      // Token expired or invalid
      localStorage.removeItem("supplier_token");
      localStorage.removeItem("supplier_code");
    }
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    
    if (!supplierCode.trim()) {
      toast.error("يرجى إدخال كود المورد");
      return;
    }
    
    if (!password.trim()) {
      toast.error("يرجى إدخال كلمة المرور");
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/supplier-portal/login`, {
        supplier_code: supplierCode,
        password: password
      });
      setSupplier(response.data.supplier);
      setIsLoggedIn(true);
      localStorage.setItem("supplier_code", supplierCode);
      localStorage.setItem("supplier_token", response.data.access_token);
      toast.success(`مرحباً ${response.data.supplier.name}`);
      
      // جلب أنواع الأعلاف والمراكز
      fetchFeedTypesAndCenters();
      
      fetchData(supplierCode);
    } catch (error) {
      toast.error(error.response?.data?.detail || "كود المورد أو كلمة المرور غير صحيحة");
    } finally {
      setLoading(false);
    }
  };
  
  const fetchFeedTypesAndCenters = async () => {
    const token = localStorage.getItem("supplier_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    try {
      // جلب أنواع الأعلاف من النظام - استخدام endpoint خاص بالموردين
      const feedTypesRes = await axios.get(`${API}/api/supplier-portal/feed-types`);
      if (feedTypesRes.data && Array.isArray(feedTypesRes.data) && feedTypesRes.data.length > 0) {
        const formattedFeedTypes = feedTypesRes.data.map(ft => ({
          id: ft.id,
          name: ft.name_ar || ft.name,
          name_en: ft.name_en || ft.name,
          // سعر الوحدة (الكيس)
          price: ft.price_per_unit || ft.price || 0,
          price_per_unit: ft.price_per_unit || 0,
          kg_per_unit: ft.kg_per_unit || 1,
          company_name: ft.company_name || ''
        }));
        setFeedTypes(formattedFeedTypes);
      }
      
      // جلب المراكز
      const centersRes = await axios.get(`${API}/api/centers`, { headers });
      if (centersRes.data && Array.isArray(centersRes.data)) {
        setCenters(centersRes.data);
      }
    } catch (error) {
      console.error("Error fetching feed types and centers:", error);
      // استخدام القائمة الافتراضية في حالة الخطأ
    }
  };

  const handleRecoverPassword = async (e) => {
    e?.preventDefault();
    
    if (!recoveryCode.trim() || !recoveryPhone.trim()) {
      toast.error("يرجى إدخال كود المورد ورقم الهاتف");
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/api/supplier-portal/recover-password?supplier_code=${recoveryCode}&phone=${recoveryPhone}`
      );
      setRecoveredPassword(response.data.new_password);
      toast.success("تم إعادة تعيين كلمة المرور بنجاح");
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل استرجاع كلمة المرور - تأكد من صحة البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e?.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("كلمة المرور الجديدة غير متطابقة");
      return;
    }
    
    if (newPassword.length < 4) {
      toast.error("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
      return;
    }
    
    setLoading(true);
    try {
      await axios.put(
        `${API}/api/supplier-portal/change-password?supplier_code=${supplierCode}&current_password=${currentPassword}&new_password=${newPassword}`
      );
      toast.success("تم تغيير كلمة المرور بنجاح");
      setChangePasswordDialogOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل تغيير كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setSupplier(null);
    setSupplierCode("");
    setPassword("");
    localStorage.removeItem("supplier_code");
    localStorage.removeItem("supplier_token");
  };

  const fetchData = async (code = supplierCode) => {
    try {
      const [receptionsRes, feedRes, messagesRes] = await Promise.all([
        axios.get(`${API}/api/supplier-portal/milk-receptions?supplier_code=${code}&month=${selectedMonth}&year=${selectedYear}`),
        axios.get(`${API}/api/supplier-portal/feed-requests?supplier_code=${code}`),
        axios.get(`${API}/api/supplier-portal/messages?supplier_code=${code}`),
      ]);
      
      setMilkReceptions(receptionsRes.data.receptions || []);
      setSupplier(prev => ({
        ...prev,
        ...receptionsRes.data.supplier,
        summary: receptionsRes.data.summary
      }));
      setFeedRequests(feedRes.data || []);
      setMessages(messagesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    if (isLoggedIn && supplierCode) {
      fetchData();
    }
  }, [selectedMonth, selectedYear]);

  const handleFeedRequest = async (e) => {
    e.preventDefault();
    
    if (!feedForm.feed_type || !feedForm.quantity || !feedForm.amount_to_deduct) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/api/supplier-portal/feed-requests`, {
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        supplier_code: supplierCode,
        feed_type: feedForm.feed_type,
        quantity: parseFloat(feedForm.quantity),
        amount_to_deduct: parseFloat(feedForm.amount_to_deduct),
        notes: feedForm.notes,
      });
      
      toast.success("تم إرسال طلب الأعلاف بنجاح وبانتظار الموافقة");
      setFeedDialogOpen(false);
      setFeedForm({ feed_type: "", quantity: "", amount_to_deduct: "", notes: "" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل إرسال الطلب");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageForm.subject || !messageForm.message) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/api/supplier-portal/messages`, {
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        supplier_code: supplierCode,
        ...messageForm,
      });
      
      toast.success("تم إرسال الرسالة بنجاح");
      setMessageDialogOpen(false);
      setMessageForm({ message_type: "general", subject: "", message: "" });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل إرسال الرسالة");
    } finally {
      setLoading(false);
    }
  };

  const calculateFeedAmount = (feedType, quantity) => {
    const feed = feedTypes.find(f => f.id === feedType);
    if (feed && quantity) {
      // حساب عدد الأكياس المطلوبة = الكمية بالكجم / وزن الكيس
      const bagsNeeded = parseFloat(quantity) / (feed.kg_per_unit || 1);
      // المبلغ الإجمالي = عدد الأكياس × سعر الكيس
      return (bagsNeeded * feed.price).toFixed(2);
    }
    return 0;
  };

  // التحقق من تجاوز الرصيد
  const isAmountExceedsBalance = () => {
    const amount = parseFloat(feedForm.amount_to_deduct) || 0;
    const balance = supplier?.balance || 0;
    return amount > balance;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: "قيد الانتظار", variant: "secondary" },
      approved: { label: "تمت الموافقة", variant: "default" },
      rejected: { label: "مرفوض", variant: "destructive" },
      delivered: { label: "تم التسليم", variant: "outline" },
      unread: { label: "جديد", variant: "secondary" },
      read: { label: "تمت القراءة", variant: "outline" },
      replied: { label: "تم الرد", variant: "default" },
    };
    const s = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  // Login Screen
  // Al Morooj Dairy Logo URL
  const logoUrl = "https://customer-assets.emergentagent.com/job_farmmanage-5/artifacts/3wl2krpz_%D8%B4%D8%B9%D8%A7%D8%B1%20%D8%A7%D9%84%D9%85%D8%B1%D9%88%D8%AC%20%D9%84%D9%84%D8%A7%D9%84%D8%A8%D8%A7%D9%86.png";

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
        {/* Language Toggle Button */}
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 right-4 rounded-full"
          onClick={toggleLanguage}
          data-testid="language-toggle"
        >
          <Globe className="w-5 h-5" />
        </Button>
        
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img 
              src={logoUrl} 
              alt="Al Morooj Dairy Logo" 
              className="w-24 h-24 mx-auto mb-4 object-contain"
            />
            <CardTitle className="text-2xl">{txt("بوابة الموردين", "Supplier Portal")}</CardTitle>
            <CardDescription>
              {showRecovery 
                ? txt("استرجاع كلمة المرور", "Password Recovery") 
                : txt("أدخل بيانات الدخول الخاصة بك", "Enter your login credentials")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showRecovery ? (
              // Login Form
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {txt("كود المورد", "Supplier Code")}
                  </Label>
                  <Input
                    type="text"
                    value={supplierCode}
                    onChange={(e) => setSupplierCode(e.target.value)}
                    placeholder={txt("مثال: 1108", "e.g. 1108")}
                    className="text-center text-lg"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    {txt("كلمة المرور", "Password")}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={txt("أدخل كلمة المرور", "Enter password")}
                      className="text-center text-lg pe-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {txt("كلمة المرور الافتراضية:", "Default password:")} <span className="font-bold">0000</span>
                  </p>
                </div>
                <Button type="submit" className="w-full gradient-primary text-white" disabled={loading}>
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin me-2" />
                  ) : (
                    <LogIn className="w-4 h-4 me-2" />
                  )}
                  {txt("دخول", "Login")}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full text-muted-foreground"
                  onClick={() => {
                    setShowRecovery(true);
                    setRecoveredPassword("");
                  }}
                >
                  <Key className="w-4 h-4 me-2" />
                  {txt("نسيت كلمة المرور؟", "Forgot password?")}
                </Button>
              </form>
            ) : (
              // Recovery Form
              <div className="space-y-4">
                {!recoveredPassword ? (
                  <form onSubmit={handleRecoverPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {txt("كود المورد", "Supplier Code")}
                      </Label>
                      <Input
                        type="text"
                        value={recoveryCode}
                        onChange={(e) => setRecoveryCode(e.target.value)}
                        placeholder={txt("أدخل كود المورد", "Enter supplier code")}
                        className="text-center"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {txt("رقم الهاتف المسجل", "Registered Phone")}
                      </Label>
                      <Input
                        type="tel"
                        value={recoveryPhone}
                        onChange={(e) => setRecoveryPhone(e.target.value)}
                        placeholder={txt("أدخل رقم هاتفك المسجل", "Enter your registered phone")}
                        className="text-center"
                        dir="ltr"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : null}
                      {txt("استرجاع كلمة المرور", "Recover Password")}
                    </Button>
                  </form>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">{txt("كلمة المرور الجديدة:", "New Password:")}</p>
                      <p className="text-3xl font-bold text-green-600">{recoveredPassword}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {txt("يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة", "You can now login with the new password")}
                    </p>
                    <Button
                      onClick={() => {
                        setShowRecovery(false);
                        setRecoveryCode("");
                        setRecoveryPhone("");
                        setRecoveredPassword("");
                        setSupplierCode(recoveryCode);
                        setPassword(recoveredPassword);
                      }}
                      className="w-full gradient-primary text-white"
                    >
                      {txt("العودة لتسجيل الدخول", "Back to Login")}
                    </Button>
                  </div>
                )}
                {!recoveredPassword && (
                  <Button
                    type="button"
                    variant="link"
                    className="w-full text-muted-foreground"
                    onClick={() => {
                      setShowRecovery(false);
                      setRecoveryCode("");
                      setRecoveryPhone("");
                    }}
                  >
                    {txt("العودة لتسجيل الدخول", "Back to Login")}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Portal
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={logoUrl} 
                alt="Al Morooj Dairy" 
                className="w-12 h-12 object-contain"
              />
              <div>
                <p className="text-xs text-muted-foreground">{txt("المورد", "Supplier")}</p>
                <h1 className="font-bold text-lg">{supplier?.name}</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{txt("كود:", "Code:")} {supplier?.code}</span>
                  {supplier?.center_name && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      {txt("المركز:", "Center:")} {language === "ar" ? supplier.center_name : supplier.center_name_en || supplier.center_name}
                    </span>
                  )}
                  {supplier?.milk_type && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                      {txt("نوع الحليب:", "Milk Type:")} {supplier.milk_type_ar || MILK_TYPES.find(m => m.id === supplier.milk_type)?.name || supplier.milk_type}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={toggleLanguage} title={txt("تغيير اللغة", "Change Language")}>
                <Globe className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setChangePasswordDialogOpen(true)}>
                <Settings className="w-4 h-4 me-1" />
                <span className="hidden sm:inline">{txt("تغيير كلمة المرور", "Change Password")}</span>
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                {txt("خروج", "Logout")}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Wallet className="w-10 h-10 opacity-80" />
                <div>
                  <p className="text-3xl font-bold">{(supplier?.balance || 0).toLocaleString()}</p>
                  <p className="text-sm opacity-80">{txt("الرصيد الحالي (ريال)", "Current Balance (OMR)")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Milk className="w-10 h-10 opacity-80" />
                <div>
                  <p className="text-3xl font-bold">{(supplier?.total_supplied || 0).toLocaleString()}</p>
                  <p className="text-sm opacity-80">{txt("إجمالي الكمية (لتر)", "Total Quantity (L)")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="w-10 h-10 opacity-80" />
                <div>
                  <p className="text-3xl font-bold">{feedRequests.filter(r => r.status === 'pending').length}</p>
                  <p className="text-sm opacity-80">{txt("طلبات أعلاف قيد الانتظار", "Pending Feed Requests")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <History className="w-10 h-10 opacity-80" />
                <div>
                  <p className="text-3xl font-bold">{supplier?.summary?.count || 0}</p>
                  <p className="text-sm opacity-80">{txt("توريدات هذا الشهر", "This Month Deliveries")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button onClick={() => setFeedDialogOpen(true)} className="gradient-primary text-white">
            <ArrowLeftRight className="w-4 h-4 me-2" />
            {txt("طلب تحويل رصيد إلى أعلاف", "Request Balance to Feed")}
          </Button>
          <Button variant="outline" onClick={() => setMessageDialogOpen(true)}>
            <MessageSquare className="w-4 h-4 me-2" />
            {txt("إرسال رسالة", "Send Message")}
          </Button>
          <Button variant="outline" onClick={() => fetchData()}>
            <RefreshCw className="w-4 h-4 me-2" />
            {txt("تحديث البيانات", "Refresh Data")}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview" className="gap-2">
              <Milk className="w-4 h-4" />
              {txt("سجل التوريدات", "Delivery Log")}
            </TabsTrigger>
            <TabsTrigger value="feed" className="gap-2">
              <Package className="w-4 h-4" />
              {txt("طلبات الأعلاف", "Feed Requests")}
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              {txt("الرسائل", "Messages")}
            </TabsTrigger>
          </TabsList>

          {/* Milk Receptions Tab */}
          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <CardTitle>{txt("سجل توريدات الحليب", "Milk Delivery Log")}</CardTitle>
                  <div className="flex gap-2">
                    <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                          <SelectItem key={m} value={m.toString()}>{txt(`شهر ${m}`, `Month ${m}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026].map(y => (
                          <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">{txt("إجمالي الكمية", "Total Quantity")}</p>
                    <p className="text-xl font-bold">{(supplier?.summary?.total_quantity || 0).toLocaleString()} {txt("لتر", "L")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{txt("إجمالي المبلغ", "Total Amount")}</p>
                    <p className="text-xl font-bold">{(supplier?.summary?.total_amount || 0).toLocaleString()} {txt("ريال", "OMR")}</p>
                  </div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{txt("التاريخ", "Date")}</TableHead>
                      <TableHead>{txt("نوع الحليب", "Milk Type")}</TableHead>
                      <TableHead>{txt("المركز", "Center")}</TableHead>
                      <TableHead>{txt("الكمية (لتر)", "Quantity (L)")}</TableHead>
                      <TableHead>{txt("السعر/لتر", "Price/L")}</TableHead>
                      <TableHead>{txt("المبلغ", "Amount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {milkReceptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {txt("لا توجد توريدات في هذه الفترة", "No deliveries in this period")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      milkReceptions.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{new Date(r.reception_date || r.date).toLocaleDateString(language === "ar" ? "ar-SA" : "en-GB")}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {language === "ar" ? r.milk_type_ar : r.milk_type_en}
                            </Badge>
                          </TableCell>
                          <TableCell>{language === "ar" ? r.center_name : r.center_name_en}</TableCell>
                          <TableCell>{r.quantity_liters?.toLocaleString()}</TableCell>
                          <TableCell>{r.price_per_liter}</TableCell>
                          <TableCell className="font-medium">{r.total_amount?.toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feed Requests Tab */}
          <TabsContent value="feed">
            <Card>
              <CardHeader>
                <CardTitle>{txt("طلبات تحويل الرصيد إلى أعلاف", "Balance to Feed Requests")}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{txt("التاريخ", "Date")}</TableHead>
                      <TableHead>{txt("نوع العلف", "Feed Type")}</TableHead>
                      <TableHead>{txt("الكمية", "Quantity")}</TableHead>
                      <TableHead>{txt("المبلغ", "Amount")}</TableHead>
                      <TableHead>{txt("الحالة", "Status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {txt("لا توجد طلبات أعلاف", "No feed requests")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      feedRequests.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{new Date(r.created_at).toLocaleDateString(language === "ar" ? "ar-SA" : "en-GB")}</TableCell>
                          <TableCell>{feedTypes.find(f => f.id === r.feed_type)?.name || r.feed_type}</TableCell>
                          <TableCell>{r.quantity}</TableCell>
                          <TableCell>{r.amount_to_deduct?.toLocaleString()} {txt("ريال", "OMR")}</TableCell>
                          <TableCell>{getStatusBadge(r.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>{txt("الرسائل والاستفسارات", "Messages & Inquiries")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">{txt("لا توجد رسائل", "No messages")}</p>
                  ) : (
                    messages.map((m) => (
                      <Card key={m.id} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{m.subject}</h4>
                            <p className="text-sm text-muted-foreground">
                              {MESSAGE_TYPES.find(t => t.id === m.message_type)?.name} • {new Date(m.created_at).toLocaleDateString(language === "ar" ? "ar-SA" : "en-GB")}
                            </p>
                          </div>
                          {getStatusBadge(m.status)}
                        </div>
                        <p className="text-sm mb-2">{m.message}</p>
                        {m.reply && (
                          <div className="mt-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                            <p className="text-sm font-medium text-green-700 dark:text-green-300">{txt("رد الإدارة:", "Admin Reply:")}</p>
                            <p className="text-sm">{m.reply}</p>
                          </div>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Feed Request Dialog */}
      <Dialog open={feedDialogOpen} onOpenChange={setFeedDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{txt("طلب تحويل رصيد إلى أعلاف", "Request Balance to Feed")}</DialogTitle>
            <DialogDescription>
              {txt("رصيدك الحالي:", "Your current balance:")} {(supplier?.balance || 0).toLocaleString()} {txt("ريال", "OMR")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFeedRequest} className="space-y-4">
            <div className="space-y-2">
              <Label>{txt("نوع العلف *", "Feed Type *")}</Label>
              <Select
                value={feedForm.feed_type}
                onValueChange={(v) => {
                  setFeedForm({ 
                    ...feedForm, 
                    feed_type: v,
                    amount_to_deduct: calculateFeedAmount(v, feedForm.quantity).toString()
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={txt("اختر نوع العلف", "Select feed type")} />
                </SelectTrigger>
                <SelectContent>
                  {feedTypes.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} - {f.price} {txt("ريال/كيس", "OMR/bag")} ({f.kg_per_unit} {txt("كجم", "kg")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{txt("الكمية (كجم) *", "Quantity (kg) *")}</Label>
              <Input
                type="number"
                value={feedForm.quantity}
                onChange={(e) => {
                  const qty = e.target.value;
                  setFeedForm({ 
                    ...feedForm, 
                    quantity: qty,
                    amount_to_deduct: calculateFeedAmount(feedForm.feed_type, qty).toString()
                  });
                }}
                placeholder={txt("أدخل الكمية", "Enter quantity")}
              />
            </div>
            <div className="space-y-2">
              <Label>{txt("المبلغ المطلوب خصمه (ريال) *", "Amount to Deduct (OMR) *")}</Label>
              <Input
                type="number"
                value={feedForm.amount_to_deduct}
                readOnly
                className={`font-bold text-lg ${isAmountExceedsBalance() ? 'bg-red-50 border-red-500 text-red-700' : 'bg-muted'}`}
              />
              {feedForm.feed_type && feedForm.quantity && (
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const feed = feedTypes.find(f => f.id === feedForm.feed_type);
                    if (feed) {
                      const bags = (parseFloat(feedForm.quantity) / (feed.kg_per_unit || 1)).toFixed(2);
                      return `${bags} ${txt("كيس", "bags")} × ${feed.price} ${txt("ريال", "OMR")} = ${feedForm.amount_to_deduct} ${txt("ريال", "OMR")}`;
                    }
                    return '';
                  })()}
                </p>
              )}
              {/* تنبيه تجاوز الرصيد */}
              {isAmountExceedsBalance() && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">
                    {txt(
                      `المبلغ المطلوب (${feedForm.amount_to_deduct} ريال) يتجاوز رصيدك الحالي (${supplier?.balance?.toFixed(2) || 0} ريال)`,
                      `Amount (${feedForm.amount_to_deduct} OMR) exceeds your current balance (${supplier?.balance?.toFixed(2) || 0} OMR)`
                    )}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>{txt("ملاحظات", "Notes")}</Label>
              <Textarea
                value={feedForm.notes}
                onChange={(e) => setFeedForm({ ...feedForm, notes: e.target.value })}
                placeholder={txt("أي ملاحظات إضافية...", "Any additional notes...")}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFeedDialogOpen(false)}>
                {txt("إلغاء", "Cancel")}
              </Button>
              <Button 
                type="submit" 
                className="gradient-primary text-white" 
                disabled={loading || isAmountExceedsBalance()}
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 me-2" />}
                {txt("إرسال الطلب", "Send Request")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{txt("إرسال رسالة", "Send Message")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendMessage} className="space-y-4">
            <div className="space-y-2">
              <Label>{txt("نوع الرسالة", "Message Type")}</Label>
              <Select
                value={messageForm.message_type}
                onValueChange={(v) => setMessageForm({ ...messageForm, message_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESSAGE_TYPES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{txt("الموضوع *", "Subject *")}</Label>
              <Input
                value={messageForm.subject}
                onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                placeholder={txt("عنوان الرسالة", "Message title")}
              />
            </div>
            <div className="space-y-2">
              <Label>{txt("الرسالة *", "Message *")}</Label>
              <Textarea
                value={messageForm.message}
                onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                placeholder={txt("اكتب رسالتك هنا...", "Write your message here...")}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMessageDialogOpen(false)}>
                {txt("إلغاء", "Cancel")}
              </Button>
              <Button type="submit" className="gradient-primary text-white" disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 me-2" />}
                {txt("إرسال", "Send")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordDialogOpen} onOpenChange={setChangePasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              {txt("تغيير كلمة المرور", "Change Password")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label>{txt("كلمة المرور الحالية", "Current Password")}</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={txt("أدخل كلمة المرور الحالية", "Enter current password")}
              />
            </div>
            <div className="space-y-2">
              <Label>{txt("كلمة المرور الجديدة", "New Password")}</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={txt("أدخل كلمة المرور الجديدة (4 أحرف على الأقل)", "Enter new password (min 4 chars)")}
              />
            </div>
            <div className="space-y-2">
              <Label>{txt("تأكيد كلمة المرور الجديدة", "Confirm New Password")}</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={txt("أعد إدخال كلمة المرور الجديدة", "Re-enter new password")}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setChangePasswordDialogOpen(false)}>
                {txt("إلغاء", "Cancel")}
              </Button>
              <Button type="submit" className="gradient-primary text-white" disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                {txt("تغيير كلمة المرور", "Change Password")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierPortal;
