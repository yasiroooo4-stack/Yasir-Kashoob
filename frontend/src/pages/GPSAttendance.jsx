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
  Fingerprint, Locate, Camera, Shield, ShieldAlert, ShieldCheck, Lock, Eye, EyeOff
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const formatTime = (timeString) => {
  if (!timeString) return "--:--";
  if (/^\d{1,2}:\d{2}$/.test(timeString)) return timeString;
  try {
    const date = new Date(timeString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('ar-SA', {hour: '2-digit', minute: '2-digit'});
    }
  } catch (e) {}
  return timeString;
};

// ==================== MOCK GPS DETECTION ====================
const detectMockGPS = (position) => {
  const result = {
    is_mock: false,
    reasons: [],
    accuracy: position.coords.accuracy,
    altitude: position.coords.altitude,
    speed: position.coords.speed,
    timestamp: position.timestamp
  };

  if (position.coords.accuracy < 1) {
    result.reasons.push("دقة مشبوهة جداً");
    result.is_mock = true;
  }

  if (position.coords.altitude === 0 && position.coords.accuracy < 10) {
    result.reasons.push("ارتفاع صفر مع دقة عالية");
    result.is_mock = true;
  }

  if (position.coords.altitudeAccuracy === null && position.coords.accuracy < 5) {
    result.reasons.push("عدم وجود دقة ارتفاع مع GPS مثالي");
  }

  return result;
};

const checkLocationJump = (prevLocation, newLocation) => {
  if (!prevLocation) return { is_jump: false };
  const timeDiff = (Date.now() - prevLocation.timestamp) / 1000;
  const R = 6371000;
  const dLat = (newLocation.lat - prevLocation.lat) * Math.PI / 180;
  const dLon = (newLocation.lng - prevLocation.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(prevLocation.lat * Math.PI / 180) * Math.cos(newLocation.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const speed = timeDiff > 0 ? (distance / timeDiff) * 3.6 : 0;
  
  if (speed > 200 && timeDiff < 60) {
    return { is_jump: true, distance: Math.round(distance), speed: Math.round(speed),
      reason: `قفزة مفاجئة ${Math.round(distance)}م في ${Math.round(timeDiff)}ث` };
  }
  return { is_jump: false, distance: Math.round(distance), speed: Math.round(speed) };
};

const GPSAttendance = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phone, setPhone] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [employee, setEmployee] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [locationStatus, setLocationStatus] = useState({
    isWithinRange: false, distance: 0, workLocation: null
  });
  
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  
  // Selfie state
  const [showCamera, setShowCamera] = useState(false);
  const [selfiePhoto, setSelfiePhoto] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingMethod, setPendingMethod] = useState("gps"); // "gps" or "wifi"
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  // Security state
  const [mockGpsDetected, setMockGpsDetected] = useState(false);
  const [securityStatus, setSecurityStatus] = useState("safe");
  const prevLocationRef = useRef(null);
  
  // WiFi state
  const [wifiLocations, setWifiLocations] = useState([]);
  const [selectedWifiLocation, setSelectedWifiLocation] = useState(null);
  const [wifiPassword, setWifiPassword] = useState("");
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [wifiVerifying, setWifiVerifying] = useState(false);
  const [wifiVerified, setWifiVerified] = useState(false);
  
  const hasAutoCheckedIn = useRef(false);
  const hasAutoCheckedOut = useRef(false);

  // Fetch settings & WiFi locations
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API}/tracking/settings`);
        setSettings(res.data);
        // Extract locations with WiFi configured
        const locsWithWifi = (res.data.work_locations || []).filter(loc => loc.wifi_ssid);
        setWifiLocations(locsWithWifi);
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  // Camera functions
  const startCamera = async (action, method = "gps") => {
    setPendingAction(action);
    setPendingMethod(method);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 480, height: 480 }
      });
      streamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch (err) {
      toast.error("فشل في فتح الكاميرا - تأكد من السماح بالوصول للكاميرا");
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, 480, 480);
    
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    ctx.fillStyle = "#fff";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    const now = new Date();
    ctx.fillText(
      `${now.toLocaleDateString('ar-SA')} - ${now.toLocaleTimeString('ar-SA')}`,
      canvas.width / 2, canvas.height - 15
    );
    
    const photoData = canvas.toDataURL("image/jpeg", 0.7);
    setSelfiePhoto(photoData);
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const confirmSelfieAndSubmit = async () => {
    if (!selfiePhoto || !pendingAction) return;
    const today = new Date().toISOString().split('T')[0];
    const lat = currentLocation?.lat || 0;
    const lng = currentLocation?.lng || 0;
    
    setAttendanceLoading(true);
    try {
      const payload = {
        employee_id: employee.id,
        action: pendingAction,
        latitude: lat,
        longitude: lng,
        date: today,
        selfie_photo: selfiePhoto,
        mock_gps_info: { is_mock: false, check_passed: true, checked_at: new Date().toISOString() },
        attendance_method: pendingMethod,
        wifi_ssid: pendingMethod === "wifi" ? selectedWifiLocation?.wifi_ssid : undefined
      };
      
      const res = await axios.post(`${API}/tracking/gps-attendance`, payload);
      
      if (res.data.success) {
        if (pendingAction === "check_in") {
          hasAutoCheckedIn.current = true;
          setTodayAttendance(prev => ({
            ...prev,
            check_in: res.data.check_in_time,
            check_in_method: pendingMethod,
            gps_approval_status: "pending",
            check_in_selfie: true
          }));
        } else {
          hasAutoCheckedOut.current = true;
          setTodayAttendance(prev => ({
            ...prev,
            check_out: res.data.check_out_time,
            check_out_method: pendingMethod,
            gps_checkout_approval_status: "pending",
            check_out_selfie: true
          }));
        }
        toast.success(res.data.message);
      }
    } catch (error) {
      if (error.response?.status === 403) {
        setMockGpsDetected(true);
        setSecurityStatus("blocked");
        toast.error(error.response.data.detail);
      } else {
        toast.error(error.response?.data?.detail || "فشل في تسجيل الحضور");
      }
    } finally {
      setAttendanceLoading(false);
      setSelfiePhoto(null);
      setShowCamera(false);
      setPendingAction(null);
    }
  };

  const cancelSelfie = () => {
    stopCamera();
    setSelfiePhoto(null);
    setShowCamera(false);
    setPendingAction(null);
  };

  // WiFi verification
  const verifyWifiPassword = async () => {
    if (!selectedWifiLocation || !wifiPassword) {
      toast.error("اختر الموقع وأدخل الرقم السري");
      return;
    }
    setWifiVerifying(true);
    try {
      // Verify password matches server-stored password
      const res = await axios.post(`${API}/tracking/wifi-verify`, {
        location_id: selectedWifiLocation.id,
        wifi_password: wifiPassword
      });
      if (res.data.verified) {
        setWifiVerified(true);
        toast.success("تم التحقق من شبكة WiFi بنجاح");
      } else {
        toast.error("الرقم السري غير صحيح");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل في التحقق");
    } finally {
      setWifiVerifying(false);
    }
  };

  const handleWifiCheckIn = () => {
    if (!wifiVerified) {
      toast.error("تحقق من شبكة WiFi أولاً");
      return;
    }
    startCamera("check_in", "wifi");
  };

  const handleWifiCheckOut = () => {
    if (!wifiVerified) {
      toast.error("تحقق من شبكة WiFi أولاً");
      return;
    }
    startCamera("check_out", "wifi");
  };

  const handleLogin = async () => {
    if (!phone && !employeeCode) {
      toast.error("أدخل رقم الهاتف أو الرقم الوظيفي");
      return;
    }
    setLoginLoading(true);
    try {
      const res = await axios.post(`${API}/tracking/employee-login`, {
        phone: phone || undefined,
        employee_code: employeeCode || undefined
      });
      if (res.data.employee) {
        setEmployee(res.data.employee);
        setIsLoggedIn(true);
        setTodayAttendance(res.data.today_attendance);
        toast.success(`مرحباً ${res.data.employee.name}`);
        const att = res.data.today_attendance;
        hasAutoCheckedIn.current = !!(att?.check_in_method === "gps" || att?.check_in_method === "wifi" || att?.gps_check_in);
        hasAutoCheckedOut.current = !!(att?.check_out_method === "gps" || att?.check_out_method === "wifi" || att?.gps_check_out);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "لم يتم العثور على الموظف");
    } finally {
      setLoginLoading(false);
    }
  };

  const sendLocation = useCallback(async (position) => {
    if (!employee) return;

    const mockCheck = detectMockGPS(position);
    if (mockCheck.is_mock) {
      setMockGpsDetected(true);
      setSecurityStatus("blocked");
      toast.error("تم رصد موقع وهمي!");
      return;
    }

    const newLoc = { lat: position.coords.latitude, lng: position.coords.longitude, timestamp: Date.now() };
    const jumpCheck = checkLocationJump(prevLocationRef.current, newLoc);
    if (jumpCheck.is_jump) {
      setSecurityStatus("warning");
      toast.warning(`تحذير: ${jumpCheck.reason}`);
    } else {
      if (securityStatus !== "blocked") setSecurityStatus("safe");
    }
    prevLocationRef.current = newLoc;

    try {
      const res = await axios.post(`${API}/tracking/location`, {
        employee_id: employee.id,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
      setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy });
      setLastUpdate(new Date());
      
      const wasWithinRange = locationStatus.isWithinRange;
      const isNowWithinRange = res.data.is_within_range;
      
      setLocationStatus({
        isWithinRange: isNowWithinRange,
        distance: res.data.distance_from_work,
        workLocation: res.data.work_location
      });
      setError(null);
      
      const today = new Date().toISOString().split('T')[0];
      
      if (isNowWithinRange && !hasAutoCheckedIn.current) {
        handleAutoGPS(today, position.coords.latitude, position.coords.longitude, "check_in");
      }
      if (!isNowWithinRange && wasWithinRange && hasAutoCheckedIn.current && !hasAutoCheckedOut.current) {
        handleAutoGPS(today, position.coords.latitude, position.coords.longitude, "check_out");
      }
    } catch (error) {
      setError("فشل في إرسال الموقع");
    }
  }, [employee, locationStatus.isWithinRange, securityStatus]);

  const handleAutoGPS = async (date, lat, lng, action) => {
    setAttendanceLoading(true);
    try {
      const res = await axios.post(`${API}/tracking/gps-attendance`, {
        employee_id: employee.id, action, latitude: lat, longitude: lng, date,
        mock_gps_info: { is_mock: false, check_passed: true, checked_at: new Date().toISOString() },
        attendance_method: "gps"
      });
      if (res.data.success) {
        if (action === "check_in") {
          hasAutoCheckedIn.current = true;
          setTodayAttendance(prev => ({ ...prev, check_in: res.data.check_in_time, check_in_method: "gps", gps_approval_status: "pending" }));
          toast.success("تم تسجيل الحضور تلقائياً - بانتظار الموافقة");
        } else {
          hasAutoCheckedOut.current = true;
          setTodayAttendance(prev => ({ ...prev, check_out: res.data.check_out_time, check_out_method: "gps", gps_checkout_approval_status: "pending" }));
          toast.warning("تم تسجيل الانصراف تلقائياً - بانتظار الموافقة");
        }
      }
    } catch (error) {
      if (error.response?.status === 403) { setMockGpsDetected(true); setSecurityStatus("blocked"); }
    } finally {
      setAttendanceLoading(false);
    }
  };

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) { setError("المتصفح لا يدعم تحديد الموقع"); return; }
    const options = { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 };
    navigator.geolocation.getCurrentPosition(
      (pos) => { sendLocation(pos); setIsTracking(true); toast.success("تم تفعيل تتبع الموقع"); },
      () => { setError("فشل في الحصول على الموقع - تأكد من تفعيل GPS"); toast.error("فشل في الحصول على الموقع"); },
      options
    );
    const id = navigator.geolocation.watchPosition(sendLocation, () => setError("فشل في متابعة الموقع"), options);
    setWatchId(id);
  }, [sendLocation]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) { navigator.geolocation.clearWatch(watchId); setWatchId(null); }
    setIsTracking(false);
    toast.info("تم إيقاف تتبع الموقع");
  }, [watchId]);

  useEffect(() => {
    return () => { if (watchId !== null) navigator.geolocation.clearWatch(watchId); stopCamera(); };
  }, [watchId]);

  // Check if check-in/out done
  const checkInDone = !!(todayAttendance?.check_in || todayAttendance?.gps_check_in);
  const checkOutDone = !!(todayAttendance?.check_out || todayAttendance?.gps_check_out);
  const gpsCheckInDone = hasAutoCheckedIn.current;
  const gpsCheckOutDone = hasAutoCheckedOut.current;

  // ==================== CAMERA MODAL ====================
  if (showCamera) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full space-y-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="text-center">
              <CardTitle className="text-white flex items-center justify-center gap-2">
                <Camera className="w-6 h-6" />
                التقاط صورة سيلفي
              </CardTitle>
              <CardDescription className="text-gray-400">
                {pendingAction === "check_in" ? "التقط صورتك لتسجيل الحضور" : "التقط صورتك لتسجيل الانصراف"}
                {pendingMethod === "wifi" && " (عبر WiFi)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selfiePhoto ? (
                <>
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
                    <video ref={videoRef} autoPlay playsInline muted
                      className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
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
                    <Button onClick={cancelSelfie} variant="destructive" className="h-14 px-6" data-testid="cancel-selfie-btn">
                      <XCircle className="w-6 h-6" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative rounded-xl overflow-hidden aspect-square">
                    <img src={selfiePhoto} alt="selfie" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <p className="text-white text-center text-sm">
                        {pendingAction === "check_in" ? "تأكيد تسجيل الحضور" : "تأكيد تسجيل الانصراف"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={confirmSelfieAndSubmit} className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-lg" disabled={attendanceLoading} data-testid="confirm-selfie-btn">
                      {attendanceLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <><CheckCircle className="w-6 h-6 me-2" />تأكيد</>}
                    </Button>
                    <Button onClick={() => { setSelfiePhoto(null); startCamera(pendingAction, pendingMethod); }} variant="outline" className="h-14 px-6 text-white border-white">
                      <RefreshCw className="w-6 h-6" />
                    </Button>
                    <Button onClick={cancelSelfie} variant="destructive" className="h-14 px-6">
                      <XCircle className="w-6 h-6" />
                    </Button>
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

  // ==================== LOGIN SCREEN ====================
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Fingerprint className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">تسجيل الحضور GPS</CardTitle>
            <CardDescription>سجل دخولك لتفعيل تتبع الموقع والحضور التلقائي</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Phone className="w-4 h-4" />رقم الهاتف
              </label>
              <Input type="tel" placeholder="مثال: 91234567" value={phone}
                onChange={(e) => setPhone(e.target.value)} className="text-lg text-center" dir="ltr" data-testid="phone-input" />
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">أو</span></div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" />الرقم الوظيفي
              </label>
              <Input type="text" placeholder="مثال: EMP001" value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)} className="text-lg text-center" dir="ltr" data-testid="employee-code-input" />
            </div>
            <Button onClick={handleLogin} className="w-full h-12 text-lg" disabled={loginLoading} data-testid="login-btn">
              {loginLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <><LogIn className="w-5 h-5 me-2" />تسجيل الدخول</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==================== MAIN TRACKING SCREEN ====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4" dir="rtl">
      <div className="max-w-md mx-auto space-y-4">
        {/* Employee Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                {employee?.name?.charAt(0)}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">{employee?.name}</h2>
                <p className="text-sm text-muted-foreground">{employee?.employee_code} - {employee?.department}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setIsLoggedIn(false); setEmployee(null); stopTracking(); }}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Status */}
        <Card className={`border-2 ${
          securityStatus === "blocked" ? "border-red-500 bg-red-50" :
          securityStatus === "warning" ? "border-yellow-500 bg-yellow-50" : "border-green-300 bg-green-50"
        }`}>
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              {securityStatus === "blocked" ? <ShieldAlert className="w-5 h-5 text-red-600" /> :
               securityStatus === "warning" ? <Shield className="w-5 h-5 text-yellow-600" /> :
               <ShieldCheck className="w-5 h-5 text-green-600" />}
              <div className="flex-1">
                <p className="font-bold text-sm">
                  {securityStatus === "blocked" ? "تم رصد موقع وهمي!" :
                   securityStatus === "warning" ? "تحذير أمني" : "الحماية مفعّلة"}
                </p>
                <p className="text-xs text-muted-foreground">كشف Mock GPS + سيلفي + تحقق WiFi</p>
              </div>
              <Badge variant={securityStatus === "blocked" ? "destructive" : "default"}
                className={securityStatus === "safe" ? "bg-green-600" : ""} data-testid="security-badge">
                {securityStatus === "blocked" ? "محظور" : securityStatus === "warning" ? "تنبيه" : "آمن"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />حالة الحضور اليوم
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('ar-SA', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg border-2 ${checkInDone ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {checkInDone ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-gray-400" />}
                  <span className="font-medium text-sm">الحضور</span>
                </div>
                <p className="text-lg font-bold text-center" data-testid="check-in-time">
                  {checkInDone ? formatTime(todayAttendance?.gps_check_in || todayAttendance?.check_in) : "--:--"}
                </p>
                {todayAttendance?.check_in_method && (
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {todayAttendance.check_in_method === "wifi" ? "WiFi" : todayAttendance.check_in_method === "gps" ? "GPS" : "بصمة"}
                    </Badge>
                    {todayAttendance?.gps_approval_status === "pending" && <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">بانتظار الموافقة</Badge>}
                    {todayAttendance?.gps_approval_status === "approved" && <Badge variant="outline" className="text-xs text-green-600 border-green-300">تمت الموافقة</Badge>}
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-lg border-2 ${checkOutDone ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {checkOutDone ? <XCircle className="w-4 h-4 text-red-600" /> : <AlertCircle className="w-4 h-4 text-gray-400" />}
                  <span className="font-medium text-sm">الانصراف</span>
                </div>
                <p className="text-lg font-bold text-center" data-testid="check-out-time">
                  {checkOutDone ? formatTime(todayAttendance?.gps_check_out || todayAttendance?.check_out) : "--:--"}
                </p>
                {todayAttendance?.check_out_method && (
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {todayAttendance.check_out_method === "wifi" ? "WiFi" : "GPS"}
                    </Badge>
                    {todayAttendance?.gps_checkout_approval_status === "pending" && <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">بانتظار الموافقة</Badge>}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WiFi Attendance - Always visible */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wifi className="w-5 h-5 text-blue-600" />
              حضور عبر WiFi + سيلفي
            </CardTitle>
            <CardDescription>اختر شبكة WiFi الخاصة بموقع عملك وأدخل الرقم السري للتحقق</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {wifiLocations.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                <WifiOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>لم يتم إعداد شبكات WiFi بعد</p>
                <p className="text-xs">اطلب من المسؤول إضافة شبكات WiFi في الإعدادات</p>
              </div>
            ) : (
              <>
                {/* Location WiFi selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">اختر موقع العمل</label>
                  <div className="grid grid-cols-2 gap-2">
                    {wifiLocations.map(loc => (
                      <Button
                        key={loc.id}
                        variant={selectedWifiLocation?.id === loc.id ? "default" : "outline"}
                        size="sm"
                        className={`h-auto py-2 px-3 ${selectedWifiLocation?.id === loc.id ? 'bg-blue-600' : ''}`}
                        onClick={() => { setSelectedWifiLocation(loc); setWifiVerified(false); setWifiPassword(""); }}
                        data-testid={`wifi-location-${loc.id}`}
                      >
                        <div className="text-center">
                          <p className="font-medium text-xs">{loc.name}</p>
                          <p className="text-xs opacity-75">{loc.wifi_ssid}</p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Password verification */}
                {selectedWifiLocation && !wifiVerified && (
                  <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      أدخل الرقم السري لشبكة: <strong>{selectedWifiLocation.wifi_ssid}</strong>
                    </p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showWifiPassword ? "text" : "password"}
                          placeholder="الرقم السري"
                          value={wifiPassword}
                          onChange={(e) => setWifiPassword(e.target.value)}
                          className="h-10 pe-10"
                          dir="ltr"
                          data-testid="wifi-password-verify"
                          onKeyDown={(e) => { if (e.key === "Enter") verifyWifiPassword(); }}
                        />
                        <Button variant="ghost" size="sm" className="absolute left-1 top-1 h-8 w-8 p-0"
                          onClick={() => setShowWifiPassword(!showWifiPassword)}>
                          {showWifiPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      <Button onClick={verifyWifiPassword} disabled={wifiVerifying || !wifiPassword}
                        className="bg-blue-600 hover:bg-blue-700" data-testid="wifi-verify-btn">
                        {wifiVerifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : "تحقق"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Verified - Show check-in/out buttons */}
                {wifiVerified && (
                  <div className="space-y-2">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-300 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        تم التحقق - {selectedWifiLocation.name} ({selectedWifiLocation.wifi_ssid})
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={handleWifiCheckIn}
                        disabled={attendanceLoading || gpsCheckInDone}
                        className="h-12 bg-green-600 hover:bg-green-700"
                        data-testid="wifi-checkin-btn">
                        {gpsCheckInDone ? <><CheckCircle className="w-4 h-4 me-1" />تم الحضور</> :
                          <><Camera className="w-4 h-4 me-1" /><LogIn className="w-4 h-4 me-1" />حضور + سيلفي</>}
                      </Button>
                      <Button onClick={handleWifiCheckOut}
                        disabled={attendanceLoading || !gpsCheckInDone || gpsCheckOutDone}
                        className="h-12 bg-orange-600 hover:bg-orange-700"
                        data-testid="wifi-checkout-btn">
                        {gpsCheckOutDone ? <><CheckCircle className="w-4 h-4 me-1" />تم الانصراف</> :
                          <><Camera className="w-4 h-4 me-1" /><LogOut className="w-4 h-4 me-1" />انصراف + سيلفي</>}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* GPS Tracking + Selfie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Navigation className="w-5 h-5" />تتبع GPS + سيلفي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`p-3 rounded-lg ${
              isTracking 
                ? (locationStatus.isWithinRange ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300')
                : 'bg-gray-100 border border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isTracking ? (
                    locationStatus.isWithinRange ? <MapPin className="w-5 h-5 text-green-600" /> : <MapPin className="w-5 h-5 text-red-600" />
                  ) : <MapPin className="w-5 h-5 text-gray-400" />}
                  <div>
                    <p className="font-bold text-sm">
                      {isTracking 
                        ? (locationStatus.isWithinRange ? "داخل نطاق العمل" : "خارج نطاق العمل")
                        : "التتبع غير مفعّل"}
                    </p>
                    {isTracking && locationStatus.distance > 0 && (
                      <p className="text-xs text-muted-foreground">
                        المسافة: {locationStatus.distance < 1000 ? `${Math.round(locationStatus.distance)}م` : `${(locationStatus.distance / 1000).toFixed(1)}كم`}
                      </p>
                    )}
                  </div>
                </div>
                {isTracking && <Badge variant={locationStatus.isWithinRange ? "default" : "destructive"}>
                  {locationStatus.isWithinRange ? "داخل" : "خارج"}
                </Badge>}
              </div>
            </div>

            {lastUpdate && <p className="text-center text-xs text-muted-foreground">آخر تحديث: {lastUpdate.toLocaleTimeString('ar-SA')}</p>}
            {error && <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center text-sm">{error}</div>}

            <Button onClick={isTracking ? stopTracking : startTracking}
              className={`w-full h-12 ${isTracking ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              disabled={attendanceLoading || mockGpsDetected} data-testid="tracking-toggle-btn">
              {attendanceLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> :
                isTracking ? <><WifiOff className="w-5 h-5 me-2" />إيقاف التتبع</> :
                <><Locate className="w-5 h-5 me-2" />تفعيل تتبع الموقع</>}
            </Button>

            {/* Manual GPS + Selfie buttons - Always visible */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => {
                if (!currentLocation && !isTracking) {
                  navigator.geolocation?.getCurrentPosition(
                    (pos) => {
                      setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                      startCamera("check_in", "gps");
                    },
                    () => toast.error("فشل في تحديد الموقع")
                  );
                } else {
                  startCamera("check_in", "gps");
                }
              }}
                disabled={attendanceLoading || gpsCheckInDone || mockGpsDetected}
                className="h-11" data-testid="manual-checkin-btn">
                <Camera className="w-4 h-4 me-1" />
                {gpsCheckInDone ? "تم" : "حضور + سيلفي"}
              </Button>
              <Button variant="outline" onClick={() => {
                if (!currentLocation && !isTracking) {
                  navigator.geolocation?.getCurrentPosition(
                    (pos) => {
                      setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                      startCamera("check_out", "gps");
                    },
                    () => toast.error("فشل في تحديد الموقع")
                  );
                } else {
                  startCamera("check_out", "gps");
                }
              }}
                disabled={attendanceLoading || !gpsCheckInDone || gpsCheckOutDone}
                className="h-11" data-testid="manual-checkout-btn">
                <Camera className="w-4 h-4 me-1" />
                {gpsCheckOutDone ? "تم" : "انصراف + سيلفي"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">كيف يعمل النظام:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong className="text-blue-600">WiFi + سيلفي:</strong> اختر شبكة WiFi → أدخل الرقم السري → التقط سيلفي</li>
                <li><strong className="text-green-600">GPS تلقائي:</strong> فعّل التتبع → دخول نطاق العمل = تسجيل تلقائي</li>
                <li><strong className="text-orange-600">GPS + سيلفي:</strong> اضغط "حضور + سيلفي" لتسجيل يدوي مع صورة</li>
                <li><strong className="text-red-600">الحماية:</strong> كشف المواقع الوهمية (Mock GPS) + تحقق الشبكة</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GPSAttendance;
