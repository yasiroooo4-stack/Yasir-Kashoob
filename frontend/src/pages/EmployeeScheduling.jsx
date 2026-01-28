import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API, useLanguage } from "../App";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  Search, 
  Users, 
  Sun, 
  Sunset, 
  Moon,
  Save,
  Edit2,
  Filter,
  Truck,
  CalendarDays,
} from "lucide-react";
import DriverSchedule from "./DriverSchedule";

const EmployeeScheduling = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [activeMainTab, setActiveMainTab] = useState("employees");
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterShift, setFilterShift] = useState("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    shift_type: "morning",
    weekly_off_days: [4, 5], // Friday=4 and Saturday=5 by default
  });

  const SHIFTS = [
    { id: "morning", name: "صباحي", name_en: "Morning", icon: Sun, color: "bg-amber-100 text-amber-700" },
    { id: "afternoon", name: "مسائي", name_en: "Afternoon", icon: Sunset, color: "bg-orange-100 text-orange-700" },
    { id: "night", name: "ليلي", name_en: "Night", icon: Moon, color: "bg-indigo-100 text-indigo-700" },
  ];

  const WEEKDAYS = [
    { id: 0, name: "الأحد", name_en: "Sunday" },
    { id: 1, name: "الإثنين", name_en: "Monday" },
    { id: 2, name: "الثلاثاء", name_en: "Tuesday" },
    { id: 3, name: "الأربعاء", name_en: "Wednesday" },
    { id: 4, name: "الخميس", name_en: "Thursday" },
    { id: 5, name: "الجمعة", name_en: "Friday" },
    { id: 6, name: "السبت", name_en: "Saturday" },
  ];

  const DEPARTMENTS = [
    { id: "hr", name: "الموارد البشرية", name_en: "HR" },
    { id: "finance", name: "المالية", name_en: "Finance" },
    { id: "milk_reception", name: "استلام الحليب", name_en: "Milk Reception" },
    { id: "purchasing", name: "المشتريات", name_en: "Purchasing" },
    { id: "sales", name: "المبيعات", name_en: "Sales" },
    { id: "operations", name: "العمليات", name_en: "Operations" },
    { id: "it", name: "تقنية المعلومات", name_en: "IT" },
    { id: "admin", name: "الإدارة", name_en: "Admin" },
  ];

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/hr/employees/work-schedules`);
      setEmployees(response.data);
    } catch (error) {
      toast.error(language === "ar" ? "فشل في تحميل البيانات" : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (employee) => {
    setSelectedEmployee(employee);
    setScheduleForm({
      shift_type: employee.shift_type || "morning",
      weekly_off_days: employee.weekly_off_days || [4, 5],
    });
    setEditDialogOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!selectedEmployee) return;

    try {
      const offDaysStr = scheduleForm.weekly_off_days.join(",");
      await axios.put(
        `${API}/hr/employees/${selectedEmployee.id}/work-schedule?shift_type=${scheduleForm.shift_type}&weekly_off_days=${offDaysStr}`
      );
      toast.success(language === "ar" ? "تم حفظ الجدول بنجاح" : "Schedule saved successfully");
      setEditDialogOpen(false);
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === "ar" ? "فشل في الحفظ" : "Failed to save"));
    }
  };

  const handleBulkSave = async () => {
    if (selectedEmployees.length === 0) {
      toast.error(language === "ar" ? "يرجى اختيار موظف واحد على الأقل" : "Please select at least one employee");
      return;
    }

    try {
      const offDaysStr = scheduleForm.weekly_off_days.join(",");
      let successCount = 0;
      
      for (const empId of selectedEmployees) {
        try {
          await axios.put(
            `${API}/hr/employees/${empId}/work-schedule?shift_type=${scheduleForm.shift_type}&weekly_off_days=${offDaysStr}`
          );
          successCount++;
        } catch (e) {
          console.error(`Failed to update employee ${empId}`);
        }
      }

      toast.success(
        language === "ar" 
          ? `تم تحديث ${successCount} موظف بنجاح` 
          : `Successfully updated ${successCount} employees`
      );
      
      setSelectedEmployees([]);
      setBulkEditMode(false);
      fetchEmployees();
    } catch (error) {
      toast.error(language === "ar" ? "فشل في التحديث الجماعي" : "Bulk update failed");
    }
  };

  const toggleEmployeeSelection = (empId) => {
    setSelectedEmployees(prev => 
      prev.includes(empId) 
        ? prev.filter(id => id !== empId)
        : [...prev, empId]
    );
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredEmployees.map(e => e.id);
    setSelectedEmployees(filteredIds);
  };

  const clearSelection = () => {
    setSelectedEmployees([]);
  };

  const toggleOffDay = (dayId) => {
    setScheduleForm(prev => ({
      ...prev,
      weekly_off_days: prev.weekly_off_days.includes(dayId)
        ? prev.weekly_off_days.filter(d => d !== dayId)
        : [...prev.weekly_off_days, dayId]
    }));
  };

  const getShiftInfo = (shiftType) => {
    return SHIFTS.find(s => s.id === shiftType) || SHIFTS[0];
  };

  const getDepartmentName = (dept) => {
    const department = DEPARTMENTS.find(d => d.id === dept);
    return department 
      ? (language === "ar" ? department.name : department.name_en)
      : dept || "-";
  };

  const getOffDaysDisplay = (offDays) => {
    if (!offDays || offDays.length === 0) return "-";
    return offDays.map(d => {
      const day = WEEKDAYS.find(w => w.id === d);
      return day ? (language === "ar" ? day.name : day.name_en.slice(0, 3)) : d;
    }).join(", ");
  };

  const filteredEmployees = employees.filter((emp) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (emp.name?.toLowerCase() || '').includes(searchLower) ||
      (emp.employee_id || '').includes(searchTerm);
    
    const matchesDepartment = filterDepartment === "all" || emp.department === filterDepartment;
    const matchesShift = filterShift === "all" || emp.shift_type === filterShift;
    
    return matchesSearch && matchesDepartment && matchesShift;
  });

  if (loading && activeMainTab === "employees") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="employee-scheduling-page">
      {/* Main Tabs */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {language === "ar" ? "جدولة العمل" : "Work Scheduling"}
            </h1>
            <p className="text-muted-foreground">
              {language === "ar" ? "إدارة جداول الموظفين والسائقين" : "Manage employee and driver schedules"}
            </p>
          </div>
          <TabsList className="grid grid-cols-2 w-[300px]">
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              {language === "ar" ? "جدول الموظفين" : "Employees"}
            </TabsTrigger>
            <TabsTrigger value="drivers" className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              {language === "ar" ? "جدول السائقين" : "Drivers"}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-6">
          {/* Employee Schedule Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {language === "ar" ? "ورديات الموظفين" : "Employee Shifts"}
              </h2>
            </div>
            <div className="flex gap-2">
              {bulkEditMode ? (
                <>
                  <Button variant="outline" onClick={() => { setBulkEditMode(false); clearSelection(); }}>
                    {language === "ar" ? "إلغاء" : "Cancel"}
                  </Button>
                  <Button 
                    onClick={handleBulkSave}
                    className="gradient-primary text-white"
                    disabled={selectedEmployees.length === 0}
                  >
                    <Save className="w-4 h-4 me-2" />
                    {language === "ar" ? `حفظ (${selectedEmployees.length})` : `Save (${selectedEmployees.length})`}
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => setBulkEditMode(true)}
                  variant="outline"
                  data-testid="bulk-edit-btn"
                >
                  <Edit2 className="w-4 h-4 me-2" />
                  {language === "ar" ? "تعديل جماعي" : "Bulk Edit"}
                </Button>
              )}
            </div>
          </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{employees.length}</p>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "إجمالي الموظفين" : "Total Employees"}
              </p>
            </div>
          </CardContent>
        </Card>
        
        {SHIFTS.map(shift => {
          const count = employees.filter(e => e.shift_type === shift.id).length;
          const Icon = shift.icon;
          return (
            <Card key={shift.id} className="stat-card">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${shift.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" ? shift.name : shift.name_en}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bulk Edit Settings (when in bulk mode) */}
      {bulkEditMode && (
        <Card className="border-2 border-primary/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              {language === "ar" ? "إعدادات التعديل الجماعي" : "Bulk Edit Settings"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2 min-w-[200px]">
                <Label>{language === "ar" ? "الوردية" : "Shift"}</Label>
                <Select 
                  value={scheduleForm.shift_type} 
                  onValueChange={(v) => setScheduleForm(prev => ({ ...prev, shift_type: v }))}
                >
                  <SelectTrigger data-testid="bulk-shift-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFTS.map(shift => (
                      <SelectItem key={shift.id} value={shift.id}>
                        {language === "ar" ? shift.name : shift.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 flex-1">
                <Label>{language === "ar" ? "أيام الإجازة الأسبوعية" : "Weekly Off Days"}</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map(day => (
                    <Button
                      key={day.id}
                      type="button"
                      variant={scheduleForm.weekly_off_days.includes(day.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleOffDay(day.id)}
                      className={scheduleForm.weekly_off_days.includes(day.id) ? "gradient-primary text-white" : ""}
                    >
                      {language === "ar" ? day.name : day.name_en.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={selectAllFiltered}>
                {language === "ar" ? "تحديد الكل" : "Select All"}
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                {language === "ar" ? "إلغاء التحديد" : "Clear Selection"}
              </Button>
              <span className="text-sm text-muted-foreground self-center ms-2">
                {language === "ar" 
                  ? `${selectedEmployees.length} موظف محدد`
                  : `${selectedEmployees.length} employees selected`}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters & Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {language === "ar" ? "جدول الموظفين" : "Employee Schedule"} ({filteredEmployees.length})
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-full sm:w-40" data-testid="filter-department">
                  <Filter className="w-4 h-4 me-2" />
                  <SelectValue placeholder={language === "ar" ? "القسم" : "Department"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "ar" ? "جميع الأقسام" : "All Departments"}</SelectItem>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {language === "ar" ? dept.name : dept.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterShift} onValueChange={setFilterShift}>
                <SelectTrigger className="w-full sm:w-36" data-testid="filter-shift">
                  <Clock className="w-4 h-4 me-2" />
                  <SelectValue placeholder={language === "ar" ? "الوردية" : "Shift"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "ar" ? "جميع الورديات" : "All Shifts"}</SelectItem>
                  {SHIFTS.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      {language === "ar" ? shift.name : shift.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="relative w-full sm:w-64">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={language === "ar" ? "بحث بالاسم أو الرقم..." : "Search by name or ID..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="ps-9"
                  data-testid="search-employees"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {bulkEditMode && (
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                        onCheckedChange={(checked) => checked ? selectAllFiltered() : clearSelection()}
                      />
                    </TableHead>
                  )}
                  <TableHead>{language === "ar" ? "اسم الموظف" : "Employee Name"}</TableHead>
                  <TableHead>{language === "ar" ? "رقم الموظف" : "Employee ID"}</TableHead>
                  <TableHead>{language === "ar" ? "القسم" : "Department"}</TableHead>
                  <TableHead>{language === "ar" ? "الوردية" : "Shift"}</TableHead>
                  <TableHead>{language === "ar" ? "أيام الإجازة" : "Off Days"}</TableHead>
                  {!bulkEditMode && <TableHead>{t("actions")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={bulkEditMode ? 7 : 6} className="text-center py-8 text-muted-foreground">
                      {language === "ar" ? "لا توجد بيانات" : "No data available"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => {
                    const shiftInfo = getShiftInfo(employee.shift_type);
                    const ShiftIcon = shiftInfo.icon;
                    
                    return (
                      <TableRow 
                        key={employee.id} 
                        className={`table-row-hover ${selectedEmployees.includes(employee.id) ? 'bg-primary/10' : ''}`}
                        data-testid={`employee-row-${employee.id}`}
                      >
                        {bulkEditMode && (
                          <TableCell>
                            <Checkbox 
                              checked={selectedEmployees.includes(employee.id)}
                              onCheckedChange={() => toggleEmployeeSelection(employee.id)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{employee.employee_id || "-"}</Badge>
                        </TableCell>
                        <TableCell>{getDepartmentName(employee.department)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${shiftInfo.color}`}>
                            <ShiftIcon className="w-3 h-3" />
                            {language === "ar" ? shiftInfo.name : shiftInfo.name_en}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {getOffDaysDisplay(employee.weekly_off_days)}
                          </span>
                        </TableCell>
                        {!bulkEditMode && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(employee)}
                              data-testid={`edit-schedule-${employee.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Single Employee Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === "ar" ? "تعديل جدول العمل" : "Edit Work Schedule"}
            </DialogTitle>
            <DialogDescription>
              {selectedEmployee?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "الوردية" : "Shift"}</Label>
              <Select 
                value={scheduleForm.shift_type} 
                onValueChange={(v) => setScheduleForm(prev => ({ ...prev, shift_type: v }))}
              >
                <SelectTrigger data-testid="edit-shift-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFTS.map(shift => (
                    <SelectItem key={shift.id} value={shift.id}>
                      <span className="flex items-center gap-2">
                        <shift.icon className="w-4 h-4" />
                        {language === "ar" ? shift.name : shift.name_en}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>{language === "ar" ? "أيام الإجازة الأسبوعية" : "Weekly Off Days"}</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map(day => (
                  <Button
                    key={day.id}
                    type="button"
                    variant={scheduleForm.weekly_off_days.includes(day.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleOffDay(day.id)}
                    className={scheduleForm.weekly_off_days.includes(day.id) ? "gradient-primary text-white" : ""}
                  >
                    {language === "ar" ? day.name : day.name_en}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === "ar" 
                  ? "اضغط على الأيام لتحديدها كأيام إجازة"
                  : "Click on days to mark them as off days"}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSaveSchedule} className="gradient-primary text-white" data-testid="save-schedule-btn">
              <Save className="w-4 h-4 me-2" />
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers">
          <DriverSchedule embedded={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeScheduling;
