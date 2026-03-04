import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { 
  MapPin, Wifi, WifiOff, RefreshCw, Clock, Navigation, 
  User, Phone, LogIn, LogOut, CheckCircle, XCircle, AlertCircle,
  Fingerprint, Locate, Camera, Shield, ShieldAlert, ShieldCheck, AlertTriangle
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const formatTime = (t) => {
  if (!t) return "--:--";
  if (/^\d{1,2}:\d{2}$/.test(t)) return t;
  try { const d = new Date(t); if (!isNaN(d.getTime())) return d.toLocaleTimeString('ar-SA', {hour:'2-digit',minute:'2-digit'}); } catch {}
  return t;
};

const detectMockGPS = (pos) => {
  const r = { is_mock: false, reasons: [], accuracy: pos.coords.accuracy };
  if (pos.coords.accuracy < 1) { r.reasons.push("دقة مشبوهة"); r.is_mock = true; }
  if (pos.coords.altitude === 0 && pos.coords.accuracy < 10) { r.reasons.push("ارتفاع صفر"); r.is_mock = true; }
  return r;
};

const GPSAttendance = () => {
  // Auth
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phone, setPhone] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [employee, setEmployee] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Network verification
  const [networkChecked, setNetworkChecked] = useState(false);
  const [networkChecking, setNetworkChecking] = useState(false);
  const [isCompanyNetwork, setIsCompanyNetwork] = useState(false);
  const [matchedLocation, setMatchedLocation] = useState(null);
  const [clientIP, setClientIP] = useState("");
  
  // GPS Tracking
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [locationStatus, setLocationStatus] = useState({ isWithinRange: false, distance: 0, workLocation: null });
  
  // Attendance
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  
  // Selfie
  const [showCamera, setShowCamera] = useState(false);
  const [selfiePhoto, setSelfiePhoto] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingMethod, setPendingMethod] = useState("wifi");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [mockGpsDetected, setMockGpsDetected] = useState(false);
  const hasAutoCheckedIn = useRef(false);
  const hasAutoCheckedOut = useRef(false);

  // ===== NETWORK CHECK - runs on page load =====
  const checkNetwork = useCallback(async () => {
    setNetworkChecking(true);
    try {
      const res = await axios.get(`${API}/tracking/detect-network`);
      setClientIP(res.data.client_ip);
      setIsCompanyNetwork(res.data.is_company_network);
      setMatchedLocation(res.data.matched_location);
      setNetworkChecked(true);
      
      if (!res.data.is_company_network) {
        toast.error("أنت خارج نطاق شبكة الشركة! لا يمكنك تسجيل الحضور");
      }
    } catch {
      setNetworkChecked(true);
      setIsCompanyNetwork(false);
    } finally {
      setNetworkChecking(false);
    }
  }, []);

  useEffect(() => { checkNetwork(); }, [checkNetwork]);

  useEffect(() => {
    const fetchSettings = async () => {
      try { const res = await axios.get(`${API}/tracking/settings`); setSettings(res.data); } catch {}
    };
    fetchSettings();
  }, []);

  // Camera
  const startCamera = async (action, method = "wifi") => {
    setPendingAction(action);
    setPendingMethod(method);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 480, height: 480 } });
      streamRef.current = stream;
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch {
      toast.error("فشل في فتح الكاميرا - تأكد من السماح بالوصول");
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 480; canvas.height = 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, 480, 480);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    ctx.fillStyle = "#fff"; ctx.font = "14px Arial"; ctx.textAlign = "center";
    ctx.fillText(`${new Date().toLocaleDateString('ar-SA')} - ${new Date().toLocaleTimeString('ar-SA')}`, canvas.width/2, canvas.height-15);
    setSelfiePhoto(canvas.toDataURL("image/jpeg", 0.7));
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  };

  const confirmSelfieAndSubmit = async () => {
    if (!selfiePhoto || !pendingAction) return;
    setAttendanceLoading(true);
    try {
      const res = await axios.post(`${API}/tracking/gps-attendance`, {
        employee_id: employee.id,
        action: pendingAction,
        latitude: currentLocation?.lat || 0,
        longitude: currentLocation?.lng || 0,
        date: new Date().toISOString().split('T')[0],
        selfie_photo: selfiePhoto,
        mock_gps_info: { is_mock: false, check_passed: true },
        attendance_method: pendingMethod,
        wifi_ssid: matchedLocation?.wifi_ssid
      });
      if (res.data.success) {
        if (pendingAction === "check_in") {
          hasAutoCheckedIn.current = true;
          setTodayAttendance(p => ({ ...p, check_in: res.data.check_in_time, check_in_method: pendingMethod, gps_approval_status: "pending", check_in_selfie: true }));
        } else {
          hasAutoCheckedOut.current = true;
          setTodayAttendance(p => ({ ...p, check_out: res.data.check_out_time, check_out_method: pendingMethod, gps_checkout_approval_status: "pending" }));
        }
        toast.success(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "فشل في تسجيل الحضور");
    } finally {
      setAttendanceLoading(false);
      setSelfiePhoto(null); setShowCamera(false); setPendingAction(null);
    }
  };

  const cancelSelfie = () => { stopCamera(); setSelfiePhoto(null); setShowCamera(false); setPendingAction(null); };

  // Login
  const handleLogin = async () => {
    if (!phone && !employeeCode) { toast.error("أدخل رقم الهاتف أو الرقم الوظيفي"); return; }
    setLoginLoading(true);
    try {
      const res = await axios.post(`${API}/tracking/employee-login`, { phone: phone || undefined, employee_code: employeeCode || undefined });
      if (res.data.employee) {
        setEmployee(res.data.employee); setIsLoggedIn(true);
        setTodayAttendance(res.data.today_attendance);
        toast.success(`مرحباً ${res.data.employee.name}`);
        const att = res.data.today_attendance;
        hasAutoCheckedIn.current = !!(att?.check_in_method === "gps" || att?.check_in_method === "wifi" || att?.gps_check_in);
        hasAutoCheckedOut.current = !!(att?.check_out_method === "gps" || att?.check_out_method === "wifi" || att?.gps_check_out);
      }
    } catch (err) { toast.error(err.response?.data?.detail || "لم يتم العثور على الموظف"); }
    finally { setLoginLoading(false); }
  };

  // GPS tracking
  const sendLocation = useCallback(async (pos) => {
    if (!employee) return;
    const mock = detectMockGPS(pos);
    if (mock.is_mock) { setMockGpsDetected(true); toast.error("تم رصد موقع وهمي!"); return; }
    try {
      const res = await axios.post(`${API}/tracking/location`, { employee_id: employee.id, latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
      setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLastUpdate(new Date());
      setLocationStatus({ isWithinRange: res.data.is_within_range, distance: res.data.distance_from_work, workLocation: res.data.work_location });
      setError(null);
    } catch { setError("فشل في إرسال الموقع"); }
  }, [employee]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) { setError("المتصفح لا يدعم GPS"); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { sendLocation(p); setIsTracking(true); toast.success("تم تفعيل التتبع"); },
      () => { setError("فشل في تحديد الموقع"); }, { enableHighAccuracy: true, timeout: 30000 }
    );
    setWatchId(navigator.geolocation.watchPosition(sendLocation, () => {}, { enableHighAccuracy: true }));
  }, [sendLocation]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    setWatchId(null); setIsTracking(false);
  }, [watchId]);

  useEffect(() => () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); stopCamera(); }, [watchId]);

  const checkInDone = hasAutoCheckedIn.current;
  const checkOutDone = hasAutoCheckedOut.current;

  // ===== BLOCKED: Not on company network =====
  if (networkChecked && !isCompanyNetwork) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md shadow-xl border-2 border-red-300">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-10 h-10 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-700">خارج نطاق شبكة الشركة</CardTitle>
            <CardDescription className="text-red-600 text-base">
              لا يمكنك تسجيل الحضور من هذه الشبكة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-bold">يجب الاتصال بشبكة WiFi الشركة</span>
              </div>
              <p className="text-sm text-red-600">
                النظام يعمل فقط من شبكة الشركة المحددة. تأكد من اتصالك بالشبكة الصحيحة ثم أعد المحاولة.
              </p>
              <div className="text-xs text-muted-foreground mt-2 p-2 bg-white rounded border">
                <p>عنوان IP الحالي: <span className="font-mono">{clientIP}</span></p>
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 font-medium flex items-center gap-2">
                <Wifi className="w-4 h-4" />
                الخطوات المطلوبة:
              </p>
              <ol className="list-decimal list-inside text-sm text-blue-600 mt-2 space-y-1">
                <li>افتح إعدادات WiFi في هاتفك</li>
                <li>اتصل بشبكة الشركة المحددة</li>
                <li>أعد فتح هذه الصفحة</li>
              </ol>
            </div>

            <Button onClick={checkNetwork} className="w-full h-12 text-lg" disabled={networkChecking} data-testid="retry-network-btn">
              {networkChecking ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><RefreshCw className="w-5 h-5 me-2" />إعادة التحقق من الشبكة</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== LOADING: Checking network =====
  if (!networkChecked || networkChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md shadow-xl text-center p-8">
          <RefreshCw className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-bold">جاري التحقق من الشبكة...</p>
          <p className="text-sm text-muted-foreground mt-2">يتم فحص اتصالك بشبكة الشركة</p>
        </Card>
      </div>
    );
  }

  // ===== CAMERA MODAL =====
  if (showCamera) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="text-center">
              <CardTitle className="text-white flex items-center justify-center gap-2">
                <Camera className="w-6 h-6" />
                {pendingAction === "check_in" ? "سيلفي تسجيل الحضور" : "سيلفي تسجيل الانصراف"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selfiePhoto ? (
                <>
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
                    <div className="absolute inset-0 border-4 border-white/20 rounded-xl" />
                    <div className="absolute top-3 left-3 right-3 flex justify-between">
                      <Badge className="bg-red-500 animate-pulse">REC</Badge>
                      <Badge className="bg-black/50">{new Date().toLocaleTimeString('ar-SA')}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={capturePhoto} className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-lg" data-testid="capture-selfie-btn">
                      <Camera className="w-6 h-6 me-2" />التقاط
                    </Button>
                    <Button onClick={cancelSelfie} variant="destructive" className="h-14 px-6"><XCircle className="w-6 h-6" /></Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative rounded-xl overflow-hidden aspect-square">
                    <img src={selfiePhoto} alt="selfie" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={confirmSelfieAndSubmit} className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-lg" disabled={attendanceLoading} data-testid="confirm-selfie-btn">
                      {attendanceLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <><CheckCircle className="w-6 h-6 me-2" />تأكيد</>}
                    </Button>
                    <Button onClick={() => { setSelfiePhoto(null); startCamera(pendingAction, pendingMethod); }} variant="outline" className="h-14 px-6 text-white border-white"><RefreshCw className="w-6 h-6" /></Button>
                    <Button onClick={cancelSelfie} variant="destructive" className="h-14 px-6"><XCircle className="w-6 h-6" /></Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    );
  }

  // ===== LOGIN SCREEN =====
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">تسجيل الحضور</CardTitle>
            <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 flex items-center justify-center gap-2">
                <Wifi className="w-4 h-4" />
                متصل بشبكة: <strong>{matchedLocation?.wifi_ssid}</strong> - {matchedLocation?.name}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Phone className="w-4 h-4" />رقم الهاتف</label>
              <Input type="tel" placeholder="مثال: 91234567" value={phone} onChange={(e) => setPhone(e.target.value)} className="text-lg text-center" dir="ltr" data-testid="phone-input" />
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">أو</span></div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><User className="w-4 h-4" />الرقم الوظيفي</label>
              <Input type="text" placeholder="مثال: EMP001" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} className="text-lg text-center" dir="ltr" data-testid="employee-code-input" />
            </div>
            <Button onClick={handleLogin} className="w-full h-12 text-lg" disabled={loginLoading} data-testid="login-btn">
              {loginLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><LogIn className="w-5 h-5 me-2" />تسجيل الدخول</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== MAIN SCREEN =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4" dir="rtl">
      <div className="max-w-md mx-auto space-y-4">
        {/* Employee + Network */}
        <Card className="border-2 border-green-300">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                {employee?.name?.charAt(0)}
              </div>
              <div className="flex-1">
                <h2 className="font-bold">{employee?.name}</h2>
                <p className="text-xs text-muted-foreground">{employee?.employee_code} - {employee?.department}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setIsLoggedIn(false); setEmployee(null); stopTracking(); }}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-700">
                شبكة مؤكدة: <strong>{matchedLocation?.wifi_ssid}</strong> ({matchedLocation?.name})
              </span>
              <Badge className="bg-green-600 text-xs ms-auto">آمن</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5" />حالة الحضور اليوم</CardTitle>
            <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('ar-SA', {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg border-2 text-center ${todayAttendance?.check_in || todayAttendance?.gps_check_in ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-xs font-medium mb-1">الحضور</p>
                <p className="text-lg font-bold" data-testid="check-in-time">
                  {(todayAttendance?.check_in || todayAttendance?.gps_check_in) ? formatTime(todayAttendance?.gps_check_in || todayAttendance?.check_in) : "--:--"}
                </p>
                {todayAttendance?.gps_approval_status === "pending" && <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 mt-1">بانتظار الموافقة</Badge>}
                {todayAttendance?.gps_approval_status === "approved" && <Badge variant="outline" className="text-xs text-green-600 border-green-300 mt-1">تمت الموافقة</Badge>}
              </div>
              <div className={`p-3 rounded-lg border-2 text-center ${todayAttendance?.check_out || todayAttendance?.gps_check_out ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-xs font-medium mb-1">الانصراف</p>
                <p className="text-lg font-bold" data-testid="check-out-time">
                  {(todayAttendance?.check_out || todayAttendance?.gps_check_out) ? formatTime(todayAttendance?.gps_check_out || todayAttendance?.check_out) : "--:--"}
                </p>
                {todayAttendance?.gps_checkout_approval_status === "pending" && <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 mt-1">بانتظار الموافقة</Badge>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Actions: Selfie-based check-in/out */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              تسجيل الحضور / الانصراف
            </CardTitle>
            <CardDescription className="text-xs">
              أنت متصل بشبكة مؤكدة - التقط سيلفي لتسجيل الحضور أو الانصراف
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => startCamera("check_in", "wifi")}
                disabled={attendanceLoading || checkInDone}
                className="h-14 bg-green-600 hover:bg-green-700 text-base" data-testid="wifi-checkin-btn">
                {checkInDone ? <><CheckCircle className="w-5 h-5 me-2" />تم الحضور</> : <><Camera className="w-5 h-5 me-2" />حضور + سيلفي</>}
              </Button>
              <Button onClick={() => startCamera("check_out", "wifi")}
                disabled={attendanceLoading || !checkInDone || checkOutDone}
                className="h-14 bg-orange-600 hover:bg-orange-700 text-base" data-testid="wifi-checkout-btn">
                {checkOutDone ? <><CheckCircle className="w-5 h-5 me-2" />تم الانصراف</> : <><Camera className="w-5 h-5 me-2" />انصراف + سيلفي</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* GPS Tracking (optional) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <Navigation className="w-4 h-4" />تتبع GPS (اختياري)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isTracking && (
              <div className={`p-2 rounded-lg text-sm ${locationStatus.isWithinRange ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <span>{locationStatus.isWithinRange ? "داخل نطاق العمل" : "خارج نطاق العمل"}</span>
                {locationStatus.distance > 0 && <span className="text-xs text-muted-foreground ms-2">({Math.round(locationStatus.distance)}م)</span>}
              </div>
            )}
            {lastUpdate && <p className="text-xs text-center text-muted-foreground">آخر تحديث: {lastUpdate.toLocaleTimeString('ar-SA')}</p>}
            {error && <p className="text-xs text-center text-red-500">{error}</p>}
            <Button onClick={isTracking ? stopTracking : startTracking} variant="outline" size="sm"
              className="w-full" disabled={mockGpsDetected} data-testid="tracking-toggle-btn">
              {isTracking ? <><WifiOff className="w-4 h-4 me-1" />إيقاف GPS</> : <><Locate className="w-4 h-4 me-1" />تفعيل GPS</>}
            </Button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardContent className="pt-4">
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>النظام يعمل <strong>فقط</strong> من شبكة WiFi الشركة المحددة</li>
              <li>التقط سيلفي لتسجيل الحضور أو الانصراف</li>
              <li>بيانات الهاتف أو أي شبكة أخرى لن تعمل</li>
              <li>جميع التسجيلات تحتاج موافقة المسؤول</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GPSAttendance;
