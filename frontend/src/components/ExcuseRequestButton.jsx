import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Plus, Upload } from "lucide-react";
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

const EXCUSE_TYPES = [
  { id: "medical", name: "عذر طبي", name_en: "Medical Excuse" },
  { id: "accompanying", name: "مرافق مريض", name_en: "Accompanying Patient" },
  { id: "other", name: "سبب آخر", name_en: "Other Reason" },
];

const ExcuseRequestButton = ({ currentUser }) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  
  // Check if user is admin or hr_manager
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'hr_manager';
  
  const [excuseForm, setExcuseForm] = useState({
    employee_id: "",
    employee_name: "",
    excuse_date: new Date().toISOString().split('T')[0],
    excuse_type: "medical",
    reason: "",
    start_time: "",
    end_time: "",
    attachment_url: "",
    notes: "",
  });

  // Fetch employees when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      if (isAdmin) {
        fetchEmployees();
      } else {
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
      
      const myEmployee = response.data.find(
        emp => emp.username === currentUser?.username || 
               emp.name === currentUser?.full_name ||
               emp.id === currentUser?.employee_id ||
               emp.id === currentUser?.id
      );
      
      if (myEmployee) {
        setCurrentEmployee(myEmployee);
        setExcuseForm(prev => ({
          ...prev,
          employee_id: myEmployee.id,
          employee_name: myEmployee.name,
        }));
      } else {
        setExcuseForm(prev => ({
          ...prev,
          employee_id: currentUser?.id || "",
          employee_name: currentUser?.full_name || "",
        }));
      }
    } catch (error) {
      console.error("Error fetching current employee:", error);
      setExcuseForm(prev => ({
        ...prev,
        employee_id: currentUser?.id || "",
        employee_name: currentUser?.full_name || "",
      }));
    }
  };
  
  if (!currentUser) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!excuseForm.employee_id) {
      toast.error(language === "ar" ? "يرجى اختيار الموظف" : "Please select an employee");
      return;
    }
    
    if (!excuseForm.reason) {
      toast.error(language === "ar" ? "يرجى إدخال سبب العذر" : "Please enter excuse reason");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/api/hr/excuse-requests`, excuseForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(language === "ar" ? "تم إرسال طلب العذر بنجاح" : "Excuse request submitted successfully");
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
      setExcuseForm({
        employee_id: "",
        employee_name: "",
        excuse_date: new Date().toISOString().split('T')[0],
        excuse_type: "medical",
        reason: "",
        start_time: "",
        end_time: "",
        attachment_url: "",
        notes: "",
      });
    } else if (currentEmployee) {
      setExcuseForm({
        employee_id: currentEmployee.id,
        employee_name: currentEmployee.name,
        excuse_date: new Date().toISOString().split('T')[0],
        excuse_type: "medical",
        reason: "",
        start_time: "",
        end_time: "",
        attachment_url: "",
        notes: "",
      });
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    if (emp) {
      setExcuseForm({
        ...excuseForm,
        employee_id: employeeId,
        employee_name: emp.name,
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
        title={language === "ar" ? "طلب عذر" : "Request Excuse"}
        data-testid="excuse-request-btn"
      >
        <AlertCircle className="w-4 h-4" />
        <span className="hidden md:inline">
          {language === "ar" ? "طلب عذر" : "Request Excuse"}
        </span>
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              {language === "ar" ? "طلب عذر عن الغياب" : "Absence Excuse Request"}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Employee Selection - Only for Admin/HR Manager */}
            {isAdmin ? (
              <div className="space-y-2">
                <Label>{language === "ar" ? "الموظف" : "Employee"} *</Label>
                <Select
                  value={excuseForm.employee_id}
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
              <div className="space-y-2">
                <Label>{language === "ar" ? "الموظف" : "Employee"}</Label>
                <Input 
                  value={excuseForm.employee_name || currentUser?.full_name || ""} 
                  disabled 
                  className="bg-muted font-medium"
                />
              </div>
            )}

            {/* Excuse Date */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "تاريخ الغياب" : "Absence Date"} *</Label>
              <Input
                type="date"
                value={excuseForm.excuse_date}
                onChange={(e) => setExcuseForm({ ...excuseForm, excuse_date: e.target.value })}
                required
              />
            </div>

            {/* Excuse Type */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "نوع العذر" : "Excuse Type"} *</Label>
              <Select
                value={excuseForm.excuse_type}
                onValueChange={(v) => setExcuseForm({ ...excuseForm, excuse_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXCUSE_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {language === "ar" ? type.name : type.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Range (Optional) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "من الساعة (اختياري)" : "From Time (Optional)"}</Label>
                <Input
                  type="time"
                  value={excuseForm.start_time}
                  onChange={(e) => setExcuseForm({ ...excuseForm, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "إلى الساعة (اختياري)" : "To Time (Optional)"}</Label>
                <Input
                  type="time"
                  value={excuseForm.end_time}
                  onChange={(e) => setExcuseForm({ ...excuseForm, end_time: e.target.value })}
                />
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "سبب العذر" : "Excuse Reason"} *</Label>
              <Textarea
                value={excuseForm.reason}
                onChange={(e) => setExcuseForm({ ...excuseForm, reason: e.target.value })}
                placeholder={language === "ar" ? "اكتب سبب العذر بالتفصيل..." : "Describe the reason for your absence..."}
                rows={3}
                required
              />
            </div>

            {/* Attachment URL */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "رابط المرفق (اختياري)" : "Attachment URL (Optional)"}</Label>
              <div className="flex gap-2">
                <Input
                  value={excuseForm.attachment_url}
                  onChange={(e) => setExcuseForm({ ...excuseForm, attachment_url: e.target.value })}
                  placeholder={language === "ar" ? "رابط الشهادة الطبية أو المرفق" : "Medical certificate or attachment URL"}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {language === "ar" ? "يمكنك إرفاق رابط الشهادة الطبية أو أي مستند داعم" : "You can attach a link to medical certificate or supporting document"}
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "ملاحظات إضافية" : "Additional Notes"}</Label>
              <Textarea
                value={excuseForm.notes}
                onChange={(e) => setExcuseForm({ ...excuseForm, notes: e.target.value })}
                placeholder={language === "ar" ? "أي ملاحظات إضافية..." : "Any additional notes..."}
                rows={2}
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

export default ExcuseRequestButton;
