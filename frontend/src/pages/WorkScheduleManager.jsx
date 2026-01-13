import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { API, useLanguage } from "../App";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
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
import { Checkbox } from "../components/ui/checkbox";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import {
  Clock,
  Calendar,
  Users,
  RefreshCw,
  Save,
  Pencil,
  Sun,
  Sunset,
  Moon,
  Search,
} from "lucide-react";

const SHIFT_TYPES = [
  { id: "morning", name_ar: "صباحي", name_en: "Morning", icon: Sun, color: "text-amber-500", time: "6:00 - 14:00" },
  { id: "afternoon", name_ar: "مسائي", name_en: "Afternoon", icon: Sunset, color: "text-orange-500", time: "14:00 - 22:00" },
  { id: "night", name_ar: "ليلي", name_en: "Night", icon: Moon, color: "text-blue-500", time: "22:00 - 6:00" },
];

const DAYS = [
  { id: 0, name_ar: "الأحد", name_en: "Sunday", short_ar: "أحد", short_en: "Sun" },
  { id: 1, name_ar: "الإثنين", name_en: "Monday", short_ar: "إثن", short_en: "Mon" },
  { id: 2, name_ar: "الثلاثاء", name_en: "Tuesday", short_ar: "ثلا", short_en: "Tue" },
  { id: 3, name_ar: "الأربعاء", name_en: "Wednesday", short_ar: "أرب", short_en: "Wed" },
  { id: 4, name_ar: "الخميس", name_en: "Thursday", short_ar: "خمي", short_en: "Thu" },
  { id: 5, name_ar: "الجمعة", name_en: "Friday", short_ar: "جمع", short_en: "Fri" },
  { id: 6, name_ar: "السبت", name_en: "Saturday", short_ar: "سبت", short_en: "Sat" },
];

const WorkScheduleManager = () => {
  const { language } = useLanguage();
  const t = (ar, en) => language === "ar" ? ar : en;
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editForm, setEditForm] = useState({ shift_type: "morning", weekly_off_days: [4, 5] });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/hr/employees/work-schedules`, { headers });
      setEmployees(res.data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("فشل في تحميل بيانات الموظفين");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (employee) => {
    setSelectedEmployee(employee);
    setEditForm({
      shift_type: employee.shift_type || "morning",
      weekly_off_days: employee.weekly_off_days || [4, 5],
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedEmployee) return;
    
    try {
      setLoading(true);
      await axios.put(
        `${API}/api/hr/employees/${selectedEmployee.id}/work-schedule?shift_type=${editForm.shift_type}&weekly_off_days=${editForm.weekly_off_days.join(",")}`,
        {},
        { headers }
      );
      toast.success("تم تحديث جدول العمل بنجاح");
      setEditDialogOpen(false);
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل في تحديث جدول العمل");
    } finally {
      setLoading(false);
    }
  };

  const toggleDayOff = (dayId) => {
    setEditForm(prev => {
      const days = prev.weekly_off_days.includes(dayId)
        ? prev.weekly_off_days.filter(d => d !== dayId)
        : [...prev.weekly_off_days, dayId];
      return { ...prev, weekly_off_days: days };
    });
  };

  const getShiftInfo = (shiftType) => {
    return SHIFT_TYPES.find(s => s.id === shiftType) || SHIFT_TYPES[0];
  };

  const filteredEmployees = employees.filter(emp =>
    !searchQuery ||
    emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employee_id?.includes(searchQuery) ||
    emp.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-7 h-7" />
            جداول العمل والإجازات
          </h1>
          <p className="text-muted-foreground">إدارة أوقات العمل وأيام الإجازة لجميع الموظفين</p>
        </div>
        <Button onClick={fetchEmployees} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 me-2 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SHIFT_TYPES.map(shift => {
          const ShiftIcon = shift.icon;
          const count = employees.filter(e => e.shift_type === shift.id).length;
          return (
            <Card key={shift.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full bg-muted ${shift.color}`}>
                    <ShiftIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">وردية {shift.name}</p>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{shift.time}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الكود أو القسم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            قائمة الموظفين ({filteredEmployees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>القسم</TableHead>
                  <TableHead>الوردية</TableHead>
                  <TableHead>أيام الإجازة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => {
                  const shift = getShiftInfo(emp.shift_type);
                  const ShiftIcon = shift.icon;
                  const offDays = (emp.weekly_off_days || [4, 5]).map(d => DAYS.find(day => day.id === d)?.short || d);
                  
                  return (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono">{emp.employee_id}</TableCell>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{emp.department}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ShiftIcon className={`w-4 h-4 ${shift.color}`} />
                          <span>{shift.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {offDays.map((day, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {day}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(emp)}>
                          <Pencil className="w-4 h-4 me-1" />
                          تعديل
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              تعديل جدول العمل
            </DialogTitle>
          </DialogHeader>
          
          {selectedEmployee && (
            <div className="space-y-6">
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-bold">{selectedEmployee.name}</p>
                <p className="text-sm text-muted-foreground">{selectedEmployee.employee_id} - {selectedEmployee.department}</p>
              </div>

              {/* Shift Type */}
              <div className="space-y-3">
                <Label className="font-bold">نوع الوردية</Label>
                <div className="grid grid-cols-3 gap-3">
                  {SHIFT_TYPES.map(shift => {
                    const ShiftIcon = shift.icon;
                    const isSelected = editForm.shift_type === shift.id;
                    return (
                      <button
                        key={shift.id}
                        onClick={() => setEditForm({ ...editForm, shift_type: shift.id })}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? "border-primary bg-primary/10" 
                            : "border-muted hover:border-primary/50"
                        }`}
                      >
                        <ShiftIcon className={`w-8 h-8 mx-auto mb-2 ${shift.color}`} />
                        <p className="font-medium">{shift.name}</p>
                        <p className="text-xs text-muted-foreground">{shift.time}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weekly Off Days */}
              <div className="space-y-3">
                <Label className="font-bold">أيام الإجازة الأسبوعية</Label>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map(day => {
                    const isOff = editForm.weekly_off_days.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        onClick={() => toggleDayOff(day.id)}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          isOff
                            ? "bg-red-100 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-green-50 border-green-300 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        <Calendar className={`w-4 h-4 mx-auto mb-1 ${isOff ? "text-red-500" : "text-green-500"}`} />
                        <p className="text-xs font-medium">{day.short}</p>
                        <p className="text-xs">{isOff ? "إجازة" : "عمل"}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />}
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkScheduleManager;
