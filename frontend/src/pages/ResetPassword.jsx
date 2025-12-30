import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "../App";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Mail, ArrowLeft, Key, CheckCircle } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [mode, setMode] = useState(token ? "reset" : "request"); // request, sent, reset, success
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);

  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await axios.get(`${API}/auth/verify-reset-token?token=${token}`);
      setTokenValid(response.data.valid);
      if (response.data.email) {
        setEmail(response.data.email);
      }
    } catch (error) {
      setTokenValid(false);
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("email", email);
      
      await axios.post(`${API}/auth/forgot-password`, formData);
      setMode("sent");
      toast.success(language === "ar" ? "تم إرسال رابط الاسترجاع" : "Reset link sent");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error sending reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error(language === "ar" ? "كلمة المرور غير متطابقة" : "Passwords do not match");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error(language === "ar" ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("new_password", newPassword);
      
      await axios.post(`${API}/auth/reset-password`, formData);
      setMode("success");
      toast.success(language === "ar" ? "تم تغيير كلمة المرور بنجاح" : "Password changed successfully");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error resetting password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4" dir={language === "ar" ? "rtl" : "ltr"}>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-amber-600 to-orange-700 rounded-full flex items-center justify-center">
            {mode === "success" ? (
              <CheckCircle className="w-8 h-8 text-white" />
            ) : mode === "reset" ? (
              <Key className="w-8 h-8 text-white" />
            ) : (
              <Mail className="w-8 h-8 text-white" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {mode === "success" 
              ? (language === "ar" ? "تم بنجاح!" : "Success!")
              : mode === "sent" 
              ? (language === "ar" ? "تحقق من بريدك" : "Check Your Email")
              : mode === "reset"
              ? (language === "ar" ? "كلمة مرور جديدة" : "New Password")
              : (language === "ar" ? "استرجاع كلمة المرور" : "Reset Password")
            }
          </CardTitle>
          <CardDescription>
            {mode === "success"
              ? (language === "ar" ? "يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة" : "You can now login with your new password")
              : mode === "sent"
              ? (language === "ar" ? "تم إرسال رابط الاسترجاع إلى بريدك الإلكتروني" : "A reset link has been sent to your email")
              : mode === "reset"
              ? (language === "ar" ? "أدخل كلمة المرور الجديدة" : "Enter your new password")
              : (language === "ar" ? "أدخل بريدك الإلكتروني لاسترجاع كلمة المرور" : "Enter your email to reset password")
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          {mode === "request" && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  {language === "ar" ? "البريد الإلكتروني" : "Email"}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@almoroojdairy.om"
                  required
                  className="text-center"
                />
              </div>
              <Button type="submit" className="w-full gradient-primary text-white" disabled={loading}>
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                ) : (
                  language === "ar" ? "إرسال رابط الاسترجاع" : "Send Reset Link"
                )}
              </Button>
            </form>
          )}

          {mode === "sent" && (
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-green-700">
                  {language === "ar" 
                    ? `تم إرسال رابط الاسترجاع إلى ${email}`
                    : `Reset link sent to ${email}`
                  }
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {language === "ar" 
                  ? "الرابط صالح لمدة ساعة واحدة" 
                  : "The link is valid for 1 hour"
                }
              </p>
            </div>
          )}

          {mode === "reset" && (
            <>
              {tokenValid === false ? (
                <div className="text-center space-y-4">
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-red-700">
                      {language === "ar" 
                        ? "الرابط غير صالح أو منتهي الصلاحية" 
                        : "Invalid or expired reset link"
                      }
                    </p>
                  </div>
                  <Button onClick={() => { setMode("request"); navigate("/reset-password"); }} variant="outline" className="w-full">
                    {language === "ar" ? "طلب رابط جديد" : "Request New Link"}
                  </Button>
                </div>
              ) : tokenValid === true ? (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">
                      {language === "ar" ? "كلمة المرور الجديدة" : "New Password"}
                    </Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
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
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full gradient-primary text-white" disabled={loading}>
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : (
                      language === "ar" ? "تغيير كلمة المرور" : "Change Password"
                    )}
                  </Button>
                </form>
              ) : (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
                </div>
              )}
            </>
          )}

          {mode === "success" && (
            <div className="text-center">
              <Button onClick={() => navigate("/")} className="w-full gradient-primary text-white">
                {language === "ar" ? "تسجيل الدخول" : "Login"}
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="justify-center">
          <Button variant="link" onClick={() => navigate("/")} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 me-2" />
            {language === "ar" ? "العودة لتسجيل الدخول" : "Back to Login"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ResetPassword;
