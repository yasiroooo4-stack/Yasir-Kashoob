import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API, useLanguage } from "../App";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Slider } from "../components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { 
  MapPin, 
  Users, 
  Bell, 
  Settings, 
  RefreshCw, 
  Plus,
  Trash2,
  Navigation,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Phone,
  ExternalLink,
  Eye,
  Calendar,
  Timer,
} from "lucide-react";

// Leaflet CSS (loaded dynamically)
const loadLeaflet = () => {
  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
};

const EmployeeTrackingAdmin = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("map"); // map, employees, alerts, attendance, settings
  
  // Location attendance data
  const [locationAttendance, setLocationAttendance] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Data states
  const [trackedEmployees, setTrackedEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState({
    enabled: true,
    update_interval_seconds: 60,
    work_radius_meters: 500,
    alert_on_exit: true,
    work_locations: []
  });
  
  // Dialog states
  const [addLocationDialog, setAddLocationDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [mapReady, setMapReady] = useState(false); // Track map initialization
  
  // New location form
  const [newLocation, setNewLocation] = useState({
    name: "",
    lat: "",
    lng: "",
    radius: 500
  });

  // Load Leaflet CSS
  useEffect(() => {
    loadLeaflet();
  }, []);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [employeesRes, allEmpRes, alertsRes, settingsRes, countRes] = await Promise.all([
        axios.get(`${API}/tracking/employees`),
        axios.get(`${API}/tracking/employees/all`),
        axios.get(`${API}/tracking/alerts?limit=20`),
        axios.get(`${API}/tracking/settings`),
        axios.get(`${API}/tracking/alerts/count`)
      ]);
      
      setTrackedEmployees(employeesRes.data);
      setAllEmployees(allEmpRes.data);
      setAlerts(alertsRes.data);
      setSettings(settingsRes.data);
      setUnreadCount(countRes.data.count);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch location attendance
  const fetchLocationAttendance = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/tracking/location-attendance?date=${attendanceDate}`);
      setLocationAttendance(res.data);
    } catch (error) {
      console.error("Error fetching location attendance:", error);
    }
  }, [attendanceDate]);

  useEffect(() => {
    fetchData();
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === "attendance") {
      fetchLocationAttendance();
    }
  }, [activeTab, attendanceDate, fetchLocationAttendance]);

  // Initialize map
  useEffect(() => {
    let isMounted = true;
    
    if (activeTab === "map" && mapRef.current && typeof window !== 'undefined') {
      // Clean up existing map if any
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.log("Map cleanup error:", e);
        }
        mapInstanceRef.current = null;
      }
      
      import('leaflet').then((L) => {
        if (!isMounted || !mapRef.current) return;
        
        // Default center (Oman)
        const defaultCenter = [17.0234, 54.0900];
        
        try {
          mapInstanceRef.current = L.map(mapRef.current, { 
            center: defaultCenter, 
            zoom: 10 
          });
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(mapInstanceRef.current);

          // Add work locations circles
          settings.work_locations?.forEach(loc => {
            if (loc.lat && loc.lng && mapInstanceRef.current) {
              L.circle([loc.lat, loc.lng], {
                color: '#2563eb',
                fillColor: '#3b82f6',
                fillOpacity: 0.2,
                radius: loc.radius || settings.work_radius_meters
              }).addTo(mapInstanceRef.current).bindPopup(`<b>${loc.name}</b><br/>نطاق: ${loc.radius || settings.work_radius_meters}م`);
            }
          });
        } catch (e) {
          console.error("Map initialization error:", e);
        }
      });
    }
    
    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.log("Map cleanup error:", e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, [activeTab, settings.work_locations, settings.work_radius_meters]);

  // Update markers when employees change - show all employees with location
  useEffect(() => {
    console.log("Marker update effect triggered", {
      hasMap: !!mapInstanceRef.current,
      activeTab,
      trackedCount: trackedEmployees.length,
      allCount: allEmployees.length
    });
    
    if (!mapInstanceRef.current || activeTab !== "map") {
      console.log("Skipping marker update - map not ready or wrong tab");
      return;
    }
    
    import('leaflet').then((L) => {
      // Clear old markers
      Object.values(markersRef.current).forEach(marker => {
        try { marker.remove(); } catch(e) {}
      });
      markersRef.current = {};
      
      // Combine tracked employees with employees who have last_location
      const employeesToShow = [];
      
      // Add currently tracked employees (online now)
      trackedEmployees.forEach(emp => {
        if (emp.latitude && emp.longitude) {
          employeesToShow.push({
            ...emp,
            isOnline: true
          });
        }
      });
      
      // Add employees with last_location who are not currently tracked
      const trackedIds = new Set(trackedEmployees.map(e => e.employee_id));
      allEmployees.forEach(emp => {
        if (emp.last_location && emp.last_location.latitude && !trackedIds.has(emp.id)) {
          employeesToShow.push({
            employee_id: emp.id,
            employee_name: emp.name,
            employee_code: emp.employee_code,
            photo_url: emp.photo_url,
            civil_id: emp.civil_id || emp.national_id,
            latitude: emp.last_location.latitude,
            longitude: emp.last_location.longitude,
            distance_from_work: emp.last_location.distance_from_work,
            is_within_range: emp.last_location.is_within_range,
            created_at: emp.last_location.last_updated,
            isOnline: false
          });
        }
      });
      
      console.log("Employees to show on map:", employeesToShow.length, employeesToShow);
      
      if (employeesToShow.length === 0) {
        console.log("No employees to show on map");
        return;
      }
      
      const boundsArray = [];
      
      // Add markers for all employees
      employeesToShow.forEach(emp => {
        if (emp.latitude && emp.longitude) {
          boundsArray.push([emp.latitude, emp.longitude]);
            
          // Get employee photo or first letter
          const photoUrl = emp.photo_url;
          const empName = emp.employee_name || emp.name || 'موظف';
          const firstLetter = empName.charAt(0) || '?';
          const shortName = empName.split(' ').slice(0, 2).join(' ');
          const civilId = emp.civil_id || emp.employee_code || '';
          const isOnline = emp.isOnline;
          const bgColor = emp.is_within_range ? '#22c55e' : '#ef4444';
          const distance = emp.distance_from_work || 0;
          
          const icon = L.divIcon({
            className: 'custom-marker-with-name',
            html: `
              <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                transform: translateX(-50%);
                opacity: ${isOnline ? '1' : '0.7'};
              ">
                <div style="
                  background: ${isOnline ? bgColor : '#6b7280'};
                  width: 50px;
                  height: 50px;
                  border-radius: 50%;
                  border: 3px solid ${isOnline ? 'white' : '#d1d5db'};
                  box-shadow: 0 2px 10px rgba(0,0,0,0.4);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 18px;
                  color: white;
                  font-weight: bold;
                  overflow: hidden;
                ">
                  ${photoUrl 
                    ? `<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.nextSibling.style.display='flex';" /><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;">${firstLetter}</span>`
                    : firstLetter
                  }
                </div>
                <div style="
                  background: rgba(0,0,0,0.85);
                  color: white;
                  padding: 4px 10px;
                  border-radius: 12px;
                  font-size: 12px;
                  font-weight: bold;
                  margin-top: 4px;
                  white-space: nowrap;
                  max-width: 150px;
                  text-align: center;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                ">
                  ${shortName}
                  <div style="font-size: 10px; color: #aaa; margin-top: 2px;">${civilId}</div>
                </div>
              </div>
            `,
            iconSize: [150, 90],
            iconAnchor: [75, 45]
          });
          
          const marker = L.marker([emp.latitude, emp.longitude], { icon })
            .addTo(mapInstanceRef.current)
            .bindPopup(`
              <div style="text-align: right; direction: rtl; min-width: 220px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #eee;">
                  ${photoUrl 
                    ? `<img src="${photoUrl}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:3px solid ${emp.is_within_range ? '#22c55e' : '#ef4444'};" onerror="this.style.display='none'" />`
                    : `<div style="width:60px;height:60px;border-radius:50%;background:#8B5A2B;color:white;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;border:3px solid ${emp.is_within_range ? '#22c55e' : '#ef4444'};">${firstLetter}</div>`
                  }
                  <div>
                    <b style="font-size: 16px; color: #333;">${empName}</b><br/>
                    <span style="color: #666; font-size: 13px;">كود: ${emp.employee_code || '-'}</span><br/>
                    <span style="color: #666; font-size: 13px;">هوية: ${civilId || '-'}</span>
                  </div>
                </div>
                <div style="
                  padding: 8px 12px;
                  border-radius: 8px;
                  background: ${emp.is_within_range ? '#dcfce7' : '#fee2e2'};
                  color: ${emp.is_within_range ? '#16a34a' : '#dc2626'};
                  font-weight: bold;
                  text-align: center;
                  margin-bottom: 8px;
                  font-size: 14px;
                ">
                  ${emp.is_within_range ? '✓ داخل نطاق العمل' : '✗ خارج نطاق العمل'}
                </div>
                <div style="
                  padding: 6px 10px;
                  border-radius: 6px;
                  background: ${isOnline ? '#dcfce7' : '#f3f4f6'};
                  color: ${isOnline ? '#16a34a' : '#666'};
                  text-align: center;
                  margin-bottom: 8px;
                  font-size: 12px;
                ">
                  ${isOnline ? '🟢 متصل الآن' : '⚪ غير متصل'}
                </div>
                <div style="font-size: 13px; color: #666; background: #f5f5f5; padding: 8px; border-radius: 6px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>المسافة:</span>
                    <b style="color: #333;">${distance < 1000 
                      ? `${Math.round(distance)} متر`
                      : `${(distance / 1000).toFixed(1)} كم`
                    }</b>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span>آخر تحديث:</span>
                    <b style="color: #333;">${emp.created_at ? new Date(emp.created_at).toLocaleTimeString('ar-SA', {hour: '2-digit', minute: '2-digit'}) : '-'}</b>
                  </div>
                </div>
              </div>
            `);
          
          markersRef.current[emp.employee_id] = marker;
        }
      });
      
      // Fit bounds if there are markers
      if (boundsArray.length > 0) {
        try {
          mapInstanceRef.current.fitBounds(boundsArray, { padding: [50, 50], maxZoom: 15 });
        } catch(e) {
          console.log("Fit bounds error:", e);
        }
      }
    });
  }, [trackedEmployees, allEmployees, activeTab]);

  // Save settings
  const saveSettings = async () => {
    try {
      await axios.put(`${API}/tracking/settings`, settings);
      toast.success(language === "ar" ? "تم حفظ الإعدادات" : "Settings saved");
    } catch (error) {
      toast.error(language === "ar" ? "فشل في حفظ الإعدادات" : "Failed to save settings");
    }
  };

  // Add work location
  const handleAddLocation = async () => {
    if (!newLocation.name || !newLocation.lat || !newLocation.lng) {
      toast.error(language === "ar" ? "يرجى ملء جميع الحقول" : "Please fill all fields");
      return;
    }
    
    try {
      await axios.post(`${API}/tracking/settings/work-location`, {
        name: newLocation.name,
        lat: parseFloat(newLocation.lat),
        lng: parseFloat(newLocation.lng),
        radius: newLocation.radius
      });
      
      toast.success(language === "ar" ? "تمت إضافة الموقع" : "Location added");
      setAddLocationDialog(false);
      setNewLocation({ name: "", lat: "", lng: "", radius: 500 });
      fetchData();
    } catch (error) {
      toast.error(language === "ar" ? "فشل في إضافة الموقع" : "Failed to add location");
    }
  };

  // Delete work location
  const handleDeleteLocation = async (locationId) => {
    if (!window.confirm(language === "ar" ? "هل تريد حذف هذا الموقع؟" : "Delete this location?")) return;
    
    try {
      await axios.delete(`${API}/tracking/settings/work-location/${locationId}`);
      toast.success(language === "ar" ? "تم حذف الموقع" : "Location deleted");
      fetchData();
    } catch (error) {
      toast.error(language === "ar" ? "فشل في حذف الموقع" : "Failed to delete location");
    }
  };

  // Request location from employee
  const handleRequestLocation = async (employeeId, employeeName) => {
    try {
      const res = await axios.post(`${API}/tracking/request-location/${employeeId}`);
      toast.success(
        language === "ar" 
          ? `تم إرسال طلب الموقع إلى ${employeeName}` 
          : `Location request sent to ${employeeName}`
      );
      
      // Show tracking link
      if (res.data.tracking_link) {
        toast.info(
          language === "ar"
            ? `رابط التتبع: ${window.location.origin}${res.data.tracking_link}`
            : `Tracking link: ${window.location.origin}${res.data.tracking_link}`,
          { duration: 10000 }
        );
      }
    } catch (error) {
      toast.error(language === "ar" ? "فشل في إرسال الطلب" : "Failed to send request");
    }
  };

  // View location history
  const handleViewHistory = async (employee) => {
    setSelectedEmployee(employee);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await axios.get(`${API}/tracking/history/${employee.id}?date=${today}&limit=50`);
      setLocationHistory(res.data);
      setHistoryDialog(true);
    } catch (error) {
      toast.error(language === "ar" ? "فشل في جلب السجل" : "Failed to fetch history");
    }
  };

  // Dismiss alert
  const handleDismissAlert = async (alertId) => {
    try {
      await axios.put(`${API}/tracking/alerts/${alertId}/dismiss`);
      setAlerts(alerts.filter(a => a.id !== alertId));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error("Error dismissing alert:", error);
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setNewLocation({
            ...newLocation,
            lat: pos.coords.latitude.toFixed(6),
            lng: pos.coords.longitude.toFixed(6)
          });
          toast.success(language === "ar" ? "تم تحديد الموقع الحالي" : "Current location set");
        },
        () => toast.error(language === "ar" ? "فشل في تحديد الموقع" : "Failed to get location")
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="employee-tracking-admin">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("map")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{trackedEmployees.length}</p>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "متصل الآن" : "Online Now"}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("employees")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{allEmployees.length}</p>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "إجمالي الموظفين" : "Total Employees"}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("alerts")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 relative">
              <Bell className="w-5 h-5 text-red-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <p className="text-2xl font-bold">{alerts.length}</p>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "التنبيهات" : "Alerts"}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("settings")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Settings className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{settings.work_locations?.length || 0}</p>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "مواقع العمل" : "Work Locations"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {[
          { id: "map", icon: MapPin, label: language === "ar" ? "الخريطة" : "Map" },
          { id: "employees", icon: Users, label: language === "ar" ? "الموظفين" : "Employees" },
          { id: "attendance", icon: Timer, label: language === "ar" ? "حضور الموقع" : "Location Attendance" },
          { id: "alerts", icon: Bell, label: language === "ar" ? "التنبيهات" : "Alerts" },
          { id: "settings", icon: Settings, label: language === "ar" ? "الإعدادات" : "Settings" }
        ].map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "ghost"}
            onClick={() => setActiveTab(tab.id)}
            className="gap-2"
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === "alerts" && unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1">{unreadCount}</Badge>
            )}
          </Button>
        ))}
        <Button variant="ghost" onClick={fetchData} className="ml-auto">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Map Tab */}
      {activeTab === "map" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {language === "ar" ? "خريطة الموظفين" : "Employees Map"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              ref={mapRef} 
              style={{ height: "500px", width: "100%", borderRadius: "8px" }}
              className="border"
            />
            <div className="flex items-center gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>{language === "ar" ? "داخل النطاق" : "Within Range"}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>{language === "ar" ? "خارج النطاق" : "Outside Range"}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500 opacity-30"></div>
                <span>{language === "ar" ? "نطاق العمل" : "Work Zone"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employees Tab */}
      {activeTab === "employees" && (
        <Card>
          <CardHeader>
            <CardTitle>{language === "ar" ? "قائمة الموظفين" : "Employees List"}</CardTitle>
            <CardDescription>
              {language === "ar" 
                ? "اضغط على 'طلب موقع' لإرسال رابط التتبع للموظف" 
                : "Click 'Request Location' to send tracking link to employee"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "ar" ? "الموظف" : "Employee"}</TableHead>
                  <TableHead>{language === "ar" ? "الهاتف" : "Phone"}</TableHead>
                  <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{language === "ar" ? "المسافة" : "Distance"}</TableHead>
                  <TableHead>{language === "ar" ? "آخر تحديث" : "Last Update"}</TableHead>
                  <TableHead>{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allEmployees.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{emp.name}</p>
                        <p className="text-sm text-muted-foreground">{emp.employee_code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {emp.phone ? (
                        <a href={`tel:${emp.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                          <Phone className="w-3 h-3" />
                          {emp.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {emp.last_location ? (
                        <Badge variant={emp.last_location.is_within_range ? "default" : "destructive"}
                               className={emp.last_location.is_within_range ? "bg-green-500" : ""}>
                          {emp.last_location.is_within_range 
                            ? (language === "ar" ? "داخل النطاق" : "In Range")
                            : (language === "ar" ? "خارج النطاق" : "Out of Range")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {language === "ar" ? "غير متصل" : "Offline"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {emp.last_location?.distance_from_work != null ? (
                        <span className={emp.last_location.is_within_range ? "text-green-600" : "text-red-600"}>
                          {emp.last_location.distance_from_work < 1000 
                            ? `${Math.round(emp.last_location.distance_from_work)} ${language === "ar" ? "متر" : "m"}`
                            : `${(emp.last_location.distance_from_work / 1000).toFixed(1)} ${language === "ar" ? "كم" : "km"}`}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {emp.last_location?.last_updated ? (
                        <span className="text-sm text-muted-foreground">
                          {new Date(emp.last_location.last_updated).toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US")}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRequestLocation(emp.id, emp.name)}
                          data-testid={`request-location-${emp.id}`}
                        >
                          <Navigation className="w-3 h-3 mr-1" />
                          {language === "ar" ? "طلب موقع" : "Request"}
                        </Button>
                        {emp.last_location && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewHistory(emp)}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Location Attendance Tab */}
      {activeTab === "attendance" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5" />
                {language === "ar" ? "سجل حضور الموقع" : "Location Attendance"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-40"
                />
                <Button variant="outline" size="sm" onClick={fetchLocationAttendance}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              {language === "ar" 
                ? "تسجيل تلقائي لدخول وخروج الموظفين من موقع العمل بناءً على GPS"
                : "Automatic check-in/out based on GPS location"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "ar" ? "الموظف" : "Employee"}</TableHead>
                  <TableHead>{language === "ar" ? "دخول الموقع" : "Location Check-in"}</TableHead>
                  <TableHead>{language === "ar" ? "خروج الموقع" : "Location Check-out"}</TableHead>
                  <TableHead>{language === "ar" ? "وقت التواجد" : "Time at Location"}</TableHead>
                  <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locationAttendance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {language === "ar" ? "لا توجد بيانات لهذا التاريخ" : "No data for this date"}
                    </TableCell>
                  </TableRow>
                ) : (
                  locationAttendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.employee_name}</p>
                          <p className="text-sm text-muted-foreground">{record.employee_code}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.location_check_in ? (
                          <span className="text-green-600 font-medium">
                            {new Date(record.location_check_in).toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US", {hour: '2-digit', minute: '2-digit'})}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {record.location_check_out ? (
                          <span className="text-red-600 font-medium">
                            {new Date(record.location_check_out).toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US", {hour: '2-digit', minute: '2-digit'})}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-primary">
                          {record.total_time_formatted || "0:00"}
                        </span>
                        <span className="text-sm text-muted-foreground ms-1">
                          ({record.total_time_hours || 0} {language === "ar" ? "ساعة" : "hrs"})
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.is_currently_at_location ? "default" : "secondary"}
                               className={record.is_currently_at_location ? "bg-green-500" : ""}>
                          {record.is_currently_at_location 
                            ? (language === "ar" ? "متواجد" : "Present")
                            : (language === "ar" ? "غادر" : "Left")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* Summary */}
            {locationAttendance.length > 0 && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {locationAttendance.filter(r => r.location_check_in).length}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {language === "ar" ? "سجلوا دخول" : "Checked in"}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      {locationAttendance.filter(r => r.is_currently_at_location).length}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {language === "ar" ? "متواجدون الآن" : "Currently present"}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {(locationAttendance.reduce((sum, r) => sum + (r.total_time_hours || 0), 0) / (locationAttendance.length || 1)).toFixed(1)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {language === "ar" ? "متوسط الساعات" : "Avg hours"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alerts Tab */}
      {activeTab === "alerts" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              {language === "ar" ? "التنبيهات" : "Alerts"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>{language === "ar" ? "لا توجد تنبيهات" : "No alerts"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map(alert => (
                  <div 
                    key={alert.id}
                    className={`p-3 rounded-lg border flex items-start justify-between ${
                      alert.is_read ? "bg-muted/30" : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`w-5 h-5 mt-0.5 ${alert.is_read ? "text-muted-foreground" : "text-red-500"}`} />
                      <div>
                        <p className="font-medium">{alert.employee_name}</p>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(alert.created_at).toLocaleString(language === "ar" ? "ar-SA" : "en-US")}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDismissAlert(alert.id)}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "إعدادات عامة" : "General Settings"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{language === "ar" ? "تفعيل التتبع" : "Enable Tracking"}</Label>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" ? "تفعيل/تعطيل نظام التتبع" : "Enable/disable tracking system"}
                  </p>
                </div>
                <Switch 
                  checked={settings.enabled} 
                  onCheckedChange={(checked) => setSettings({...settings, enabled: checked})}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>{language === "ar" ? "تنبيه عند الخروج" : "Alert on Exit"}</Label>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" ? "إرسال تنبيه عند خروج موظف من النطاق" : "Send alert when employee exits range"}
                  </p>
                </div>
                <Switch 
                  checked={settings.alert_on_exit} 
                  onCheckedChange={(checked) => setSettings({...settings, alert_on_exit: checked})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>{language === "ar" ? "فترة التحديث (ثانية)" : "Update Interval (seconds)"}</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[settings.update_interval_seconds]}
                    onValueChange={([value]) => setSettings({...settings, update_interval_seconds: value})}
                    min={30}
                    max={300}
                    step={30}
                    className="flex-1"
                  />
                  <span className="w-16 text-center font-mono">{settings.update_interval_seconds}s</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>{language === "ar" ? "نطاق العمل الافتراضي (متر)" : "Default Work Radius (meters)"}</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[settings.work_radius_meters]}
                    onValueChange={([value]) => setSettings({...settings, work_radius_meters: value})}
                    min={100}
                    max={2000}
                    step={50}
                    className="flex-1"
                  />
                  <span className="w-20 text-center font-mono">{settings.work_radius_meters}m</span>
                </div>
              </div>
              
              <Button onClick={saveSettings} className="w-full">
                {language === "ar" ? "حفظ الإعدادات" : "Save Settings"}
              </Button>
            </CardContent>
          </Card>

          {/* Work Locations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{language === "ar" ? "مواقع العمل" : "Work Locations"}</CardTitle>
                <Button size="sm" onClick={() => setAddLocationDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  {language === "ar" ? "إضافة" : "Add"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {settings.work_locations?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{language === "ar" ? "لا توجد مواقع محددة" : "No locations defined"}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {settings.work_locations?.map(loc => (
                    <div key={loc.id} className="p-3 rounded-lg border flex items-center justify-between">
                      <div>
                        <p className="font-medium">{loc.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {loc.lat?.toFixed(4)}, {loc.lng?.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {language === "ar" ? "النطاق" : "Radius"}: {loc.radius}m
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteLocation(loc.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Location Dialog */}
      <Dialog open={addLocationDialog} onOpenChange={setAddLocationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "إضافة موقع عمل" : "Add Work Location"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "اسم الموقع" : "Location Name"}</Label>
              <Input 
                value={newLocation.name}
                onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                placeholder={language === "ar" ? "مثال: المقر الرئيسي" : "e.g., Main Office"}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "خط العرض" : "Latitude"}</Label>
                <Input 
                  value={newLocation.lat}
                  onChange={(e) => setNewLocation({...newLocation, lat: e.target.value})}
                  placeholder="17.0234"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "خط الطول" : "Longitude"}</Label>
                <Input 
                  value={newLocation.lng}
                  onChange={(e) => setNewLocation({...newLocation, lng: e.target.value})}
                  placeholder="54.0900"
                />
              </div>
            </div>
            <Button variant="outline" onClick={getCurrentLocation} className="w-full">
              <Navigation className="w-4 h-4 mr-2" />
              {language === "ar" ? "استخدام الموقع الحالي" : "Use Current Location"}
            </Button>
            <div className="space-y-2">
              <Label>{language === "ar" ? "نطاق العمل (متر)" : "Work Radius (meters)"}</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[newLocation.radius]}
                  onValueChange={([value]) => setNewLocation({...newLocation, radius: value})}
                  min={100}
                  max={2000}
                  step={50}
                  className="flex-1"
                />
                <span className="w-20 text-center font-mono">{newLocation.radius}m</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLocationDialog(false)}>
              {language === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleAddLocation}>
              {language === "ar" ? "إضافة" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {language === "ar" ? "سجل تحركات" : "Location History"}: {selectedEmployee?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {locationHistory.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                {language === "ar" ? "لا يوجد سجل" : "No history"}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "الوقت" : "Time"}</TableHead>
                    <TableHead>{language === "ar" ? "الإحداثيات" : "Coordinates"}</TableHead>
                    <TableHead>{language === "ar" ? "المسافة" : "Distance"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locationHistory.map((loc, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        {new Date(loc.created_at).toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {loc.latitude?.toFixed(5)}, {loc.longitude?.toFixed(5)}
                      </TableCell>
                      <TableCell>
                        {loc.distance_from_work < 1000 
                          ? `${Math.round(loc.distance_from_work)}m`
                          : `${(loc.distance_from_work / 1000).toFixed(1)}km`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={loc.is_within_range ? "default" : "destructive"}
                               className={loc.is_within_range ? "bg-green-500" : ""}>
                          {loc.is_within_range ? "✓" : "✗"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeTrackingAdmin;
