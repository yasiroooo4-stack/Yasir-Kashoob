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
  Fingerprint, Locate
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Helper function to format time - handles both ISO format and simple time strings
const formatTime = (timeString) => {
  if (!timeString) return "--:--";
  
  // If it's already in HH:MM format, return as is
  if (/^\d{1,2}:\d{2}$/.test(timeString)) {
    return timeString;
  }
  
  // Try to parse as ISO date
  try {
    const date = new Date(timeString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('ar-SA', {hour: '2-digit', minute: '2-digit'});
    }
  } catch (e) {
    console.error("Error parsing time:", e);
  }
  
  // If all else fails, return the original string
  return timeString;
};

const GPSAttendance = () => {
  // Login state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phone, setPhone] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [employee, setEmployee] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [locationStatus, setLocationStatus] = useState({
    isWithinRange: false,
    distance: 0,
    workLocation: null
  });
  
  // Attendance state
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  
  // Track if we already auto-checked in/out
  const hasAutoCheckedIn = useRef(false);
  const hasAutoCheckedOut = useRef(false);

  // Fetch tracking settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API}/tracking/settings`);
        setSettings(res.data);
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  // Login with phone or employee code
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
        
        // Reset auto-check flags
        hasAutoCheckedIn.current = !!res.data.today_attendance?.check_in;
        hasAutoCheckedOut.current = !!res.data.today_attendance?.check_out;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "لم يتم العثور على الموظف");
    } finally {
      setLoginLoading(false);
    }
  };

  // Send location and check geofence
  const sendLocation = useCallback(async (position) => {
    if (!employee) return;

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
      
      // Auto attendance logic
      const today = new Date().toISOString().split('T')[0];
      
      // Auto CHECK-IN: Entered geofence and no check-in today
      if (isNowWithinRange && !hasAutoCheckedIn.current) {
        console.log("Auto check-in triggered");
        await handleAutoCheckIn(today, position.coords.latitude, position.coords.longitude);
      }
      
      // Auto CHECK-OUT: Exited geofence and already checked in
      if (!isNowWithinRange && wasWithinRange && hasAutoCheckedIn.current && !hasAutoCheckedOut.current) {
        console.log("Auto check-out triggered");
        await handleAutoCheckOut(today, position.coords.latitude, position.coords.longitude);
      }
      
    } catch (error) {
      console.error("Error sending location:", error);
      setError("فشل في إرسال الموقع");
    }
  }, [employee, locationStatus.isWithinRange]);

  // Auto check-in when entering geofence
  const handleAutoCheckIn = async (date, lat, lng) => {
    if (!employee || hasAutoCheckedIn.current) return;
    
    setAttendanceLoading(true);
    try {
      const res = await axios.post(`${API}/tracking/gps-attendance`, {
        employee_id: employee.id,
        action: "check_in",
        latitude: lat,
        longitude: lng,
        date: date
      });
      
      if (res.data.success) {
        hasAutoCheckedIn.current = true;
        setTodayAttendance(prev => ({
          ...prev,
          check_in: res.data.check_in_time,
          check_in_method: "gps",
          gps_approval_status: "pending"
        }));
        if (res.data.requires_approval) {
          toast.success("✅ تم تسجيل الحضور - بانتظار موافقة المسؤول");
        } else {
          toast.success("✅ تم تسجيل الحضور تلقائياً - دخلت نطاق العمل");
        }
      }
    } catch (error) {
      console.error("Auto check-in error:", error);
      // Don't show error toast for duplicate attendance
      if (!error.response?.data?.detail?.includes("already")) {
        toast.error("فشل في تسجيل الحضور التلقائي");
      }
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Auto check-out when exiting geofence
  const handleAutoCheckOut = async (date, lat, lng) => {
    if (!employee || !hasAutoCheckedIn.current || hasAutoCheckedOut.current) return;
    
    setAttendanceLoading(true);
    try {
      const res = await axios.post(`${API}/tracking/gps-attendance`, {
        employee_id: employee.id,
        action: "check_out",
        latitude: lat,
        longitude: lng,
        date: date
      });
      
      if (res.data.success) {
        hasAutoCheckedOut.current = true;
        setTodayAttendance(prev => ({
          ...prev,
          check_out: res.data.check_out_time,
          check_out_method: "gps",
          gps_checkout_approval_status: "pending"
        }));
        if (res.data.requires_approval) {
          toast.warning("🔴 تم تسجيل الانصراف - بانتظار موافقة المسؤول");
        } else {
          toast.warning("🔴 تم تسجيل الانصراف تلقائياً - خرجت من نطاق العمل");
        }
      }
    } catch (error) {
      console.error("Auto check-out error:", error);
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Manual check-in
  const handleManualCheckIn = async () => {
    if (!employee || !currentLocation) {
      toast.error("يرجى تفعيل الموقع أولاً");
      return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    await handleAutoCheckIn(today, currentLocation.lat, currentLocation.lng);
  };

  // Manual check-out
  const handleManualCheckOut = async () => {
    if (!employee || !currentLocation) {
      toast.error("يرجى تفعيل الموقع أولاً");
      return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    await handleAutoCheckOut(today, currentLocation.lat, currentLocation.lng);
  };

  // Start tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم تحديد الموقع");
      toast.error("المتصفح لا يدعم تحديد الموقع");
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        sendLocation(position);
        setIsTracking(true);
        toast.success("تم تفعيل تتبع الموقع");
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError("فشل في الحصول على الموقع - تأكد من تفعيل GPS");
        toast.error("فشل في الحصول على الموقع");
      },
      options
    );

    // Watch position
    const id = navigator.geolocation.watchPosition(
      sendLocation,
      (err) => {
        console.error("Watch position error:", err);
        setError("فشل في متابعة الموقع");
      },
      options
    );
    setWatchId(id);
  }, [sendLocation]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    toast.info("تم إيقاف تتبع الموقع");
  }, [watchId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  // Login Screen
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
              <Input
                type="tel"
                placeholder="مثال: 91234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-lg text-center"
                dir="ltr"
              />
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">أو</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                الرقم الوظيفي
              </label>
              <Input
                type="text"
                placeholder="مثال: EMP001"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                className="text-lg text-center"
                dir="ltr"
              />
            </div>
            
            <Button 
              onClick={handleLogin} 
              className="w-full h-12 text-lg"
              disabled={loginLoading}
            >
              {loginLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5 me-2" />
                  تسجيل الدخول
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Tracking Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4" dir="rtl">
      <div className="max-w-md mx-auto space-y-4">
        {/* Employee Info Card */}
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
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setIsLoggedIn(false);
                  setEmployee(null);
                  stopTracking();
                }}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Status Card */}
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
                  {todayAttendance?.check_in ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="font-medium">الحضور</span>
                </div>
                <p className="text-xl font-bold text-center">
                  {todayAttendance?.check_in 
                    ? formatTime(todayAttendance.check_in)
                    : "--:--"
                  }
                </p>
                {todayAttendance?.check_in_method === "gps" && (
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <Badge variant="secondary" className="text-xs">GPS تلقائي</Badge>
                    {todayAttendance?.gps_approval_status === "pending" && (
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">⏳ بانتظار الموافقة</Badge>
                    )}
                    {todayAttendance?.gps_approval_status === "approved" && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-300">✓ تمت الموافقة</Badge>
                    )}
                    {todayAttendance?.gps_approval_status === "rejected" && (
                      <Badge variant="destructive" className="text-xs">✗ مرفوض</Badge>
                    )}
                  </div>
                )}
              </div>
              
              <div className={`p-4 rounded-lg border-2 ${todayAttendance?.check_out ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {todayAttendance?.check_out ? (
                    <XCircle className="w-5 h-5 text-red-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="font-medium">الانصراف</span>
                </div>
                <p className="text-xl font-bold text-center">
                  {todayAttendance?.check_out 
                    ? formatTime(todayAttendance.check_out)
                    : "--:--"
                  }
                </p>
                {todayAttendance?.check_out_method === "gps" && (
                  <div className="flex flex-col items-center gap-1 mt-1">
                    <Badge variant="secondary" className="text-xs">GPS تلقائي</Badge>
                    {todayAttendance?.gps_checkout_approval_status === "pending" && (
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">⏳ بانتظار الموافقة</Badge>
                    )}
                    {todayAttendance?.gps_checkout_approval_status === "approved" && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-300">✓ تمت الموافقة</Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
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
            {/* Status */}
            <div className={`p-4 rounded-lg ${
              isTracking 
                ? (locationStatus.isWithinRange ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300')
                : 'bg-gray-100 border border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isTracking ? (
                    locationStatus.isWithinRange ? (
                      <Wifi className="w-6 h-6 text-green-600" />
                    ) : (
                      <WifiOff className="w-6 h-6 text-red-600" />
                    )
                  ) : (
                    <WifiOff className="w-6 h-6 text-gray-400" />
                  )}
                  <div>
                    <p className="font-bold">
                      {isTracking 
                        ? (locationStatus.isWithinRange ? "داخل نطاق العمل ✓" : "خارج نطاق العمل ✗")
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

            {/* Work Location */}
            {locationStatus.workLocation && (
              <div className="p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <span className="text-sm">موقع العمل: <strong>{locationStatus.workLocation}</strong></span>
              </div>
            )}

            {/* Last Update */}
            {lastUpdate && (
              <div className="text-center text-sm text-muted-foreground">
                آخر تحديث: {lastUpdate.toLocaleTimeString('ar-SA')}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
                {error}
              </div>
            )}

            {/* Tracking Button */}
            <Button
              onClick={isTracking ? stopTracking : startTracking}
              className={`w-full h-14 text-lg ${isTracking ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              disabled={attendanceLoading}
            >
              {attendanceLoading ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : isTracking ? (
                <>
                  <WifiOff className="w-6 h-6 me-2" />
                  إيقاف التتبع
                </>
              ) : (
                <>
                  <Locate className="w-6 h-6 me-2" />
                  تفعيل تتبع الموقع
                </>
              )}
            </Button>

            {/* Manual Attendance Buttons */}
            {isTracking && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleManualCheckIn}
                  disabled={attendanceLoading || todayAttendance?.check_in}
                  className="h-12"
                >
                  <LogIn className="w-4 h-4 me-2" />
                  تسجيل حضور يدوي
                </Button>
                <Button
                  variant="outline"
                  onClick={handleManualCheckOut}
                  disabled={attendanceLoading || !todayAttendance?.check_in || todayAttendance?.check_out}
                  className="h-12"
                >
                  <LogOut className="w-4 h-4 me-2" />
                  تسجيل انصراف يدوي
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
                <li>فعّل تتبع الموقع من الزر الأخضر</li>
                <li><span className="text-green-600 font-medium">عند دخولك نطاق العمل</span> → يُسجل حضورك تلقائياً</li>
                <li><span className="text-red-600 font-medium">عند خروجك من النطاق</span> → يُسجل انصرافك تلقائياً</li>
                <li>تأكد من إبقاء التطبيق مفتوحاً أثناء العمل</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GPSAttendance;
