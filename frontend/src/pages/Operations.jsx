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
import { Activity, Wrench, AlertTriangle, Truck, Plus, Pencil, CheckCircle, Settings2, Users, Fuel, MapPin, Clock, Printer } from "lucide-react";

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
                      <Fuel className="w-8 h-8 text-amber-600" />
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
                      <Fuel className="w-8 h-8 text-blue-600" />
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
                      <Fuel className="w-8 h-8 text-pink-600" />
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driverTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                <Input 
                  value={driverTaskForm.vehicle_plate} 
                  onChange={(e) => setDriverTaskForm({...driverTaskForm, vehicle_plate: e.target.value})}
                  placeholder="ABC 1234"
                  required
                />
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
