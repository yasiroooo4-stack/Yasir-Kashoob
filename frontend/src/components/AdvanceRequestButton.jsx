import { useState, useEffect } from "react";
import { Banknote, Plus, Send } from "lucide-react";
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
import axios from "axios";
import { toast } from "sonner";
import { useLanguage, API, useAuth } from "../App";

const REQUEST_TYPES = [
  { id: "advance", name: "سلفة", name_en: "Advance" },
  { id: "expense", name: "مصروفات", name_en: "Expense" },
  { id: "reimbursement", name: "استرداد مصاريف", name_en: "Reimbursement" },
];

const AdvanceRequestButton = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [currentEmployee, setCurrentEmployee] = useState(null);

  const isAdmin = user?.role === "admin" || user?.role === "hr_manager" || user?.role === "finance_manager";

  const [requestForm, setRequestForm] = useState({
    employee_id: "",
    employee_name: "",
    request_type: "advance",
    amount: "",
    reason: "",
    notes: "",
  });

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
        setRequestForm(prev => ({
          ...prev,
          employee_id: res.data.id,
          employee_name: res.data.name,
        }));
      }
    } catch (error) {
      console.log("Could not fetch current employee");
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      setRequestForm(prev => ({
        ...prev,
        employee_id: employee.id,
        employee_name: employee.name,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!requestForm.employee_id) {
      toast.error(language === "ar" ? "يرجى اختيار الموظف" : "Please select an employee");
      return;
    }

    if (!requestForm.amount || parseFloat(requestForm.amount) <= 0) {
      toast.error(language === "ar" ? "يرجى إدخال المبلغ" : "Please enter the amount");
      return;
    }

    if (!requestForm.reason) {
      toast.error(language === "ar" ? "يرجى إدخال السبب" : "Please enter the reason");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const data = {
        employee_id: requestForm.employee_id,
        employee_name: requestForm.employee_name,
        request_type: requestForm.request_type,
        amount: parseFloat(requestForm.amount),
        reason: requestForm.reason,
        notes: requestForm.notes || "",
      };

      await axios.post(`${API}/hr/advance-requests`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(language === "ar" ? "تم إرسال الطلب بنجاح وبانتظار موافقة الموارد البشرية" : "Request submitted successfully, awaiting HR approval");
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      let errorMessage = language === "ar" ? "حدث خطأ" : "An error occurred";
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === "string") {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
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
    setRequestForm({
      employee_id: currentEmployee?.id || "",
      employee_name: currentEmployee?.name || "",
      request_type: "advance",
      amount: "",
      reason: "",
      notes: "",
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        className="gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
        data-testid="advance-request-btn"
      >
        <Banknote className="w-4 h-4" />
        {language === "ar" ? "طلب سلفة" : "Advance Request"}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-purple-600" />
              {language === "ar" ? "طلب سلفة / مصاريف" : "Advance / Expense Request"}
            </DialogTitle>
            <DialogDescription>
              {language === "ar" 
                ? "تقديم طلب سلفة أو مصاريف للموافقة (الموارد البشرية ثم المالية)"
                : "Submit an advance or expense request for approval (HR then Finance)"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Employee Selection (Admin only) */}
            {isAdmin && (
              <div className="space-y-2">
                <Label>{language === "ar" ? "الموظف" : "Employee"} *</Label>
                <Select
                  value={requestForm.employee_id}
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

            {/* Request Type */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "نوع الطلب" : "Request Type"} *</Label>
              <Select
                value={requestForm.request_type}
                onValueChange={(v) => setRequestForm({ ...requestForm, request_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {language === "ar" ? type.name : type.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "المبلغ (ر.ع)" : "Amount (OMR)"} *</Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={requestForm.amount}
                onChange={(e) => setRequestForm({ ...requestForm, amount: e.target.value })}
                placeholder={language === "ar" ? "أدخل المبلغ" : "Enter amount"}
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "السبب" : "Reason"} *</Label>
              <Textarea
                value={requestForm.reason}
                onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                placeholder={language === "ar" ? "اكتب سبب الطلب..." : "Enter the reason for request..."}
                rows={3}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "ملاحظات" : "Notes"}</Label>
              <Input
                value={requestForm.notes}
                onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                placeholder={language === "ar" ? "ملاحظات إضافية..." : "Additional notes..."}
              />
            </div>

            {/* Approval Flow Info */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700">
                <Send className="w-4 h-4 inline me-2" />
                {language === "ar" 
                  ? "مسار الموافقة: الموارد البشرية ← المالية"
                  : "Approval flow: HR → Finance"}
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
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

export default AdvanceRequestButton;
