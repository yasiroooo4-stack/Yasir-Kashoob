import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { API, useLanguage } from "../App";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Checkbox } from "../components/ui/checkbox";
import {
  Truck,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Building2,
  RefreshCw,
  Edit2,
  Trash2,
  UserCheck,
  Copy,
  ChevronLeft,
  ChevronRight,
  Users,
  Droplets,
  AlertCircle,
} from "lucide-react";

// مراكز التجميع
const COLLECTION_CENTERS = ["زيك", "حجيف", "غدو", "طاقة", "ثمريت", "مرباط"];

// حالات الجدولة
const STATUSES = {
  scheduled: { label: "مجدول", label_en: "Scheduled", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "قيد التنفيذ", label_en: "In Progress", color: "bg-yellow-100 text-yellow-700" },
  completed: { label: "مكتمل", label_en: "Completed", color: "bg-green-100 text-green-700" },
  cancelled: { label: "ملغي", label_en: "Cancelled", color: "bg-red-100 text-red-700" },
  reassigned: { label: "معاد تعيينه", label_en: "Reassigned", color: "bg-purple-100 text-purple-700" },
};

const DriverSchedule = ({ embedded = false }) => {
  const { language } = useLanguage();
  const t = (ar, en) => (language === "ar" ? ar : en);

  // State
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("calendar");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  
  // Data
  const [schedules, setSchedules] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState(null);
  
  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Form
  const [formData, setFormData] = useState({
    driver_id: "",
    driver_name: "",
    schedule_date: "",
    start_time: "06:00",
    end_time: "14:00",
    collection_centers: [],
    customer_company: "",
    customer_id: "",
    truck_number: "",
    expected_quantity: 0,
    notes: "",
  });
  
  // Reassign form
  const [reassignData, setReassignData] = useState({
    new_driver_id: "",
    new_driver_name: "",
    reason: "",
  });

  // Fetch data
  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/driver-schedule/schedules`, {
        params: { month: currentMonth },
        headers: { Authorization: `Bearer ${token}` },
      });
      setSchedules(response.data || []);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast.error(t("فشل في جلب الجداول", "Failed to fetch schedules"));
    } finally {
      setLoading(false);
    }
  }, [currentMonth, t]);

  const fetchDrivers = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/driver-schedule/drivers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDrivers(response.data || []);
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/driver-schedule/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCustomers(response.data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/driver-schedule/schedules/summary/${currentMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSummary(response.data);
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchSchedules();
    fetchDrivers();
    fetchCustomers();
  }, [fetchSchedules, fetchDrivers, fetchCustomers]);

  useEffect(() => {
    if (activeTab === "summary") {
      fetchSummary();
    }
  }, [activeTab, fetchSummary]);

  // Calendar helpers
  const getDaysInMonth = (monthStr) => {
    const [year, month] = monthStr.split("-").map(Number);
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (monthStr) => {
    const [year, month] = monthStr.split("-").map(Number);
    return new Date(year, month - 1, 1).getDay();
  };

  const getSchedulesForDate = (date) => {
    return schedules.filter((s) => s.schedule_date === date);
  };

  const navigateMonth = (direction) => {
    const [year, month] = currentMonth.split("-").map(Number);
    let newYear = year;
    let newMonth = month + direction;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    setCurrentMonth(`${newYear}-${String(newMonth).padStart(2, "0")}`);
  };

  // Form handlers
  const handleDriverSelect = (driverId) => {
    const driver = drivers.find((d) => d.id === driverId);
    setFormData({
      ...formData,
      driver_id: driverId,
      driver_name: driver?.name || "",
    });
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find((c) => c.id === customerId);
    setFormData({
      ...formData,
      customer_id: customerId,
      customer_company: customer?.company_name || customer?.name || "",
    });
  };

  const handleCenterToggle = (center) => {
    const current = formData.collection_centers;
    if (current.includes(center)) {
      setFormData({
        ...formData,
        collection_centers: current.filter((c) => c !== center),
      });
    } else {
      setFormData({
        ...formData,
        collection_centers: [...current, center],
      });
    }
  };

  const resetForm = () => {
    setFormData({
      driver_id: "",
      driver_name: "",
      schedule_date: selectedDate || "",
      start_time: "06:00",
      end_time: "14:00",
      collection_centers: [],
      customer_company: "",
      customer_id: "",
      truck_number: "",
      expected_quantity: 0,
      notes: "",
    });
  };

  const openAddDialog = (date = null) => {
    setSelectedDate(date);
    resetForm();
    if (date) {
      setFormData((prev) => ({ ...prev, schedule_date: date }));
    }
    setAddDialogOpen(true);
  };

  const openEditDialog = (schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      driver_id: schedule.driver_id,
      driver_name: schedule.driver_name,
      schedule_date: schedule.schedule_date,
      start_time: schedule.start_time || "06:00",
      end_time: schedule.end_time || "14:00",
      collection_centers: schedule.collection_centers || [],
      customer_company: schedule.customer_company || "",
      customer_id: schedule.customer_id || "",
      truck_number: schedule.truck_number || "",
      expected_quantity: schedule.expected_quantity || 0,
      notes: schedule.notes || "",
    });
    setEditDialogOpen(true);
  };

  const openReassignDialog = (schedule) => {
    setSelectedSchedule(schedule);
    setReassignData({
      new_driver_id: "",
      new_driver_name: "",
      reason: "",
    });
    setReassignDialogOpen(true);
  };

  // API handlers
  const handleCreateSchedule = async () => {
    if (!formData.driver_id || !formData.schedule_date) {
      toast.error(t("يرجى تحديد السائق والتاريخ", "Please select driver and date"));
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      await axios.post(`${API}/driver-schedule/schedules`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(t("تم إنشاء الجدولة بنجاح", "Schedule created successfully"));
      setAddDialogOpen(false);
      fetchSchedules();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في إنشاء الجدولة", "Failed to create schedule"));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSchedule = async () => {
    if (!selectedSchedule) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      await axios.put(`${API}/driver-schedule/schedules/${selectedSchedule.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(t("تم تحديث الجدولة بنجاح", "Schedule updated successfully"));
      setEditDialogOpen(false);
      fetchSchedules();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في تحديث الجدولة", "Failed to update schedule"));
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedSchedule || !reassignData.new_driver_id || !reassignData.reason) {
      toast.error(t("يرجى تحديد السائق الجديد والسبب", "Please select new driver and reason"));
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/driver-schedule/schedules/${selectedSchedule.id}/reassign`,
        null,
        {
          params: {
            new_driver_id: reassignData.new_driver_id,
            new_driver_name: reassignData.new_driver_name,
            reason: reassignData.reason,
          },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success(t("تم إعادة التعيين بنجاح", "Reassignment successful"));
      setReassignDialogOpen(false);
      fetchSchedules();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في إعادة التعيين", "Failed to reassign"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!confirm(t("هل أنت متأكد من حذف هذه الجدولة؟", "Are you sure you want to delete this schedule?"))) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/driver-schedule/schedules/${scheduleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(t("تم حذف الجدولة", "Schedule deleted"));
      fetchSchedules();
    } catch (error) {
      toast.error(t("فشل في الحذف", "Failed to delete"));
    }
  };

  const handleReassignDriverSelect = (driverId) => {
    const driver = drivers.find((d) => d.id === driverId);
    setReassignData({
      ...reassignData,
      new_driver_id: driverId,
      new_driver_name: driver?.name || "",
    });
  };

  // Render calendar
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];
    const weekDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[120px] bg-gray-50 border" />);
    }

    // Days with schedules
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentMonth}-${String(day).padStart(2, "0")}`;
      const daySchedules = getSchedulesForDate(dateStr);
      const isToday = dateStr === new Date().toISOString().split("T")[0];

      days.push(
        <div
          key={day}
          className={`min-h-[120px] border p-1 cursor-pointer hover:bg-gray-50 transition-colors ${
            isToday ? "bg-blue-50 border-blue-300" : ""
          }`}
          onClick={() => openAddDialog(dateStr)}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? "text-blue-600" : ""}`}>
            {day}
          </div>
          <div className="space-y-1 max-h-[90px] overflow-y-auto">
            {daySchedules.map((sch) => (
              <div
                key={sch.id}
                className={`text-xs p-1 rounded ${STATUSES[sch.status]?.color || "bg-gray-100"} cursor-pointer`}
                onClick={(e) => {
                  e.stopPropagation();
                  openEditDialog(sch);
                }}
              >
                <div className="font-medium truncate">{sch.driver_name}</div>
                <div className="truncate opacity-75">
                  {sch.collection_centers?.join("، ") || "-"}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div>
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-0 mb-1">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-medium py-2 bg-gray-100 border">
              {day}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0">{days}</div>
      </div>
    );
  };

  // Render list view
  const renderListView = () => {
    const sortedSchedules = [...schedules].sort((a, b) => 
      a.schedule_date.localeCompare(b.schedule_date) || 
      (a.start_time || "").localeCompare(b.start_time || "")
    );

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("التاريخ", "Date")}</TableHead>
            <TableHead>{t("السائق", "Driver")}</TableHead>
            <TableHead>{t("الوقت", "Time")}</TableHead>
            <TableHead>{t("مراكز التجميع", "Collection Centers")}</TableHead>
            <TableHead>{t("العميل", "Customer")}</TableHead>
            <TableHead>{t("الشاحنة", "Truck")}</TableHead>
            <TableHead>{t("الكمية المتوقعة", "Expected Qty")}</TableHead>
            <TableHead>{t("الحالة", "Status")}</TableHead>
            <TableHead>{t("إجراءات", "Actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSchedules.map((sch) => (
            <TableRow key={sch.id}>
              <TableCell className="font-medium">{sch.schedule_date}</TableCell>
              <TableCell>
                <div>
                  {sch.driver_name}
                  {sch.original_driver_name && (
                    <div className="text-xs text-muted-foreground">
                      ({t("بدلاً من", "Instead of")} {sch.original_driver_name})
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {sch.start_time} - {sch.end_time}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {sch.collection_centers?.map((c) => (
                    <Badge key={c} variant="outline" className="text-xs">
                      {c}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>{sch.customer_company}</TableCell>
              <TableCell>{sch.truck_number}</TableCell>
              <TableCell>{sch.expected_quantity?.toLocaleString()} {t("لتر", "L")}</TableCell>
              <TableCell>
                <Badge className={STATUSES[sch.status]?.color}>
                  {language === "ar" ? STATUSES[sch.status]?.label : STATUSES[sch.status]?.label_en}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(sch)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openReassignDialog(sch)}>
                    <UserCheck className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteSchedule(sch.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // Render summary
  const renderSummary = () => {
    if (!summary) return <div className="text-center py-8">{t("جاري التحميل...", "Loading...")}</div>;

    return (
      <div className="space-y-6">
        {/* Overview cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Truck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.total_trips}</p>
                  <p className="text-sm text-muted-foreground">{t("إجمالي الرحلات", "Total Trips")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Droplets className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.total_expected_quantity?.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{t("الكمية المتوقعة (لتر)", "Expected Qty (L)")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.completed_trips}</p>
                  <p className="text-sm text-muted-foreground">{t("رحلات مكتملة", "Completed")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.reassigned_trips}</p>
                  <p className="text-sm text-muted-foreground">{t("رحلات معاد تعيينها", "Reassigned")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Driver summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t("ملخص السائقين", "Driver Summary")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("السائق", "Driver")}</TableHead>
                  <TableHead>{t("عدد الرحلات", "Trips")}</TableHead>
                  <TableHead>{t("الكمية المتوقعة", "Expected Qty")}</TableHead>
                  <TableHead>{t("مكتملة", "Completed")}</TableHead>
                  <TableHead>{t("معاد تعيينها (له)", "Reassigned To")}</TableHead>
                  <TableHead>{t("معاد تعيينها (منه)", "Reassigned From")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.drivers?.map((driver) => (
                  <TableRow key={driver.driver_id}>
                    <TableCell className="font-medium">{driver.driver_name}</TableCell>
                    <TableCell>{driver.trips_count}</TableCell>
                    <TableCell>{driver.expected_quantity?.toLocaleString()} {t("لتر", "L")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50">
                        {driver.completed}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {driver.reassigned_to > 0 && (
                        <Badge variant="outline" className="bg-purple-50">
                          +{driver.reassigned_to}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {driver.reassigned_from > 0 && (
                        <Badge variant="outline" className="bg-orange-50">
                          -{driver.reassigned_from}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Schedule form dialog content
  const renderScheduleForm = () => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
      <div className="grid grid-cols-2 gap-4">
        {/* Driver */}
        <div className="space-y-2">
          <Label>{t("السائق", "Driver")} *</Label>
          <Select value={formData.driver_id} onValueChange={handleDriverSelect}>
            <SelectTrigger>
              <SelectValue placeholder={t("اختر السائق", "Select driver")} />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label>{t("التاريخ", "Date")} *</Label>
          <Input
            type="date"
            value={formData.schedule_date}
            onChange={(e) => setFormData({ ...formData, schedule_date: e.target.value })}
          />
        </div>

        {/* Start Time */}
        <div className="space-y-2">
          <Label>{t("وقت البدء", "Start Time")}</Label>
          <Input
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          />
        </div>

        {/* End Time */}
        <div className="space-y-2">
          <Label>{t("وقت الانتهاء", "End Time")}</Label>
          <Input
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          />
        </div>

        {/* Truck Number */}
        <div className="space-y-2">
          <Label>{t("رقم الشاحنة", "Truck Number")}</Label>
          <Input
            value={formData.truck_number}
            onChange={(e) => setFormData({ ...formData, truck_number: e.target.value })}
            placeholder={t("مثال: 1234 أ ب", "e.g., 1234 AB")}
          />
        </div>

        {/* Expected Quantity */}
        <div className="space-y-2">
          <Label>{t("الكمية المتوقعة (لتر)", "Expected Quantity (L)")}</Label>
          <Input
            type="number"
            value={formData.expected_quantity}
            onChange={(e) => setFormData({ ...formData, expected_quantity: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      {/* Collection Centers */}
      <div className="space-y-2">
        <Label>{t("مراكز التجميع", "Collection Centers")}</Label>
        <div className="flex flex-wrap gap-3 p-3 border rounded-lg">
          {COLLECTION_CENTERS.map((center) => (
            <div key={center} className="flex items-center gap-2">
              <Checkbox
                id={`center-${center}`}
                checked={formData.collection_centers.includes(center)}
                onCheckedChange={() => handleCenterToggle(center)}
              />
              <Label htmlFor={`center-${center}`} className="cursor-pointer">
                {center}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Customer */}
      <div className="space-y-2">
        <Label>{t("شركة العميل", "Customer Company")}</Label>
        <Select value={formData.customer_id} onValueChange={handleCustomerSelect}>
          <SelectTrigger>
            <SelectValue placeholder={t("اختر العميل", "Select customer")} />
          </SelectTrigger>
          <SelectContent>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.company_name || c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Or manual input */}
        <Input
          value={formData.customer_company}
          onChange={(e) => setFormData({ ...formData, customer_company: e.target.value, customer_id: "" })}
          placeholder={t("أو اكتب اسم الشركة", "Or type company name")}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>{t("ملاحظات", "Notes")}</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
        />
      </div>
    </div>
  );

  return (
    <div className={embedded ? "space-y-6" : "p-6 space-y-6"} dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      {!embedded && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="w-7 h-7 text-primary" />
              {t("جدول السائقين", "Driver Schedule")}
            </h1>
            <p className="text-muted-foreground">
              {t("إدارة جداول السائقين الشهرية ورحلات نقل الحليب", "Manage monthly driver schedules and milk transport trips")}
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => navigateMonth(-1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <div className="px-4 py-2 bg-muted rounded-lg font-medium min-w-[150px] text-center">
          {new Date(currentMonth + "-01").toLocaleDateString(language === "ar" ? "ar-OM" : "en-US", {
            year: "numeric",
            month: "long",
          })}
        </div>
        <Button variant="outline" onClick={() => navigateMonth(1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button onClick={() => openAddDialog()}>
          <Plus className="w-4 h-4 me-2" />
          {t("إضافة جدولة", "Add Schedule")}
        </Button>
        <Button variant="outline" onClick={fetchSchedules}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* No drivers warning */}
      {drivers.length === 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
              <div>
                <p className="font-medium">{t("لا يوجد سائقين مسجلين", "No drivers registered")}</p>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "يرجى إضافة موظفين بوظيفة 'سائق' في صفحة الموظفين",
                    "Please add employees with 'Driver' job title in the Employees page"
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="calendar" className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {t("التقويم", "Calendar")}
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-1">
            <Truck className="w-4 h-4" />
            {t("القائمة", "List")}
            <Badge className="ms-1">{schedules.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {t("الملخص", "Summary")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardContent className="p-4">{renderCalendar()}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardContent className="p-4">
              {schedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("لا توجد جداول لهذا الشهر", "No schedules for this month")}
                </div>
              ) : (
                renderListView()
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          {renderSummary()}
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl" dir={language === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {t("إضافة جدولة جديدة", "Add New Schedule")}
            </DialogTitle>
            <DialogDescription>
              {t("أضف رحلة جديدة لسائق", "Add a new trip for a driver")}
            </DialogDescription>
          </DialogHeader>
          {renderScheduleForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button onClick={handleCreateSchedule} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : t("إنشاء", "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl" dir={language === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              {t("تعديل الجدولة", "Edit Schedule")}
            </DialogTitle>
          </DialogHeader>
          {renderScheduleForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button onClick={handleUpdateSchedule} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : t("حفظ", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent dir={language === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              {t("إعادة تعيين السائق", "Reassign Driver")}
            </DialogTitle>
            <DialogDescription>
              {t(
                `إعادة تعيين الرحلة من ${selectedSchedule?.driver_name} إلى سائق آخر`,
                `Reassign trip from ${selectedSchedule?.driver_name} to another driver`
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("السائق الجديد", "New Driver")} *</Label>
              <Select value={reassignData.new_driver_id} onValueChange={handleReassignDriverSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={t("اختر السائق", "Select driver")} />
                </SelectTrigger>
                <SelectContent>
                  {drivers
                    .filter((d) => d.id !== selectedSchedule?.driver_id)
                    .map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("سبب إعادة التعيين", "Reassignment Reason")} *</Label>
              <Textarea
                value={reassignData.reason}
                onChange={(e) => setReassignData({ ...reassignData, reason: e.target.value })}
                placeholder={t("مثال: غياب السائق الأصلي", "e.g., Original driver absent")}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button onClick={handleReassign} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : t("تأكيد", "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverSchedule;
