import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../App";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Milk, Globe, ArrowRight, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const ForgotPassword = () => {
  const { t } = useTranslation();
  const { language, toggleLanguage } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", email);
      
      await axios.post(`${API}/api/auth/forgot-password`, formData);
      setSent(true);
      toast.success(
        language === "ar" 
          ? "تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني" 
          : "Password reset link sent to your email"
      );
    } catch (error) {
      toast.error(
        language === "ar" 
          ? "حدث خطأ، يرجى المحاولة مرة أخرى" 
          : "An error occurred, please try again"
      );
    } finally {
      setLoading(false);
    }
  };

  const ArrowIcon = language === "ar" ? ArrowLeft : ArrowRight;

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
            <CardHeader className="text-center pb-2">
              <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                  <Milk className="w-7 h-7 text-white" />
                </div>
              </div>
              
              {sent ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <CardTitle className="text-2xl font-bold">
                    {language === "ar" ? "تم الإرسال!" : "Email Sent!"}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {language === "ar" 
                      ? "تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد."
                      : "A password reset link has been sent to your email. Please check your inbox."}
                  </CardDescription>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-bold">
                    {language === "ar" ? "نسيت كلمة المرور؟" : "Forgot Password?"}
                  </CardTitle>
                  <CardDescription>
                    {language === "ar" 
                      ? "أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور"
                      : "Enter your email and we'll send you a link to reset your password"}
                  </CardDescription>
                </>
              )}
            </CardHeader>

            <CardContent>
              {sent ? (
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setSent(false)}
                  >
                    {language === "ar" ? "إرسال مرة أخرى" : "Send Again"}
                  </Button>
                  <Link to="/login">
                    <Button className="w-full gradient-primary text-white hover:opacity-90">
                      <ArrowIcon className="w-4 h-4 me-2" />
                      {language === "ar" ? "العودة لتسجيل الدخول" : "Back to Login"}
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      {language === "ar" ? "البريد الإلكتروني" : "Email"}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={language === "ar" ? "أدخل بريدك الإلكتروني" : "Enter your email"}
                      required
                      dir="ltr"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full gradient-primary text-white hover:opacity-90"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {language === "ar" ? "جاري الإرسال..." : "Sending..."}
                      </span>
                    ) : (
                      language === "ar" ? "إرسال رابط الاستعادة" : "Send Reset Link"
                    )}
                  </Button>

                  <div className="text-center pt-4">
                    <Link 
                      to="/login" 
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <ArrowIcon className="w-4 h-4" />
                      {language === "ar" ? "العودة لتسجيل الدخول" : "Back to Login"}
                    </Link>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
