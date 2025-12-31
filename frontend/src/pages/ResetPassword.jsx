import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Milk, Globe, Eye, EyeOff, Lock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const ResetPassword = () => {
  const { t } = useTranslation();
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setVerifying(false);
        setTokenValid(false);
        return;
      }

      try {
        const response = await axios.get(`${API}/auth/verify-reset-token?token=${token}`);
        setTokenValid(response.data.valid);
        setUserEmail(response.data.email || "");
      } catch (error) {
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(
        language === "ar" 
          ? "كلمات المرور غير متطابقة" 
          : "Passwords do not match"
      );
      return;
    }

    if (password.length < 6) {
      toast.error(
        language === "ar" 
          ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" 
          : "Password must be at least 6 characters"
      );
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("new_password", password);
      
      await axios.post(`${API}/auth/reset-password`, formData);
      setSuccess(true);
      toast.success(
        language === "ar" 
          ? "تم تغيير كلمة المرور بنجاح" 
          : "Password changed successfully"
      );
    } catch (error) {
      toast.error(
        error.response?.data?.detail || 
        (language === "ar" 
          ? "حدث خطأ، يرجى المحاولة مرة أخرى" 
          : "An error occurred, please try again")
      );
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (verifying) {
      return (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">
            {language === "ar" ? "جاري التحقق..." : "Verifying..."}
          </p>
        </div>
      );
    }

    if (!token || !tokenValid) {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            {language === "ar" ? "رابط غير صالح" : "Invalid Link"}
          </CardTitle>
          <CardDescription className="text-base text-center">
            {language === "ar" 
              ? "هذا الرابط غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد."
              : "This link is invalid or expired. Please request a new one."}
          </CardDescription>
          <Link to="/forgot-password" className="w-full mt-4">
            <Button className="w-full gradient-primary text-white hover:opacity-90">
              {language === "ar" ? "طلب رابط جديد" : "Request New Link"}
            </Button>
          </Link>
        </div>
      );
    }

    if (success) {
      return (
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            {language === "ar" ? "تم بنجاح!" : "Success!"}
          </CardTitle>
          <CardDescription className="text-base text-center">
            {language === "ar" 
              ? "تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة."
              : "Your password has been changed successfully. You can now login with your new password."}
          </CardDescription>
          <Link to="/login" className="w-full mt-4">
            <Button className="w-full gradient-primary text-white hover:opacity-90">
              {language === "ar" ? "تسجيل الدخول" : "Login"}
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <>
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {language === "ar" ? "إعادة تعيين كلمة المرور" : "Reset Password"}
          </CardTitle>
          <CardDescription>
            {language === "ar" 
              ? `أدخل كلمة المرور الجديدة للحساب ${userEmail}`
              : `Enter a new password for ${userEmail}`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                {language === "ar" ? "كلمة المرور الجديدة" : "New Password"}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={language === "ar" ? "أدخل كلمة المرور الجديدة" : "Enter new password"}
                  required
                  minLength={6}
                  className="pe-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-0 end-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {language === "ar" ? "تأكيد كلمة المرور" : "Confirm Password"}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={language === "ar" ? "أعد إدخال كلمة المرور" : "Re-enter password"}
                required
                minLength={6}
              />
            </div>

            {password && confirmPassword && password !== confirmPassword && (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                {language === "ar" ? "كلمات المرور غير متطابقة" : "Passwords do not match"}
              </div>
            )}

            <Button
              type="submit"
              className="w-full gradient-primary text-white hover:opacity-90"
              disabled={loading || password !== confirmPassword}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {language === "ar" ? "جاري التغيير..." : "Changing..."}
                </span>
              ) : (
                language === "ar" ? "تغيير كلمة المرور" : "Change Password"
              )}
            </Button>
          </form>
        </CardContent>
      </>
    );
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="https://customer-assets.emergentagent.com/job_dairysystem/artifacts/9vg9jfp2_%D8%A7%D9%84%D8%A7%D8%A8%D9%84.jpg"
          alt="الإبل"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-12 start-12 end-12 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Milk className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold">{t("app_name")}</h1>
          </div>
          <p className="text-lg text-white/80 max-w-md">
            {language === "ar" 
              ? "نظام متكامل لإدارة مراكز تجميع الحليب بكفاءة عالية"
              : "A comprehensive system for managing milk collection centers efficiently"}
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col">
        {/* Language Toggle */}
        <div className="flex justify-end p-4">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="gap-2"
          >
            <Globe className="w-4 h-4" />
            {language === "ar" ? "English" : "العربية"}
          </Button>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="w-full max-w-md border-0 shadow-xl">
            {renderContent()}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
