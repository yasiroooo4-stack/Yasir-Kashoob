import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Plus, CalendarIcon } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import axios from "axios";
import { toast } from "sonner";
import { useLanguage } from "../App";

const API = process.env.REACT_APP_BACKEND_URL;

const LETTER_TYPES = [
  { id: "salary_certificate", name: "شهادة راتب", name_en: "Salary Certificate" },
  { id: "salary_continuity_certificate", name: "شهادة استمرارية راتب", name_en: "Salary Continuity Certificate" },
  { id: "employment_letter", name: "شهادة عمل", name_en: "Employment Letter" },
  { id: "experience_letter", name: "شهادة خبرة", name_en: "Experience Letter" },
  { id: "mission_letter", name: "خطاب مهمة", name_en: "Mission Letter" },
  { id: "no_objection", name: "خطاب عدم ممانعة", name_en: "No Objection Letter" },
];

const LetterRequestButton = ({ currentUser }) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [fetchError, setFetchError] = useState(false);
  
  // Check if user is admin or hr_manager
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'hr_manager';
  
  const [letterForm, setLetterForm] = useState({
    employee_id: "",
    employee_name: "",
    department: "",
    position: "",
    letter_type: "salary_certificate",
    purpose: "",
    recipient: "",
    content: "",
    leave_start_date: null,
    leave_end_date: null,
  });

  // Fetch employees when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      if (isAdmin) {
        fetchEmployees();
      } else {
        // For regular employees, fetch only their own data
        fetchCurrentEmployee();
      }
    }
  }, [dialogOpen, isAdmin]);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const response = await axios.get(`${API}/api/hr/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(response.data)) {
        setEmployees(response.data);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      setFetchError(true);
    }
  };

  const fetchCurrentEmployee = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const response = await axios.get(`${API}/api/hr/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!Array.isArray(response.data)) return;
      
      // Find the employee that matches the current user
      const myEmployee = response.data.find(
        emp => emp.username === currentUser?.username || 
               emp.name === currentUser?.full_name ||
               emp.id === currentUser?.employee_id ||
               emp.id === currentUser?.id
      );
      
      if (myEmployee) {
        setCurrentEmployee(myEmployee);
        // Auto-fill the form with current employee data
        setLetterForm(prev => ({
          ...prev,
          employee_id: myEmployee.id,
          employee_name: myEmployee.name,
          department: myEmployee.department || "",
          position: myEmployee.position || "",
        }));
      } else {
        // If no employee found, use current user data
        setLetterForm(prev => ({
          ...prev,
          employee_id: currentUser?.id || "",
          employee_name: currentUser?.full_name || "",
          department: currentUser?.department || "",
          position: "",
        }));
      }
    } catch (error) {
      console.error("Error fetching current employee:", error);
      // On error, still populate with current user data
      setLetterForm(prev => ({
        ...prev,
        employee_id: currentUser?.id || "",
        employee_name: currentUser?.full_name || "",
        department: currentUser?.department || "",
      }));
    }
  };
  
  // Don't render if no user
  if (!currentUser) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!letterForm.employee_id) {
      toast.error(language === "ar" ? "يرجى اختيار الموظف" : "Please select an employee");
      return;
    }

    // Validate leave dates if letter type is leave_request
    if (letterForm.letter_type === "leave_request") {
      if (!letterForm.leave_start_date || !letterForm.leave_end_date) {
        toast.error(language === "ar" ? "يرجى تحديد فترة الإجازة" : "Please select leave period");
        return;
      }
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      // Prepare submission data
      const submitData = { ...letterForm };
      if (letterForm.leave_start_date) {
        submitData.leave_start_date = format(letterForm.leave_start_date, "yyyy-MM-dd");
      }
      if (letterForm.leave_end_date) {
        submitData.leave_end_date = format(letterForm.leave_end_date, "yyyy-MM-dd");
      }
      
      await axios.post(`${API}/api/hr/official-letters`, submitData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(language === "ar" ? "تم إرسال طلب الرسالة بنجاح" : "Letter request submitted successfully");
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === "ar" ? "حدث خطأ" : "An error occurred"));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    if (isAdmin) {
      setLetterForm({
        employee_id: "",
        employee_name: "",
        department: "",
        position: "",
        letter_type: "salary_certificate",
        purpose: "",
        recipient: "",
        content: "",
        leave_start_date: null,
        leave_end_date: null,
      });
    } else if (currentEmployee) {
      // Keep current employee data for regular employees
      setLetterForm({
        employee_id: currentEmployee.id,
        employee_name: currentEmployee.name,
        department: currentEmployee.department || "",
        position: currentEmployee.position || "",
        letter_type: "salary_certificate",
        purpose: "",
        recipient: "",
        content: "",
        leave_start_date: null,
        leave_end_date: null,
      });
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    if (emp) {
      setLetterForm({
        ...letterForm,
        employee_id: employeeId,
        employee_name: emp.name,
        department: emp.department || "",
        position: emp.position || "",
      });
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        className="gap-2"
        title={language === "ar" ? "طلب رسالة رسمية" : "Request Official Letter"}
      >
        <FileText className="w-4 h-4" />
        <span className="hidden md:inline">
          {language === "ar" ? "طلب رسالة" : "Request Letter"}
        </span>
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {language === "ar" ? "طلب رسالة رسمية" : "Request Official Letter"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Employee Selection - Only for Admin/HR Manager */}
            {isAdmin ? (
              <div className="space-y-2">
                <Label>{language === "ar" ? "الموظف" : "Employee"} *</Label>
                <Select
                  value={letterForm.employee_id}
                  onValueChange={handleEmployeeSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === "ar" ? "اختر الموظف" : "Select Employee"} />
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
            ) : (
              // For regular employees - show their own name (read-only)
              <div className="space-y-2">
                <Label>{language === "ar" ? "الموظف" : "Employee"}</Label>
                <Input 
                  value={letterForm.employee_name || currentUser?.full_name || ""} 
                  disabled 
                  className="bg-muted font-medium"
                />
              </div>
            )}

            {/* Department (Auto-filled) */}
            {letterForm.department && (
              <div className="space-y-2">
                <Label>{language === "ar" ? "القسم" : "Department"}</Label>
                <Input value={letterForm.department} disabled className="bg-muted" />
              </div>
            )}

            {/* Position */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "المنصب" : "Position"}</Label>
              <Input
                value={letterForm.position}
                onChange={(e) => setLetterForm({ ...letterForm, position: e.target.value })}
                placeholder={language === "ar" ? "أدخل المنصب" : "Enter position"}
              />
            </div>

            {/* Letter Type */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "نوع الرسالة" : "Letter Type"} *</Label>
              <Select
                value={letterForm.letter_type}
                onValueChange={(v) => setLetterForm({ ...letterForm, letter_type: v, leave_start_date: null, leave_end_date: null })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LETTER_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {language === "ar" ? type.name : type.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Leave Date Range - Only shown when letter_type is "leave_request" */}
            {letterForm.letter_type === "leave_request" && (
              <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Label className="text-blue-700 dark:text-blue-300 font-semibold">
                  {language === "ar" ? "فترة الإجازة" : "Leave Period"} *
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">
                      {language === "ar" ? "من تاريخ" : "From Date"}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${
                            !letterForm.leave_start_date && "text-muted-foreground"
                          }`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {letterForm.leave_start_date ? (
                            format(letterForm.leave_start_date, "PPP", { locale: language === "ar" ? ar : enUS })
                          ) : (
                            <span>{language === "ar" ? "اختر التاريخ" : "Pick a date"}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={letterForm.leave_start_date}
                          onSelect={(date) => setLetterForm({ ...letterForm, leave_start_date: date })}
                          initialFocus
                          locale={language === "ar" ? ar : enUS}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* End Date */}
                  <div className="space-y-1">
                    <Label className="text-sm text-muted-foreground">
                      {language === "ar" ? "إلى تاريخ" : "To Date"}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${
                            !letterForm.leave_end_date && "text-muted-foreground"
                          }`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {letterForm.leave_end_date ? (
                            format(letterForm.leave_end_date, "PPP", { locale: language === "ar" ? ar : enUS })
                          ) : (
                            <span>{language === "ar" ? "اختر التاريخ" : "Pick a date"}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={letterForm.leave_end_date}
                          onSelect={(date) => setLetterForm({ ...letterForm, leave_end_date: date })}
                          disabled={(date) => letterForm.leave_start_date && date < letterForm.leave_start_date}
                          initialFocus
                          locale={language === "ar" ? ar : enUS}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {letterForm.leave_start_date && letterForm.leave_end_date && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                    {language === "ar" ? "مدة الإجازة: " : "Leave Duration: "}
                    {Math.ceil((letterForm.leave_end_date - letterForm.leave_start_date) / (1000 * 60 * 60 * 24)) + 1}
                    {language === "ar" ? " يوم" : " days"}
                  </p>
                )}
              </div>
            )}

            {/* Purpose */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "الغرض من الرسالة" : "Purpose"}</Label>
              <Textarea
                value={letterForm.purpose}
                onChange={(e) => setLetterForm({ ...letterForm, purpose: e.target.value })}
                placeholder={language === "ar" ? "اكتب الغرض من طلب الرسالة..." : "Enter the purpose of the letter..."}
                rows={2}
              />
            </div>

            {/* Recipient */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "الجهة المستلمة" : "Recipient"}</Label>
              <Input
                value={letterForm.recipient}
                onChange={(e) => setLetterForm({ ...letterForm, recipient: e.target.value })}
                placeholder={language === "ar" ? "مثال: السفارة، البنك..." : "e.g., Embassy, Bank..."}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
                disabled={loading}
              >
                {t("cancel")}
              </Button>
              <Button 
                type="submit" 
                className="gradient-primary text-white"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    {language === "ar" ? "جاري الإرسال..." : "Submitting..."}
                  </span>
                ) : (
                  <>
                    <Plus className="w-4 h-4 me-2" />
                    {language === "ar" ? "إرسال الطلب" : "Submit Request"}
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

export default LetterRequestButton;
