import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { API, useAuth, useLanguage } from "../App";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { MapPin, Wifi, WifiOff, RefreshCw, Clock, Navigation } from "lucide-react";

const EmployeeTracking = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [locationStatus, setLocationStatus] = useState({
    isWithinRange: true,
    distance: 0,
    workLocation: null
  });

  // Get employee ID from URL or user
  const employeeId = searchParams.get("id") || user?.employee_id || user?.id;

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

  // Send location to server
  const sendLocation = useCallback(async (position) => {
    if (!employeeId) return;

    const locationData = {
      employee_id: employeeId,
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
      setLocationStatus({
        isWithinRange: res.data.is_within_range,
        distance: res.data.distance_from_work,
        workLocation: res.data.work_location
      });
      setError(null);
    } catch (error) {
      console.error("Error sending location:", error);
      setError(language === "ar" ? "فشل في إرسال الموقع" : "Failed to send location");
    }
  }, [employeeId, language]);

  // Start tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError(language === "ar" ? "المتصفح لا يدعم تحديد الموقع" : "Browser doesn't support geolocation");
      return;
    }

    setIsTracking(true);
    setError(null);

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      sendLocation,
      (err) => {
        console.error("Geolocation error:", err);
        setError(
          err.code === 1 
            ? (language === "ar" ? "يرجى السماح بالوصول للموقع" : "Please allow location access")
            : (language === "ar" ? "فشل في تحديد الموقع" : "Failed to get location")
        );
        setIsTracking(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Watch position
    const interval = (settings?.update_interval_seconds || 60) * 1000;
    const id = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        sendLocation,
        (err) => console.error("Watch error:", err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }, interval);

    setWatchId(id);
  }, [sendLocation, settings, language]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchId) {
      clearInterval(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  }, [watchId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId) {
        clearInterval(watchId);
      }
    };
  }, [watchId]);

  // Manual refresh
  const refreshLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        sendLocation,
        (err) => {
          setError(language === "ar" ? "فشل في تحديث الموقع" : "Failed to refresh location");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 p-4" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
              <Navigation className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl">
              {language === "ar" ? "تتبع الموقع" : "Location Tracking"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {language === "ar" 
                ? "شارك موقعك مع إدارة العمل" 
                : "Share your location with management"}
            </p>
          </CardHeader>
        </Card>

        {/* Status Card */}
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6 space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                {isTracking ? (
                  <Wifi className="w-5 h-5 text-green-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-gray-400" />
                )}
                <span className="font-medium">
                  {language === "ar" ? "حالة الاتصال" : "Connection Status"}
                </span>
              </div>
              <Badge variant={isTracking ? "default" : "secondary"} className={isTracking ? "bg-green-500" : ""}>
                {isTracking 
                  ? (language === "ar" ? "متصل" : "Connected") 
                  : (language === "ar" ? "غير متصل" : "Disconnected")}
              </Badge>
            </div>

            {/* Location Status */}
            {currentLocation && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <MapPin className={`w-5 h-5 ${locationStatus.isWithinRange ? "text-green-500" : "text-red-500"}`} />
                    <span className="font-medium">
                      {language === "ar" ? "نطاق العمل" : "Work Range"}
                    </span>
                  </div>
                  <Badge variant={locationStatus.isWithinRange ? "default" : "destructive"} 
                         className={locationStatus.isWithinRange ? "bg-green-500" : ""}>
                    {locationStatus.isWithinRange 
                      ? (language === "ar" ? "داخل النطاق" : "Within Range") 
                      : (language === "ar" ? "خارج النطاق" : "Outside Range")}
                  </Badge>
                </div>

                {/* Distance */}
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === "ar" ? "المسافة من مقر العمل" : "Distance from Work"}
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {locationStatus.distance < 1000 
                      ? `${Math.round(locationStatus.distance)} ${language === "ar" ? "متر" : "m"}`
                      : `${(locationStatus.distance / 1000).toFixed(1)} ${language === "ar" ? "كم" : "km"}`}
                  </p>
                  {locationStatus.workLocation && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {locationStatus.workLocation}
                    </p>
                  )}
                </div>

                {/* Coordinates */}
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="text-muted-foreground text-center">
                    {language === "ar" ? "الإحداثيات" : "Coordinates"}
                  </p>
                  <p className="font-mono text-center text-xs mt-1">
                    {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </p>
                  {currentLocation.accuracy && (
                    <p className="text-center text-xs text-muted-foreground mt-1">
                      {language === "ar" ? "الدقة" : "Accuracy"}: ±{Math.round(currentLocation.accuracy)}m
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Last Update */}
            {lastUpdate && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  {language === "ar" ? "آخر تحديث" : "Last update"}: {lastUpdate.toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US")}
                </span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-center text-sm">
                {error}
              </div>
            )}

            {/* Update Interval Info */}
            {settings && isTracking && (
              <p className="text-center text-xs text-muted-foreground">
                {language === "ar" 
                  ? `يتم تحديث الموقع كل ${settings.update_interval_seconds} ثانية`
                  : `Location updates every ${settings.update_interval_seconds} seconds`}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-2">
          {!isTracking ? (
            <Button 
              onClick={startTracking} 
              className="w-full h-14 text-lg gradient-primary text-white"
              data-testid="start-tracking-btn"
            >
              <MapPin className="w-5 h-5 mr-2" />
              {language === "ar" ? "بدء مشاركة الموقع" : "Start Sharing Location"}
            </Button>
          ) : (
            <>
              <Button 
                onClick={refreshLocation} 
                variant="outline"
                className="w-full h-12"
                data-testid="refresh-location-btn"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {language === "ar" ? "تحديث الموقع الآن" : "Refresh Location Now"}
              </Button>
              <Button 
                onClick={stopTracking} 
                variant="destructive"
                className="w-full h-12"
                data-testid="stop-tracking-btn"
              >
                <WifiOff className="w-4 h-4 mr-2" />
                {language === "ar" ? "إيقاف المشاركة" : "Stop Sharing"}
              </Button>
            </>
          )}
        </div>

        {/* Instructions */}
        <Card className="border-0 shadow-lg bg-amber-50/50">
          <CardContent className="pt-4">
            <p className="text-sm text-amber-800 text-center">
              {language === "ar" 
                ? "⚠️ أبقِ هذه الصفحة مفتوحة لمشاركة موقعك باستمرار" 
                : "⚠️ Keep this page open to continuously share your location"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeTracking;
