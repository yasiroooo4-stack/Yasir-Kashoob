import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { 
  Wifi, WifiOff, RefreshCw, Clock, Navigation, 
  User, Phone, LogIn, LogOut, CheckCircle, XCircle,
  Locate, Camera, ShieldAlert, ShieldCheck, AlertTriangle, Globe,
  MapPin, Bell, ArrowLeftRight
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const translations = {
  ar: {
    blockedTitle: "خارج نطاق شبكة الشركة",
    blockedDesc: "لا يمكنك تسجيل الحضور من هذه الشبكة",
    mustConnectWifi: "يجب الاتصال بشبكة WiFi الشركة",
    blockedExplain: "النظام يعمل فقط من شبكة الشركة المحددة. تأكد من اتصالك بالشبكة الصحيحة ثم أعد المحاولة.",
    currentIP: "عنوان IP الحالي:",
    requiredSteps: "الخطوات المطلوبة:",
    step1: "افتح إعدادات WiFi في هاتفك",
    step2: "اتصل بشبكة الشركة المحددة",
    step3: "أعد فتح هذه الصفحة",
    retryNetwork: "إعادة التحقق من الشبكة",
    checkingNetwork: "جاري التحقق من الشبكة...",
    checkingNetworkDesc: "يتم فحص اتصالك بشبكة الشركة",
    selfieCheckIn: "سيلفي تسجيل الحضور",
    selfieCheckOut: "سيلفي تسجيل الانصراف",
    capture: "التقاط",
    confirm: "تأكيد",
    attendanceTitle: "تسجيل الحضور",
    connectedTo: "متصل بشبكة:",
    phoneLabel: "رقم الهاتف",
    phonePlaceholder: "مثال: 91234567",
    or: "أو",
    employeeCodeLabel: "الرقم الوظيفي",
    employeeCodePlaceholder: "مثال: EMP001",
    login: "تسجيل الدخول",
    verifiedNetwork: "شبكة مؤكدة:",
    secure: "آمن",
    todayStatus: "حالة الحضور اليوم",
    checkIn: "الحضور",
    checkOut: "الانصراف",
    pendingApproval: "بانتظار الموافقة",
    approved: "تمت الموافقة",
    attendanceActions: "تسجيل الحضور / الانصراف",
    attendanceActionsDesc: "أنت متصل بشبكة مؤكدة - التقط سيلفي لتسجيل الحضور أو الانصراف",
    checkInDone: "تم الحضور",
    checkInSelfie: "حضور + سيلفي",
    checkOutDone: "تم الانصراف",
    checkOutSelfie: "انصراف + سيلفي",
    // GPS auto tracking
    gpsAutoTitle: "تتبع GPS تلقائي",
    gpsAutoDesc: "يتم تتبع موقعك تلقائياً بعد تسجيل الحضور",
    gpsActivating: "جاري تفعيل GPS...",
    insideRange: "داخل نطاق العمل",
    outsideRange: "خارج نطاق العمل",
    lastUpdate: "آخر تحديث:",
    exitAlertTitle: "تنبيه: خارج نطاق العمل!",
    exitAlertDesc: "أنت خارج نطاق موقع العمل المحدد",
    distanceLabel: "المسافة:",
    meters: "م",
    // Exit log
    exitLogTitle: "سجل الخروج من نطاق العمل",
    exitTime: "وقت الخروج",
    returnTime: "وقت العودة",
    duration: "المدة",
    distance: "المسافة",
    statusOutside: "خارج النطاق",
    statusReturned: "عاد للنطاق",
    noExitLogs: "لا يوجد سجل خروج اليوم",
    ongoing: "مستمر",
    // Instructions
    inst1: "النظام يعمل فقط من شبكة WiFi الشركة المحددة",
    inst2: "يتم تفعيل GPS تلقائياً بعد تسجيل الحضور",
    inst3: "سيتم تنبيهك عند الخروج من نطاق العمل",
    inst4: "جميع التسجيلات تحتاج موافقة المسؤول",
    // Toasts
    toastOutsideNetwork: "أنت خارج نطاق شبكة الشركة! لا يمكنك تسجيل الحضور",
    toastCameraFail: "فشل في فتح الكاميرا - تأكد من السماح بالوصول",
    toastAttendanceFail: "فشل في تسجيل الحضور",
    toastEnterPhoneOrCode: "أدخل رقم الهاتف أو الرقم الوظيفي",
    toastWelcome: "مرحباً",
    toastEmployeeNotFound: "لم يتم العثور على الموظف",
    toastMockGPS: "تم رصد موقع وهمي!",
    toastGpsAutoOn: "تم تفعيل تتبع GPS تلقائياً",
    toastLocationSendFail: "فشل في إرسال الموقع",
    toastBrowserNoGPS: "المتصفح لا يدعم GPS",
    toastLocationFail: "فشل في تحديد الموقع",
    toastExitRange: "تنبيه! أنت خارج نطاق العمل",
    toastReturnRange: "مرحباً بعودتك إلى نطاق العمل",
  },
  en: {
    blockedTitle: "Outside Company Network",
    blockedDesc: "You cannot record attendance from this network",
    mustConnectWifi: "You must connect to company WiFi",
    blockedExplain: "The system only works from the designated company network. Make sure you are connected to the correct network and try again.",
    currentIP: "Current IP:",
    requiredSteps: "Required Steps:",
    step1: "Open WiFi settings on your phone",
    step2: "Connect to the designated company network",
    step3: "Reopen this page",
    retryNetwork: "Retry Network Check",
    checkingNetwork: "Checking network...",
    checkingNetworkDesc: "Verifying your connection to company network",
    selfieCheckIn: "Check-in Selfie",
    selfieCheckOut: "Check-out Selfie",
    capture: "Capture",
    confirm: "Confirm",
    attendanceTitle: "Attendance",
    connectedTo: "Connected to:",
    phoneLabel: "Phone Number",
    phonePlaceholder: "e.g. 91234567",
    or: "OR",
    employeeCodeLabel: "Employee Code",
    employeeCodePlaceholder: "e.g. EMP001",
    login: "Login",
    verifiedNetwork: "Verified network:",
    secure: "Secure",
    todayStatus: "Today's Attendance",
    checkIn: "Check-in",
    checkOut: "Check-out",
    pendingApproval: "Pending Approval",
    approved: "Approved",
    attendanceActions: "Check-in / Check-out",
    attendanceActionsDesc: "You are on a verified network - take a selfie to check in or out",
    checkInDone: "Checked In",
    checkInSelfie: "Check-in + Selfie",
    checkOutDone: "Checked Out",
    checkOutSelfie: "Check-out + Selfie",
    gpsAutoTitle: "Auto GPS Tracking",
    gpsAutoDesc: "Your location is tracked automatically after check-in",
    gpsActivating: "Activating GPS...",
    insideRange: "Inside work range",
    outsideRange: "Outside work range",
    lastUpdate: "Last update:",
    exitAlertTitle: "Alert: Outside work range!",
    exitAlertDesc: "You are outside the designated work area",
    distanceLabel: "Distance:",
    meters: "m",
    exitLogTitle: "Work Range Exit Log",
    exitTime: "Exit Time",
    returnTime: "Return Time",
    duration: "Duration",
    distance: "Distance",
    statusOutside: "Outside",
    statusReturned: "Returned",
    noExitLogs: "No exit records today",
    ongoing: "Ongoing",
    inst1: "System works only from the designated company WiFi",
    inst2: "GPS activates automatically after check-in",
    inst3: "You will be alerted when leaving work area",
    inst4: "All records require manager approval",
    toastOutsideNetwork: "You are outside the company network! Attendance cannot be recorded",
    toastCameraFail: "Failed to open camera - please allow access",
    toastAttendanceFail: "Failed to record attendance",
    toastEnterPhoneOrCode: "Enter phone number or employee code",
    toastWelcome: "Welcome",
    toastEmployeeNotFound: "Employee not found",
    toastMockGPS: "Mock GPS detected!",
    toastGpsAutoOn: "GPS tracking activated automatically",
    toastLocationSendFail: "Failed to send location",
    toastBrowserNoGPS: "Browser does not support GPS",
    toastLocationFail: "Failed to determine location",
    toastExitRange: "Alert! You are outside the work area",
    toastReturnRange: "Welcome back to the work area",
  }
};

const formatTime = (t, lang) => {
  if (!t) return "--:--";
  if (/^\d{1,2}:\d{2}$/.test(t)) return t;
  const locale = lang === "ar" ? "ar-SA" : "en-US";
  try { const d = new Date(t); if (!isNaN(d.getTime())) return d.toLocaleTimeString(locale, {hour:'2-digit',minute:'2-digit'}); } catch {}
  return t;
};

const detectMockGPS = (pos) => {
  const r = { is_mock: false, reasons: [], accuracy: pos.coords.accuracy };
  if (pos.coords.accuracy < 1) { r.reasons.push("suspicious_accuracy"); r.is_mock = true; }
  if (pos.coords.altitude === 0 && pos.coords.accuracy < 10) { r.reasons.push("zero_altitude"); r.is_mock = true; }
  return r;
};

const LanguageToggle = ({ lang, setLang }) => (
  <Button variant="outline" size="sm"
    onClick={() => { const next = lang === "ar" ? "en" : "ar"; setLang(next); localStorage.setItem("gps_attendance_lang", next); }}
    className="gap-2 font-medium" data-testid="lang-toggle-btn">
    <Globe className="w-4 h-4" />
    {lang === "ar" ? "English" : "عربي"}
  </Button>
);

const GPSAttendance = () => {
  const [lang, setLang] = useState(() => localStorage.getItem("gps_attendance_lang") || "ar");
  const t = translations[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phone, setPhone] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [employee, setEmployee] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [networkChecked, setNetworkChecked] = useState(false);
  const [networkChecking, setNetworkChecking] = useState(false);
  const [isCompanyNetwork, setIsCompanyNetwork] = useState(false);
  const [matchedLocation, setMatchedLocation] = useState(null);
  const [clientIP, setClientIP] = useState("");
  
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [locationStatus, setLocationStatus] = useState({ isWithinRange: true, distance: 0 });
  
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  
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
  const gpsAutoStarted = useRef(false);

  // Exit logs
  const [exitLogs, setExitLogs] = useState([]);

  // Network check
  const checkNetwork = useCallback(async () => {
    setNetworkChecking(true);
    try {
      const res = await axios.get(`${API}/tracking/detect-network`);
      setClientIP(res.data.client_ip);
      setIsCompanyNetwork(res.data.is_company_network);
      setMatchedLocation(res.data.matched_location);
      setNetworkChecked(true);
      if (!res.data.is_company_network) toast.error(t.toastOutsideNetwork);
    } catch {
      setNetworkChecked(true);
      setIsCompanyNetwork(false);
    } finally {
      setNetworkChecking(false);
    }
  }, [t.toastOutsideNetwork]);

  useEffect(() => { checkNetwork(); }, [checkNetwork]);

  // Fetch exit logs
  const fetchExitLogs = useCallback(async () => {
    if (!employee) return;
    try {
      const res = await axios.get(`${API}/tracking/range-exit-logs/${employee.id}`);
      setExitLogs(res.data);
    } catch {}
  }, [employee]);

  // Camera
  const startCamera = async (action, method = "wifi") => {
    setPendingAction(action); setPendingMethod(method); setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 480, height: 480 } });
      streamRef.current = stream;
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch {
      toast.error(t.toastCameraFail); setShowCamera(false);
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
    const locale = lang === "ar" ? "ar-SA" : "en-US";
    ctx.fillText(`${new Date().toLocaleDateString(locale)} - ${new Date().toLocaleTimeString(locale)}`, canvas.width/2, canvas.height-15);
    setSelfiePhoto(canvas.toDataURL("image/jpeg", 0.7));
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(tr => tr.stop()); streamRef.current = null; }
  };

  // GPS tracking
  const sendLocation = useCallback(async (pos) => {
    if (!employee) return;
    const mock = detectMockGPS(pos);
    if (mock.is_mock) { setMockGpsDetected(true); toast.error(t.toastMockGPS); return; }
    try {
      const res = await axios.post(`${API}/tracking/location`, {
        employee_id: employee.id, latitude: pos.coords.latitude,
        longitude: pos.coords.longitude, accuracy: pos.coords.accuracy
      });
      setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setLastUpdate(new Date());
      const wasInside = locationStatus.isWithinRange;
      setLocationStatus({ isWithinRange: res.data.is_within_range, distance: res.data.distance_from_work });
      setError(null);

      // Handle range events with toasts
      if (res.data.range_event === "exit") {
        toast.error(t.toastExitRange, { duration: 10000 });
        fetchExitLogs();
      } else if (res.data.range_event === "return") {
        toast.success(t.toastReturnRange);
        fetchExitLogs();
      }
    } catch { setError(t.toastLocationSendFail); }
  }, [employee, t.toastMockGPS, t.toastLocationSendFail, t.toastExitRange, t.toastReturnRange, locationStatus.isWithinRange, fetchExitLogs]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) { setError(t.toastBrowserNoGPS); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { sendLocation(p); setIsTracking(true); },
      () => { setError(t.toastLocationFail); },
      { enableHighAccuracy: true, timeout: 30000 }
    );
    const id = navigator.geolocation.watchPosition(sendLocation, () => {}, { enableHighAccuracy: true, maximumAge: 10000 });
    setWatchId(id);
  }, [sendLocation, t.toastBrowserNoGPS, t.toastLocationFail]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    setWatchId(null); setIsTracking(false);
  }, [watchId]);

  // Auto-start GPS after check-in
  const autoStartGPS = useCallback(() => {
    if (gpsAutoStarted.current || !navigator.geolocation) return;
    gpsAutoStarted.current = true;
    toast.success(t.toastGpsAutoOn);
    startTracking();
  }, [startTracking, t.toastGpsAutoOn]);

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
          setTodayAttendance(p => ({ ...p, check_in: res.data.check_in_time, check_in_method: pendingMethod, gps_approval_status: "pending" }));
          // Auto-start GPS after check-in
          setTimeout(() => autoStartGPS(), 500);
        } else {
          hasAutoCheckedOut.current = true;
          setTodayAttendance(p => ({ ...p, check_out: res.data.check_out_time, check_out_method: pendingMethod, gps_checkout_approval_status: "pending" }));
        }
        toast.success(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || t.toastAttendanceFail);
    } finally {
      setAttendanceLoading(false);
      setSelfiePhoto(null); setShowCamera(false); setPendingAction(null);
    }
  };

  const cancelSelfie = () => { stopCamera(); setSelfiePhoto(null); setShowCamera(false); setPendingAction(null); };

  // Login
  const handleLogin = async () => {
    if (!phone && !employeeCode) { toast.error(t.toastEnterPhoneOrCode); return; }
    setLoginLoading(true);
    try {
      const res = await axios.post(`${API}/tracking/employee-login`, { phone: phone || undefined, employee_code: employeeCode || undefined });
      if (res.data.employee) {
        setEmployee(res.data.employee); setIsLoggedIn(true);
        setTodayAttendance(res.data.today_attendance);
        toast.success(`${t.toastWelcome} ${res.data.employee.name}`);
        const att = res.data.today_attendance;
        const wasCheckedIn = !!(att?.check_in_method === "gps" || att?.check_in_method === "wifi" || att?.gps_check_in);
        hasAutoCheckedIn.current = wasCheckedIn;
        hasAutoCheckedOut.current = !!(att?.check_out_method === "gps" || att?.check_out_method === "wifi" || att?.gps_check_out);
        // If already checked in, auto-start GPS
        if (wasCheckedIn && !hasAutoCheckedOut.current) {
          setTimeout(() => autoStartGPS(), 800);
        }
      }
    } catch (err) { toast.error(err.response?.data?.detail || t.toastEmployeeNotFound); }
    finally { setLoginLoading(false); }
  };

  // Fetch exit logs when employee is set
  useEffect(() => { if (employee) fetchExitLogs(); }, [employee, fetchExitLogs]);

  // Cleanup
  useEffect(() => () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); stopCamera(); }, [watchId]);

  const checkInDone = hasAutoCheckedIn.current;
  const checkOutDone = hasAutoCheckedOut.current;
  const dateLocale = lang === "ar" ? "ar-SA" : "en-US";

  // ===== BLOCKED =====
  if (networkChecked && !isCompanyNetwork) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4" dir={dir}>
        <Card className="w-full max-w-md shadow-xl border-2 border-red-300">
          <CardHeader className="text-center space-y-3">
            <div className="flex justify-end"><LanguageToggle lang={lang} setLang={setLang} /></div>
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <ShieldAlert className="w-10 h-10 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-700">{t.blockedTitle}</CardTitle>
            <CardDescription className="text-red-600 text-base">{t.blockedDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-bold">{t.mustConnectWifi}</span>
              </div>
              <p className="text-sm text-red-600">{t.blockedExplain}</p>
              <div className="text-xs text-muted-foreground mt-2 p-2 bg-white rounded border">
                <p>{t.currentIP} <span className="font-mono">{clientIP}</span></p>
              </div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 font-medium flex items-center gap-2"><Wifi className="w-4 h-4" />{t.requiredSteps}</p>
              <ol className="list-decimal list-inside text-sm text-blue-600 mt-2 space-y-1">
                <li>{t.step1}</li><li>{t.step2}</li><li>{t.step3}</li>
              </ol>
            </div>
            <Button onClick={checkNetwork} className="w-full h-12 text-lg" disabled={networkChecking} data-testid="retry-network-btn">
              {networkChecking ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><RefreshCw className="w-5 h-5 me-2" />{t.retryNetwork}</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== LOADING =====
  if (!networkChecked || networkChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir={dir}>
        <Card className="w-full max-w-md shadow-xl text-center p-8">
          <RefreshCw className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-bold">{t.checkingNetwork}</p>
          <p className="text-sm text-muted-foreground mt-2">{t.checkingNetworkDesc}</p>
        </Card>
      </div>
    );
  }

  // ===== CAMERA =====
  if (showCamera) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4" dir={dir}>
        <div className="max-w-md w-full space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="text-center">
              <CardTitle className="text-white flex items-center justify-center gap-2">
                <Camera className="w-6 h-6" />
                {pendingAction === "check_in" ? t.selfieCheckIn : t.selfieCheckOut}
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
                      <Badge className="bg-black/50">{new Date().toLocaleTimeString(dateLocale)}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={capturePhoto} className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-lg" data-testid="capture-selfie-btn">
                      <Camera className="w-6 h-6 me-2" />{t.capture}
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
                      {attendanceLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <><CheckCircle className="w-6 h-6 me-2" />{t.confirm}</>}
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

  // ===== LOGIN =====
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir={dir}>
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-end"><LanguageToggle lang={lang} setLang={setLang} /></div>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">{t.attendanceTitle}</CardTitle>
            <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 flex items-center justify-center gap-2">
                <Wifi className="w-4 h-4" />
                {t.connectedTo} <strong>{matchedLocation?.wifi_ssid}</strong> - {matchedLocation?.name}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Phone className="w-4 h-4" />{t.phoneLabel}</label>
              <Input type="tel" placeholder={t.phonePlaceholder} value={phone} onChange={(e) => setPhone(e.target.value)} className="text-lg text-center" dir="ltr" data-testid="phone-input" />
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">{t.or}</span></div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><User className="w-4 h-4" />{t.employeeCodeLabel}</label>
              <Input type="text" placeholder={t.employeeCodePlaceholder} value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} className="text-lg text-center" dir="ltr" data-testid="employee-code-input" />
            </div>
            <Button onClick={handleLogin} className="w-full h-12 text-lg" disabled={loginLoading} data-testid="login-btn">
              {loginLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><LogIn className="w-5 h-5 me-2" />{t.login}</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===== MAIN =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4" dir={dir}>
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
              <LanguageToggle lang={lang} setLang={setLang} />
              <Button variant="ghost" size="sm" onClick={() => { setIsLoggedIn(false); setEmployee(null); stopTracking(); gpsAutoStarted.current = false; }}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-700">
                {t.verifiedNetwork} <strong>{matchedLocation?.wifi_ssid}</strong> ({matchedLocation?.name})
              </span>
              <Badge className="bg-green-600 text-xs ms-auto">{t.secure}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Exit Alert - Prominent warning when outside range */}
        {isTracking && !locationStatus.isWithinRange && (
          <Card className="border-2 border-red-400 bg-red-50 animate-pulse" data-testid="exit-alert-card">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-200 flex items-center justify-center shrink-0">
                  <Bell className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-red-700 text-base">{t.exitAlertTitle}</h3>
                  <p className="text-sm text-red-600">{t.exitAlertDesc}</p>
                  <p className="text-xs text-red-500 mt-1">
                    {t.distanceLabel} <strong>{Math.round(locationStatus.distance)} {t.meters}</strong>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attendance Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5" />{t.todayStatus}</CardTitle>
            <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString(dateLocale, {weekday:'long', year:'numeric', month:'long', day:'numeric'})}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg border-2 text-center ${todayAttendance?.check_in || todayAttendance?.gps_check_in ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-xs font-medium mb-1">{t.checkIn}</p>
                <p className="text-lg font-bold" data-testid="check-in-time">
                  {(todayAttendance?.check_in || todayAttendance?.gps_check_in) ? formatTime(todayAttendance?.gps_check_in || todayAttendance?.check_in, lang) : "--:--"}
                </p>
                {todayAttendance?.gps_approval_status === "pending" && <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 mt-1">{t.pendingApproval}</Badge>}
                {todayAttendance?.gps_approval_status === "approved" && <Badge variant="outline" className="text-xs text-green-600 border-green-300 mt-1">{t.approved}</Badge>}
              </div>
              <div className={`p-3 rounded-lg border-2 text-center ${todayAttendance?.check_out || todayAttendance?.gps_check_out ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-xs font-medium mb-1">{t.checkOut}</p>
                <p className="text-lg font-bold" data-testid="check-out-time">
                  {(todayAttendance?.check_out || todayAttendance?.gps_check_out) ? formatTime(todayAttendance?.gps_check_out || todayAttendance?.check_out, lang) : "--:--"}
                </p>
                {todayAttendance?.gps_checkout_approval_status === "pending" && <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 mt-1">{t.pendingApproval}</Badge>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Actions */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />{t.attendanceActions}
            </CardTitle>
            <CardDescription className="text-xs">{t.attendanceActionsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={() => startCamera("check_in", "wifi")}
                disabled={attendanceLoading || checkInDone}
                className="h-14 bg-green-600 hover:bg-green-700 text-base" data-testid="wifi-checkin-btn">
                {checkInDone ? <><CheckCircle className="w-5 h-5 me-2" />{t.checkInDone}</> : <><Camera className="w-5 h-5 me-2" />{t.checkInSelfie}</>}
              </Button>
              <Button onClick={() => startCamera("check_out", "wifi")}
                disabled={attendanceLoading || !checkInDone || checkOutDone}
                className="h-14 bg-orange-600 hover:bg-orange-700 text-base" data-testid="wifi-checkout-btn">
                {checkOutDone ? <><CheckCircle className="w-5 h-5 me-2" />{t.checkOutDone}</> : <><Camera className="w-5 h-5 me-2" />{t.checkOutSelfie}</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* GPS Auto Tracking Status */}
        {checkInDone && (
          <Card className={`border-2 ${isTracking ? (locationStatus.isWithinRange ? 'border-green-300' : 'border-red-300') : 'border-gray-200'}`}
            data-testid="gps-tracking-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Navigation className={`w-5 h-5 ${isTracking ? 'text-green-600 animate-pulse' : 'text-gray-400'}`} />
                {t.gpsAutoTitle}
              </CardTitle>
              <CardDescription className="text-xs">{t.gpsAutoDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {isTracking ? (
                <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${locationStatus.isWithinRange ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  <MapPin className="w-4 h-4" />
                  <span>{locationStatus.isWithinRange ? t.insideRange : t.outsideRange}</span>
                  {locationStatus.distance > 0 && (
                    <span className="text-xs ms-auto">({Math.round(locationStatus.distance)} {t.meters})</span>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg text-sm bg-blue-50 border border-blue-200 text-blue-700 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t.gpsActivating}</span>
                </div>
              )}
              {lastUpdate && (
                <p className="text-xs text-center text-muted-foreground">
                  {t.lastUpdate} {lastUpdate.toLocaleTimeString(dateLocale)}
                </p>
              )}
              {error && <p className="text-xs text-center text-red-500">{error}</p>}
            </CardContent>
          </Card>
        )}

        {/* Exit Logs */}
        {checkInDone && (
          <Card data-testid="exit-logs-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-orange-500" />
                {t.exitLogTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {exitLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3" data-testid="no-exit-logs">
                  {t.noExitLogs}
                </p>
              ) : (
                <div className="space-y-2" data-testid="exit-logs-list">
                  {exitLogs.map((log, i) => (
                    <div key={log.id || i} className={`p-3 rounded-lg border text-sm ${log.status === 'outside' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}
                      data-testid={`exit-log-${i}`}>
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className={`text-xs ${log.status === 'outside' ? 'text-red-600 border-red-300' : 'text-orange-600 border-orange-300'}`}>
                          {log.status === "outside" ? t.statusOutside : t.statusReturned}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {log.exit_distance} {t.meters}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                        <div>
                          <p className="text-muted-foreground">{t.exitTime}</p>
                          <p className="font-medium">{formatTime(log.exit_time, lang)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t.returnTime}</p>
                          <p className="font-medium">{log.return_time ? formatTime(log.return_time, lang) : t.ongoing}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t.duration}</p>
                          <p className="font-medium">{log.duration_formatted || "--"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardContent className="pt-4">
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>{lang === "ar" ? "فقط" : "Only"}</strong> {t.inst1}</li>
              <li>{t.inst2}</li>
              <li>{t.inst3}</li>
              <li>{t.inst4}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GPSAttendance;
