import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth, useLanguage, API } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Globe, Eye, EyeOff, MapPin, AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

// شعار المروج للألبان
const LOGO_URL = "https://customer-assets.emergentagent.com/job_milkmanage-3/artifacts/valn5g7i_%D8%B4%D8%B9%D8%A7%D8%B1%20%D8%A7%D9%84%D9%85%D8%B1%D9%88%D8%AC%20%D9%84%D9%84%D8%A7%D9%84%D8%A8%D8%A7%D9%86.png";

const Login = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [locationStatus, setLocationStatus] = useState("idle"); // idle, loading, success, error, blocked
  const [userLocation, setUserLocation] = useState(null);
  const [locationBlocked, setLocationBlocked] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  // Check location against geofence
  const checkLocationAllowed = async (latitude, longitude) => {
    try {
      const params = new URLSearchParams();
      if (latitude) params.append("latitude", latitude);
      if (longitude) params.append("longitude", longitude);
      
      const response = await axios.post(`${API}/auth/check-location?${params}`);
      const data = response.data;
      
      if (!data.allowed) {
        setLocationBlocked(true);
        setLocationStatus("blocked");
        if (data.reason === "location_required") {
          setLocationMessage(language === "ar" ? "يجب تفعيل الموقع للدخول" : "Location required for login");
        } else if (data.reason === "outside_allowed_area") {
          setLocationMessage(language === "ar" ? "أنت خارج نطاق المواقع المسموح بها" : "You are outside allowed locations");
        }
        return false;
      } else {
        setLocationBlocked(false);
        if (data.warning) {
          setLocationMessage(language === "ar" ? "⚠️ أنت خارج المواقع المحددة (وضع المراقبة)" : "⚠️ Outside defined locations (monitoring mode)");
        } else if (data.location_name) {
          setLocationMessage(language === "ar" ? `✓ ${data.location_name}` : `✓ ${data.location_name}`);
        }
        return true;
      }
    } catch (error) {
      // If check fails, allow login (fail open)
      console.log("Location check error:", error);
      return true;
    }
  };

  const requestLocation = () => {
    setLocationStatus("loading");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setUserLocation(loc);
          
          // Check if location is allowed
          const allowed = await checkLocationAllowed(loc.latitude, loc.longitude);
          if (allowed) {
            setLocationStatus("success");
          }
        },
        async (error) => {
          console.log("Location error:", error);
          // Check if login without location is allowed
          const allowed = await checkLocationAllowed(null, null);
          if (allowed) {
            setLocationStatus("error");
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      // Check if login without location is allowed
      checkLocationAllowed(null, null).then(allowed => {
        if (allowed) {
          setLocationStatus("error");
        }
      });
    }
  };

  // Get user location on component mount
  useEffect(() => {
    requestLocation();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if location is blocked
    if (locationBlocked) {
      toast.error(
        language === "ar"
          ? "لا يمكن تسجيل الدخول من هذا الموقع"
          : "Login not allowed from this location"
      );
      return;
    }
    
    setLoading(true);

    const result = await login(formData.username, formData.password);

    if (result.success) {
      // Track login with location
      try {
        const token = localStorage.getItem("token");
        const trackResponse = await axios.post(`${API}/auth/track-login`, null, {
          params: {
            latitude: userLocation?.latitude,
            longitude: userLocation?.longitude,
            location_name: locationMessage || null,
            ip_address: null, // Will be captured by backend
            user_agent: navigator.userAgent,
          },
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!trackResponse.data.is_within_allowed_area) {
          // Location is outside allowed area
          toast.warning(
            language === "ar" 
              ? "⚠️ تم تسجيل الدخول من موقع غير مصرح - تم إبلاغ المسؤول" 
              : "⚠️ Login from unauthorized location - Admin notified"
          );
        }
      } catch (trackError) {
        console.log("Login tracking error:", trackError);
      }

      setLoading(false);
      navigate("/dashboard");
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        {/* Animated Logo */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute inset-0 blur-3xl bg-white/20 rounded-full animate-pulse" />
            <img
              src={LOGO_URL}
              alt="المروج للألبان"
              className="relative w-72 h-72 object-contain drop-shadow-2xl animate-float"
              style={{
                animation: "float 3s ease-in-out infinite",
              }}
            />
          </div>
        </div>
        
        {/* Bottom Content */}
        <div className="absolute bottom-12 start-12 end-12 text-white">
          <h1 className="text-4xl font-bold mb-3 drop-shadow-lg">Almorooj Dairy</h1>
          <p className="text-lg text-white/90 max-w-md">
            {language === "ar" 
              ? "نظام متكامل لإدارة مراكز تجميع الحليب بكفاءة عالية"
              : "A comprehensive system for managing milk collection centers efficiently"}
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Language Toggle */}
        <div className="flex justify-end p-4">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="gap-2"
            data-testid="login-language-toggle"
          >
            <Globe className="w-4 h-4" />
            {language === "ar" ? "English" : "العربية"}
          </Button>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="w-full max-w-md border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              {/* Welcome Logo - Animated */}
              <div className="flex flex-col items-center justify-center mb-6">
                <div className="relative">
                  {/* Pulse Ring */}
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: "2s" }} />
                  <img
                    src={LOGO_URL}
                    alt="المروج للألبان"
                    className="relative w-24 h-24 object-contain rounded-2xl shadow-lg animate-bounce-slow"
                    style={{
                      animation: "bounce-slow 2s ease-in-out infinite",
                    }}
                  />
                </div>
                <h2 className="mt-4 text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-800 bg-clip-text text-transparent">
                  Almorooj Dairy
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {language === "ar" ? "المروج للألبان" : "Al-Morooj Dairy"}
                </p>
              </div>
              
              <CardTitle className="text-xl font-bold text-slate-800">
                {t("login_title")}
              </CardTitle>
              <CardDescription>
                {language === "ar" ? "أدخل بياناتك للوصول إلى النظام" : "Enter your credentials to access the system"}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">{t("username")}</Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder={language === "ar" ? "أدخل اسم المستخدم" : "Enter username"}
                    required
                    data-testid="username-input"
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">{t("password")}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder={language === "ar" ? "أدخل كلمة المرور" : "Enter password"}
                      required
                      className="pe-10"
                      data-testid="password-input"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-0 end-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      data-testid="toggle-password-visibility"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full gradient-primary text-white hover:opacity-90"
                  disabled={loading}
                  data-testid="submit-btn"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t("loading")}
                    </span>
                  ) : (
                    t("login")
                  )}
                </Button>

                {/* Location Status */}
                <div className={`flex items-center justify-center gap-2 p-2 rounded-lg text-sm ${
                  locationStatus === "success" ? "bg-green-50 text-green-700" :
                  locationStatus === "loading" ? "bg-blue-50 text-blue-700" :
                  locationStatus === "blocked" ? "bg-red-50 text-red-700" :
                  locationStatus === "error" ? "bg-yellow-50 text-yellow-700" :
                  "bg-gray-50 text-gray-500"
                }`}>
                  {locationStatus === "loading" && (
                    <>
                      <MapPin className="w-4 h-4 animate-pulse" />
                      {language === "ar" ? "جاري تحديد الموقع..." : "Getting location..."}
                    </>
                  )}
                  {locationStatus === "success" && (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      {locationMessage || (language === "ar" ? "تم تحديد الموقع" : "Location detected")}
                    </>
                  )}
                  {locationStatus === "blocked" && (
                    <>
                      <ShieldAlert className="w-4 h-4" />
                      {locationMessage || (language === "ar" ? "الموقع غير مصرح" : "Location not authorized")}
                    </>
                  )}
                  {locationStatus === "error" && (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      {locationMessage || (language === "ar" ? "لم يتم تحديد الموقع" : "Location not available")}
                      <Button 
                        type="button" 
                        variant="link" 
                        size="sm" 
                        onClick={requestLocation}
                        className="p-0 h-auto text-yellow-700 underline"
                      >
                        {language === "ar" ? "إعادة المحاولة" : "Retry"}
                      </Button>
                    </>
                  )}
                </div>

                {/* Blocked Location Warning */}
                {locationBlocked && (
                  <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-800 text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      <ShieldAlert className="w-5 h-5" />
                      {language === "ar" ? "تسجيل الدخول غير مسموح" : "Login Not Allowed"}
                    </div>
                    <p className="mt-1 text-xs">
                      {language === "ar" 
                        ? "أنت خارج نطاق المواقع المسموح بها. يرجى التواصل مع المسؤول."
                        : "You are outside the allowed locations. Please contact admin."}
                    </p>
                  </div>
                )}

                {/* Forgot Password Link */}
                <div className="text-center pt-4">
                  <Link
                    to="/forgot-password"
                    className="text-primary hover:underline"
                    data-testid="forgot-password-link"
                  >
                    {language === "ar" ? "نسيت كلمة المرور؟" : "Forgot Password?"}
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
