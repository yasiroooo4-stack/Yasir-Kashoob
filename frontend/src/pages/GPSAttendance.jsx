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
  Fingerprint, Locate, Camera, Shield, ShieldAlert, ShieldCheck
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

  // Check 1: Very high accuracy (< 1m) is suspicious
  if (position.coords.accuracy < 1) {
    result.reasons.push("دقة مشبوهة جداً (أقل من 1 متر)");
    result.is_mock = true;
  }

  // Check 2: Altitude exactly 0 with high accuracy
  if (position.coords.altitude === 0 && position.coords.accuracy < 10) {
    result.reasons.push("ارتفاع صفر مع دقة عالية");
    result.is_mock = true;
  }

  // Check 3: Speed is exactly 0 while accuracy is perfect
  if (position.coords.speed === 0 && position.coords.accuracy < 5) {
    result.reasons.push("سرعة صفر مع دقة مثالية");
  }

  // Check 4: Check if mock location is enabled (Android)
  if (position.coords.altitudeAccuracy === null && position.coords.accuracy < 5) {
    result.reasons.push("عدم وجود دقة ارتفاع مع GPS مثالي");
  }

  return result;
};

// Check for location spoofing patterns
const checkLocationJump = (prevLocation, newLocation) => {
  if (!prevLocation) return { is_jump: false };
  
  const timeDiff = (Date.now() - prevLocation.timestamp) / 1000; // seconds
  const R = 6371000;
  const dLat = (newLocation.lat - prevLocation.lat) * Math.PI / 180;
  const dLon = (newLocation.lng - prevLocation.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(prevLocation.lat * Math.PI / 180) * Math.cos(newLocation.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  // Speed check: > 200 km/h is suspicious for employee tracking
  const speed = timeDiff > 0 ? (distance / timeDiff) * 3.6 : 0;
  
  if (speed > 200 && timeDiff < 60) {
    return { 
      is_jump: true, 
      distance: Math.round(distance),
      speed: Math.round(speed),
      reason: `قفزة مفاجئة ${Math.round(distance)}م في ${Math.round(timeDiff)}ث (${Math.round(speed)} كم/س)`
    };
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
  const [pendingAction, setPendingAction] = useState(null); // "check_in" or "check_out"
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  // Security state
  const [mockGpsDetected, setMockGpsDetected] = useState(false);
  const [securityStatus, setSecurityStatus] = useState("safe"); // "safe", "warning", "blocked"
  const prevLocationRef = useRef(null);
  
  // WiFi state
  const [wifiConnected, setWifiConnected] = useState(false);
  const [wifiSSID, setWifiSSID] = useState(null);
  const [wifiSettings, setWifiSettings] = useState(null);
  
  const hasAutoCheckedIn = useRef(false);
  const hasAutoCheckedOut = useRef(false);

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [trackingRes, wifiRes] = await Promise.all([
          axios.get(`${API}/tracking/settings`),
          axios.get(`${API}/tracking/wifi-settings`).catch(() => ({ data: null }))
        ]);
        setSettings(trackingRes.data);
        if (wifiRes.data) setWifiSettings(wifiRes.data);
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  // WiFi detection
  useEffect(() => {
    if (!isLoggedIn || !employee) return;
    
    const checkWifi = async () => {
      try {
        // Use Network Information API if available
        if (navigator.connection) {
          const conn = navigator.connection;
          if (conn.type === "wifi") {
            setWifiConnected(true);
            // Note: browser can't read SSID for security, but we know it's WiFi
            setWifiSSID("WiFi Connected");
          } else {
            setWifiConnected(false);
            setWifiSSID(null);
          }
        }
      } catch (e) {
        console.error("WiFi check error:", e);
      }
    };
    
    checkWifi();
    const interval = setInterval(checkWifi, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn, employee]);

  // Camera functions
  const startCamera = async (action) => {
    setPendingAction(action);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 480, height: 480 }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error("فشل في فتح الكاميرا - تأكد من السماح بالوصول");
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
    
    // Add timestamp overlay
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
    if (pendingAction === "check_in") {
      await handleAutoCheckIn(today, currentLocation?.lat, currentLocation?.lng, selfiePhoto);
    } else {
      await handleAutoCheckOut(today, currentLocation?.lat, currentLocation?.lng, selfiePhoto);
    }
    
    setSelfiePhoto(null);
    setShowCamera(false);
    setPendingAction(null);
  };

  const cancelSelfie = () => {
    stopCamera();
    setSelfiePhoto(null);
    setShowCamera(false);
    setPendingAction(null);
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

    // Mock GPS detection
    const mockCheck = detectMockGPS(position);
    if (mockCheck.is_mock) {
      setMockGpsDetected(true);
      setSecurityStatus("blocked");
      toast.error("تم رصد موقع وهمي! يرجى إيقاف تطبيقات تزوير الموقع.");
      return;
    }

    // Location jump detection
    const newLoc = { lat: position.coords.latitude, lng: position.coords.longitude, timestamp: Date.now() };
    const jumpCheck = checkLocationJump(prevLocationRef.current, newLoc);
    if (jumpCheck.is_jump) {
      setSecurityStatus("warning");
      toast.warning(`تحذير أمني: ${jumpCheck.reason}`);
      // Log but don't block
      await axios.post(`${API}/tracking/gps-attendance`, {
        employee_id: employee.id,
        action: "security_log",
        mock_gps_info: { ...mockCheck, location_jump: jumpCheck }
      }).catch(() => {});
    } else {
      setSecurityStatus("safe");
    }
    prevLocationRef.current = newLoc;

    const locationData = {
      employee_id: employee.id,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy
    };

    try {
      const res = await axios.post(`${API}/tracking/location`, locationData);
      setCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
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
      
      // Auto CHECK-IN: Entered geofence
      if (isNowWithinRange && !hasAutoCheckedIn.current) {
        await handleAutoCheckIn(today, position.coords.latitude, position.coords.longitude, null);
      }
      
      // Auto CHECK-OUT: Exited geofence
      if (!isNowWithinRange && wasWithinRange && hasAutoCheckedIn.current && !hasAutoCheckedOut.current) {
        await handleAutoCheckOut(today, position.coords.latitude, position.coords.longitude, null);
      }
      
    } catch (error) {
      console.error("Error sending location:", error);
      setError("فشل في إرسال الموقع");
    }
  }, [employee, locationStatus.isWithinRange]);

  const handleAutoCheckIn = async (date, lat, lng, selfie) => {
    if (!employee || hasAutoCheckedIn.current) return;
    setAttendanceLoading(true);
    try {
      const mockInfo = { is_mock: false, check_passed: true, checked_at: new Date().toISOString() };
      const res = await axios.post(`${API}/tracking/gps-attendance`, {
        employee_id: employee.id,
        action: "check_in",
        latitude: lat,
        longitude: lng,
        date: date,
        selfie_photo: selfie || undefined,
        mock_gps_info: mockInfo,
        wifi_ssid: wifiConnected ? wifiSSID : undefined,
        attendance_method: wifiConnected ? "wifi" : "gps"
      });
      
      if (res.data.success) {
        hasAutoCheckedIn.current = true;
        setTodayAttendance(prev => ({
          ...prev,
          check_in: res.data.check_in_time,
          check_in_method: wifiConnected ? "wifi" : "gps",
          gps_approval_status: "pending",
          check_in_selfie: !!selfie
        }));
        toast.success(res.data.requires_approval 
          ? "تم تسجيل الحضور - بانتظار موافقة المسؤول"
          : "تم تسجيل الحضور تلقائياً"
        );
      }
    } catch (error) {
      if (error.response?.status === 403) {
        setMockGpsDetected(true);
        setSecurityStatus("blocked");
        toast.error(error.response.data.detail);
      } else if (!error.response?.data?.detail?.includes("مسبقاً")) {
        toast.error("فشل في تسجيل الحضور التلقائي");
      }
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleAutoCheckOut = async (date, lat, lng, selfie) => {
    if (!employee || !hasAutoCheckedIn.current || hasAutoCheckedOut.current) return;
    setAttendanceLoading(true);
    try {
      const res = await axios.post(`${API}/tracking/gps-attendance`, {
        employee_id: employee.id,
        action: "check_out",
        latitude: lat,
        longitude: lng,
        date: date,
        selfie_photo: selfie || undefined,
        attendance_method: wifiConnected ? "wifi" : "gps"
      });
      
      if (res.data.success) {
        hasAutoCheckedOut.current = true;
        setTodayAttendance(prev => ({
          ...prev,
          check_out: res.data.check_out_time,
          check_out_method: wifiConnected ? "wifi" : "gps",
          gps_checkout_approval_status: "pending",
          check_out_selfie: !!selfie
        }));
        toast.warning("تم تسجيل الانصراف - بانتظار موافقة المسؤول");
      }
    } catch (error) {
      console.error("Auto check-out error:", error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleManualCheckIn = async () => {
    if (!employee || !currentLocation) {
      toast.error("يرجى تفعيل الموقع أولاً");
      return;
    }
    if (mockGpsDetected) {
      toast.error("لا يمكن التسجيل - تم رصد موقع وهمي");
      return;
    }
    startCamera("check_in");
  };

  const handleManualCheckOut = async () => {
    if (!employee || !currentLocation) {
      toast.error("يرجى تفعيل الموقع أولاً");
      return;
    }
    startCamera("check_out");
  };

  // WiFi-based attendance
  const handleWifiCheckIn = async () => {
    if (!employee) return;
    if (!wifiConnected) {
      toast.error("يرجى الاتصال بشبكة WiFi الشركة أولاً");
      return;
    }
    startCamera("check_in");
  };

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم تحديد الموقع");
      toast.error("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    const options = { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 };
    navigator.geolocation.getCurrentPosition(
      (position) => {
        sendLocation(position);
        setIsTracking(true);
        toast.success("تم تفعيل تتبع الموقع");
      },
      (err) => {
        setError("فشل في الحصول على الموقع - تأكد من تفعيل GPS");
        toast.error("فشل في الحصول على الموقع");
      },
      options
    );
    const id = navigator.geolocation.watchPosition(sendLocation, () => setError("فشل في متابعة الموقع"), options);
    setWatchId(id);
  }, [sendLocation]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    toast.info("تم إيقاف تتبع الموقع");
  }, [watchId]);

  useEffect(() => {
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      stopCamera();
    };
  }, [watchId]);

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
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selfiePhoto ? (
                <>
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover mirror"
                      style={{ transform: "scaleX(-1)" }}
                    />
                    <div className="absolute inset-0 border-4 border-white/20 rounded-xl" />
                    <div className="absolute top-3 left-3 right-3 flex justify-between">
                      <Badge className="bg-red-500 animate-pulse">REC</Badge>
                      <Badge className="bg-black/50">{new Date().toLocaleTimeString('ar-SA')}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={capturePhoto} className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-lg" data-testid="capture-selfie-btn">
                      <Camera className="w-6 h-6 me-2" />
                      التقاط
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
                      {attendanceLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : (
                        <><CheckCircle className="w-6 h-6 me-2" />تأكيد</>
                      )}
                    </Button>
                    <Button onClick={() => { setSelfiePhoto(null); startCamera(pendingAction); }} variant="outline" className="h-14 px-6 text-white border-white" data-testid="retake-selfie-btn">
                      <RefreshCw className="w-6 h-6" />
                    </Button>
                    <Button onClick={cancelSelfie} variant="destructive" className="h-14 px-6" data-testid="cancel-confirm-btn">
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
                <Phone className="w-4 h-4" />
                رقم الهاتف
              </label>
              <Input type="tel" placeholder="مثال: 91234567" value={phone}
                onChange={(e) => setPhone(e.target.value)} className="text-lg text-center" dir="ltr" data-testid="phone-input" />
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">أو</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                الرقم الوظيفي
              </label>
              <Input type="text" placeholder="مثال: EMP001" value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)} className="text-lg text-center" dir="ltr" data-testid="employee-code-input" />
            </div>
            
            <Button onClick={handleLogin} className="w-full h-12 text-lg" disabled={loginLoading} data-testid="login-btn">
              {loginLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : (
                <><LogIn className="w-5 h-5 me-2" />تسجيل الدخول</>
              )}
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
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {employee?.name?.charAt(0) || "؟"}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">{employee?.name}</h2>
                <p className="text-sm text-muted-foreground">{employee?.employee_code}</p>
                <p className="text-sm text-muted-foreground">{employee?.department}</p>
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
          securityStatus === "warning" ? "border-yellow-500 bg-yellow-50" :
          "border-green-300 bg-green-50"
        }`}>
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              {securityStatus === "blocked" ? (
                <ShieldAlert className="w-6 h-6 text-red-600" />
              ) : securityStatus === "warning" ? (
                <Shield className="w-6 h-6 text-yellow-600" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-green-600" />
              )}
              <div className="flex-1">
                <p className="font-bold text-sm">
                  {securityStatus === "blocked" ? "تم رصد موقع وهمي!" :
                   securityStatus === "warning" ? "تحذير أمني" :
                   "الحماية مفعّلة"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {securityStatus === "blocked" ? "أوقف تطبيقات تزوير الموقع لاستخدام النظام" :
                   securityStatus === "warning" ? "تم رصد حركة غير طبيعية" :
                   "كشف Mock GPS + سيلفي + تحقق الموقع"}
                </p>
              </div>
              <Badge variant={securityStatus === "blocked" ? "destructive" : securityStatus === "warning" ? "secondary" : "default"}
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
              <Clock className="w-5 h-5" />
              حالة الحضور اليوم
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('ar-SA', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-lg border-2 ${todayAttendance?.check_in ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {todayAttendance?.check_in ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-gray-400" />}
                  <span className="font-medium">الحضور</span>
                </div>
                <p className="text-xl font-bold text-center" data-testid="check-in-time">
                  {todayAttendance?.check_in ? formatTime(todayAttendance.gps_check_in || todayAttendance.check_in) : "--:--"}
                </p>
                {(todayAttendance?.check_in_method === "gps" || todayAttendance?.check_in_method === "wifi") && (
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {todayAttendance.check_in_method === "wifi" ? "WiFi تلقائي" : "GPS تلقائي"}
                    </Badge>
                    {todayAttendance?.check_in_selfie && <Badge variant="outline" className="text-xs bg-blue-50">صورة مرفقة</Badge>}
                    {todayAttendance?.gps_approval_status === "pending" && (
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">بانتظار الموافقة</Badge>
                    )}
                    {todayAttendance?.gps_approval_status === "approved" && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-300">تمت الموافقة</Badge>
                    )}
                    {todayAttendance?.gps_approval_status === "rejected" && (
                      <Badge variant="destructive" className="text-xs">مرفوض</Badge>
                    )}
                  </div>
                )}
              </div>
              
              <div className={`p-4 rounded-lg border-2 ${todayAttendance?.check_out ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {todayAttendance?.check_out ? <XCircle className="w-5 h-5 text-red-600" /> : <AlertCircle className="w-5 h-5 text-gray-400" />}
                  <span className="font-medium">الانصراف</span>
                </div>
                <p className="text-xl font-bold text-center" data-testid="check-out-time">
                  {todayAttendance?.check_out ? formatTime(todayAttendance.gps_check_out || todayAttendance.check_out) : "--:--"}
                </p>
                {(todayAttendance?.check_out_method === "gps" || todayAttendance?.check_out_method === "wifi") && (
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {todayAttendance.check_out_method === "wifi" ? "WiFi تلقائي" : "GPS تلقائي"}
                    </Badge>
                    {todayAttendance?.gps_checkout_approval_status === "pending" && (
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">بانتظار الموافقة</Badge>
                    )}
                    {todayAttendance?.gps_checkout_approval_status === "approved" && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-300">تمت الموافقة</Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WiFi Attendance Card */}
        <Card className={`border-2 ${wifiConnected ? 'border-blue-300' : 'border-gray-200'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              حضور عبر WiFi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`p-3 rounded-lg ${wifiConnected ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center gap-2">
                {wifiConnected ? <Wifi className="w-5 h-5 text-blue-600" /> : <WifiOff className="w-5 h-5 text-gray-400" />}
                <span className="text-sm font-medium">
                  {wifiConnected ? "متصل بشبكة WiFi" : "غير متصل بالـ WiFi"}
                </span>
              </div>
            </div>
            <Button
              onClick={handleWifiCheckIn}
              disabled={!wifiConnected || attendanceLoading || hasAutoCheckedIn.current}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700"
              data-testid="wifi-checkin-btn"
            >
              {hasAutoCheckedIn.current ? (
                <><CheckCircle className="w-5 h-5 me-2" />تم تسجيل الحضور</>
              ) : (
                <><Wifi className="w-5 h-5 me-2" />تسجيل حضور عبر WiFi + سيلفي</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              اتصل بشبكة WiFi الشركة ثم اضغط الزر مع التقاط سيلفي
            </p>
          </CardContent>
        </Card>

        {/* GPS Tracking Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              تتبع الموقع GPS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-lg ${
              isTracking 
                ? (locationStatus.isWithinRange ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300')
                : 'bg-gray-100 border border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isTracking ? (
                    locationStatus.isWithinRange ? <Wifi className="w-6 h-6 text-green-600" /> : <WifiOff className="w-6 h-6 text-red-600" />
                  ) : (
                    <WifiOff className="w-6 h-6 text-gray-400" />
                  )}
                  <div>
                    <p className="font-bold">
                      {isTracking 
                        ? (locationStatus.isWithinRange ? "داخل نطاق العمل" : "خارج نطاق العمل")
                        : "التتبع غير مفعّل"
                      }
                    </p>
                    {isTracking && locationStatus.distance > 0 && (
                      <p className="text-sm text-muted-foreground">
                        المسافة: {locationStatus.distance < 1000 
                          ? `${Math.round(locationStatus.distance)} متر`
                          : `${(locationStatus.distance / 1000).toFixed(1)} كم`
                        }
                      </p>
                    )}
                  </div>
                </div>
                {isTracking && (
                  <Badge variant={locationStatus.isWithinRange ? "default" : "destructive"}>
                    {locationStatus.isWithinRange ? "داخل" : "خارج"}
                  </Badge>
                )}
              </div>
            </div>

            {locationStatus.workLocation && (
              <div className="p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span className="text-sm">موقع العمل: <strong>{locationStatus.workLocation}</strong></span>
              </div>
            )}

            {lastUpdate && (
              <div className="text-center text-sm text-muted-foreground">
                آخر تحديث: {lastUpdate.toLocaleTimeString('ar-SA')}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">{error}</div>
            )}

            <Button
              onClick={isTracking ? stopTracking : startTracking}
              className={`w-full h-14 text-lg ${isTracking ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              disabled={attendanceLoading || mockGpsDetected}
              data-testid="tracking-toggle-btn"
            >
              {attendanceLoading ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : isTracking ? (
                <><WifiOff className="w-6 h-6 me-2" />إيقاف التتبع</>
              ) : (
                <><Locate className="w-6 h-6 me-2" />تفعيل تتبع الموقع</>
              )}
            </Button>

            {/* Manual Attendance with Selfie */}
            {isTracking && !mockGpsDetected && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleManualCheckIn}
                  disabled={attendanceLoading || hasAutoCheckedIn.current}
                  className="h-12"
                  data-testid="manual-checkin-btn"
                >
                  <Camera className="w-4 h-4 me-1" />
                  <LogIn className="w-4 h-4 me-1" />
                  حضور + سيلفي
                </Button>
                <Button
                  variant="outline"
                  onClick={handleManualCheckOut}
                  disabled={attendanceLoading || !hasAutoCheckedIn.current || hasAutoCheckedOut.current}
                  className="h-12"
                  data-testid="manual-checkout-btn"
                >
                  <Camera className="w-4 h-4 me-1" />
                  <LogOut className="w-4 h-4 me-1" />
                  انصراف + سيلفي
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">كيف يعمل النظام:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li><strong className="text-blue-600">WiFi:</strong> اتصل بشبكة الشركة + سيلفي = تسجيل فوري</li>
                <li><strong className="text-green-600">GPS تلقائي:</strong> فعّل التتبع → دخول نطاق العمل = تسجيل تلقائي</li>
                <li><strong className="text-orange-600">يدوي + سيلفي:</strong> اضغط "حضور + سيلفي" لتسجيل مع صورة</li>
                <li><strong className="text-red-600">الحماية:</strong> كشف تلقائي للمواقع الوهمية (Mock GPS)</li>
                <li>جميع التسجيلات تحتاج موافقة المسؤول</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GPSAttendance;
