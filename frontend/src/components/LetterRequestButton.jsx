import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Plus } from "lucide-react";
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
import axios from "axios";
import { toast } from "sonner";
import { useLanguage } from "../App";

const API = process.env.REACT_APP_BACKEND_URL;

const LETTER_TYPES = [
  { id: "salary_certificate", name: "شهادة راتب", name_en: "Salary Certificate" },
  { id: "employment_letter", name: "شهادة عمل", name_en: "Employment Letter" },
  { id: "experience_letter", name: "شهادة خبرة", name_en: "Experience Letter" },
  { id: "mission_letter", name: "خطاب مهمة", name_en: "Mission Letter" },
  { id: "no_objection", name: "خطاب عدم ممانعة", name_en: "No Objection Letter" },
  { id: "leave_request", name: "طلب إجازة", name_en: "Leave Request" },
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

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/api/hr/official-letters`, letterForm, {
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
                onValueChange={(v) => setLetterForm({ ...letterForm, letter_type: v })}
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
