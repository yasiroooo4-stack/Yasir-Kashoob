import { useState, useEffect } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { format, differenceInDays } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import axios from "axios";
import { toast } from "sonner";
import { useLanguage, API, useAuth } from "../App";

const LEAVE_TYPES = [
  { id: "annual", name: "إجازة سنوية", name_en: "Annual Leave" },
  { id: "sick", name: "إجازة مرضية", name_en: "Sick Leave" },
  { id: "emergency", name: "إجازة طارئة", name_en: "Emergency Leave" },
  { id: "unpaid", name: "إجازة بدون راتب", name_en: "Unpaid Leave" },
  { id: "maternity", name: "إجازة أمومة", name_en: "Maternity Leave" },
  { id: "paternity", name: "إجازة أبوة", name_en: "Paternity Leave" },
  { id: "hajj", name: "إجازة حج", name_en: "Hajj Leave" },
  { id: "marriage", name: "إجازة زواج", name_en: "Marriage Leave" },
  { id: "bereavement", name: "إجازة عزاء", name_en: "Bereavement Leave" },
];

const LeaveRequestButton = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState(null);

  const isAdmin = user?.role === "admin" || user?.role === "hr_manager";

  const [leaveForm, setLeaveForm] = useState({
    employee_id: "",
    employee_name: "",
    leave_type: "annual",
    start_date: null,
    end_date: null,
    reason: "",
    notes: "",
    substitute_employee_id: "",
    substitute_employee_name: "",
    delegate_permissions_to_id: "",
    delegate_permissions_to_name: "",
    attachment_url: "",
  });
  
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  useEffect(() => {
    if (dialogOpen) {
      fetchEmployees();
      if (!isAdmin) {
        fetchCurrentEmployee();
      }
    }
  }, [dialogOpen, isAdmin]);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/hr/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(res.data || []);
    } catch (error) {
      console.log("Could not fetch employees");
    }
  };

  const fetchCurrentEmployee = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/hr/employees/current`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        setCurrentEmployee(res.data);
        setLeaveForm(prev => ({
          ...prev,
          employee_id: res.data.id,
          employee_name: res.data.name,
        }));
        setLeaveBalance(res.data.leave_balance || 21);
      }
    } catch (error) {
      console.log("Could not fetch current employee");
    }
  };

  const fetchEmployeeBalance = async (employeeId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/hr/employees/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        setLeaveBalance(res.data.leave_balance || 21);
      }
    } catch (error) {
      console.log("Could not fetch employee balance");
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      setLeaveForm(prev => ({
        ...prev,
        employee_id: employee.id,
        employee_name: employee.name,
      }));
      fetchEmployeeBalance(employeeId);
    }
  };

  const calculateDays = () => {
    if (leaveForm.start_date && leaveForm.end_date) {
      return differenceInDays(leaveForm.end_date, leaveForm.start_date) + 1;
    }
    return 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!leaveForm.employee_id) {
      toast.error(language === "ar" ? "يرجى اختيار الموظف" : "Please select an employee");
      return;
    }

    if (!leaveForm.start_date || !leaveForm.end_date) {
      toast.error(language === "ar" ? "يرجى تحديد تاريخ الإجازة" : "Please select leave dates");
      return;
    }

    if (leaveForm.end_date < leaveForm.start_date) {
      toast.error(language === "ar" ? "تاريخ النهاية يجب أن يكون بعد تاريخ البداية" : "End date must be after start date");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      // Upload attachment if selected
      let attachmentUrl = leaveForm.attachment_url;
      if (attachmentFile) {
        setUploadingAttachment(true);
        const formData = new FormData();
        formData.append("file", attachmentFile);
        
        const uploadRes = await axios.post(`${API}/hr/upload-file`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        });
        attachmentUrl = uploadRes.data.file_url;
        setUploadingAttachment(false);
      }
      
      const data = {
        employee_id: leaveForm.employee_id,
        employee_name: leaveForm.employee_name,
        leave_type: leaveForm.leave_type,
        start_date: format(leaveForm.start_date, "yyyy-MM-dd"),
        end_date: format(leaveForm.end_date, "yyyy-MM-dd"),
        reason: leaveForm.reason || "",
        days_count: calculateDays(),
        substitute_employee_id: leaveForm.substitute_employee_id === "none" ? null : leaveForm.substitute_employee_id,
        substitute_employee_name: leaveForm.substitute_employee_id === "none" ? null : leaveForm.substitute_employee_name,
        delegate_permissions_to_id: leaveForm.delegate_permissions_to_id === "none" ? null : leaveForm.delegate_permissions_to_id,
        delegate_permissions_to_name: leaveForm.delegate_permissions_to_id === "none" ? null : leaveForm.delegate_permissions_to_name,
        attachment_url: attachmentUrl,
      };

      await axios.post(`${API}/hr/leave-requests`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(language === "ar" ? "تم إرسال طلب الإجازة بنجاح" : "Leave request submitted successfully");
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      setUploadingAttachment(false);
      // Handle error properly - ensure we get a string message
      let errorMessage = language === "ar" ? "حدث خطأ" : "An error occurred";
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === "string") {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          // Pydantic validation errors come as array
          errorMessage = detail.map(e => e.msg || e.message || JSON.stringify(e)).join(", ");
        } else if (typeof detail === "object") {
          errorMessage = detail.msg || detail.message || JSON.stringify(detail);
        }
      }
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLeaveForm({
      employee_id: currentEmployee?.id || "",
      employee_name: currentEmployee?.name || "",
      leave_type: "annual",
      start_date: null,
      end_date: null,
      reason: "",
      notes: "",
      substitute_employee_id: "",
      substitute_employee_name: "",
      delegate_permissions_to_id: "",
      delegate_permissions_to_name: "",
      attachment_url: "",
    });
    setAttachmentFile(null);
  };
    setLeaveBalance(null);
  };

  const days = calculateDays();

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        className="gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
        data-testid="leave-request-btn"
      >
        <CalendarDays className="w-4 h-4" />
        {language === "ar" ? "طلب إجازة" : "Leave Request"}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-green-600" />
              {language === "ar" ? "طلب إجازة جديد" : "New Leave Request"}
            </DialogTitle>
            <DialogDescription>
              {language === "ar" ? "تقديم طلب إجازة للموافقة" : "Submit a leave request for approval"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Employee Selection (Admin only) */}
            {isAdmin && (
              <div className="space-y-2">
                <Label>{language === "ar" ? "الموظف" : "Employee"} *</Label>
                <Select
                  value={leaveForm.employee_id}
                  onValueChange={handleEmployeeSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === "ar" ? "اختر الموظف" : "Select employee"} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} - {emp.employee_code || emp.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Employee Name (Non-admin) */}
            {!isAdmin && currentEmployee && (
              <div className="space-y-2">
                <Label>{language === "ar" ? "الموظف" : "Employee"}</Label>
                <Input value={currentEmployee.name} disabled className="bg-muted" />
              </div>
            )}

            {/* Leave Balance */}
            {leaveBalance !== null && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  {language === "ar" ? "رصيد الإجازات المتبقي: " : "Remaining leave balance: "}
                  <span className="font-bold">{leaveBalance}</span>
                  {language === "ar" ? " يوم" : " days"}
                </p>
              </div>
            )}

            {/* Leave Type */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "نوع الإجازة" : "Leave Type"} *</Label>
              <Select
                value={leaveForm.leave_type}
                onValueChange={(v) => setLeaveForm({ ...leaveForm, leave_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {language === "ar" ? type.name : type.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <Label>{language === "ar" ? "من تاريخ" : "From Date"} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        !leaveForm.start_date && "text-muted-foreground"
                      }`}
                    >
                      {leaveForm.start_date ? (
                        format(leaveForm.start_date, "PPP", { locale: language === "ar" ? ar : enUS })
                      ) : (
                        <span>{language === "ar" ? "اختر التاريخ" : "Pick a date"}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={leaveForm.start_date}
                      onSelect={(date) => setLeaveForm({ ...leaveForm, start_date: date })}
                      initialFocus
                      locale={language === "ar" ? ar : enUS}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label>{language === "ar" ? "إلى تاريخ" : "To Date"} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        !leaveForm.end_date && "text-muted-foreground"
                      }`}
                    >
                      {leaveForm.end_date ? (
                        format(leaveForm.end_date, "PPP", { locale: language === "ar" ? ar : enUS })
                      ) : (
                        <span>{language === "ar" ? "اختر التاريخ" : "Pick a date"}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={leaveForm.end_date}
                      onSelect={(date) => setLeaveForm({ ...leaveForm, end_date: date })}
                      disabled={(date) => leaveForm.start_date && date < leaveForm.start_date}
                      initialFocus
                      locale={language === "ar" ? ar : enUS}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Days Calculation */}
            {days > 0 && (
              <div className={`p-3 rounded-lg border ${
                leaveBalance !== null && days > leaveBalance 
                  ? "bg-red-50 border-red-200" 
                  : "bg-green-50 border-green-200"
              }`}>
                <p className={`text-sm ${
                  leaveBalance !== null && days > leaveBalance 
                    ? "text-red-700" 
                    : "text-green-700"
                }`}>
                  {language === "ar" ? "مدة الإجازة: " : "Leave Duration: "}
                  <span className="font-bold">{days}</span>
                  {language === "ar" ? " يوم" : " days"}
                  {leaveBalance !== null && days > leaveBalance && (
                    <span className="block mt-1 text-red-600 font-semibold">
                      {language === "ar" ? "⚠️ تجاوز الرصيد المتبقي!" : "⚠️ Exceeds available balance!"}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "سبب الإجازة" : "Reason"}</Label>
              <Textarea
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                placeholder={language === "ar" ? "اكتب سبب طلب الإجازة..." : "Enter the reason for leave..."}
                rows={3}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "ملاحظات" : "Notes"}</Label>
              <Input
                value={leaveForm.notes}
                onChange={(e) => setLeaveForm({ ...leaveForm, notes: e.target.value })}
                placeholder={language === "ar" ? "ملاحظات إضافية..." : "Additional notes..."}
              />
            </div>

            {/* Substitute Employee (Optional) */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "الموظف البديل (اختياري)" : "Substitute Employee (Optional)"}</Label>
              <Select
                value={leaveForm.substitute_employee_id}
                onValueChange={(employeeId) => {
                  const employee = employees.find(e => e.id === employeeId);
                  setLeaveForm(prev => ({
                    ...prev,
                    substitute_employee_id: employeeId,
                    substitute_employee_name: employee?.name || "",
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === "ar" ? "اختر الموظف البديل" : "Select substitute"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === "ar" ? "-- لا يوجد --" : "-- None --"}</SelectItem>
                  {employees.filter(e => e.id !== leaveForm.employee_id).map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} - {emp.employee_code || emp.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Delegate Permissions To (Optional) */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "تحويل الصلاحيات إلى (اختياري)" : "Delegate Permissions To (Optional)"}</Label>
              <Select
                value={leaveForm.delegate_permissions_to_id}
                onValueChange={(employeeId) => {
                  const employee = employees.find(e => e.id === employeeId);
                  setLeaveForm(prev => ({
                    ...prev,
                    delegate_permissions_to_id: employeeId,
                    delegate_permissions_to_name: employee?.name || "",
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === "ar" ? "اختر الموظف" : "Select employee"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === "ar" ? "-- لا يوجد --" : "-- None --"}</SelectItem>
                  {employees.filter(e => e.id !== leaveForm.employee_id).map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} - {emp.employee_code || emp.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                {loading ? (
                  <>{language === "ar" ? "جاري الإرسال..." : "Submitting..."}</>
                ) : (
                  <>
                    <Plus className="w-4 h-4 me-2" />
                    {language === "ar" ? "تقديم الطلب" : "Submit Request"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeaveRequestButton;
