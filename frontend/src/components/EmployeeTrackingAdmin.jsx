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
  FileSpreadsheet,
  FileText,
  Download,
  Wifi,
} from "lucide-react";
import * as XLSX from 'xlsx';

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
  
  // Map display mode: "gps" (متصل GPS) or "attendance" (حاضر بالبصمة)
  const [mapDisplayMode, setMapDisplayMode] = useState("gps");
  const hasFittedBounds = useRef(false);
  const prevDisplayMode = useRef("gps");
  const [attendanceBasedEmployees, setAttendanceBasedEmployees] = useState([]);
  const [attendanceMapDate, setAttendanceMapDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Employee list filter dates
  const [employeeFilterFromDate, setEmployeeFilterFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [employeeFilterToDate, setEmployeeFilterToDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Dialog states
  const [addLocationDialog, setAddLocationDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [mapReady, setMapReady] = useState(false); // Track map initialization
  
  // GPS Approval states
  const [pendingGpsApprovals, setPendingGpsApprovals] = useState([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  
  // New location form
  const [newLocation, setNewLocation] = useState({
    name: "", lat: "", lng: "", radius: 500,
    wifi_ssid: "", wifi_password: "", wifi_bssid: "", wifi_ip_range: "", wifi_gateway: ""
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

  // Fetch attendance-based employees for map
  const fetchAttendanceBasedEmployees = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/tracking/employees/attendance-based?date=${attendanceMapDate}`);
      setAttendanceBasedEmployees(res.data);
    } catch (error) {
      console.error("Error fetching attendance-based employees:", error);
    }
  }, [attendanceMapDate]);

  useEffect(() => {
    fetchData();
    // Auto refresh every 30 seconds
    const interval = setInterval(() => {
      fetchData();
      if (mapDisplayMode === "attendance") fetchAttendanceBasedEmployees();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData, mapDisplayMode, fetchAttendanceBasedEmployees]);

  useEffect(() => {
    if (activeTab === "attendance") {
      fetchLocationAttendance();
    }
  }, [activeTab, attendanceDate, fetchLocationAttendance]);

  // Fetch attendance-based employees when mode or date changes
  useEffect(() => {
    if (mapDisplayMode === "attendance") {
      fetchAttendanceBasedEmployees();
    }
  }, [mapDisplayMode, attendanceMapDate, fetchAttendanceBasedEmployees]);

  // Fetch pending GPS approvals
  const fetchPendingGpsApprovals = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/tracking/gps-attendance/pending`);
      setPendingGpsApprovals(res.data);
    } catch (error) {
      console.error("Error fetching pending GPS approvals:", error);
    }
  }, []);

  // Fetch approvals when approvals tab is active
  useEffect(() => {
    if (activeTab === "approvals") {
      fetchPendingGpsApprovals();
    }
  }, [activeTab, fetchPendingGpsApprovals]);

  // Handle GPS attendance approval
  const handleGpsApproval = async (attendanceId, type, approved) => {
    setApprovalLoading(true);
    try {
      await axios.post(`${API}/tracking/gps-attendance/approve`, {
        attendance_id: attendanceId,
        type: type,
        approved: approved,
        approved_by: "admin" // Could be replaced with actual user
      });
      
      toast.success(approved 
        ? (language === "ar" ? "تمت الموافقة بنجاح" : "Approved successfully")
        : (language === "ar" ? "تم الرفض" : "Rejected")
      );
      
      fetchPendingGpsApprovals();
    } catch (error) {
      toast.error(language === "ar" ? "فشل في العملية" : "Operation failed");
    } finally {
      setApprovalLoading(false);
    }
  };

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
        setMapReady(false);
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
          
          // Mark map as ready
          setMapReady(true);
          console.log("Map initialized successfully");
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
        setMapReady(false);
      }
    };
  }, [activeTab, settings.work_locations, settings.work_radius_meters]);

  // Update markers when employees change - show all employees with location
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady || activeTab !== "map") return;
    
    import('leaflet').then((L) => {
      // Choose data source based on display mode
      let employeesToShow = [];
      
      if (mapDisplayMode === "attendance") {
        attendanceBasedEmployees.forEach(emp => {
          if (emp.latitude && emp.longitude) {
            employeesToShow.push({ ...emp, isOnline: emp.attendance_status === "present", isFromAttendance: true });
          }
        });
      } else {
        // GPS mode
        trackedEmployees.forEach(emp => {
          if (emp.latitude && emp.longitude) employeesToShow.push({ ...emp, isOnline: true });
        });
        
        // Add offline employees
        const trackedIds = new Set(trackedEmployees.map(e => e.employee_id));
        allEmployees.forEach(emp => {
          if (!trackedIds.has(emp.id) && emp.last_latitude && emp.last_longitude) {
            employeesToShow.push({
              ...emp,
              employee_id: emp.id,
              latitude: emp.last_latitude,
              longitude: emp.last_longitude,
              isOnline: false,
              created_at: emp.last_location_time
            });
          }
        });
      }
      
      // Track which marker IDs are in the new data
      const newIds = new Set();
      const isAr = language === "ar";
      const locale = isAr ? 'ar-SA' : 'en-US';
      
      const fmtTime = (val) => {
        if (!val || val === "None") return "-";
        if (/^\d{1,2}:\d{2}$/.test(val)) return val;
        try { const d = new Date(val); if (!isNaN(d.getTime())) return d.toLocaleTimeString(locale, {hour:'2-digit',minute:'2-digit'}); } catch {}
        return val;
      };
      
      employeesToShow.forEach(emp => {
        const markerId = emp.employee_id || emp.id;
        newIds.add(markerId);
        
        const empName = emp.employee_name || emp.name || "";
        const firstLetter = empName.charAt(0) || "?";
        const isOnline = emp.isOnline;
        const civilId = emp.civil_id || emp.civil_id_number || "";
        const photoUrl = emp.photo ? `${process.env.REACT_APP_BACKEND_URL}/api/uploads/${emp.photo}` : null;
        const distance = emp.distance_from_work || 0;
        
        let markerColor, statusText, bgColor;
        
        if (emp.isFromAttendance) {
          // GPS status takes priority if available
          if (emp.gps_status === 'inside') {
            markerColor = '#22c55e'; bgColor = '#22c55e';
            statusText = isAr ? 'داخل النطاق (GPS)' : 'Inside Range (GPS)';
          } else if (emp.gps_status === 'outside') {
            markerColor = '#ef4444'; bgColor = '#ef4444';
            statusText = isAr ? 'خارج النطاق (GPS)' : 'Outside Range (GPS)';
          } else {
            markerColor = emp.attendance_status === "present" ? '#22c55e' : '#ef4444';
            statusText = isAr
              ? (emp.attendance_status === "checked_out" ? 'انصرف' : 'حاضر (بصمة)')
              : (emp.attendance_status === "checked_out" ? 'Checked Out' : 'Present (Fingerprint)');
            bgColor = markerColor;
          }
        } else if (emp.gps_status === 'inside') {
          markerColor = '#22c55e'; bgColor = '#22c55e';
          statusText = isAr ? 'داخل النطاق' : 'Inside Range';
        } else if (emp.gps_status === 'outside') {
          markerColor = '#ef4444'; bgColor = '#ef4444';
          statusText = isAr ? 'خارج النطاق' : 'Outside Range';
        } else if (isOnline) {
          markerColor = emp.is_within_range ? '#22c55e' : '#ef4444';
          statusText = emp.is_within_range ? (isAr ? 'داخل النطاق' : 'Inside Range') : (isAr ? 'خارج النطاق' : 'Outside Range');
          bgColor = markerColor;
        } else {
          markerColor = '#6b7280'; bgColor = '#6b7280';
          statusText = isAr ? 'غير متصل' : 'Offline';
        }
        
        let popupStatus = statusText;
        if (!isAr) {
          if (emp.gps_status === 'inside') popupStatus = 'Inside Range (GPS)';
          else if (emp.gps_status === 'outside') popupStatus = 'Outside Range (GPS)';
          else if (emp.isFromAttendance && emp.attendance_status === 'checked_out') popupStatus = 'Checked Out';
          else if (emp.isFromAttendance) popupStatus = 'Present (Fingerprint)';
          else if (isOnline) popupStatus = emp.is_within_range ? 'Inside Range' : 'Outside Range';
          else popupStatus = 'Offline';
        }
        
        const popupHtml = `
          <div style="text-align: ${isAr ? 'right' : 'left'}; direction: ${isAr ? 'rtl' : 'ltr'}; min-width: 240px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #eee;">
              ${photoUrl 
                ? `<img src="${photoUrl}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:3px solid ${bgColor};" onerror="this.style.display='none'" />`
                : `<div style="width:60px;height:60px;border-radius:50%;background:#8B5A2B;color:white;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;border:3px solid ${bgColor};">${firstLetter}</div>`
              }
              <div>
                <b style="font-size: 16px; color: #333;">${empName}</b><br/>
                <span style="color: #666; font-size: 13px;">${isAr ? 'كود' : 'Code'}: ${emp.employee_code || '-'}</span><br/>
                <span style="color: #666; font-size: 13px;">${isAr ? 'هوية' : 'ID'}: ${civilId || '-'}</span>
                ${emp.phone ? `<br/><span style="color: #666; font-size: 13px;">📱 ${emp.phone}</span>` : ''}
              </div>
            </div>
            <div style="padding:8px 12px;border-radius:8px;background:${bgColor}20;color:${bgColor};font-weight:bold;text-align:center;margin-bottom:8px;font-size:14px;">${popupStatus}</div>
            ${emp.work_location_name ? `<div style="padding:6px 10px;border-radius:6px;background:#f0f9ff;color:#0369a1;text-align:center;margin-bottom:8px;font-size:12px;">📍 ${emp.work_location_name}</div>` : ''}
            <div style="padding:6px 10px;border-radius:6px;background:${emp.gps_status === 'inside' ? '#dcfce7' : emp.gps_status === 'outside' ? '#fee2e2' : '#f3f4f6'};color:${emp.gps_status === 'inside' ? '#16a34a' : emp.gps_status === 'outside' ? '#dc2626' : '#666'};text-align:center;margin-bottom:8px;font-size:12px;">
              ${emp.gps_status === 'inside' ? (isAr ? '🟢 GPS داخل النطاق' : '🟢 GPS Inside Range') : 
                emp.gps_status === 'outside' ? (isAr ? '🔴 GPS خارج النطاق' : '🔴 GPS Outside Range') : 
                emp.isFromAttendance ? (isAr ? '📟 حاضر بالبصمة' : '📟 Present via Fingerprint') : 
                (isOnline ? (isAr ? '🟢 متصل الآن' : '🟢 Online') : (isAr ? '⚪ غير متصل' : '⚪ Offline'))}
            </div>
            <div style="font-size:13px;color:#666;background:#f5f5f5;padding:8px;border-radius:6px;">
              ${emp.check_in_time ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>${isAr ? 'وقت الدخول:' : 'Check-in:'}</span><b style="color:#16a34a;">${fmtTime(emp.check_in_time)}</b></div>` : ''}
              ${emp.check_out_time && emp.check_out_time !== 'None' ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>${isAr ? 'وقت الخروج:' : 'Check-out:'}</span><b style="color:#dc2626;">${fmtTime(emp.check_out_time)}</b></div>` : ''}
              ${distance > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>${isAr ? 'المسافة:' : 'Distance:'}</span><b style="color:#333;">${distance < 1000 ? `${Math.round(distance)} ${isAr ? 'متر' : 'm'}` : `${(distance / 1000).toFixed(1)} ${isAr ? 'كم' : 'km'}`}</b></div>` : ''}
              <div style="display:flex;justify-content:space-between;"><span>${isAr ? 'آخر تحديث:' : 'Last update:'}</span><b style="color:#333;">${fmtTime(emp.created_at)}</b></div>
            </div>
          </div>`;
        
        const icon = L.divIcon({
          className: 'custom-marker-with-name',
          html: `<div style="display:flex;flex-direction:column;align-items:center;pointer-events:all;">
            <div style="
              background:${isOnline ? bgColor : '#6b7280'};
              width:50px;height:50px;border-radius:50%;
              border:3px solid ${isOnline ? 'white' : '#d1d5db'};
              box-shadow:0 2px 10px rgba(0,0,0,0.4);
              display:flex;align-items:center;justify-content:center;
              font-size:18px;color:white;font-weight:bold;overflow:hidden;
              opacity:${isOnline ? '1' : '0.7'};
            ">
              ${photoUrl 
                ? `<img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.nextSibling.style.display='flex';" /><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;">${firstLetter}</span>`
                : firstLetter
              }
            </div>
            <div style="background:rgba(0,0,0,0.85);color:white;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:bold;margin-top:4px;white-space:nowrap;max-width:150px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);overflow:hidden;text-overflow:ellipsis;">
              ${empName.split(' ').slice(0,2).join(' ')}
              <div style="font-size:10px;color:#aaa;margin-top:2px;">${civilId}</div>
            </div>
          </div>`,
          iconSize: [150, 90],
          iconAnchor: [75, 45]
        });
        
        // Update existing marker or create new one
        if (markersRef.current[markerId]) {
          const marker = markersRef.current[markerId];
          marker.setLatLng([emp.latitude, emp.longitude]);
          marker.setIcon(icon);
          marker.setPopupContent(popupHtml);
        } else {
          const marker = L.marker([emp.latitude, emp.longitude], { icon })
            .addTo(mapInstanceRef.current)
            .bindPopup(popupHtml);
          markersRef.current[markerId] = marker;
        }
      });
      
      // Remove markers that are no longer in the data
      Object.keys(markersRef.current).forEach(id => {
        if (!newIds.has(id)) {
          try { markersRef.current[id].remove(); } catch {}
          delete markersRef.current[id];
        }
      });
      
      // Fit bounds only on first load or when display mode changes
      const modeChanged = prevDisplayMode.current !== mapDisplayMode;
      prevDisplayMode.current = mapDisplayMode;
      
      if (employeesToShow.length > 0 && (!hasFittedBounds.current || modeChanged)) {
        const bounds = L.latLngBounds(employeesToShow.map(e => [e.latitude, e.longitude]));
        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
          hasFittedBounds.current = true;
        }
      }
    });
  }, [trackedEmployees, allEmployees, activeTab, mapReady, mapDisplayMode, attendanceBasedEmployees, language]);
      
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
        radius: newLocation.radius,
        wifi_ssid: newLocation.wifi_ssid || "",
        wifi_password: newLocation.wifi_password || "",
        wifi_bssid: newLocation.wifi_bssid || "",
        wifi_ip_range: newLocation.wifi_ip_range || "",
        wifi_gateway: newLocation.wifi_gateway || ""
      });
      
      toast.success(language === "ar" ? "تمت إضافة الموقع" : "Location added");
      setAddLocationDialog(false);
      setNewLocation({ name: "", lat: "", lng: "", radius: 500, wifi_ssid: "", wifi_password: "", wifi_bssid: "", wifi_ip_range: "", wifi_gateway: "" });
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

  // Export employee list to Excel
  const exportEmployeeListToExcel = () => {
    try {
      const data = allEmployees.map(emp => ({
        "الاسم": emp.name,
        "الرقم الوظيفي": emp.employee_code,
        "الهاتف": emp.phone || "-",
        "القسم": emp.department || "-",
        "الحالة": emp.last_location?.is_within_range ? "داخل النطاق" : "خارج النطاق / غير متصل",
        "المسافة (متر)": emp.last_location?.distance_from_work ? Math.round(emp.last_location.distance_from_work) : "-",
        "آخر تحديث": emp.last_location?.last_updated ? new Date(emp.last_location.last_updated).toLocaleString('ar-SA') : "-",
        "رابط التتبع": `${window.location.origin}/gps-attendance`
      }));
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "قائمة الموظفين");
      
      // Auto-fit columns
      const colWidths = Object.keys(data[0] || {}).map(key => ({ wch: Math.max(key.length, 15) }));
      ws['!cols'] = colWidths;
      
      XLSX.writeFile(wb, `قائمة_الموظفين_${employeeFilterFromDate}_${employeeFilterToDate}.xlsx`);
      toast.success(language === "ar" ? "تم تصدير الملف بنجاح" : "File exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(language === "ar" ? "فشل في تصدير الملف" : "Export failed");
    }
  };

  // Export employee list to PDF
  const exportEmployeeListToPDF = () => {
    try {
      // Create printable content
      const printContent = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>قائمة الموظفين</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; }
            h1 { text-align: center; color: #333; margin-bottom: 10px; }
            .date-range { text-align: center; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
            th { background-color: #f5f5f5; font-weight: bold; }
            tr:nth-child(even) { background-color: #fafafa; }
            .status-in { color: green; font-weight: bold; }
            .status-out { color: red; }
            .footer { margin-top: 20px; text-align: center; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>قائمة الموظفين - تتبع المواقع</h1>
          <p class="date-range">الفترة: ${employeeFilterFromDate} إلى ${employeeFilterToDate}</p>
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>الرقم الوظيفي</th>
                <th>الهاتف</th>
                <th>الحالة</th>
                <th>المسافة</th>
                <th>آخر تحديث</th>
              </tr>
            </thead>
            <tbody>
              ${allEmployees.map(emp => `
                <tr>
                  <td>${emp.name}</td>
                  <td>${emp.employee_code || '-'}</td>
                  <td>${emp.phone || '-'}</td>
                  <td class="${emp.last_location?.is_within_range ? 'status-in' : 'status-out'}">
                    ${emp.last_location?.is_within_range ? 'داخل النطاق' : 'خارج / غير متصل'}
                  </td>
                  <td>${emp.last_location?.distance_from_work ? Math.round(emp.last_location.distance_from_work) + ' م' : '-'}</td>
                  <td>${emp.last_location?.last_updated ? new Date(emp.last_location.last_updated).toLocaleString('ar-SA') : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p class="footer">تم التصدير بتاريخ: ${new Date().toLocaleString('ar-SA')}</p>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      
      toast.success(language === "ar" ? "تم فتح نافذة الطباعة" : "Print window opened");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error(language === "ar" ? "فشل في تصدير PDF" : "PDF export failed");
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
      <div className="flex gap-2 border-b pb-2 flex-wrap">
        {[
          { id: "map", icon: MapPin, label: language === "ar" ? "الخريطة" : "Map" },
          { id: "employees", icon: Users, label: language === "ar" ? "الموظفين" : "Employees" },
          { id: "attendance", icon: Timer, label: language === "ar" ? "حضور الموقع" : "Location Attendance" },
          { id: "approvals", icon: CheckCircle, label: language === "ar" ? "طلبات الموافقة GPS" : "GPS Approvals", count: pendingGpsApprovals.length },
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
            {tab.id === "approvals" && pendingGpsApprovals.length > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingGpsApprovals.length}</Badge>
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                {language === "ar" ? "خريطة الموظفين" : "Employees Map"}
              </CardTitle>
              
              {/* Display Mode Toggle */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                  <Button
                    variant={mapDisplayMode === "gps" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setMapDisplayMode("gps")}
                    className="text-xs"
                  >
                    <Navigation className="w-3 h-3 me-1" />
                    {language === "ar" ? "GPS متصل" : "GPS Connected"}
                  </Button>
                  <Button
                    variant={mapDisplayMode === "attendance" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setMapDisplayMode("attendance")}
                    className="text-xs"
                  >
                    <CheckCircle className="w-3 h-3 me-1" />
                    {language === "ar" ? "حاضر بالبصمة" : "Attendance"}
                  </Button>
                </div>
                
                {/* Date picker for attendance mode */}
                {mapDisplayMode === "attendance" && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={attendanceMapDate}
                      onChange={(e) => setAttendanceMapDate(e.target.value)}
                      className="w-40 h-8 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* Stats for current mode */}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {mapDisplayMode === "gps" ? (
                <span>
                  {language === "ar" 
                    ? `${trackedEmployees.length} متصل الآن من ${allEmployees.length} موظف` 
                    : `${trackedEmployees.length} connected of ${allEmployees.length} employees`}
                </span>
              ) : (
                <span className="text-green-600 font-medium">
                  {language === "ar" 
                    ? `${attendanceBasedEmployees.length} موظف حاضر في البصمة (${attendanceMapDate})` 
                    : `${attendanceBasedEmployees.length} employees present via fingerprint (${attendanceMapDate})`}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div 
              ref={mapRef} 
              style={{ height: "500px", width: "100%", borderRadius: "8px" }}
              className="border"
            />
            {/* Info message when no employees are showing */}
            {mapDisplayMode === "gps" && trackedEmployees.length === 0 && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-center">
                <p className="font-medium">
                  {language === "ar" 
                    ? "⚠️ لا يوجد موظفين متصلين حالياً عبر GPS" 
                    : "⚠️ No employees are currently connected via GPS"}
                </p>
                <p className="text-sm mt-1">
                  {language === "ar" 
                    ? "جرب التبديل لوضع 'حاضر بالبصمة' لعرض الموظفين المسجلين في نظام الحضور" 
                    : "Try switching to 'Attendance' mode to see employees registered in the attendance system"}
                </p>
              </div>
            )}
            {mapDisplayMode === "attendance" && attendanceBasedEmployees.length === 0 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-center">
                <p className="font-medium">
                  {language === "ar" 
                    ? "ℹ️ لا يوجد سجلات حضور لهذا التاريخ" 
                    : "ℹ️ No attendance records for this date"}
                </p>
                <p className="text-sm mt-1">
                  {language === "ar" 
                    ? "اختر تاريخاً آخر أو تأكد من مزامنة أجهزة البصمة" 
                    : "Select another date or ensure fingerprint devices are synced"}
                </p>
              </div>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm flex-wrap">
              {mapDisplayMode === "attendance" ? (
                <>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>{language === "ar" ? "GPS داخل النطاق" : "GPS Inside"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>{language === "ar" ? "GPS خارج النطاق / انصرف" : "GPS Outside / Checked Out"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>{language === "ar" ? "حاضر بالبصمة (بدون GPS)" : "Present via Fingerprint"}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>{language === "ar" ? "داخل النطاق" : "Within Range"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>{language === "ar" ? "خارج النطاق" : "Outside Range"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                    <span>{language === "ar" ? "غير متصل" : "Offline"}</span>
                  </div>
                </>
              )}
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>{language === "ar" ? "قائمة الموظفين" : "Employees List"}</CardTitle>
                <CardDescription>
                  {language === "ar" 
                    ? "اضغط على 'طلب موقع' لإرسال رابط التتبع للموظف" 
                    : "Click 'Request Location' to send tracking link to employee"}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Date Range Filter */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">{language === "ar" ? "من:" : "From:"}</span>
                    <Input 
                      type="date" 
                      value={employeeFilterFromDate}
                      onChange={(e) => setEmployeeFilterFromDate(e.target.value)}
                      className="w-36 h-8 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">{language === "ar" ? "إلى:" : "To:"}</span>
                    <Input 
                      type="date" 
                      value={employeeFilterToDate}
                      onChange={(e) => setEmployeeFilterToDate(e.target.value)}
                      className="w-36 h-8 text-sm"
                    />
                  </div>
                </div>
                {/* Export Buttons */}
                <div className="flex items-center gap-1">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportEmployeeListToExcel()}
                    className="flex items-center gap-1"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportEmployeeListToPDF()}
                    className="flex items-center gap-1"
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </div>
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

      {/* GPS Approvals Tab */}
      {activeTab === "approvals" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {language === "ar" ? "طلبات موافقة حضور GPS" : "GPS Attendance Approvals"}
              </CardTitle>
              <Button variant="outline" size="sm" onClick={fetchPendingGpsApprovals}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <CardDescription>
              {language === "ar" 
                ? "مراجعة والموافقة على طلبات الحضور/الانصراف المسجلة عبر GPS"
                : "Review and approve GPS-based attendance check-in/out requests"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingGpsApprovals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="no-pending-approvals">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
                <p>{language === "ar" ? "لا توجد طلبات معلقة" : "No pending requests"}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "الموظف" : "Employee"}</TableHead>
                    <TableHead>{language === "ar" ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{language === "ar" ? "نوع الطلب" : "Request Type"}</TableHead>
                    <TableHead>{language === "ar" ? "الوقت" : "Time"}</TableHead>
                    <TableHead>{language === "ar" ? "الموقع" : "Location"}</TableHead>
                    <TableHead>{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingGpsApprovals.map((record) => {
                    const pendingTypes = [];
                    if (record.gps_approval_status === "pending") pendingTypes.push("check_in");
                    if (record.gps_checkout_approval_status === "pending") pendingTypes.push("check_out");
                    
                    return pendingTypes.map((type) => (
                      <TableRow key={`${record.id}-${type}`} data-testid={`approval-row-${record.id}-${type}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{record.employee_name}</p>
                            <p className="text-sm text-muted-foreground">{record.employee_code}</p>
                          </div>
                        </TableCell>
                        <TableCell>{record.date}</TableCell>
                        <TableCell>
                          <Badge variant={type === "check_in" ? "default" : "secondary"}
                                 className={type === "check_in" ? "bg-green-500" : "bg-orange-500"}>
                            {type === "check_in" 
                              ? (language === "ar" ? "تسجيل حضور" : "Check-in")
                              : (language === "ar" ? "تسجيل انصراف" : "Check-out")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const timeStr = type === "check_in" 
                              ? (record.gps_check_in || record.check_in) 
                              : (record.gps_check_out || record.check_out);
                            if (!timeStr) return "-";
                            if (timeStr.includes("T")) {
                              return new Date(timeStr).toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US", {hour: '2-digit', minute: '2-digit'});
                            }
                            return timeStr;
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {type === "check_in" && record.check_in_location_lat && (
                              <span className="text-xs text-muted-foreground block">
                                {record.check_in_location_lat?.toFixed(4)}, {record.check_in_location_lng?.toFixed(4)}
                              </span>
                            )}
                            {type === "check_out" && record.check_out_location_lat && (
                              <span className="text-xs text-muted-foreground block">
                                {record.check_out_location_lat?.toFixed(4)}, {record.check_out_location_lng?.toFixed(4)}
                              </span>
                            )}
                            {record.check_in_method === "wifi" && (
                              <Badge variant="outline" className="text-xs bg-blue-50">WiFi</Badge>
                            )}
                            {record.check_in_selfie_url && type === "check_in" && (
                              <a href={`${process.env.REACT_APP_BACKEND_URL}${record.check_in_selfie_url}`} target="_blank" rel="noreferrer">
                                <Badge variant="outline" className="text-xs bg-purple-50 cursor-pointer hover:bg-purple-100">
                                  {language === "ar" ? "عرض السيلفي" : "View Selfie"}
                                </Badge>
                              </a>
                            )}
                            {record.check_out_selfie_url && type === "check_out" && (
                              <a href={`${process.env.REACT_APP_BACKEND_URL}${record.check_out_selfie_url}`} target="_blank" rel="noreferrer">
                                <Badge variant="outline" className="text-xs bg-purple-50 cursor-pointer hover:bg-purple-100">
                                  {language === "ar" ? "عرض السيلفي" : "View Selfie"}
                                </Badge>
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              disabled={approvalLoading}
                              onClick={() => handleGpsApproval(record.id, type, true)}
                              data-testid={`approve-btn-${record.id}-${type}`}
                            >
                              <CheckCircle className="w-4 h-4 me-1" />
                              {language === "ar" ? "موافقة" : "Approve"}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              disabled={approvalLoading}
                              onClick={() => handleGpsApproval(record.id, type, false)}
                              data-testid={`reject-btn-${record.id}-${type}`}
                            >
                              <XCircle className="w-4 h-4 me-1" />
                              {language === "ar" ? "رفض" : "Reject"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ));
                  })}
                </TableBody>
              </Table>
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
                    <div key={loc.id} className="p-3 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
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
                      {/* WiFi Network Settings */}
                      <div className="space-y-2 pt-2 border-t">
                        <p className="text-xs font-bold text-blue-600 flex items-center gap-1">
                          <Wifi className="w-3 h-3" />
                          {language === "ar" ? "بيانات شبكة WiFi" : "WiFi Network Data"}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="SSID (اسم الشبكة)" defaultValue={loc.wifi_ssid || ""}
                            className="h-7 text-xs" id={`ssid-${loc.id}`} />
                          <Input type="password" placeholder={language === "ar" ? "الرقم السري" : "Password"}
                            defaultValue={loc.wifi_password || ""} className="h-7 text-xs" id={`pass-${loc.id}`} />
                          <Input placeholder="BSSID / MAC (مثال: AA:BB:CC:DD:EE:FF)" defaultValue={loc.wifi_bssid || ""}
                            className="h-7 text-xs font-mono" dir="ltr" id={`bssid-${loc.id}`} />
                          <Input placeholder="IP Range (مثال: 192.168.1.0/24)" defaultValue={loc.wifi_ip_range || ""}
                            className="h-7 text-xs font-mono" dir="ltr" id={`ip-${loc.id}`} />
                          <Input placeholder="Gateway (مثال: 192.168.1.1)" defaultValue={loc.wifi_gateway || ""}
                            className="h-7 text-xs font-mono" dir="ltr" id={`gw-${loc.id}`} />
                          <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                            data-testid={`save-wifi-${loc.id}`}
                            onClick={async () => {
                              try {
                                await axios.put(`${API}/tracking/settings/work-location/${loc.id}/wifi`, {
                                  wifi_ssid: document.getElementById(`ssid-${loc.id}`).value,
                                  wifi_password: document.getElementById(`pass-${loc.id}`).value,
                                  wifi_bssid: document.getElementById(`bssid-${loc.id}`).value,
                                  wifi_ip_range: document.getElementById(`ip-${loc.id}`).value,
                                  wifi_gateway: document.getElementById(`gw-${loc.id}`).value,
                                });
                                toast.success(language === "ar" ? `تم حفظ بيانات WiFi لـ ${loc.name}` : `WiFi saved for ${loc.name}`);
                                fetchData();
                              } catch (error) {
                                toast.error(language === "ar" ? "فشل في حفظ بيانات WiFi" : "Failed to save WiFi");
                              }
                            }}>
                            {language === "ar" ? "حفظ WiFi" : "Save WiFi"}
                          </Button>
                        </div>
                      </div>
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
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-blue-500" />
                {language === "ar" ? "بيانات شبكة WiFi" : "WiFi Network Data"}
              </Label>
              <Input value={newLocation.wifi_ssid}
                onChange={(e) => setNewLocation({...newLocation, wifi_ssid: e.target.value})}
                placeholder="SSID (اسم الشبكة)" />
              <Input type="password" value={newLocation.wifi_password}
                onChange={(e) => setNewLocation({...newLocation, wifi_password: e.target.value})}
                placeholder={language === "ar" ? "الرقم السري" : "Password"} />
              <Input value={newLocation.wifi_bssid}
                onChange={(e) => setNewLocation({...newLocation, wifi_bssid: e.target.value})}
                placeholder="BSSID / MAC (مثال: AA:BB:CC:DD:EE:FF)" dir="ltr" />
              <Input value={newLocation.wifi_ip_range}
                onChange={(e) => setNewLocation({...newLocation, wifi_ip_range: e.target.value})}
                placeholder="IP Range (مثال: 192.168.1.0/24)" dir="ltr" />
              <Input value={newLocation.wifi_gateway}
                onChange={(e) => setNewLocation({...newLocation, wifi_gateway: e.target.value})}
                placeholder="Gateway (مثال: 192.168.1.1)" dir="ltr" />
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
