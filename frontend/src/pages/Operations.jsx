import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API, useAuth, useLanguage } from "../App";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Activity, Wrench, AlertTriangle, Truck, Plus, Pencil, CheckCircle, Settings2, Users, MapPin, Clock, Printer, Trash2 } from "lucide-react";

const Operations = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("daily");
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [dailyOps, setDailyOps] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [dashboard, setDashboard] = useState({});
  const [driverTasks, setDriverTasks] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [driverTasksSummary, setDriverTasksSummary] = useState({});
  
  // Dialog states
  const [dailyOpDialogOpen, setDailyOpDialogOpen] = useState(false);
  const [equipmentDialogOpen, setEquipmentDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [driverTaskDialogOpen, setDriverTaskDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Form states
  const [dailyOpForm, setDailyOpForm] = useState({
    operation_date: new Date().toISOString().split('T')[0], shift: "morning",
    supervisor_name: "", milk_received_liters: 0, milk_processed_liters: 0,
    milk_sold_liters: 0, wastage_liters: 0, staff_present: 0, notes: ""
  });
  const [equipmentForm, setEquipmentForm] = useState({
    name: "", equipment_type: "", brand: "", model: "", serial_number: "",
    purchase_date: "", purchase_price: 0, warranty_expiry: "", location: "", specifications: ""
  });
  const [maintenanceForm, setMaintenanceForm] = useState({
    equipment_id: "", equipment_name: "", maintenance_type: "",
    description: "", performed_by: "", cost: 0, maintenance_date: "", next_maintenance_date: ""
  });
  const [incidentForm, setIncidentForm] = useState({
    incident_type: "", title: "", description: "", incident_date: "",
    location: "", severity: "medium", reported_by_id: "", reported_by_name: "",
    immediate_actions: ""
  });
  const [vehicleForm, setVehicleForm] = useState({
    vehicle_type: "", brand: "", model: "", year: new Date().getFullYear(),
    plate_number: "", color: "", fuel_type: "diesel", assigned_driver_name: "",
    insurance_expiry: "", registration_expiry: ""
  });
  const [driverTaskForm, setDriverTaskForm] = useState({
    driver_id: "", driver_name: "", transport_type: "camel_milk",
    vehicle_plate: "", vehicle_type: "truck", quantity: 0,
    transport_date: new Date().toISOString().split('T')[0],
    transport_time: new Date().toTimeString().slice(0, 5),
    from_location: "حجيف", to_destination: "شركة الصفوة",
    destination_company: "", notes: ""
  });
  const [newCompanyName, setNewCompanyName] = useState("");
  const [destinationCompanies, setDestinationCompanies] = useState(["شركة الصفوة"]);

  // Location options
  const locationOptions = ["حجيف", "غدو", "زيك", "ثمريت", "طاقة", "مرباط"];
  
  // Transport type options
  const transportTypeOptions = [
    { value: "camel_milk", label: "حليب إبل", labelEn: "Camel Milk" },
    { value: "cow_milk", label: "حليب أبقار", labelEn: "Cow Milk" },
    { value: "sheep_milk", label: "حليب أغنام", labelEn: "Sheep Milk" }
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const [dailyRes, equipRes, maintRes, incRes, vehRes, dashRes, driverTasksRes, driversRes, summaryRes, companiesRes] = await Promise.all([
        axios.get(`${API}/operations/daily`, { headers }),
        axios.get(`${API}/operations/equipment`, { headers }),
        axios.get(`${API}/operations/maintenance`, { headers }),
        axios.get(`${API}/operations/incidents`, { headers }),
        axios.get(`${API}/operations/vehicles`, { headers }),
        axios.get(`${API}/operations/dashboard`, { headers }),
        axios.get(`${API}/operations/driver-tasks`, { headers }),
        axios.get(`${API}/hr/employees`, { headers }),
        axios.get(`${API}/operations/driver-tasks/summary`, { headers }),
        axios.get(`${API}/operations/destination-companies`, { headers }).catch(() => ({ data: [] }))
      ]);
      setDailyOps(dailyRes.data);
      setEquipment(equipRes.data);
      setMaintenance(maintRes.data);
      setIncidents(incRes.data);
      setVehicles(vehRes.data);
      setDashboard(dashRes.data);
      setDriverTasks(driverTasksRes.data);
      // Filter only employees with position containing "سائق" or "driver"
      setDrivers(driversRes.data.filter(emp => 
        emp.position?.includes("سائق") || 
        emp.position?.toLowerCase().includes("driver")
      ));
      setDriverTasksSummary(summaryRes.data);
      // Set destination companies
      const companies = companiesRes.data.map(c => c.name);
      setDestinationCompanies(companies.length > 0 ? companies : ["شركة الصفوة"]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Driver Task handlers
  const handleDriverTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/operations/driver-tasks`, driverTaskForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === "ar" ? "تم تسجيل المهمة بنجاح" : "Task recorded successfully");
      setDriverTaskDialogOpen(false);
      resetDriverTaskForm();
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === "ar" ? "حدث خطأ" : "Error occurred"));
    }
  };

  const resetDriverTaskForm = () => {
    setDriverTaskForm({
      driver_id: "", driver_name: "", transport_type: "camel_milk",
      vehicle_plate: "", vehicle_type: "truck", quantity: 0,
      transport_date: new Date().toISOString().split('T')[0],
      transport_time: new Date().toTimeString().slice(0, 5),
      from_location: "حجيف", to_destination: destinationCompanies[0] || "شركة الصفوة",
      destination_company: "", notes: ""
    });
  };

  const handleDriverSelect = (driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    if (driver) {
      setDriverTaskForm({
        ...driverTaskForm,
        driver_id: driverId,
        driver_name: driver.name
      });
    }
  };

  // Add new destination company
  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) return;
    
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/operations/destination-companies`, 
        { name: newCompanyName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(language === "ar" ? "تم إضافة الشركة بنجاح" : "Company added successfully");
      setDestinationCompanies([...destinationCompanies, newCompanyName.trim()]);
      setDriverTaskForm({ ...driverTaskForm, to_destination: newCompanyName.trim() });
      setNewCompanyName("");
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === "ar" ? "فشل إضافة الشركة" : "Failed to add company"));
    }
  };

  // طباعة إيصال توصيل الحليب
  const handlePrintMilkDelivery = (task) => {
    const printWindow = window.open('', '_blank');
    const logoUrl = window.location.origin + '/logo-morooj.png';
    const isEn = language === 'en';
    const dir = isEn ? 'ltr' : 'rtl';
    const textAlign = isEn ? 'left' : 'right';
    const today = new Date().toLocaleDateString(isEn ? 'en-US' : 'ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // الألوان البني الفاتح
    const primaryColor = '#8B5A2B';
    const secondaryColor = '#A67C52';
    const lightBrown = '#D2B48C';
    
    // تحديد نوع الحليب
    const transportTypes = {
      camel_milk: isEn ? 'Camel Milk' : 'حليب إبل',
      cow_milk: isEn ? 'Cow Milk' : 'حليب أبقار',
      sheep_milk: isEn ? 'Sheep Milk' : 'حليب أغنام'
    };
    
    // ترجمات
    const t = {
      title: isEn ? 'Milk Delivery Receipt' : 'إيصال توصيل الحليب',
      date: isEn ? 'Date' : 'التاريخ',
      receiptNo: isEn ? 'Receipt No' : 'رقم الإيصال',
      driverInfo: isEn ? 'Driver Information' : 'معلومات السائق',
      driverName: isEn ? 'Driver Name' : 'اسم السائق',
      vehiclePlate: isEn ? 'Vehicle Plate' : 'رقم السيارة',
      vehicleType: isEn ? 'Vehicle Type' : 'نوع المركبة',
      truck: isEn ? 'Truck' : 'شاحنة',
      tanker: isEn ? 'Tanker' : 'صهريج',
      transportInfo: isEn ? 'Transport Information' : 'معلومات النقل',
      transportDate: isEn ? 'Transport Date' : 'تاريخ النقل',
      transportTime: isEn ? 'Transport Time' : 'وقت النقل',
      milkType: isEn ? 'Milk Type' : 'نوع الحليب',
      litersOf: isEn ? 'Liters of' : 'لتر من',
      fromCenter: isEn ? 'From Center' : 'من مركز',
      to: isEn ? 'To' : 'إلى',
      notes: isEn ? 'Notes' : 'ملاحظات',
      driverSignature: isEn ? 'Driver Signature' : 'توقيع السائق',
      receiverSignature: isEn ? 'Receiver Signature' : 'توقيع المستلم',
      opsSignature: isEn ? 'Operations Manager' : 'توقيع مسؤول العمليات',
      signaturePlace: isEn ? 'Signature' : 'مكان التوقيع',
      phone: isEn ? 'Phone' : 'هاتف',
      fax: isEn ? 'Fax' : 'فاكس',
      email: isEn ? 'Email' : 'البريد',
    };
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${dir}" lang="${isEn ? 'en' : 'ar'}">
      <head>
        <meta charset="UTF-8">
        <title>${t.title}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { box-sizing: border-box; }
          body { 
            font-family: 'Arial', 'Tahoma', sans-serif; 
            direction: ${dir};
            margin: 0;
            padding: 15px;
            font-size: 12px;
            line-height: 1.6;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid ${primaryColor};
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .logo img {
            width: 80px;
            height: auto;
          }
          .company-info {
            text-align: center;
            flex: 1;
            padding: 0 15px;
          }
          .company-header {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #666;
            margin-bottom: 5px;
          }
          .company-name {
            font-size: 14px;
            font-weight: bold;
            color: ${primaryColor};
          }
          .company-name-ar {
            font-size: 12px;
            color: #333;
          }
          .company-details {
            font-size: 9px;
            color: #666;
            margin-top: 5px;
          }
          .document-title {
            background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
            color: white;
            padding: 12px 20px;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            border-radius: 5px;
            margin: 15px 0;
          }
          .delivery-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
          }
          .info-box {
            background: #faf5f0;
            border: 1px solid ${lightBrown};
            border-radius: 8px;
            padding: 12px;
          }
          .info-box h4 {
            margin: 0 0 8px 0;
            color: ${primaryColor};
            font-size: 13px;
            border-bottom: 1px solid ${lightBrown};
            padding-bottom: 5px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .info-label {
            color: #666;
            font-size: 11px;
          }
          .info-value {
            font-weight: bold;
            color: #333;
          }
          .quantity-highlight {
            background: ${primaryColor};
            color: white;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            margin: 20px 0;
          }
          .quantity-highlight .amount {
            font-size: 32px;
            font-weight: bold;
          }
          .quantity-highlight .unit {
            font-size: 14px;
            opacity: 0.9;
          }
          .route-section {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            margin: 20px 0;
            padding: 15px;
            background: #f9f6f2;
            border-radius: 10px;
          }
          .route-point {
            text-align: center;
            padding: 10px 20px;
            background: white;
            border-radius: 8px;
            border: 2px solid ${lightBrown};
          }
          .route-point .label {
            font-size: 10px;
            color: #888;
            margin-bottom: 3px;
          }
          .route-point .name {
            font-size: 14px;
            font-weight: bold;
            color: ${primaryColor};
          }
          .route-arrow {
            font-size: 24px;
            color: ${primaryColor};
          }
          .notes-section {
            background: #fffbf5;
            border: 1px dashed ${lightBrown};
            border-radius: 5px;
            padding: 10px;
            margin: 15px 0;
          }
          .notes-section h4 {
            margin: 0 0 5px 0;
            color: ${primaryColor};
            font-size: 12px;
          }
          .signatures {
            display: flex;
            justify-content: space-around;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px dashed ${lightBrown};
          }
          .signature-box {
            text-align: center;
            width: 30%;
          }
          .e-signature {
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px dashed ${lightBrown};
            border-radius: 5px;
            margin-bottom: 5px;
            background: #faf8f5;
            font-style: italic;
            color: #888;
            font-size: 10px;
          }
          .signature-line {
            border-top: 1px solid #333;
            margin-top: 5px;
            padding-top: 5px;
            font-size: 11px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 10px;
            border-top: 3px solid ${primaryColor};
            text-align: center;
            font-size: 9px;
            color: #666;
          }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            <img src="${logoUrl}" alt="Al Morooj Dairy Logo" onerror="this.style.display='none'" />
          </div>
          <div class="company-info">
            <div class="company-header">
              <div>DHOFAR FOODS AND INVESTMENTS (SAOG)</div>
              <div>شركة ظفار للأغذية والاستثمار (ش.م.ع.ع)</div>
            </div>
            <div class="company-name">AL MOROOJ DAIRY CO SAOC</div>
            <div class="company-name-ar">شركة المروج للألبان</div>
            <div class="company-details">
              CR NO: 1249988 | P.O BOX: 1385, PC-211 | VAT: OM1100091687<br/>
              SALALAH, SULTANATE OF OMAN
            </div>
          </div>
          <div style="text-align: ${isEn ? 'right' : 'left'}; font-size: 10px;">
            <div>${t.date}: ${today}</div>
            <div>${t.receiptNo}: ${task.id?.slice(0, 8) || 'N/A'}</div>
          </div>
        </div>
        
        <div class="document-title">${t.title}</div>
        
        <div class="delivery-info">
          <div class="info-box">
            <h4>${t.driverInfo}</h4>
            <div class="info-row">
              <span class="info-label">${t.driverName}:</span>
              <span class="info-value">${task.driver_name || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${t.vehiclePlate}:</span>
              <span class="info-value">${task.vehicle_plate || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${t.vehicleType}:</span>
              <span class="info-value">${task.vehicle_type === 'truck' ? t.truck : task.vehicle_type === 'tanker' ? t.tanker : task.vehicle_type || '-'}</span>
            </div>
          </div>
          <div class="info-box">
            <h4>${t.transportInfo}</h4>
            <div class="info-row">
              <span class="info-label">${t.transportDate}:</span>
              <span class="info-value">${task.transport_date || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${t.transportTime}:</span>
              <span class="info-value">${task.transport_time || '-'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">${t.milkType}:</span>
              <span class="info-value">${transportTypes[task.transport_type] || task.transport_type || '-'}</span>
            </div>
          </div>
        </div>
        
        <div class="quantity-highlight">
          <div class="amount">${task.quantity?.toLocaleString() || 0}</div>
          <div class="unit">${t.litersOf} ${transportTypes[task.transport_type] || (isEn ? 'Milk' : 'الحليب')}</div>
        </div>
        
        <div class="route-section">
          <div class="route-point">
            <div class="label">${t.fromCenter}</div>
            <div class="name">${task.from_location || '-'}</div>
          </div>
          <div class="route-arrow">${isEn ? '→' : '←'}</div>
          <div class="route-point">
            <div class="label">${t.to}</div>
            <div class="name">${task.to_destination || '-'}</div>
          </div>
        </div>
        
        ${task.notes ? `
        <div class="notes-section">
          <h4>${t.notes}:</h4>
          <p>${task.notes}</p>
        </div>
        ` : ''}
        
        <div class="signatures">
          <div class="signature-box">
            <div class="e-signature">${t.signaturePlace}</div>
            <div class="signature-line">${t.driverSignature}</div>
          </div>
          <div class="signature-box">
            <div class="e-signature">${t.signaturePlace}</div>
            <div class="signature-line">${t.receiverSignature}</div>
          </div>
          <div class="signature-box">
            <div class="e-signature">${t.signaturePlace}</div>
            <div class="signature-line">${t.opsSignature}</div>
          </div>
        </div>
        
        <div class="footer">
          ${isEn ? 'Al Morooj Dairy Co. SAOC' : 'شركة المروج للألبان'} - Al Morooj Dairy Co. SAOC<br/>
          ${t.phone}: +968 23456789 | ${t.fax}: +968 23456780 | ${t.email}: info@almorooj.com
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  // حذف مهمة سائق
  const handleDeleteDriverTask = async (taskId) => {
    if (!window.confirm(language === "ar" ? "هل أنت متأكد من حذف هذه المهمة؟" : "Are you sure you want to delete this task?")) {
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/operations/driver-tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === "ar" ? "تم حذف المهمة بنجاح" : "Task deleted successfully");
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === "ar" ? "فشل حذف المهمة" : "Failed to delete task"));
    }
  };

  // Daily Operation handlers
  const handleDailyOpSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        await axios.put(`${API}/operations/daily/${selectedItem.id}`, dailyOpForm);
      } else {
        await axios.post(`${API}/operations/daily`, dailyOpForm);
      }
      toast.success(language === "ar" ? "تم الحفظ بنجاح" : "Saved successfully");
      setDailyOpDialogOpen(false);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  // Equipment handlers
  const handleEquipmentSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        await axios.put(`${API}/operations/equipment/${selectedItem.id}`, equipmentForm);
      } else {
        await axios.post(`${API}/operations/equipment`, equipmentForm);
      }
      toast.success(language === "ar" ? "تم الحفظ بنجاح" : "Saved successfully");
      setEquipmentDialogOpen(false);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  // Maintenance handlers
  const handleMaintenanceSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/operations/maintenance`, maintenanceForm);
      toast.success(language === "ar" ? "تم الحفظ بنجاح" : "Saved successfully");
      setMaintenanceDialogOpen(false);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  // Incident handlers
  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/operations/incidents`, incidentForm);
      toast.success(language === "ar" ? "تم الإبلاغ بنجاح" : "Reported successfully");
      setIncidentDialogOpen(false);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  // Vehicle handlers
  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        await axios.put(`${API}/operations/vehicles/${selectedItem.id}`, vehicleForm);
      } else {
        await axios.post(`${API}/operations/vehicles`, vehicleForm);
      }
      toast.success(language === "ar" ? "تم الحفظ بنجاح" : "Saved successfully");
      setVehicleDialogOpen(false);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      operational: "bg-green-100 text-green-800",
      available: "bg-green-100 text-green-800",
      maintenance: "bg-yellow-100 text-yellow-800",
      out_of_order: "bg-red-100 text-red-800",
      out_of_service: "bg-red-100 text-red-800",
      in_use: "bg-blue-100 text-blue-800",
      ongoing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      reported: "bg-yellow-100 text-yellow-800",
      investigating: "bg-orange-100 text-orange-800",
      resolved: "bg-green-100 text-green-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      low: "bg-gray-100 text-gray-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800"
    };
    return colors[severity] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {language === "ar" ? "إدارة العمليات" : "Operations Management"}
        </h1>
        <p className="text-muted-foreground">
          {language === "ar" ? "متابعة العمليات اليومية والمعدات والصيانة" : "Track daily operations, equipment and maintenance"}
        </p>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <Settings2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.equipment?.operational || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "معدات تعمل" : "Operational"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-100">
                <Wrench className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.equipment?.maintenance || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "تحت الصيانة" : "In Maintenance"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.vehicles?.available || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "مركبات متاحة" : "Vehicles Available"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-100">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.open_incidents || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "حوادث مفتوحة" : "Open Incidents"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{driverTasksSummary.total_tasks || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "مهام السائقين" : "Driver Tasks"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-4xl grid-cols-6">
          <TabsTrigger value="daily" className="gap-2">
            <Activity className="w-4 h-4" />
            {language === "ar" ? "يومي" : "Daily"}
          </TabsTrigger>
          <TabsTrigger value="drivers" className="gap-2">
            <Users className="w-4 h-4" />
            {language === "ar" ? "السائقين" : "Drivers"}
          </TabsTrigger>
          <TabsTrigger value="equipment" className="gap-2">
            <Settings2 className="w-4 h-4" />
            {language === "ar" ? "المعدات" : "Equipment"}
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2">
            <Wrench className="w-4 h-4" />
            {language === "ar" ? "الصيانة" : "Maintenance"}
          </TabsTrigger>
          <TabsTrigger value="incidents" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            {language === "ar" ? "الحوادث" : "Incidents"}
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="gap-2">
            <Truck className="w-4 h-4" />
            {language === "ar" ? "المركبات" : "Vehicles"}
          </TabsTrigger>
        </TabsList>

        {/* Daily Operations Tab */}
        <TabsContent value="daily">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "العمليات اليومية" : "Daily Operations"}</CardTitle>
              </div>
              <Button onClick={() => { setSelectedItem(null); setDailyOpDialogOpen(true); }} className="gradient-primary text-white">
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "تسجيل عملية" : "Log Operation"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{language === "ar" ? "الوردية" : "Shift"}</TableHead>
                    <TableHead>{language === "ar" ? "المشرف" : "Supervisor"}</TableHead>
                    <TableHead>{language === "ar" ? "حليب مستلم" : "Received"}</TableHead>
                    <TableHead>{language === "ar" ? "حليب مباع" : "Sold"}</TableHead>
                    <TableHead>{language === "ar" ? "الفاقد" : "Wastage"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyOps.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا توجد سجلات" : "No records"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    dailyOps.map((op) => (
                      <TableRow key={op.id}>
                        <TableCell>{op.operation_date}</TableCell>
                        <TableCell>{op.shift}</TableCell>
                        <TableCell>{op.supervisor_name || "-"}</TableCell>
                        <TableCell>{op.milk_received_liters} L</TableCell>
                        <TableCell>{op.milk_sold_liters} L</TableCell>
                        <TableCell>{op.wastage_liters} L</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(op.status)}>{op.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Driver Tasks Tab - مهام السائقين */}
        <TabsContent value="drivers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "مهام السائقين" : "Driver Tasks"}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "توثيق مهام نقل الحليب والبترول" : "Document milk and petroleum transport tasks"}
                </p>
              </div>
              <Button onClick={() => { setSelectedItem(null); setDriverTaskDialogOpen(true); }} className="gradient-primary text-white">
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "تسجيل مهمة" : "Log Task"}
              </Button>
            </CardHeader>
            <CardContent>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {/* 🐪 Camel Icon - SVG */}
                      <div className="w-10 h-10 flex items-center justify-center text-amber-600">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                          <path d="M22,10c0-1.1-0.9-2-2-2h-1V6c0-1.7-1.3-3-3-3c-0.8,0-1.5,0.3-2,0.8V3c0-0.6-0.4-1-1-1s-1,0.4-1,1v1H8 C6.3,4,5,5.3,5,7v1H4c-1.1,0-2,0.9-2,2v2c0,1.1,0.9,2,2,2h1v2c0,1.7,1.3,3,3,3h1v2c0,0.6,0.4,1,1,1s1-0.4,1-1v-2h2v2 c0,0.6,0.4,1,1,1s1-0.4,1-1v-2h1c1.7,0,3-1.3,3-3v-2h1c1.1,0,2-0.9,2-2V10z M18,13c0,0.6-0.4,1-1,1H7c-0.6,0-1-0.4-1-1V9 c0-0.6,0.4-1,1-1h10c0.6,0,1,0.4,1,1V13z M9,11c0.6,0,1-0.4,1-1s-0.4-1-1-1s-1,0.4-1,1S8.4,11,9,11z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-700">{driverTasksSummary.camel_milk_tasks || 0}</p>
                        <p className="text-sm text-amber-600">{language === "ar" ? "حليب إبل" : "Camel Milk"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {/* 🐄 Cow Icon - SVG */}
                      <div className="w-10 h-10 flex items-center justify-center text-blue-600">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                          <path d="M12,2C9.2,2,7,4.2,7,7v1H5c-1.7,0-3,1.3-3,3v3c0,1.1,0.9,2,2,2h1v1c0,1.7,1.3,3,3,3v2c0,0.6,0.4,1,1,1s1-0.4,1-1v-2h4v2 c0,0.6,0.4,1,1,1s1-0.4,1-1v-2c1.7,0,3-1.3,3-3v-1h1c1.1,0,2-0.9,2-2v-3c0-1.7-1.3-3-3-3h-2V7C17,4.2,14.8,2,12,2z M10,9 c0.6,0,1,0.4,1,1s-0.4,1-1,1s-1-0.4-1-1S9.4,9,10,9z M14,9c0.6,0,1,0.4,1,1s-0.4,1-1,1s-1-0.4-1-1S13.4,9,14,9z M8,14h8 c0,1.1-0.9,2-2,2h-4C8.9,16,8,15.1,8,14z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-700">{driverTasksSummary.cow_milk_tasks || 0}</p>
                        <p className="text-sm text-blue-600">{language === "ar" ? "حليب أبقار" : "Cow Milk"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-pink-50 border-pink-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {/* 🐑 Sheep Icon - SVG */}
                      <div className="w-10 h-10 flex items-center justify-center text-pink-600">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                          <path d="M18,9c0-0.6-0.4-1-1-1c-0.3,0-0.5,0.1-0.7,0.3C15.4,7.5,13.8,7,12,7S8.6,7.5,7.7,8.3C7.5,8.1,7.3,8,7,8C6.4,8,6,8.4,6,9 c-1.1,0-2,0.9-2,2v1c0,1.1,0.9,2,2,2v1c0,1.7,1.3,3,3,3v1c0,0.6,0.4,1,1,1s1-0.4,1-1v-1h2v1c0,0.6,0.4,1,1,1s1-0.4,1-1v-1 c1.7,0,3-1.3,3-3v-1c1.1,0,2-0.9,2-2v-1C20,9.9,19.1,9,18,9z M10,12c-0.6,0-1-0.4-1-1s0.4-1,1-1s1,0.4,1,1S10.6,12,10,12z M14,12 c-0.6,0-1-0.4-1-1s0.4-1,1-1s1,0.4,1,1S14.6,12,14,12z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-pink-700">{driverTasksSummary.sheep_milk_tasks || 0}</p>
                        <p className="text-sm text-pink-600">{language === "ar" ? "حليب أغنام" : "Sheep Milk"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Truck className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold text-green-700">{(driverTasksSummary.total_milk_quantity || 0).toLocaleString()}</p>
                        <p className="text-sm text-green-600">{language === "ar" ? "لتر حليب منقول" : "Liters Transported"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-8 h-8 text-purple-600" />
                      <div>
                        <p className="text-2xl font-bold text-purple-700">{Object.keys(driverTasksSummary.by_location || {}).length}</p>
                        <p className="text-sm text-purple-600">{language === "ar" ? "مواقع نشطة" : "Active Locations"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{language === "ar" ? "الوقت" : "Time"}</TableHead>
                    <TableHead>{language === "ar" ? "السائق" : "Driver"}</TableHead>
                    <TableHead>{language === "ar" ? "النوع" : "Type"}</TableHead>
                    <TableHead>{language === "ar" ? "رقم السيارة" : "Plate"}</TableHead>
                    <TableHead>{language === "ar" ? "الكمية" : "Quantity"}</TableHead>
                    <TableHead>{language === "ar" ? "من" : "From"}</TableHead>
                    <TableHead>{language === "ar" ? "إلى" : "To"}</TableHead>
                    <TableHead className="text-center">{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driverTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا توجد مهام مسجلة" : "No tasks recorded"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    driverTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>{task.transport_date}</TableCell>
                        <TableCell>{task.transport_time}</TableCell>
                        <TableCell className="font-medium">{task.driver_name}</TableCell>
                        <TableCell>
                          <Badge variant="default">
                            {task.transport_type === "camel_milk" ? (language === "ar" ? "حليب إبل" : "Camel") :
                             task.transport_type === "cow_milk" ? (language === "ar" ? "حليب أبقار" : "Cow") :
                             task.transport_type === "sheep_milk" ? (language === "ar" ? "حليب أغنام" : "Sheep") :
                             (language === "ar" ? "حليب" : "Milk")}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{task.vehicle_plate}</TableCell>
                        <TableCell>
                          {`${task.quantity?.toLocaleString() || 0} ${language === "ar" ? "لتر" : "L"}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{task.from_location}</Badge>
                        </TableCell>
                        <TableCell>{task.to_destination}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePrintMilkDelivery(task)}
                              title={language === "ar" ? "طباعة إيصال التوصيل" : "Print Delivery Receipt"}
                              className="text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDriverTask(task.id)}
                              title={language === "ar" ? "حذف المهمة" : "Delete Task"}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equipment Tab */}
        <TabsContent value="equipment">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "المعدات" : "Equipment"}</CardTitle>
              </div>
              <Button onClick={() => { setSelectedItem(null); setEquipmentDialogOpen(true); }} className="gradient-primary text-white">
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "معدة جديدة" : "New Equipment"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "الكود" : "Code"}</TableHead>
                    <TableHead>{language === "ar" ? "الاسم" : "Name"}</TableHead>
                    <TableHead>{language === "ar" ? "النوع" : "Type"}</TableHead>
                    <TableHead>{language === "ar" ? "الماركة" : "Brand"}</TableHead>
                    <TableHead>{language === "ar" ? "الموقع" : "Location"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipment.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا توجد معدات" : "No equipment"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    equipment.map((eq) => (
                      <TableRow key={eq.id}>
                        <TableCell className="font-mono">{eq.equipment_code}</TableCell>
                        <TableCell className="font-medium">{eq.name}</TableCell>
                        <TableCell>{eq.equipment_type}</TableCell>
                        <TableCell>{eq.brand || "-"}</TableCell>
                        <TableCell>{eq.location || "-"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(eq.status)}>{eq.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => {
                              setSelectedItem(eq);
                              setMaintenanceForm({...maintenanceForm, equipment_id: eq.id, equipment_name: eq.name});
                              setMaintenanceDialogOpen(true);
                            }} title={language === "ar" ? "صيانة" : "Maintenance"}>
                              <Wrench className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => {
                              setSelectedItem(eq);
                              setEquipmentForm(eq);
                              setEquipmentDialogOpen(true);
                            }}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "سجلات الصيانة" : "Maintenance Records"}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{language === "ar" ? "المعدة" : "Equipment"}</TableHead>
                    <TableHead>{language === "ar" ? "النوع" : "Type"}</TableHead>
                    <TableHead>{language === "ar" ? "الوصف" : "Description"}</TableHead>
                    <TableHead>{language === "ar" ? "التكلفة" : "Cost"}</TableHead>
                    <TableHead>{language === "ar" ? "الصيانة القادمة" : "Next"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا توجد سجلات" : "No records"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    maintenance.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{m.maintenance_date?.split('T')[0]}</TableCell>
                        <TableCell className="font-medium">{m.equipment_name}</TableCell>
                        <TableCell>{m.maintenance_type}</TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="group relative">
                            <span className="block truncate">{m.description}</span>
                            {m.description && m.description.length > 40 && (
                              <div className="absolute z-50 invisible group-hover:visible bg-gray-900 text-white text-sm rounded-lg p-3 -top-2 left-0 transform -translate-y-full min-w-[300px] max-w-[400px] whitespace-normal shadow-lg">
                                {m.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{m.cost?.toFixed(3)} {language === "ar" ? "ر.ع" : "OMR"}</TableCell>
                        <TableCell>{m.next_maintenance_date?.split('T')[0] || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Incidents Tab */}
        <TabsContent value="incidents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "تقارير الحوادث" : "Incident Reports"}</CardTitle>
              </div>
              <Button onClick={() => { setSelectedItem(null); setIncidentDialogOpen(true); }} className="gradient-primary text-white">
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "إبلاغ عن حادث" : "Report Incident"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "الرقم" : "#"}</TableHead>
                    <TableHead>{language === "ar" ? "العنوان" : "Title"}</TableHead>
                    <TableHead>{language === "ar" ? "النوع" : "Type"}</TableHead>
                    <TableHead>{language === "ar" ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{language === "ar" ? "الخطورة" : "Severity"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا توجد حوادث" : "No incidents"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    incidents.map((inc) => (
                      <TableRow key={inc.id}>
                        <TableCell className="font-mono">{inc.incident_number}</TableCell>
                        <TableCell className="font-medium">{inc.title}</TableCell>
                        <TableCell>{inc.incident_type}</TableCell>
                        <TableCell>{inc.incident_date?.split('T')[0]}</TableCell>
                        <TableCell>
                          <Badge className={getSeverityBadge(inc.severity)}>{inc.severity}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(inc.status)}>{inc.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vehicles Tab */}
        <TabsContent value="vehicles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "أسطول المركبات" : "Vehicle Fleet"}</CardTitle>
              </div>
              <Button onClick={() => { setSelectedItem(null); setVehicleDialogOpen(true); }} className="gradient-primary text-white">
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "مركبة جديدة" : "New Vehicle"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "الكود" : "Code"}</TableHead>
                    <TableHead>{language === "ar" ? "النوع" : "Type"}</TableHead>
                    <TableHead>{language === "ar" ? "الماركة/الموديل" : "Brand/Model"}</TableHead>
                    <TableHead>{language === "ar" ? "رقم اللوحة" : "Plate"}</TableHead>
                    <TableHead>{language === "ar" ? "السائق" : "Driver"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا توجد مركبات" : "No vehicles"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    vehicles.map((veh) => (
                      <TableRow key={veh.id}>
                        <TableCell className="font-mono">{veh.vehicle_code}</TableCell>
                        <TableCell>{veh.vehicle_type}</TableCell>
                        <TableCell>{veh.brand} {veh.model}</TableCell>
                        <TableCell>{veh.plate_number}</TableCell>
                        <TableCell>{veh.assigned_driver_name || "-"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(veh.status)}>{veh.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => {
                            setSelectedItem(veh);
                            setVehicleForm(veh);
                            setVehicleDialogOpen(true);
                          }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Daily Operation Dialog */}
      <Dialog open={dailyOpDialogOpen} onOpenChange={setDailyOpDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "تسجيل عملية يومية" : "Log Daily Operation"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDailyOpSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "التاريخ" : "Date"} *</Label>
                <Input type="date" value={dailyOpForm.operation_date} onChange={(e) => setDailyOpForm({...dailyOpForm, operation_date: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "الوردية" : "Shift"}</Label>
                <Select value={dailyOpForm.shift} onValueChange={(v) => setDailyOpForm({...dailyOpForm, shift: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">{language === "ar" ? "صباحية" : "Morning"}</SelectItem>
                    <SelectItem value="afternoon">{language === "ar" ? "مسائية" : "Afternoon"}</SelectItem>
                    <SelectItem value="night">{language === "ar" ? "ليلية" : "Night"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "حليب مستلم (لتر)" : "Received (L)"}</Label>
                <Input type="number" value={dailyOpForm.milk_received_liters} onChange={(e) => setDailyOpForm({...dailyOpForm, milk_received_liters: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "حليب مباع (لتر)" : "Sold (L)"}</Label>
                <Input type="number" value={dailyOpForm.milk_sold_liters} onChange={(e) => setDailyOpForm({...dailyOpForm, milk_sold_liters: parseFloat(e.target.value)})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "الفاقد (لتر)" : "Wastage (L)"}</Label>
                <Input type="number" value={dailyOpForm.wastage_liters} onChange={(e) => setDailyOpForm({...dailyOpForm, wastage_liters: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "عدد الموظفين" : "Staff Present"}</Label>
                <Input type="number" value={dailyOpForm.staff_present} onChange={(e) => setDailyOpForm({...dailyOpForm, staff_present: parseInt(e.target.value)})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "ملاحظات" : "Notes"}</Label>
              <Textarea value={dailyOpForm.notes} onChange={(e) => setDailyOpForm({...dailyOpForm, notes: e.target.value})} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDailyOpDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {language === "ar" ? "حفظ" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Equipment Dialog */}
      <Dialog open={equipmentDialogOpen} onOpenChange={setEquipmentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedItem ? (language === "ar" ? "تعديل معدة" : "Edit Equipment") : (language === "ar" ? "معدة جديدة" : "New Equipment")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEquipmentSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "الاسم" : "Name"} *</Label>
                <Input value={equipmentForm.name} onChange={(e) => setEquipmentForm({...equipmentForm, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "النوع" : "Type"} *</Label>
                <Select value={equipmentForm.equipment_type} onValueChange={(v) => setEquipmentForm({...equipmentForm, equipment_type: v})}>
                  <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tank">{language === "ar" ? "خزان" : "Tank"}</SelectItem>
                    <SelectItem value="cooler">{language === "ar" ? "مبرد" : "Cooler"}</SelectItem>
                    <SelectItem value="pump">{language === "ar" ? "مضخة" : "Pump"}</SelectItem>
                    <SelectItem value="scale">{language === "ar" ? "ميزان" : "Scale"}</SelectItem>
                    <SelectItem value="analyzer">{language === "ar" ? "محلل" : "Analyzer"}</SelectItem>
                    <SelectItem value="generator">{language === "ar" ? "مولد" : "Generator"}</SelectItem>
                    <SelectItem value="other">{language === "ar" ? "أخرى" : "Other"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "الماركة" : "Brand"}</Label>
                <Input value={equipmentForm.brand} onChange={(e) => setEquipmentForm({...equipmentForm, brand: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "الموديل" : "Model"}</Label>
                <Input value={equipmentForm.model} onChange={(e) => setEquipmentForm({...equipmentForm, model: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الموقع" : "Location"}</Label>
              <Input value={equipmentForm.location} onChange={(e) => setEquipmentForm({...equipmentForm, location: e.target.value})} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEquipmentDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {language === "ar" ? "حفظ" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Maintenance Dialog */}
      <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "تسجيل صيانة" : "Log Maintenance"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMaintenanceSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "المعدة" : "Equipment"}</Label>
                <Input value={maintenanceForm.equipment_name} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "نوع الصيانة" : "Type"} *</Label>
                <Select value={maintenanceForm.maintenance_type} onValueChange={(v) => setMaintenanceForm({...maintenanceForm, maintenance_type: v})}>
                  <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">{language === "ar" ? "وقائية" : "Preventive"}</SelectItem>
                    <SelectItem value="corrective">{language === "ar" ? "تصحيحية" : "Corrective"}</SelectItem>
                    <SelectItem value="emergency">{language === "ar" ? "طارئة" : "Emergency"}</SelectItem>
                    <SelectItem value="inspection">{language === "ar" ? "فحص" : "Inspection"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الوصف" : "Description"} *</Label>
              <Textarea value={maintenanceForm.description} onChange={(e) => setMaintenanceForm({...maintenanceForm, description: e.target.value})} rows={2} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ الصيانة" : "Date"} *</Label>
                <Input type="date" value={maintenanceForm.maintenance_date} onChange={(e) => setMaintenanceForm({...maintenanceForm, maintenance_date: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "التكلفة" : "Cost"}</Label>
                <Input type="number" step="0.001" value={maintenanceForm.cost} onChange={(e) => setMaintenanceForm({...maintenanceForm, cost: parseFloat(e.target.value)})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMaintenanceDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {language === "ar" ? "حفظ" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Incident Dialog */}
      <Dialog open={incidentDialogOpen} onOpenChange={setIncidentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "إبلاغ عن حادث" : "Report Incident"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleIncidentSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "نوع الحادث" : "Type"} *</Label>
                <Select value={incidentForm.incident_type} onValueChange={(v) => setIncidentForm({...incidentForm, incident_type: v})}>
                  <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accident">{language === "ar" ? "حادث" : "Accident"}</SelectItem>
                    <SelectItem value="equipment_failure">{language === "ar" ? "عطل معدات" : "Equipment Failure"}</SelectItem>
                    <SelectItem value="quality_issue">{language === "ar" ? "مشكلة جودة" : "Quality Issue"}</SelectItem>
                    <SelectItem value="safety">{language === "ar" ? "سلامة" : "Safety"}</SelectItem>
                    <SelectItem value="environmental">{language === "ar" ? "بيئي" : "Environmental"}</SelectItem>
                    <SelectItem value="other">{language === "ar" ? "أخرى" : "Other"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "الخطورة" : "Severity"}</Label>
                <Select value={incidentForm.severity} onValueChange={(v) => setIncidentForm({...incidentForm, severity: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{language === "ar" ? "منخفضة" : "Low"}</SelectItem>
                    <SelectItem value="medium">{language === "ar" ? "متوسطة" : "Medium"}</SelectItem>
                    <SelectItem value="high">{language === "ar" ? "عالية" : "High"}</SelectItem>
                    <SelectItem value="critical">{language === "ar" ? "حرجة" : "Critical"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "العنوان" : "Title"} *</Label>
              <Input value={incidentForm.title} onChange={(e) => setIncidentForm({...incidentForm, title: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "التاريخ" : "Date"} *</Label>
                <Input type="date" value={incidentForm.incident_date} onChange={(e) => setIncidentForm({...incidentForm, incident_date: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "الموقع" : "Location"} *</Label>
                <Input value={incidentForm.location} onChange={(e) => setIncidentForm({...incidentForm, location: e.target.value})} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الوصف" : "Description"} *</Label>
              <Textarea value={incidentForm.description} onChange={(e) => setIncidentForm({...incidentForm, description: e.target.value})} rows={3} required />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "اسم المبلغ" : "Reported By"} *</Label>
              <Input value={incidentForm.reported_by_name} onChange={(e) => setIncidentForm({...incidentForm, reported_by_name: e.target.value, reported_by_id: e.target.value})} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIncidentDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {language === "ar" ? "إبلاغ" : "Report"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vehicle Dialog */}
      <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedItem ? (language === "ar" ? "تعديل مركبة" : "Edit Vehicle") : (language === "ar" ? "مركبة جديدة" : "New Vehicle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVehicleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "نوع المركبة" : "Type"} *</Label>
                <Select value={vehicleForm.vehicle_type} onValueChange={(v) => setVehicleForm({...vehicleForm, vehicle_type: v})}>
                  <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="truck">{language === "ar" ? "شاحنة" : "Truck"}</SelectItem>
                    <SelectItem value="tanker">{language === "ar" ? "صهريج" : "Tanker"}</SelectItem>
                    <SelectItem value="pickup">{language === "ar" ? "بيك أب" : "Pickup"}</SelectItem>
                    <SelectItem value="car">{language === "ar" ? "سيارة" : "Car"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "رقم اللوحة" : "Plate"} *</Label>
                <Input value={vehicleForm.plate_number} onChange={(e) => setVehicleForm({...vehicleForm, plate_number: e.target.value})} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "الماركة" : "Brand"} *</Label>
                <Input value={vehicleForm.brand} onChange={(e) => setVehicleForm({...vehicleForm, brand: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "الموديل" : "Model"} *</Label>
                <Input value={vehicleForm.model} onChange={(e) => setVehicleForm({...vehicleForm, model: e.target.value})} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "سنة الصنع" : "Year"}</Label>
                <Input type="number" value={vehicleForm.year} onChange={(e) => setVehicleForm({...vehicleForm, year: parseInt(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "السائق" : "Driver"}</Label>
                <Input value={vehicleForm.assigned_driver_name} onChange={(e) => setVehicleForm({...vehicleForm, assigned_driver_name: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setVehicleDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {language === "ar" ? "حفظ" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Driver Task Dialog - مهمة سائق */}
      <Dialog open={driverTaskDialogOpen} onOpenChange={setDriverTaskDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {language === "ar" ? "تسجيل مهمة سائق" : "Log Driver Task"}
            </DialogTitle>
            <DialogDescription>
              {language === "ar" ? "توثيق مهمة نقل حليب أو بترول" : "Document a milk or petroleum transport task"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDriverTaskSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "السائق" : "Driver"} *</Label>
                <Select value={driverTaskForm.driver_id} onValueChange={handleDriverSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === "ar" ? "اختر السائق" : "Select Driver"} />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.length === 0 ? (
                      <SelectItem value="_none" disabled>{language === "ar" ? "لا يوجد سائقين" : "No drivers"}</SelectItem>
                    ) : (
                      drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "نوع الحليب" : "Milk Type"} *</Label>
                <Select value={driverTaskForm.transport_type} onValueChange={(v) => setDriverTaskForm({...driverTaskForm, transport_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {transportTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {language === "ar" ? opt.label : opt.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "رقم السيارة" : "Vehicle Plate"} *</Label>
                <Select 
                  value={driverTaskForm.vehicle_plate} 
                  onValueChange={(v) => {
                    const selectedVehicle = vehicles.find(veh => veh.plate_number === v);
                    setDriverTaskForm({
                      ...driverTaskForm, 
                      vehicle_plate: v,
                      vehicle_type: selectedVehicle?.vehicle_type || driverTaskForm.vehicle_type
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === "ar" ? "اختر السيارة" : "Select Vehicle"} />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.filter(v => v.status === 'available' || v.status === 'operational').length === 0 ? (
                      <SelectItem value="none" disabled>
                        {language === "ar" ? "لا توجد سيارات متاحة" : "No vehicles available"}
                      </SelectItem>
                    ) : (
                      vehicles
                        .filter(v => v.status === 'available' || v.status === 'operational' || !v.status)
                        .map((veh) => (
                          <SelectItem key={veh.id} value={veh.plate_number}>
                            {veh.plate_number} - {veh.brand} {veh.model} ({
                              veh.vehicle_type === 'truck' ? (language === "ar" ? "شاحنة" : "Truck") :
                              veh.vehicle_type === 'tanker' ? (language === "ar" ? "صهريج" : "Tanker") :
                              veh.vehicle_type === 'pickup' ? (language === "ar" ? "بيك آب" : "Pickup") :
                              veh.vehicle_type
                            })
                          </SelectItem>
                        ))
                    )}
                    {/* خيار إدخال يدوي */}
                    <SelectItem value="manual">
                      {language === "ar" ? "إدخال يدوي..." : "Manual entry..."}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {driverTaskForm.vehicle_plate === 'manual' && (
                  <Input 
                    placeholder={language === "ar" ? "أدخل رقم السيارة" : "Enter plate number"}
                    onChange={(e) => setDriverTaskForm({...driverTaskForm, vehicle_plate: e.target.value})}
                    className="mt-2"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "نوع السيارة" : "Vehicle Type"}</Label>
                <Select value={driverTaskForm.vehicle_type} onValueChange={(v) => setDriverTaskForm({...driverTaskForm, vehicle_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="truck">{language === "ar" ? "شاحنة" : "Truck"}</SelectItem>
                    <SelectItem value="tanker">{language === "ar" ? "صهريج" : "Tanker"}</SelectItem>
                    <SelectItem value="pickup">{language === "ar" ? "بيك آب" : "Pickup"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === "ar" ? "كمية الحليب (لتر)" : "Milk Quantity (Liters)"}</Label>
              <Input 
                type="number" 
                value={driverTaskForm.quantity} 
                onChange={(e) => setDriverTaskForm({...driverTaskForm, quantity: parseFloat(e.target.value) || 0})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ النقل" : "Transport Date"} *</Label>
                <Input 
                  type="date" 
                  value={driverTaskForm.transport_date} 
                  onChange={(e) => setDriverTaskForm({...driverTaskForm, transport_date: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "وقت النقل" : "Transport Time"}</Label>
                <Input 
                  type="time" 
                  value={driverTaskForm.transport_time} 
                  onChange={(e) => setDriverTaskForm({...driverTaskForm, transport_time: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "من موقع" : "From Location"} *</Label>
                <Select value={driverTaskForm.from_location} onValueChange={(v) => setDriverTaskForm({...driverTaskForm, from_location: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((loc) => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "إلى وجهة" : "To Destination"} *</Label>
                <Select value={driverTaskForm.to_destination} onValueChange={(v) => setDriverTaskForm({...driverTaskForm, to_destination: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationCompanies.map((dest) => (
                      <SelectItem key={dest} value={dest}>{dest}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Add New Company Section */}
            <div className="bg-muted/50 p-3 rounded-lg space-y-3">
              <Label className="text-sm font-medium">{language === "ar" ? "إضافة شركة جديدة" : "Add New Company"}</Label>
              <div className="flex gap-2">
                <Input 
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder={language === "ar" ? "اسم الشركة الجديدة..." : "New company name..."}
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleAddCompany}
                  disabled={!newCompanyName.trim()}
                >
                  <Plus className="w-4 h-4 me-1" />
                  {language === "ar" ? "إضافة" : "Add"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === "ar" ? "ملاحظات" : "Notes"}</Label>
              <Textarea 
                value={driverTaskForm.notes} 
                onChange={(e) => setDriverTaskForm({...driverTaskForm, notes: e.target.value})}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDriverTaskDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="gradient-primary text-white" disabled={!driverTaskForm.driver_id || !driverTaskForm.vehicle_plate}>
                {language === "ar" ? "تسجيل المهمة" : "Log Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Operations;
