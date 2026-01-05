import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Plus, Upload, FileText, X, Loader2 } from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const fileInputRef = useRef(null);
  
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
    attachment_name: "",
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

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(language === "ar" ? "نوع الملف غير مدعوم. يرجى رفع صورة أو PDF" : "Invalid file type. Please upload an image or PDF");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(language === "ar" ? "حجم الملف يجب أن يكون أقل من 10 ميجابايت" : "File size must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(`${API}/api/hr/upload-file`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setExcuseForm(prev => ({
        ...prev,
        attachment_url: response.data.url,
        attachment_name: response.data.original_name,
      }));

      toast.success(language === "ar" ? "تم رفع الملف بنجاح" : "File uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.detail || (language === "ar" ? "فشل رفع الملف" : "Failed to upload file"));
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = () => {
    setExcuseForm(prev => ({
      ...prev,
      attachment_url: "",
      attachment_name: "",
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
        attachment_name: "",
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
        attachment_name: "",
        notes: "",
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

            {/* File Upload */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "إرفاق ملف (صورة أو PDF)" : "Attach File (Image or PDF)"}</Label>
              
              {excuseForm.attachment_url ? (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="flex-1 text-sm truncate">{excuseForm.attachment_name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={removeAttachment}
                    className="h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`${API}${excuseForm.attachment_url}`, '_blank')}
                  >
                    {language === "ar" ? "عرض" : "View"}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                  {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                {language === "ar" 
                  ? "الملفات المدعومة: PDF، PNG، JPG، JPEG، GIF، WEBP (حد أقصى 10 ميجابايت)" 
                  : "Supported files: PDF, PNG, JPG, JPEG, GIF, WEBP (Max 10MB)"}
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
                disabled={loading || uploading}
              >
                {t("cancel")}
              </Button>
              <Button 
                type="submit" 
                className="gradient-primary text-white"
                disabled={loading || uploading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
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
