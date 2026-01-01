import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API, useAuth, useLanguage } from "../App";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Calendar,
  FileText,
  Car,
  Wallet,
  CheckCircle,
  XCircle,
  Fingerprint,
  UserPlus,
  Building,
  RefreshCw,
  Download,
  FileSpreadsheet,
  Upload,
  Wifi,
  WifiOff,
  Settings,
  Play,
  Server,
  History,
} from "lucide-react";

const HR = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("employees");
  
  // Data states
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [expenseRequests, setExpenseRequests] = useState([]);
  const [carContracts, setCarContracts] = useState([]);
  const [officialLetters, setOfficialLetters] = useState([]);
  const [fingerprintDevices, setFingerprintDevices] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [dashboard, setDashboard] = useState({});
  const [centers, setCenters] = useState([]);
  
  // New HR features states
  const [shifts, setShifts] = useState([]);
  const [employeeShifts, setEmployeeShifts] = useState([]);
  const [overtime, setOvertime] = useState([]);
  const [loans, setLoans] = useState([]);
  const [documents, setDocuments] = useState([]);
  
  // Dialog states
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [carDialogOpen, setCarDialogOpen] = useState(false);
  const [letterDialogOpen, setLetterDialogOpen] = useState(false);
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  
  // New dialogs for HR features
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [assignShiftDialogOpen, setAssignShiftDialogOpen] = useState(false);
  const [overtimeDialogOpen, setOvertimeDialogOpen] = useState(false);
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  
  // ZKTeco Sync Manager states
  const [zktecoDialogOpen, setZktecoDialogOpen] = useState(false);
  const [zktecoDevices, setZktecoDevices] = useState([]);
  const [zktecoSyncSettings, setZktecoSyncSettings] = useState({
    auto_sync_enabled: false,
    sync_interval: 60,
    last_sync: null
  });
  const [zktecoDeviceForm, setZktecoDeviceForm] = useState({
    name: "",
    ip_address: "",
    port: 4370,
    location: ""
  });
  const [zktecoSyncing, setZktecoSyncing] = useState(false);
  const [zktecoTesting, setZktecoTesting] = useState(false);
  const [selectedZktecoDevice, setSelectedZktecoDevice] = useState(null);
  const [zktecoAddDialogOpen, setZktecoAddDialogOpen] = useState(false);
  const [zktecoLogs, setZktecoLogs] = useState([]);
  
  // Selected items
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);
  const [selectedOvertime, setSelectedOvertime] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  
  // Forms for new features
  const [shiftForm, setShiftForm] = useState({
    name: "", start_time: "08:00", end_time: "16:00",
    break_duration: 60, working_hours: 8, is_night_shift: false, color: "#3B82F6"
  });
  const [overtimeForm, setOvertimeForm] = useState({
    employee_id: "", employee_name: "", date: new Date().toISOString().split('T')[0],
    start_time: "", end_time: "", hours: 0, rate: 1.5, reason: ""
  });
  const [loanForm, setLoanForm] = useState({
    employee_id: "", employee_name: "", loan_type: "advance",
    amount: 0, reason: "", installments: 1, start_deduction_date: ""
  });
  const [documentForm, setDocumentForm] = useState({
    employee_id: "", employee_name: "", document_type: "passport",
    document_name: "", document_number: "", issue_date: "", expiry_date: "", notes: ""
  });
  const [assignShiftForm, setAssignShiftForm] = useState({
    employee_id: "", employee_name: "", shift_id: "", shift_name: "",
    date: new Date().toISOString().split('T')[0], end_date: "", is_recurring: false
  });
  
  // Excel import
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useState(null);
  
  // Attendance search/filter
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [selectedAttendanceEmployee, setSelectedAttendanceEmployee] = useState("");
  
  // Attendance form
  const [attendanceForm, setAttendanceForm] = useState({
    employee_id: "",
    employee_name: "",
    date: new Date().toISOString().split('T')[0],
    check_in: "",
    check_out: "",
    source: "manual"
  });
  
  // Available permissions and managers
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [managers, setManagers] = useState([]);
  
  // Form data
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    phone: "",
    email: "",
    position: "",
    department: "",
    salary: "",
    hire_date: "",
    national_id: "",
    employee_code: "",
    center_id: "",
    center_name: "",
    fingerprint_id: "",
    permissions: [],
    manager_id: "",
    manager_name: "",
    username: "",
  });
  
  const [leaveForm, setLeaveForm] = useState({
    employee_id: "",
    employee_name: "",
    leave_type: "annual",
    start_date: "",
    end_date: "",
    reason: "",
    days_count: 0,
  });
  
  const [expenseForm, setExpenseForm] = useState({
    employee_id: "",
    employee_name: "",
    expense_type: "other",
    amount: "",
    description: "",
  });
  
  const [carForm, setCarForm] = useState({
    employee_id: "",
    employee_name: "",
    car_type: "",
    plate_number: "",
    model_year: "",
    color: "",
    start_date: "",
    end_date: "",
    monthly_rent: "",
    total_value: "",
    contract_type: "rent",
    notes: "",
  });
  
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
  
  const [deviceForm, setDeviceForm] = useState({
    name: "",
    ip_address: "",
    port: 80,
    login_id: "",
    password: "",
    device_type: "hikvision",
    location: "",
  });
  
  const [accountPassword, setAccountPassword] = useState("");
  
  // Filter states
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().getMonth() + 1);
  const [attendanceYear, setAttendanceYear] = useState(new Date().getFullYear());

  const DEPARTMENTS = [
    { id: "admin", name: "الإدارة", name_en: "Administration" },
    { id: "it", name: "تقنية المعلومات", name_en: "IT" },
    { id: "hr", name: "الموارد البشرية", name_en: "Human Resources" },
    { id: "finance", name: "المالية", name_en: "Finance" },
    { id: "purchasing", name: "المشتريات", name_en: "Purchasing" },
    { id: "milk_reception", name: "استلام الحليب", name_en: "Milk Reception" },
    { id: "sales", name: "المبيعات", name_en: "Sales" },
    { id: "inventory", name: "المخازن", name_en: "Inventory" },
    { id: "legal", name: "القسم القانوني", name_en: "Legal" },
    { id: "projects", name: "المشاريع", name_en: "Projects" },
    { id: "operations", name: "العمليات", name_en: "Operations" },
    { id: "marketing", name: "التسويق", name_en: "Marketing" },
  ];

  const LEAVE_TYPES = [
    { id: "annual", name: "سنوية", name_en: "Annual" },
    { id: "sick", name: "مرضية", name_en: "Sick" },
    { id: "emergency", name: "طارئة", name_en: "Emergency" },
    { id: "unpaid", name: "بدون راتب", name_en: "Unpaid" },
  ];

  const EXPENSE_TYPES = [
    { id: "travel", name: "سفر", name_en: "Travel" },
    { id: "equipment", name: "معدات", name_en: "Equipment" },
    { id: "office", name: "مكتبية", name_en: "Office" },
    { id: "other", name: "أخرى", name_en: "Other" },
  ];

  const LETTER_TYPES = [
    { id: "salary_certificate", name: "شهادة راتب", name_en: "Salary Certificate" },
    { id: "employment_letter", name: "خطاب تعريف بالراتب", name_en: "Employment Letter" },
    { id: "experience_letter", name: "شهادة خبرة", name_en: "Experience Letter" },
    { id: "mission_letter", name: "خطاب مهمة عمل", name_en: "Mission Letter" },
    { id: "no_objection", name: "شهادة عدم ممانعة", name_en: "No Objection Certificate" },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [
        employeesRes,
        departmentsRes,
        leavesRes,
        expensesRes,
        carsRes,
        lettersRes,
        devicesRes,
        dashboardRes,
        centersRes,
        permissionsRes,
        managersRes,
        shiftsRes,
        overtimeRes,
        loansRes,
        documentsRes,
      ] = await Promise.all([
        axios.get(`${API}/hr/employees`),
        axios.get(`${API}/hr/departments`),
        axios.get(`${API}/hr/leave-requests`),
        axios.get(`${API}/hr/expense-requests`),
        axios.get(`${API}/hr/car-contracts`),
        axios.get(`${API}/hr/official-letters`),
        axios.get(`${API}/hr/fingerprint-devices`),
        axios.get(`${API}/hr/dashboard`),
        axios.get(`${API}/centers`),
        axios.get(`${API}/hr/available-permissions`),
        axios.get(`${API}/hr/managers`),
        axios.get(`${API}/hr/shifts`).catch(() => ({ data: [] })),
        axios.get(`${API}/hr/overtime`).catch(() => ({ data: [] })),
        axios.get(`${API}/hr/loans`).catch(() => ({ data: [] })),
        axios.get(`${API}/hr/documents`).catch(() => ({ data: [] })),
      ]);
      
      setEmployees(employeesRes.data);
      setDepartments(departmentsRes.data);
      setLeaveRequests(leavesRes.data);
      setExpenseRequests(expensesRes.data);
      setCarContracts(carsRes.data);
      setOfficialLetters(lettersRes.data);
      setFingerprintDevices(devicesRes.data);
      setDashboard(dashboardRes.data);
      setCenters(centersRes.data);
      setAvailablePermissions(permissionsRes.data);
      setManagers(managersRes.data);
      setShifts(shiftsRes.data || []);
      setOvertime(overtimeRes.data || []);
      setLoans(loansRes.data || []);
      setDocuments(documentsRes.data || []);
    } catch (error) {
      console.error("Error fetching HR data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await axios.get(`${API}/hr/attendance/report`, {
        params: { year: attendanceYear, month: attendanceMonth }
      });
      setAttendance(res.data.report || []);
      
      // Also fetch raw attendance records for display
      const recordsRes = await axios.get(`${API}/hr/attendance`, {
        params: { 
          start_date: `${attendanceYear}-${String(attendanceMonth).padStart(2, '0')}-01`,
          end_date: `${attendanceYear}-${String(attendanceMonth).padStart(2, '0')}-31`
        }
      });
      setAttendanceRecords(recordsRes.data || []);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "attendance") {
      fetchAttendance();
    }
  }, [activeTab, attendanceMonth, attendanceYear]);

  // Attendance handlers
  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/hr/attendance`, attendanceForm);
      toast.success(t("success"));
      setAttendanceDialogOpen(false);
      resetAttendanceForm();
      fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const resetAttendanceForm = () => {
    setAttendanceForm({
      employee_id: "",
      employee_name: "",
      date: new Date().toISOString().split('T')[0],
      check_in: "",
      check_out: "",
      source: "manual"
    });
  };

  // Employee handlers
  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedEmployee) {
        await axios.put(`${API}/hr/employees/${selectedEmployee.id}`, employeeForm);
      } else {
        await axios.post(`${API}/hr/employees`, employeeForm);
      }
      toast.success(t("success"));
      setEmployeeDialogOpen(false);
      resetEmployeeForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      name: "",
      phone: "",
      email: "",
      position: "",
      department: "",
      salary: "",
      hire_date: "",
      national_id: "",
      employee_code: "",
      center_id: "",
      center_name: "",
      fingerprint_id: "",
      permissions: [],
      manager_id: "",
      manager_name: "",
      username: "",
    });
    setSelectedEmployee(null);
  };

  const openEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setEmployeeForm({
      name: employee.name,
      phone: employee.phone,
      email: employee.email || "",
      position: employee.position,
      department: employee.department,
      salary: employee.salary,
      hire_date: employee.hire_date,
      national_id: employee.national_id || "",
      employee_code: employee.employee_code || "",
      center_id: employee.center_id || "",
      center_name: employee.center_name || "",
      fingerprint_id: employee.fingerprint_id || "",
      permissions: employee.permissions || [],
      manager_id: employee.manager_id || "",
      manager_name: employee.manager_name || "",
      username: employee.username || "",
    });
    setEmployeeDialogOpen(true);
  };

  const handleDeleteEmployee = async () => {
    try {
      await axios.delete(`${API}/hr/employees/${selectedEmployee.id}`);
      toast.success(t("success"));
      setDeleteDialogOpen(false);
      setSelectedEmployee(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const handleCreateAccount = async () => {
    if (!accountPassword) {
      toast.error(language === "ar" ? "أدخل كلمة المرور" : "Enter password");
      return;
    }
    try {
      await axios.post(`${API}/hr/employees/${selectedEmployee.id}/create-account?password=${accountPassword}`);
      toast.success(language === "ar" ? "تم إنشاء الحساب بنجاح" : "Account created successfully");
      setAccountDialogOpen(false);
      setAccountPassword("");
      setSelectedEmployee(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  // Leave request handlers
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/hr/leave-requests`, leaveForm);
      toast.success(t("success"));
      setLeaveDialogOpen(false);
      resetLeaveForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const resetLeaveForm = () => {
    setLeaveForm({
      employee_id: "",
      employee_name: "",
      leave_type: "annual",
      start_date: "",
      end_date: "",
      reason: "",
      days_count: 0,
    });
  };

  const handleLeaveAction = async (requestId, action) => {
    try {
      await axios.put(`${API}/hr/leave-requests/${requestId}/${action}`);
      toast.success(t("success"));
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  // Expense request handlers
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/hr/expense-requests`, expenseForm);
      toast.success(t("success"));
      setExpenseDialogOpen(false);
      resetExpenseForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      employee_id: "",
      employee_name: "",
      expense_type: "other",
      amount: "",
      description: "",
    });
  };

  const handleExpenseAction = async (requestId, action) => {
    try {
      await axios.put(`${API}/hr/expense-requests/${requestId}/${action}`);
      toast.success(t("success"));
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  // Car contract handlers
  const handleCarSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedCar) {
        await axios.put(`${API}/hr/car-contracts/${selectedCar.id}`, carForm);
      } else {
        await axios.post(`${API}/hr/car-contracts`, carForm);
      }
      toast.success(t("success"));
      setCarDialogOpen(false);
      resetCarForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const resetCarForm = () => {
    setCarForm({
      employee_id: "",
      employee_name: "",
      car_type: "",
      plate_number: "",
      model_year: "",
      color: "",
      start_date: "",
      end_date: "",
      monthly_rent: "",
      total_value: "",
      contract_type: "rent",
      notes: "",
    });
    setSelectedCar(null);
  };

  // Official letter handlers
  const handleLetterSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/hr/official-letters`, letterForm);
      toast.success(t("success"));
      setLetterDialogOpen(false);
      resetLetterForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const resetLetterForm = () => {
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
  };

  const handleIssueLetter = async (letterId) => {
    try {
      await axios.put(`${API}/hr/official-letters/${letterId}/issue`);
      toast.success(t("success"));
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  // Approve official letter
  const handleApproveLetter = async (letterId) => {
    try {
      const response = await axios.post(`${API}/hr/official-letters/${letterId}/approve`);
      toast.success(
        language === "ar" 
          ? `تم تصديق الرسالة - كود التصديق: ${response.data.signature_code}`
          : `Letter approved - Code: ${response.data.signature_code}`
      );
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  // Reject official letter
  const handleRejectLetter = async (letterId) => {
    const reason = prompt(language === "ar" ? "سبب الرفض:" : "Rejection reason:");
    if (reason === null) return;
    
    try {
      await axios.post(`${API}/hr/official-letters/${letterId}/reject?reason=${encodeURIComponent(reason)}`);
      toast.success(language === "ar" ? "تم رفض الرسالة" : "Letter rejected");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  // Print official letter
  const handlePrintLetter = (letter) => {
    // Mark as printed in backend
    axios.post(`${API}/hr/official-letters/${letter.id}/print`).catch(() => {});
    
    // Generate printable content with background image
    const printWindow = window.open('', '_blank');
    const letterTypeName = LETTER_TYPES.find(t => t.id === letter.letter_type);
    const backgroundImage = "https://customer-assets.emergentagent.com/job_dairy-erp/artifacts/rotzc27o_%D9%86%D9%85%D9%88%D8%B0%D8%AC.jpeg";
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>رسالة رسمية - ${letter.letter_number}</title>
        <style>
          @page { size: A4; margin: 0; }
          body { 
            font-family: 'Arial', sans-serif; 
            direction: rtl;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            background-image: url('${backgroundImage}');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
          }
          .content-wrapper {
            padding: 180px 60px 100px 60px;
            min-height: calc(100vh - 280px);
          }
          .letter-info { 
            text-align: left; 
            margin-bottom: 30px;
            font-size: 14px;
          }
          .letter-title {
            text-align: center;
            font-size: 22px;
            font-weight: bold;
            margin: 40px 0;
            color: #1a365d;
          }
          .letter-body { 
            line-height: 2.2; 
            font-size: 16px;
            text-align: justify;
            margin: 30px 0;
          }
          .letter-body p { margin: 15px 0; }
          .signature-section {
            margin-top: 60px;
            text-align: left;
          }
          .signature-box {
            display: inline-block;
            text-align: center;
            padding: 20px;
          }
          .signature-name {
            font-weight: bold;
            font-size: 14px;
            margin-top: 10px;
          }
          .signature-code {
            background: rgba(255,255,255,0.9);
            padding: 10px 15px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            margin-top: 10px;
            border: 1px solid #ddd;
          }
          .print-footer {
            position: fixed;
            bottom: 20px;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 10px;
            color: #666;
          }
          @media print { 
            body { 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="content-wrapper">
          <div class="letter-info">
            <strong>رقم الرسالة:</strong> ${letter.letter_number}<br>
            <strong>التاريخ:</strong> ${new Date(letter.approved_at || letter.created_at).toLocaleDateString('ar-SA')}
          </div>
          
          <div class="letter-title">${letterTypeName?.name || letter.letter_type}</div>
          
          <div class="letter-body">
            <p><strong>إلى من يهمه الأمر،</strong></p>
            <p>نشهد نحن شركة المروج للألبان بأن السيد/ة <strong>${letter.employee_name}</strong></p>
            ${letter.department ? `<p>القسم: ${letter.department}</p>` : ''}
            ${letter.position ? `<p>المسمى الوظيفي: ${letter.position}</p>` : ''}
            ${letter.purpose ? `<p><strong>الغرض:</strong> ${letter.purpose}</p>` : ''}
            ${letter.content ? `<p>${letter.content}</p>` : ''}
            <p>وقد أُعطي هذا الخطاب بناءً على طلبه دون أدنى مسؤولية على الشركة.</p>
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              <div><strong>مدير الموارد البشرية</strong></div>
              <div class="signature-name">HASSAN SALIM KASHOOB</div>
              <div class="signature-code">
                كود التصديق: ${letter.signature_code || 'N/A'}
              </div>
            </div>
          </div>
        </div>
        
        <div class="print-footer">
          تم طباعة هذه الرسالة إلكترونياً - ${new Date().toLocaleString('ar-SA')}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Device handlers
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deleteDeviceDialogOpen, setDeleteDeviceDialogOpen] = useState(false);

  const handleDeviceSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedDevice) {
        await axios.put(`${API}/hr/fingerprint-devices/${selectedDevice.id}`, deviceForm);
      } else {
        await axios.post(`${API}/hr/fingerprint-devices`, deviceForm);
      }
      toast.success(t("success"));
      setDeviceDialogOpen(false);
      resetDeviceForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const resetDeviceForm = () => {
    setDeviceForm({
      name: "",
      ip_address: "",
      port: 80,
      login_id: "",
      password: "",
      device_type: "zkteco",
      location: "",
    });
    setSelectedDevice(null);
  };

  const openEditDevice = (device) => {
    setSelectedDevice(device);
    setDeviceForm({
      name: device.name,
      ip_address: device.ip_address,
      port: device.port || 80,
      login_id: device.login_id,
      password: device.password,
      device_type: device.device_type || "zkteco",
      location: device.location || "",
    });
    setDeviceDialogOpen(true);
  };

  const handleDeleteDevice = async () => {
    try {
      await axios.delete(`${API}/hr/fingerprint-devices/${selectedDevice.id}`);
      toast.success(t("success"));
      setDeleteDeviceDialogOpen(false);
      setSelectedDevice(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const handleSyncDevice = async (deviceId) => {
    try {
      await axios.post(`${API}/hr/fingerprint-devices/${deviceId}/sync`);
      toast.success(language === "ar" ? "تم بدء المزامنة" : "Sync started");
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  // Export Attendance functions
  const handleExportAttendanceExcel = async () => {
    try {
      const response = await axios.get(`${API}/hr/attendance/export/excel`, {
        params: { year: attendanceYear, month: attendanceMonth },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${attendanceYear}_${attendanceMonth}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(language === "ar" ? "تم التصدير بنجاح" : "Exported successfully");
    } catch (error) {
      toast.error(language === "ar" ? "فشل التصدير" : "Export failed");
    }
  };

  const handleExportAttendancePDF = async () => {
    try {
      const response = await axios.get(`${API}/hr/attendance/export/pdf`, {
        params: { year: attendanceYear, month: attendanceMonth },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${attendanceYear}_${attendanceMonth}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(language === "ar" ? "تم التصدير بنجاح" : "Exported successfully");
    } catch (error) {
      toast.error(language === "ar" ? "فشل التصدير" : "Export failed");
    }
  };

  // Import attendance from Excel
  const handleImportExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setImportLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(`${API}/hr/attendance/import-excel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(
        language === "ar" 
          ? `تم استيراد ${response.data.imported} سجل جديد وتحديث ${response.data.updated} سجل`
          : `Imported ${response.data.imported} new and updated ${response.data.updated} records`
      );
      
      if (response.data.errors?.length > 0) {
        console.warn("Import errors:", response.data.errors);
      }
      
      fetchAttendance();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || 
        (language === "ar" ? "فشل الاستيراد" : "Import failed")
      );
    } finally {
      setImportLoading(false);
      event.target.value = '';
    }
  };

  // Import attendance from ZKTeco MDB file
  const handleImportZKTeco = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setImportLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(`${API}/hr/attendance/import-zkteco`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success(
        language === "ar" 
          ? `تم استيراد ${response.data.imported} سجل جديد وتحديث ${response.data.updated} سجل من جهاز البصمة`
          : `Imported ${response.data.imported} new and updated ${response.data.updated} records from fingerprint device`
      );
      
      fetchAttendance();
    } catch (error) {
      toast.error(
        error.response?.data?.detail || 
        (language === "ar" ? "فشل استيراد ملف البصمة" : "ZKTeco import failed")
      );
    } finally {
      setImportLoading(false);
      event.target.value = '';
    }
  };

  // ==================== ZKTeco Sync Manager Functions ====================
  
  // Fetch ZKTeco devices
  const fetchZktecoDevices = async () => {
    try {
      const res = await axios.get(`${API}/hr/zkteco/devices`);
      setZktecoDevices(res.data.devices || []);
      setZktecoSyncSettings({
        auto_sync_enabled: res.data.auto_sync_enabled || false,
        sync_interval: res.data.sync_interval || 60,
        last_sync: res.data.last_sync
      });
    } catch (error) {
      console.error("Error fetching ZKTeco devices:", error);
    }
  };

  // Add ZKTeco device
  const handleAddZktecoDevice = async () => {
    try {
      await axios.post(`${API}/hr/zkteco/devices`, zktecoDeviceForm);
      toast.success(language === "ar" ? "تمت إضافة الجهاز بنجاح" : "Device added successfully");
      setZktecoAddDialogOpen(false);
      setZktecoDeviceForm({ name: "", ip_address: "", port: 4370, location: "" });
      fetchZktecoDevices();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === "ar" ? "فشل إضافة الجهاز" : "Failed to add device"));
    }
  };

  // Delete ZKTeco device
  const handleDeleteZktecoDevice = async (deviceId) => {
    try {
      await axios.delete(`${API}/hr/zkteco/devices/${deviceId}`);
      toast.success(language === "ar" ? "تم حذف الجهاز" : "Device deleted");
      fetchZktecoDevices();
    } catch (error) {
      toast.error(language === "ar" ? "فشل حذف الجهاز" : "Failed to delete device");
    }
  };

  // Test ZKTeco device connection
  const handleTestZktecoDevice = async (device) => {
    setZktecoTesting(true);
    setSelectedZktecoDevice(device.id);
    addZktecoLog(`🔌 جاري اختبار الاتصال بـ ${device.ip_address}...`);
    
    try {
      const res = await axios.post(`${API}/hr/zkteco/devices/${device.id}/test`);
      if (res.data.success) {
        addZktecoLog(`✅ تم الاتصال بنجاح!`);
        addZktecoLog(`   الرقم التسلسلي: ${res.data.serial_number || 'N/A'}`);
        addZktecoLog(`   المستخدمين: ${res.data.users_count || 0}، السجلات: ${res.data.records_count || 0}`);
        toast.success(language === "ar" ? "الاتصال ناجح!" : "Connection successful!");
      } else {
        addZktecoLog(`❌ فشل الاتصال: ${res.data.error || 'خطأ غير معروف'}`);
        toast.error(res.data.error || (language === "ar" ? "فشل الاتصال" : "Connection failed"));
      }
    } catch (error) {
      addZktecoLog(`❌ خطأ: ${error.response?.data?.detail || error.message}`);
      toast.error(error.response?.data?.detail || (language === "ar" ? "فشل الاتصال" : "Connection failed"));
    } finally {
      setZktecoTesting(false);
      setSelectedZktecoDevice(null);
    }
  };

  // Sync now
  const handleZktecoSyncNow = async () => {
    setZktecoSyncing(true);
    addZktecoLog("=" .repeat(40));
    addZktecoLog("🔄 بدء المزامنة...");
    
    try {
      const res = await axios.post(`${API}/hr/zkteco/sync`);
      addZktecoLog(`✅ اكتملت المزامنة: ${res.data.imported || 0} جديد، ${res.data.updated || 0} محدث`);
      toast.success(
        language === "ar" 
          ? `تم استيراد ${res.data.imported} سجل جديد وتحديث ${res.data.updated} سجل`
          : `Imported ${res.data.imported} new and updated ${res.data.updated} records`
      );
      fetchAttendance();
      fetchZktecoDevices();
    } catch (error) {
      addZktecoLog(`❌ فشلت المزامنة: ${error.response?.data?.detail || error.message}`);
      toast.error(error.response?.data?.detail || (language === "ar" ? "فشلت المزامنة" : "Sync failed"));
    } finally {
      setZktecoSyncing(false);
    }
  };

  // Update sync settings
  const handleUpdateZktecoSettings = async () => {
    try {
      await axios.put(`${API}/hr/zkteco/settings`, zktecoSyncSettings);
      toast.success(language === "ar" ? "تم حفظ الإعدادات" : "Settings saved");
      addZktecoLog("💾 تم حفظ إعدادات المزامنة");
    } catch (error) {
      toast.error(language === "ar" ? "فشل حفظ الإعدادات" : "Failed to save settings");
    }
  };

  // Add log entry
  const addZktecoLog = (message) => {
    const timestamp = new Date().toLocaleTimeString('ar-SA');
    setZktecoLogs(prev => [...prev.slice(-50), `[${timestamp}] ${message}`]);
  };

  // Clear logs
  const clearZktecoLogs = () => {
    setZktecoLogs([]);
  };

  // Open ZKTeco dialog
  const openZktecoManager = () => {
    fetchZktecoDevices();
    setZktecoDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: language === "ar" ? "قيد الانتظار" : "Pending", variant: "warning" },
      approved: { label: language === "ar" ? "مقبول" : "Approved", variant: "success" },
      rejected: { label: language === "ar" ? "مرفوض" : "Rejected", variant: "destructive" },
      paid: { label: language === "ar" ? "مدفوع" : "Paid", variant: "info" },
      issued: { label: language === "ar" ? "صادر" : "Issued", variant: "success" },
      active: { label: language === "ar" ? "نشط" : "Active", variant: "success" },
      expired: { label: language === "ar" ? "منتهي" : "Expired", variant: "warning" },
      cancelled: { label: language === "ar" ? "ملغي" : "Cancelled", variant: "destructive" },
    };
    const config = statusConfig[status] || { label: status, variant: "default" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDepartmentName = (deptId) => {
    const dept = DEPARTMENTS.find(d => d.id === deptId);
    return dept ? (language === "ar" ? dept.name : dept.name_en) : deptId;
  };

  const getLeaveTypeName = (typeId) => {
    const type = LEAVE_TYPES.find(t => t.id === typeId);
    return type ? (language === "ar" ? type.name : type.name_en) : typeId;
  };

  const getLetterTypeName = (typeId) => {
    const type = LETTER_TYPES.find(t => t.id === typeId);
    return type ? (language === "ar" ? type.name : type.name_en) : typeId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="hr-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {language === "ar" ? "الموارد البشرية" : "Human Resources"}
          </h1>
          <p className="text-muted-foreground">
            {language === "ar" ? "إدارة الموظفين والحضور والطلبات" : "Manage employees, attendance and requests"}
          </p>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{dashboard.total_employees || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "إجمالي الموظفين" : "Total Employees"}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{dashboard.today_attendance || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "حضور اليوم" : "Today's Attendance"}
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{dashboard.today_absent || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "الغياب اليوم" : "Today's Absent"}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{dashboard.pending_leaves || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "طلبات إجازة" : "Leave Requests"}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">{dashboard.active_warnings || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "الإنذارات" : "Warnings"}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{dashboard.pending_expenses || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "طلبات مصاريف" : "Expense Requests"}
                </p>
              </div>
              <Wallet className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap gap-2 h-auto p-2 bg-muted/50">
          <TabsTrigger value="employees" className="gap-2 px-4 py-3 text-base font-medium">
            <Users className="w-5 h-5" />
            <span>{language === "ar" ? "الموظفين" : "Employees"}</span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2 px-4 py-3 text-base font-medium">
            <Clock className="w-5 h-5" />
            <span>{language === "ar" ? "الحضور" : "Attendance"}</span>
          </TabsTrigger>
          <TabsTrigger value="leaves" className="gap-2 px-4 py-3 text-base font-medium">
            <Calendar className="w-5 h-5" />
            <span>{language === "ar" ? "الإجازات" : "Leaves"}</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2 px-4 py-3 text-base font-medium">
            <Wallet className="w-5 h-5" />
            <span>{language === "ar" ? "المصاريف" : "Expenses"}</span>
          </TabsTrigger>
          <TabsTrigger value="cars" className="gap-2 px-4 py-3 text-base font-medium">
            <Car className="w-5 h-5" />
            <span>{language === "ar" ? "السيارات" : "Cars"}</span>
          </TabsTrigger>
          <TabsTrigger value="letters" className="gap-2 px-4 py-3 text-base font-medium">
            <FileText className="w-5 h-5" />
            <span>{language === "ar" ? "الرسائل" : "Letters"}</span>
          </TabsTrigger>
          <TabsTrigger value="shifts" className="gap-2 px-4 py-3 text-base font-medium">
            <Clock className="w-5 h-5" />
            <span>{language === "ar" ? "الورديات" : "Shifts"}</span>
          </TabsTrigger>
          <TabsTrigger value="overtime" className="gap-2 px-4 py-3 text-base font-medium">
            <Clock className="w-5 h-5" />
            <span>{language === "ar" ? "الإضافي" : "Overtime"}</span>
          </TabsTrigger>
          <TabsTrigger value="loans" className="gap-2 px-4 py-3 text-base font-medium">
            <Wallet className="w-5 h-5" />
            <span>{language === "ar" ? "السلف" : "Loans"}</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2 px-4 py-3 text-base font-medium">
            <FileText className="w-5 h-5" />
            <span>{language === "ar" ? "الوثائق" : "Documents"}</span>
          </TabsTrigger>
        </TabsList>

        {/* Employees Tab */}
        <TabsContent value="employees">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "قائمة الموظفين" : "Employee List"}</CardTitle>
                <CardDescription>
                  {language === "ar" ? "إدارة بيانات الموظفين" : "Manage employee data"}
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  resetEmployeeForm();
                  setEmployeeDialogOpen(true);
                }}
                className="gradient-primary text-white"
              >
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "إضافة موظف" : "Add Employee"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === "ar" ? "الكود" : "Code"}</TableHead>
                      <TableHead>{language === "ar" ? "الاسم" : "Name"}</TableHead>
                      <TableHead>{language === "ar" ? "القسم" : "Department"}</TableHead>
                      <TableHead>{language === "ar" ? "المنصب" : "Position"}</TableHead>
                      <TableHead>{language === "ar" ? "المسؤول" : "Manager"}</TableHead>
                      <TableHead>{language === "ar" ? "الراتب" : "Salary"}</TableHead>
                      <TableHead>{language === "ar" ? "اسم المستخدم" : "Username"}</TableHead>
                      <TableHead>{language === "ar" ? "حساب النظام" : "Account"}</TableHead>
                      <TableHead>{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          {t("no_data")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      employees.map((emp) => (
                        <TableRow key={emp.id}>
                          <TableCell>
                            <Badge variant="outline">{emp.employee_code || "-"}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{emp.name}</TableCell>
                          <TableCell>{getDepartmentName(emp.department)}</TableCell>
                          <TableCell>{emp.position}</TableCell>
                          <TableCell>
                            {emp.manager_name ? (
                              <span className="text-sm text-muted-foreground">{emp.manager_name}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{emp.salary} {language === "ar" ? "ر.ع" : "OMR"}</TableCell>
                          <TableCell>
                            {emp.username ? (
                              <Badge variant="outline" className="font-mono">{emp.username}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {emp.can_login ? (
                              <Badge variant="success">{language === "ar" ? "مفعل" : "Active"}</Badge>
                            ) : (
                              <Badge variant="secondary">{language === "ar" ? "غير مفعل" : "Inactive"}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditEmployee(emp)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              {!emp.can_login && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedEmployee(emp);
                                    setAccountDialogOpen(true);
                                  }}
                                  title={language === "ar" ? "إنشاء حساب" : "Create Account"}
                                >
                                  <UserPlus className="w-4 h-4 text-blue-500" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setSelectedEmployee(emp);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "تقارير الحضور والانصراف" : "Attendance Reports"}</CardTitle>
                <CardDescription>
                  {language === "ar" ? "عرض سجلات الحضور" : "View attendance records"}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Button onClick={() => setAttendanceDialogOpen(true)} className="gradient-primary text-white gap-1">
                  <Plus className="w-4 h-4" />
                  {language === "ar" ? "إضافة حضور" : "Add Attendance"}
                </Button>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImportExcel}
                    className="hidden"
                    disabled={importLoading}
                  />
                  <Button variant="outline" className="gap-1" asChild disabled={importLoading}>
                    <span>
                      {importLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 text-blue-600" />
                      )}
                      {language === "ar" ? "استيراد Excel" : "Import Excel"}
                    </span>
                  </Button>
                </label>
                <Button variant="outline" className="gap-1" onClick={openZktecoManager}>
                  <Fingerprint className="w-4 h-4 text-green-600" />
                  {language === "ar" ? "أجهزة البصمة" : "Fingerprint Devices"}
                </Button>
                <Select value={attendanceMonth.toString()} onValueChange={(v) => setAttendanceMonth(parseInt(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                      <SelectItem key={m} value={m.toString()}>
                        {language === "ar" ? `شهر ${m}` : `Month ${m}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={attendanceYear.toString()} onValueChange={(v) => setAttendanceYear(parseInt(v))}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleExportAttendanceExcel} className="gap-1">
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  Excel
                </Button>
                <Button variant="outline" onClick={handleExportAttendancePDF} className="gap-1">
                  <FileText className="w-4 h-4 text-red-600" />
                  PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filter */}
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder={language === "ar" ? "البحث عن موظف..." : "Search employee..."}
                    value={attendanceSearch}
                    onChange={(e) => setAttendanceSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Select value={selectedAttendanceEmployee} onValueChange={setSelectedAttendanceEmployee}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={language === "ar" ? "تحديد موظف" : "Select Employee"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === "ar" ? "جميع الموظفين" : "All Employees"}</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === "ar" ? "التاريخ" : "Date"}</TableHead>
                      <TableHead>{language === "ar" ? "الموظف" : "Employee"}</TableHead>
                      <TableHead>{language === "ar" ? "وقت الحضور" : "Check In"}</TableHead>
                      <TableHead>{language === "ar" ? "وقت الانصراف" : "Check Out"}</TableHead>
                      <TableHead>{language === "ar" ? "المصدر" : "Source"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords
                      .filter(record => {
                        const matchesSearch = !attendanceSearch || 
                          record.employee_name?.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
                          record.employee_id?.toLowerCase().includes(attendanceSearch.toLowerCase());
                        const matchesEmployee = !selectedAttendanceEmployee || selectedAttendanceEmployee === "all" || 
                          record.employee_id === selectedAttendanceEmployee;
                        return matchesSearch && matchesEmployee;
                      })
                      .length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {language === "ar" ? "لا توجد سجلات حضور. أضف حضور يدوياً أو قم بمزامنة جهاز البصمة." : "No attendance records. Add manually or sync fingerprint device."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      attendanceRecords
                        .filter(record => {
                          const matchesSearch = !attendanceSearch || 
                            record.employee_name?.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
                            record.employee_id?.toLowerCase().includes(attendanceSearch.toLowerCase());
                          const matchesEmployee = !selectedAttendanceEmployee || selectedAttendanceEmployee === "all" || 
                            record.employee_id === selectedAttendanceEmployee;
                          return matchesSearch && matchesEmployee;
                        })
                        .map((record, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{record.date}</TableCell>
                          <TableCell className="font-medium">{record.employee_name}</TableCell>
                          <TableCell>{record.check_in || "-"}</TableCell>
                          <TableCell>{record.check_out || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={record.source === "fingerprint" ? "success" : "secondary"}>
                              {record.source === "fingerprint" ? (language === "ar" ? "بصمة" : "Fingerprint") : 
                               record.source === "zkteco_import" ? "ZKTeco" :
                               record.source === "excel_import" ? "Excel" :
                               (language === "ar" ? "يدوي" : "Manual")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaves Tab */}
        <TabsContent value="leaves">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "طلبات الإجازات" : "Leave Requests"}</CardTitle>
                <CardDescription>
                  {language === "ar" ? "إدارة طلبات الإجازات" : "Manage leave requests"}
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  resetLeaveForm();
                  setLeaveDialogOpen(true);
                }}
                className="gradient-primary text-white"
              >
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "طلب إجازة" : "Request Leave"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === "ar" ? "الموظف" : "Employee"}</TableHead>
                      <TableHead>{language === "ar" ? "النوع" : "Type"}</TableHead>
                      <TableHead>{language === "ar" ? "من" : "From"}</TableHead>
                      <TableHead>{language === "ar" ? "إلى" : "To"}</TableHead>
                      <TableHead>{language === "ar" ? "الأيام" : "Days"}</TableHead>
                      <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                      <TableHead>{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t("no_data")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      leaveRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">{req.employee_name}</TableCell>
                          <TableCell>{getLeaveTypeName(req.leave_type)}</TableCell>
                          <TableCell>{req.start_date}</TableCell>
                          <TableCell>{req.end_date}</TableCell>
                          <TableCell>{req.days_count}</TableCell>
                          <TableCell>{getStatusBadge(req.status)}</TableCell>
                          <TableCell>
                            {req.status === "pending" && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600"
                                  onClick={() => handleLeaveAction(req.id, "approve")}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600"
                                  onClick={() => handleLeaveAction(req.id, "reject")}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "طلبات المصاريف" : "Expense Requests"}</CardTitle>
                <CardDescription>
                  {language === "ar" ? "إدارة طلبات المصاريف" : "Manage expense requests"}
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  resetExpenseForm();
                  setExpenseDialogOpen(true);
                }}
                className="gradient-primary text-white"
              >
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "طلب مصاريف" : "Request Expense"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === "ar" ? "الموظف" : "Employee"}</TableHead>
                      <TableHead>{language === "ar" ? "النوع" : "Type"}</TableHead>
                      <TableHead>{language === "ar" ? "المبلغ" : "Amount"}</TableHead>
                      <TableHead>{language === "ar" ? "الوصف" : "Description"}</TableHead>
                      <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                      <TableHead>{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenseRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {t("no_data")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      expenseRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">{req.employee_name}</TableCell>
                          <TableCell>{req.expense_type}</TableCell>
                          <TableCell>{req.amount} {language === "ar" ? "ر.ع" : "OMR"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{req.description}</TableCell>
                          <TableCell>{getStatusBadge(req.status)}</TableCell>
                          <TableCell>
                            {req.status === "pending" && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600"
                                  onClick={() => handleExpenseAction(req.id, "approve")}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600"
                                  onClick={() => handleExpenseAction(req.id, "reject")}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                            {req.status === "approved" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600"
                                onClick={() => handleExpenseAction(req.id, "pay")}
                              >
                                {language === "ar" ? "صرف" : "Pay"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cars Tab */}
        <TabsContent value="cars">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "عقود السيارات" : "Car Contracts"}</CardTitle>
                <CardDescription>
                  {language === "ar" ? "إدارة عقود السيارات الصغيرة" : "Manage small car contracts"}
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  resetCarForm();
                  setCarDialogOpen(true);
                }}
                className="gradient-primary text-white"
              >
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "إضافة عقد" : "Add Contract"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === "ar" ? "نوع السيارة" : "Car Type"}</TableHead>
                      <TableHead>{language === "ar" ? "رقم اللوحة" : "Plate No."}</TableHead>
                      <TableHead>{language === "ar" ? "الموظف" : "Employee"}</TableHead>
                      <TableHead>{language === "ar" ? "من" : "From"}</TableHead>
                      <TableHead>{language === "ar" ? "إلى" : "To"}</TableHead>
                      <TableHead>{language === "ar" ? "الإيجار الشهري" : "Monthly Rent"}</TableHead>
                      <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carContracts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t("no_data")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      carContracts.map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">{contract.car_type}</TableCell>
                          <TableCell>{contract.plate_number}</TableCell>
                          <TableCell>{contract.employee_name || "-"}</TableCell>
                          <TableCell>{contract.start_date}</TableCell>
                          <TableCell>{contract.end_date}</TableCell>
                          <TableCell>{contract.monthly_rent} {language === "ar" ? "ر.ع" : "OMR"}</TableCell>
                          <TableCell>{getStatusBadge(contract.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Letters Tab */}
        <TabsContent value="letters">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "الرسائل الرسمية" : "Official Letters"}</CardTitle>
                <CardDescription>
                  {language === "ar" ? "إدارة الرسائل والشهادات الرسمية" : "Manage official letters and certificates"}
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  resetLetterForm();
                  setLetterDialogOpen(true);
                }}
                className="gradient-primary text-white"
              >
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "إضافة رسالة" : "Add Letter"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === "ar" ? "رقم الرسالة" : "Letter No."}</TableHead>
                      <TableHead>{language === "ar" ? "الموظف" : "Employee"}</TableHead>
                      <TableHead>{language === "ar" ? "النوع" : "Type"}</TableHead>
                      <TableHead>{language === "ar" ? "الغرض" : "Purpose"}</TableHead>
                      <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                      <TableHead>{t("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {officialLetters.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {t("no_data")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      officialLetters.map((letter) => (
                        <TableRow key={letter.id}>
                          <TableCell>
                            <Badge variant="outline">{letter.letter_number || "-"}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{letter.employee_name}</TableCell>
                          <TableCell>{getLetterTypeName(letter.letter_type)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{letter.purpose || "-"}</TableCell>
                          <TableCell>{getStatusBadge(letter.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {letter.status === "pending" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600"
                                    onClick={() => handleApproveLetter(letter.id)}
                                  >
                                    {language === "ar" ? "تصديق" : "Approve"}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600"
                                    onClick={() => handleRejectLetter(letter.id)}
                                  >
                                    {language === "ar" ? "رفض" : "Reject"}
                                  </Button>
                                </>
                              )}
                              {letter.is_approved && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-600"
                                  onClick={() => handlePrintLetter(letter)}
                                >
                                  {language === "ar" ? "طباعة" : "Print"}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shifts Tab */}
        <TabsContent value="shifts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "إدارة الورديات" : "Shift Management"}</CardTitle>
                <CardDescription>
                  {language === "ar" ? "إنشاء وتعيين ورديات العمل للموظفين" : "Create and assign work shifts to employees"}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => { setSelectedShift(null); setShiftForm({ name: "", start_time: "08:00", end_time: "16:00", break_duration: 60, working_hours: 8, is_night_shift: false, color: "#3B82F6" }); setShiftDialogOpen(true); }}>
                  <Plus className="w-4 h-4 ml-2" />
                  {language === "ar" ? "وردية جديدة" : "New Shift"}
                </Button>
                <Button variant="outline" onClick={() => setAssignShiftDialogOpen(true)}>
                  <UserPlus className="w-4 h-4 ml-2" />
                  {language === "ar" ? "تعيين وردية" : "Assign Shift"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shifts.map((shift) => (
                  <Card key={shift.id} className="border-r-4" style={{ borderRightColor: shift.color }}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{shift.name}</h3>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setSelectedShift(shift); setShiftForm(shift); setShiftDialogOpen(true); }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-red-500" onClick={async () => { await axios.delete(`${API}/hr/shifts/${shift.id}`); fetchData(); toast.success(language === "ar" ? "تم الحذف" : "Deleted"); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p><Clock className="w-3 h-3 inline ml-1" /> {shift.start_time} - {shift.end_time}</p>
                        <p>{language === "ar" ? "ساعات العمل:" : "Working hours:"} {shift.working_hours}h</p>
                        <p>{language === "ar" ? "الاستراحة:" : "Break:"} {shift.break_duration} {language === "ar" ? "دقيقة" : "min"}</p>
                        {shift.is_night_shift && <Badge variant="secondary">{language === "ar" ? "وردية ليلية" : "Night Shift"}</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {shifts.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    {language === "ar" ? "لا توجد ورديات. قم بإنشاء وردية جديدة." : "No shifts. Create a new shift."}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overtime Tab */}
        <TabsContent value="overtime">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "العمل الإضافي" : "Overtime"}</CardTitle>
                <CardDescription>
                  {language === "ar" ? "تسجيل وإدارة ساعات العمل الإضافي" : "Record and manage overtime hours"}
                </CardDescription>
              </div>
              <Button onClick={() => { setSelectedOvertime(null); setOvertimeForm({ employee_id: "", employee_name: "", date: new Date().toISOString().split('T')[0], start_time: "", end_time: "", hours: 0, rate: 1.5, reason: "" }); setOvertimeDialogOpen(true); }}>
                <Plus className="w-4 h-4 ml-2" />
                {language === "ar" ? "تسجيل عمل إضافي" : "Record Overtime"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "الموظف" : "Employee"}</TableHead>
                    <TableHead>{language === "ar" ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{language === "ar" ? "الوقت" : "Time"}</TableHead>
                    <TableHead>{language === "ar" ? "الساعات" : "Hours"}</TableHead>
                    <TableHead>{language === "ar" ? "المعدل" : "Rate"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overtime.map((ot) => (
                    <TableRow key={ot.id}>
                      <TableCell className="font-medium">{ot.employee_name}</TableCell>
                      <TableCell>{ot.date}</TableCell>
                      <TableCell>{ot.start_time} - {ot.end_time}</TableCell>
                      <TableCell>{ot.hours}h</TableCell>
                      <TableCell>{ot.rate}x</TableCell>
                      <TableCell>
                        <Badge variant={ot.status === "approved" ? "success" : ot.status === "rejected" ? "destructive" : "secondary"}>
                          {ot.status === "pending" ? (language === "ar" ? "معلق" : "Pending") : ot.status === "approved" ? (language === "ar" ? "معتمد" : "Approved") : (language === "ar" ? "مرفوض" : "Rejected")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ot.status === "pending" && (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="text-green-600" onClick={async () => { await axios.put(`${API}/hr/overtime/${ot.id}/approve?approved=true`); fetchData(); toast.success(language === "ar" ? "تمت الموافقة" : "Approved"); }}>
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-red-600" onClick={async () => { await axios.put(`${API}/hr/overtime/${ot.id}/approve?approved=false`); fetchData(); toast.success(language === "ar" ? "تم الرفض" : "Rejected"); }}>
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {overtime.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا توجد سجلات عمل إضافي" : "No overtime records"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loans Tab */}
        <TabsContent value="loans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "السلف والقروض" : "Advances & Loans"}</CardTitle>
                <CardDescription>
                  {language === "ar" ? "إدارة السلف والقروض للموظفين" : "Manage employee advances and loans"}
                </CardDescription>
              </div>
              <Button onClick={() => { setSelectedLoan(null); setLoanForm({ employee_id: "", employee_name: "", loan_type: "advance", amount: 0, reason: "", installments: 1, start_deduction_date: "" }); setLoanDialogOpen(true); }}>
                <Plus className="w-4 h-4 ml-2" />
                {language === "ar" ? "سلفة/قرض جديد" : "New Loan"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "الموظف" : "Employee"}</TableHead>
                    <TableHead>{language === "ar" ? "النوع" : "Type"}</TableHead>
                    <TableHead>{language === "ar" ? "المبلغ" : "Amount"}</TableHead>
                    <TableHead>{language === "ar" ? "الأقساط" : "Installments"}</TableHead>
                    <TableHead>{language === "ar" ? "المسدد" : "Paid"}</TableHead>
                    <TableHead>{language === "ar" ? "المتبقي" : "Remaining"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">{loan.employee_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {loan.loan_type === "advance" ? (language === "ar" ? "سلفة" : "Advance") : (language === "ar" ? "قرض" : "Loan")}
                        </Badge>
                      </TableCell>
                      <TableCell>{loan.amount?.toFixed(2)} {language === "ar" ? "ر.ع" : "OMR"}</TableCell>
                      <TableCell>{loan.paid_installments || 0} / {loan.installments}</TableCell>
                      <TableCell className="text-green-600">{(loan.paid_amount || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-orange-600">{(loan.remaining_amount || loan.amount).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={loan.status === "active" ? "default" : loan.status === "completed" ? "success" : loan.status === "rejected" ? "destructive" : "secondary"}>
                          {loan.status === "pending" ? (language === "ar" ? "معلق" : "Pending") : loan.status === "active" ? (language === "ar" ? "نشط" : "Active") : loan.status === "completed" ? (language === "ar" ? "مكتمل" : "Completed") : (language === "ar" ? "مرفوض" : "Rejected")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {loan.status === "pending" && (
                            <>
                              <Button size="icon" variant="ghost" className="text-green-600" onClick={async () => { await axios.put(`${API}/hr/loans/${loan.id}/approve?approved=true`); fetchData(); toast.success(language === "ar" ? "تمت الموافقة" : "Approved"); }}>
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="text-red-600" onClick={async () => { await axios.put(`${API}/hr/loans/${loan.id}/approve?approved=false`); fetchData(); toast.success(language === "ar" ? "تم الرفض" : "Rejected"); }}>
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {loan.status === "active" && (
                            <Button size="sm" variant="outline" onClick={async () => { await axios.post(`${API}/hr/loans/${loan.id}/payment?amount=${loan.installment_amount || loan.amount / loan.installments}`); fetchData(); toast.success(language === "ar" ? "تم تسجيل الدفعة" : "Payment recorded"); }}>
                              {language === "ar" ? "سداد قسط" : "Pay"}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {loans.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا توجد سلف أو قروض" : "No loans or advances"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "وثائق الموظفين" : "Employee Documents"}</CardTitle>
                <CardDescription>
                  {language === "ar" ? "إدارة وثائق ومستندات الموظفين" : "Manage employee documents and certificates"}
                </CardDescription>
              </div>
              <Button onClick={() => { setSelectedDocument(null); setDocumentForm({ employee_id: "", employee_name: "", document_type: "passport", document_name: "", document_number: "", issue_date: "", expiry_date: "", notes: "" }); setDocumentDialogOpen(true); }}>
                <Plus className="w-4 h-4 ml-2" />
                {language === "ar" ? "وثيقة جديدة" : "New Document"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "الموظف" : "Employee"}</TableHead>
                    <TableHead>{language === "ar" ? "نوع الوثيقة" : "Type"}</TableHead>
                    <TableHead>{language === "ar" ? "اسم الوثيقة" : "Document"}</TableHead>
                    <TableHead>{language === "ar" ? "الرقم" : "Number"}</TableHead>
                    <TableHead>{language === "ar" ? "تاريخ الانتهاء" : "Expiry"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.employee_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {doc.document_type === "passport" ? (language === "ar" ? "جواز سفر" : "Passport") : 
                           doc.document_type === "id_card" ? (language === "ar" ? "بطاقة هوية" : "ID Card") :
                           doc.document_type === "visa" ? (language === "ar" ? "تأشيرة" : "Visa") :
                           doc.document_type === "contract" ? (language === "ar" ? "عقد عمل" : "Contract") :
                           doc.document_type === "certificate" ? (language === "ar" ? "شهادة" : "Certificate") :
                           doc.document_type === "medical" ? (language === "ar" ? "طبي" : "Medical") : (language === "ar" ? "أخرى" : "Other")}
                        </Badge>
                      </TableCell>
                      <TableCell>{doc.document_name}</TableCell>
                      <TableCell>{doc.document_number || "-"}</TableCell>
                      <TableCell>{doc.expiry_date || "-"}</TableCell>
                      <TableCell>
                        {doc.expiry_date ? (
                          doc.is_expired ? (
                            <Badge variant="destructive">{language === "ar" ? "منتهي" : "Expired"}</Badge>
                          ) : doc.days_to_expiry <= 30 ? (
                            <Badge variant="warning" className="bg-orange-100 text-orange-800">{language === "ar" ? `ينتهي خلال ${doc.days_to_expiry} يوم` : `Expires in ${doc.days_to_expiry} days`}</Badge>
                          ) : (
                            <Badge variant="success" className="bg-green-100 text-green-800">{language === "ar" ? "ساري" : "Valid"}</Badge>
                          )
                        ) : (
                          <Badge variant="secondary">{language === "ar" ? "بدون تاريخ" : "No expiry"}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setSelectedDocument(doc); setDocumentForm(doc); setDocumentDialogOpen(true); }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-red-500" onClick={async () => { await axios.delete(`${API}/hr/documents/${doc.id}`); fetchData(); toast.success(language === "ar" ? "تم الحذف" : "Deleted"); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {documents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا توجد وثائق مسجلة" : "No documents recorded"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Employee Dialog */}
      <Dialog open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee ? (language === "ar" ? "تعديل موظف" : "Edit Employee") : (language === "ar" ? "إضافة موظف جديد" : "Add New Employee")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEmployeeSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "الاسم" : "Name"} *</Label>
                <Input
                  value={employeeForm.name}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "كود الموظف" : "Employee Code"}</Label>
                <Input
                  value={employeeForm.employee_code}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, employee_code: e.target.value })}
                  placeholder="EMP0001"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "اسم المستخدم" : "Username"}</Label>
                <Input
                  value={employeeForm.username}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, username: e.target.value })}
                  placeholder={language === "ar" ? "للدخول للنظام" : "For system login"}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "الهاتف" : "Phone"} *</Label>
                <Input
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "البريد الإلكتروني" : "Email"}</Label>
                <Input
                  type="email"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "القسم" : "Department"} *</Label>
                <Select
                  value={employeeForm.department}
                  onValueChange={(v) => setEmployeeForm({ ...employeeForm, department: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === "ar" ? "اختر القسم" : "Select Department"} />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {language === "ar" ? dept.name : dept.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "المنصب" : "Position"} *</Label>
                <Input
                  value={employeeForm.position}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, position: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "الراتب" : "Salary"} *</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={employeeForm.salary}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, salary: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ التعيين" : "Hire Date"} *</Label>
                <Input
                  type="date"
                  value={employeeForm.hire_date}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, hire_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "رقم الهوية" : "National ID"}</Label>
                <Input
                  value={employeeForm.national_id}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, national_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "معرف البصمة" : "Fingerprint ID"}</Label>
                <Input
                  value={employeeForm.fingerprint_id}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, fingerprint_id: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "المركز" : "Center"}</Label>
              <Select
                value={employeeForm.center_id}
                onValueChange={(v) => {
                  const center = centers.find(c => c.id === v);
                  setEmployeeForm({ 
                    ...employeeForm, 
                    center_id: v,
                    center_name: center?.name || ""
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === "ar" ? "اختر المركز" : "Select Center"} />
                </SelectTrigger>
                <SelectContent>
                  {centers.map((center) => (
                    <SelectItem key={center.id} value={center.id}>
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Manager Selection - مسؤول القسم */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "مسؤول القسم" : "Department Manager"}</Label>
              <Select
                value={employeeForm.manager_id || "none"}
                onValueChange={(v) => {
                  if (v === "none") {
                    setEmployeeForm({ 
                      ...employeeForm, 
                      manager_id: "",
                      manager_name: ""
                    });
                  } else {
                    const manager = managers.find(m => m.id === v);
                    setEmployeeForm({ 
                      ...employeeForm, 
                      manager_id: v,
                      manager_name: manager?.name || ""
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === "ar" ? "اختر المسؤول" : "Select Manager"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === "ar" ? "بدون مسؤول" : "No Manager"}</SelectItem>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name} - {getDepartmentName(manager.department)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Permissions - الصلاحيات */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "الصلاحيات" : "Permissions"}</Label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {availablePermissions.map((perm) => (
                    <label key={perm.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded">
                      <input
                        type="checkbox"
                        checked={employeeForm.permissions?.includes(perm.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEmployeeForm({
                              ...employeeForm,
                              permissions: [...(employeeForm.permissions || []), perm.id]
                            });
                          } else {
                            setEmployeeForm({
                              ...employeeForm,
                              permissions: (employeeForm.permissions || []).filter(p => p !== perm.id)
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">
                        {language === "ar" ? perm.name : perm.name_en}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEmployeeDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Leave Request Dialog */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "طلب إجازة جديد" : "New Leave Request"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLeaveSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "الموظف" : "Employee"} *</Label>
              <Select
                value={leaveForm.employee_id}
                onValueChange={(v) => {
                  const emp = employees.find(e => e.id === v);
                  setLeaveForm({ 
                    ...leaveForm, 
                    employee_id: v,
                    employee_name: emp?.name || ""
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === "ar" ? "اختر الموظف" : "Select Employee"} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "من تاريخ" : "From Date"} *</Label>
                <Input
                  type="date"
                  value={leaveForm.start_date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "إلى تاريخ" : "To Date"} *</Label>
                <Input
                  type="date"
                  value={leaveForm.end_date}
                  onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "عدد الأيام" : "Days Count"} *</Label>
              <Input
                type="number"
                value={leaveForm.days_count}
                onChange={(e) => setLeaveForm({ ...leaveForm, days_count: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "السبب" : "Reason"}</Label>
              <Textarea
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLeaveDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Request Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "طلب مصاريف جديد" : "New Expense Request"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "الموظف" : "Employee"} *</Label>
              <Select
                value={expenseForm.employee_id}
                onValueChange={(v) => {
                  const emp = employees.find(e => e.id === v);
                  setExpenseForm({ 
                    ...expenseForm, 
                    employee_id: v,
                    employee_name: emp?.name || ""
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === "ar" ? "اختر الموظف" : "Select Employee"} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "نوع المصاريف" : "Expense Type"} *</Label>
              <Select
                value={expenseForm.expense_type}
                onValueChange={(v) => setExpenseForm({ ...expenseForm, expense_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {language === "ar" ? type.name : type.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "المبلغ" : "Amount"} *</Label>
              <Input
                type="number"
                step="0.001"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الوصف" : "Description"} *</Label>
              <Textarea
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExpenseDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Car Contract Dialog */}
      <Dialog open={carDialogOpen} onOpenChange={setCarDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "عقد سيارة جديد" : "New Car Contract"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCarSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "نوع السيارة" : "Car Type"} *</Label>
                <Input
                  value={carForm.car_type}
                  onChange={(e) => setCarForm({ ...carForm, car_type: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "رقم اللوحة" : "Plate Number"} *</Label>
                <Input
                  value={carForm.plate_number}
                  onChange={(e) => setCarForm({ ...carForm, plate_number: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "سنة الصنع" : "Model Year"}</Label>
                <Input
                  value={carForm.model_year}
                  onChange={(e) => setCarForm({ ...carForm, model_year: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "اللون" : "Color"}</Label>
                <Input
                  value={carForm.color}
                  onChange={(e) => setCarForm({ ...carForm, color: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الموظف المسؤول" : "Assigned Employee"}</Label>
              <Select
                value={carForm.employee_id}
                onValueChange={(v) => {
                  const emp = employees.find(e => e.id === v);
                  setCarForm({ 
                    ...carForm, 
                    employee_id: v,
                    employee_name: emp?.name || ""
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === "ar" ? "اختر الموظف" : "Select Employee"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === "ar" ? "بدون تعيين" : "Not Assigned"}</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ البداية" : "Start Date"} *</Label>
                <Input
                  type="date"
                  value={carForm.start_date}
                  onChange={(e) => setCarForm({ ...carForm, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ النهاية" : "End Date"} *</Label>
                <Input
                  type="date"
                  value={carForm.end_date}
                  onChange={(e) => setCarForm({ ...carForm, end_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "الإيجار الشهري" : "Monthly Rent"} *</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={carForm.monthly_rent}
                  onChange={(e) => setCarForm({ ...carForm, monthly_rent: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "القيمة الإجمالية" : "Total Value"} *</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={carForm.total_value}
                  onChange={(e) => setCarForm({ ...carForm, total_value: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "ملاحظات" : "Notes"}</Label>
              <Textarea
                value={carForm.notes}
                onChange={(e) => setCarForm({ ...carForm, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCarDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Official Letter Dialog */}
      <Dialog open={letterDialogOpen} onOpenChange={setLetterDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "رسالة رسمية جديدة" : "New Official Letter"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLetterSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "الموظف" : "Employee"} *</Label>
              <Select
                value={letterForm.employee_id}
                onValueChange={(v) => {
                  const emp = employees.find(e => e.id === v);
                  setLetterForm({ 
                    ...letterForm, 
                    employee_id: v,
                    employee_name: emp?.name || "",
                    department: emp?.department || "",
                    position: emp?.position || ""
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === "ar" ? "اختر الموظف" : "Select Employee"} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "المنصب" : "Position"}</Label>
              <Input
                value={letterForm.position}
                onChange={(e) => setLetterForm({ ...letterForm, position: e.target.value })}
                placeholder={language === "ar" ? "أدخل المنصب" : "Enter position"}
              />
            </div>
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
            <div className="space-y-2">
              <Label>{language === "ar" ? "الغرض" : "Purpose"}</Label>
              <Input
                value={letterForm.purpose}
                onChange={(e) => setLetterForm({ ...letterForm, purpose: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الجهة المستلمة" : "Recipient"}</Label>
              <Input
                value={letterForm.recipient}
                onChange={(e) => setLetterForm({ ...letterForm, recipient: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLetterDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fingerprint Device Dialog */}
      <Dialog open={deviceDialogOpen} onOpenChange={setDeviceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDevice 
                ? (language === "ar" ? "تعديل جهاز بصمة" : "Edit Fingerprint Device")
                : (language === "ar" ? "إضافة جهاز بصمة" : "Add Fingerprint Device")
              }
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDeviceSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "اسم الجهاز" : "Device Name"} *</Label>
              <Input
                value={deviceForm.name}
                onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "عنوان IP" : "IP Address"} *</Label>
                <Input
                  value={deviceForm.ip_address}
                  onChange={(e) => setDeviceForm({ ...deviceForm, ip_address: e.target.value })}
                  placeholder="192.168.100.201"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "المنفذ" : "Port"}</Label>
                <Input
                  type="number"
                  value={deviceForm.port}
                  onChange={(e) => setDeviceForm({ ...deviceForm, port: parseInt(e.target.value) || 80 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "معرف الدخول" : "Login ID"} *</Label>
                <Input
                  value={deviceForm.login_id}
                  onChange={(e) => setDeviceForm({ ...deviceForm, login_id: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "كلمة المرور" : "Password"} *</Label>
                <Input
                  type="password"
                  value={deviceForm.password}
                  onChange={(e) => setDeviceForm({ ...deviceForm, password: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الموقع" : "Location"}</Label>
              <Input
                value={deviceForm.location}
                onChange={(e) => setDeviceForm({ ...deviceForm, location: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeviceDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Account Dialog */}
      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "إنشاء حساب للموظف" : "Create Employee Account"}</DialogTitle>
            <DialogDescription>
              {language === "ar" 
                ? `إنشاء حساب دخول للموظف: ${selectedEmployee?.name}`
                : `Create login account for: ${selectedEmployee?.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "كلمة المرور" : "Password"} *</Label>
              <Input
                type="password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                placeholder={language === "ar" ? "أدخل كلمة المرور" : "Enter password"}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {language === "ar" 
                ? `سيتم إنشاء حساب باسم المستخدم: ${selectedEmployee?.employee_code?.toLowerCase() || selectedEmployee?.name?.replace(/\s/g, '').toLowerCase()}`
                : `Username will be: ${selectedEmployee?.employee_code?.toLowerCase() || selectedEmployee?.name?.replace(/\s/g, '').toLowerCase()}`}
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAccountDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleCreateAccount} className="gradient-primary text-white">
              {language === "ar" ? "إنشاء الحساب" : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "إضافة سجل حضور" : "Add Attendance Record"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAttendanceSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "الموظف" : "Employee"} *</Label>
              <Select
                value={attendanceForm.employee_id}
                onValueChange={(v) => {
                  const emp = employees.find(e => e.id === v);
                  setAttendanceForm({ 
                    ...attendanceForm, 
                    employee_id: v,
                    employee_name: emp?.name || ""
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === "ar" ? "اختر الموظف" : "Select Employee"} />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "التاريخ" : "Date"} *</Label>
              <Input
                type="date"
                value={attendanceForm.date}
                onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "وقت الحضور" : "Check In"}</Label>
                <Input
                  type="time"
                  value={attendanceForm.check_in}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, check_in: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "وقت الانصراف" : "Check Out"}</Label>
                <Input
                  type="time"
                  value={attendanceForm.check_out}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, check_out: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAttendanceDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "ar" ? "تأكيد الحذف" : "Confirm Delete"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "ar"
                ? `هل أنت متأكد من حذف الموظف "${selectedEmployee?.name}"؟`
                : `Are you sure you want to delete employee "${selectedEmployee?.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEmployee}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Device Confirmation */}
      <AlertDialog open={deleteDeviceDialogOpen} onOpenChange={setDeleteDeviceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "ar" ? "تأكيد حذف الجهاز" : "Confirm Delete Device"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "ar"
                ? `هل أنت متأكد من حذف الجهاز "${selectedDevice?.name}"؟`
                : `Are you sure you want to delete device "${selectedDevice?.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDevice}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Shift Dialog */}
      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedShift ? (language === "ar" ? "تعديل وردية" : "Edit Shift") : (language === "ar" ? "وردية جديدة" : "New Shift")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              if (selectedShift) {
                await axios.put(`${API}/hr/shifts/${selectedShift.id}`, shiftForm);
              } else {
                await axios.post(`${API}/hr/shifts`, shiftForm);
              }
              setShiftDialogOpen(false);
              fetchData();
              toast.success(language === "ar" ? "تم الحفظ" : "Saved");
            } catch (error) {
              toast.error(error.response?.data?.detail || "Error");
            }
          }} className="space-y-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "اسم الوردية" : "Shift Name"} *</Label>
              <Input value={shiftForm.name} onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })} required placeholder={language === "ar" ? "مثال: الوردية الصباحية" : "e.g., Morning Shift"} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "وقت البداية" : "Start Time"} *</Label>
                <Input type="time" value={shiftForm.start_time} onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "وقت النهاية" : "End Time"} *</Label>
                <Input type="time" value={shiftForm.end_time} onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "ساعات العمل" : "Working Hours"}</Label>
                <Input type="number" step="0.5" value={shiftForm.working_hours} onChange={(e) => setShiftForm({ ...shiftForm, working_hours: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "الاستراحة (دقيقة)" : "Break (min)"}</Label>
                <Input type="number" value={shiftForm.break_duration} onChange={(e) => setShiftForm({ ...shiftForm, break_duration: parseInt(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "اللون" : "Color"}</Label>
                <Input type="color" value={shiftForm.color} onChange={(e) => setShiftForm({ ...shiftForm, color: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="nightShift" checked={shiftForm.is_night_shift} onChange={(e) => setShiftForm({ ...shiftForm, is_night_shift: e.target.checked })} />
                <Label htmlFor="nightShift">{language === "ar" ? "وردية ليلية" : "Night Shift"}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShiftDialogOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" className="gradient-primary text-white">{t("save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Shift Dialog */}
      <Dialog open={assignShiftDialogOpen} onOpenChange={setAssignShiftDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "تعيين وردية لموظف" : "Assign Shift to Employee"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              await axios.post(`${API}/hr/employee-shifts`, assignShiftForm);
              setAssignShiftDialogOpen(false);
              toast.success(language === "ar" ? "تم التعيين" : "Assigned");
            } catch (error) {
              toast.error(error.response?.data?.detail || "Error");
            }
          }} className="space-y-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "الموظف" : "Employee"} *</Label>
              <Select value={assignShiftForm.employee_id} onValueChange={(val) => { const emp = employees.find(e => e.id === val); setAssignShiftForm({ ...assignShiftForm, employee_id: val, employee_name: emp?.name || "" }); }}>
                <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر موظف" : "Select employee"} /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الوردية" : "Shift"} *</Label>
              <Select value={assignShiftForm.shift_id} onValueChange={(val) => { const shift = shifts.find(s => s.id === val); setAssignShiftForm({ ...assignShiftForm, shift_id: val, shift_name: shift?.name || "" }); }}>
                <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر وردية" : "Select shift"} /></SelectTrigger>
                <SelectContent>
                  {shifts.map((shift) => <SelectItem key={shift.id} value={shift.id}>{shift.name} ({shift.start_time}-{shift.end_time})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "من تاريخ" : "From Date"} *</Label>
                <Input type="date" value={assignShiftForm.date} onChange={(e) => setAssignShiftForm({ ...assignShiftForm, date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "إلى تاريخ" : "To Date"}</Label>
                <Input type="date" value={assignShiftForm.end_date} onChange={(e) => setAssignShiftForm({ ...assignShiftForm, end_date: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssignShiftDialogOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" className="gradient-primary text-white">{language === "ar" ? "تعيين" : "Assign"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Overtime Dialog */}
      <Dialog open={overtimeDialogOpen} onOpenChange={setOvertimeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "تسجيل عمل إضافي" : "Record Overtime"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              // Calculate hours
              const [sh, sm] = overtimeForm.start_time.split(':').map(Number);
              const [eh, em] = overtimeForm.end_time.split(':').map(Number);
              const hours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
              
              await axios.post(`${API}/hr/overtime`, { ...overtimeForm, hours: hours > 0 ? hours : 0 });
              setOvertimeDialogOpen(false);
              fetchData();
              toast.success(language === "ar" ? "تم التسجيل" : "Recorded");
            } catch (error) {
              toast.error(error.response?.data?.detail || "Error");
            }
          }} className="space-y-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "الموظف" : "Employee"} *</Label>
              <Select value={overtimeForm.employee_id} onValueChange={(val) => { const emp = employees.find(e => e.id === val); setOvertimeForm({ ...overtimeForm, employee_id: val, employee_name: emp?.name || "" }); }}>
                <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر موظف" : "Select employee"} /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "التاريخ" : "Date"} *</Label>
              <Input type="date" value={overtimeForm.date} onChange={(e) => setOvertimeForm({ ...overtimeForm, date: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "من الساعة" : "From"} *</Label>
                <Input type="time" value={overtimeForm.start_time} onChange={(e) => setOvertimeForm({ ...overtimeForm, start_time: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "إلى الساعة" : "To"} *</Label>
                <Input type="time" value={overtimeForm.end_time} onChange={(e) => setOvertimeForm({ ...overtimeForm, end_time: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "معدل الأجر" : "Rate"}</Label>
              <Select value={String(overtimeForm.rate)} onValueChange={(val) => setOvertimeForm({ ...overtimeForm, rate: parseFloat(val) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.5">1.5x ({language === "ar" ? "عادي" : "Normal"})</SelectItem>
                  <SelectItem value="2">2x ({language === "ar" ? "عطلة" : "Holiday"})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "السبب" : "Reason"}</Label>
              <Textarea value={overtimeForm.reason} onChange={(e) => setOvertimeForm({ ...overtimeForm, reason: e.target.value })} placeholder={language === "ar" ? "سبب العمل الإضافي" : "Overtime reason"} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOvertimeDialogOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" className="gradient-primary text-white">{t("save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Loan Dialog */}
      <Dialog open={loanDialogOpen} onOpenChange={setLoanDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "سلفة / قرض جديد" : "New Advance / Loan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              await axios.post(`${API}/hr/loans`, loanForm);
              setLoanDialogOpen(false);
              fetchData();
              toast.success(language === "ar" ? "تم الإنشاء" : "Created");
            } catch (error) {
              toast.error(error.response?.data?.detail || "Error");
            }
          }} className="space-y-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "الموظف" : "Employee"} *</Label>
              <Select value={loanForm.employee_id} onValueChange={(val) => { const emp = employees.find(e => e.id === val); setLoanForm({ ...loanForm, employee_id: val, employee_name: emp?.name || "" }); }}>
                <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر موظف" : "Select employee"} /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "النوع" : "Type"} *</Label>
              <Select value={loanForm.loan_type} onValueChange={(val) => setLoanForm({ ...loanForm, loan_type: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="advance">{language === "ar" ? "سلفة" : "Advance"}</SelectItem>
                  <SelectItem value="loan">{language === "ar" ? "قرض" : "Loan"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "المبلغ" : "Amount"} *</Label>
                <Input type="number" step="0.01" value={loanForm.amount} onChange={(e) => setLoanForm({ ...loanForm, amount: parseFloat(e.target.value) || 0 })} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "عدد الأقساط" : "Installments"}</Label>
                <Input type="number" min="1" value={loanForm.installments} onChange={(e) => setLoanForm({ ...loanForm, installments: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "بداية الخصم" : "Deduction Start"}</Label>
              <Input type="date" value={loanForm.start_deduction_date} onChange={(e) => setLoanForm({ ...loanForm, start_deduction_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "السبب" : "Reason"}</Label>
              <Textarea value={loanForm.reason} onChange={(e) => setLoanForm({ ...loanForm, reason: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLoanDialogOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" className="gradient-primary text-white">{t("save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Document Dialog */}
      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDocument ? (language === "ar" ? "تعديل وثيقة" : "Edit Document") : (language === "ar" ? "وثيقة جديدة" : "New Document")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              if (selectedDocument) {
                await axios.put(`${API}/hr/documents/${selectedDocument.id}`, documentForm);
              } else {
                await axios.post(`${API}/hr/documents`, documentForm);
              }
              setDocumentDialogOpen(false);
              fetchData();
              toast.success(language === "ar" ? "تم الحفظ" : "Saved");
            } catch (error) {
              toast.error(error.response?.data?.detail || "Error");
            }
          }} className="space-y-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "الموظف" : "Employee"} *</Label>
              <Select value={documentForm.employee_id} onValueChange={(val) => { const emp = employees.find(e => e.id === val); setDocumentForm({ ...documentForm, employee_id: val, employee_name: emp?.name || "" }); }}>
                <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر موظف" : "Select employee"} /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "نوع الوثيقة" : "Document Type"} *</Label>
              <Select value={documentForm.document_type} onValueChange={(val) => setDocumentForm({ ...documentForm, document_type: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="passport">{language === "ar" ? "جواز سفر" : "Passport"}</SelectItem>
                  <SelectItem value="id_card">{language === "ar" ? "بطاقة هوية" : "ID Card"}</SelectItem>
                  <SelectItem value="visa">{language === "ar" ? "تأشيرة" : "Visa"}</SelectItem>
                  <SelectItem value="contract">{language === "ar" ? "عقد عمل" : "Contract"}</SelectItem>
                  <SelectItem value="certificate">{language === "ar" ? "شهادة" : "Certificate"}</SelectItem>
                  <SelectItem value="medical">{language === "ar" ? "شهادة طبية" : "Medical"}</SelectItem>
                  <SelectItem value="other">{language === "ar" ? "أخرى" : "Other"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "اسم الوثيقة" : "Document Name"} *</Label>
              <Input value={documentForm.document_name} onChange={(e) => setDocumentForm({ ...documentForm, document_name: e.target.value })} required placeholder={language === "ar" ? "مثال: جواز سفر هندي" : "e.g., Indian Passport"} />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "رقم الوثيقة" : "Document Number"}</Label>
              <Input value={documentForm.document_number} onChange={(e) => setDocumentForm({ ...documentForm, document_number: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ الإصدار" : "Issue Date"}</Label>
                <Input type="date" value={documentForm.issue_date} onChange={(e) => setDocumentForm({ ...documentForm, issue_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ الانتهاء" : "Expiry Date"}</Label>
                <Input type="date" value={documentForm.expiry_date} onChange={(e) => setDocumentForm({ ...documentForm, expiry_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "ملاحظات" : "Notes"}</Label>
              <Textarea value={documentForm.notes} onChange={(e) => setDocumentForm({ ...documentForm, notes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDocumentDialogOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" className="gradient-primary text-white">{t("save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ZKTeco Sync Manager Dialog */}
      <Dialog open={zktecoDialogOpen} onOpenChange={setZktecoDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Fingerprint className="w-6 h-6 text-green-600" />
              {language === "ar" ? "مدير مزامنة البصمات - ZKTeco" : "ZKTeco Sync Manager"}
            </DialogTitle>
            <DialogDescription>
              {language === "ar" ? "إدارة أجهزة البصمة ومزامنة بيانات الحضور" : "Manage fingerprint devices and sync attendance data"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Sync Settings Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {language === "ar" ? "إعدادات المزامنة" : "Sync Settings"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="auto-sync"
                      checked={zktecoSyncSettings.auto_sync_enabled}
                      onChange={(e) => setZktecoSyncSettings({ ...zktecoSyncSettings, auto_sync_enabled: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300"
                    />
                    <Label htmlFor="auto-sync" className="text-base font-medium cursor-pointer">
                      {language === "ar" ? "المزامنة التلقائية" : "Auto Sync"}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-gray-500">
                      {language === "ar" ? "كل" : "Every"}
                    </Label>
                    <Input
                      type="number"
                      min="5"
                      value={zktecoSyncSettings.sync_interval}
                      onChange={(e) => setZktecoSyncSettings({ ...zktecoSyncSettings, sync_interval: parseInt(e.target.value) || 60 })}
                      className="w-20"
                    />
                    <Label className="text-sm text-gray-500">
                      {language === "ar" ? "دقيقة" : "minutes"}
                    </Label>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-sm text-gray-500">
                    {zktecoSyncSettings.last_sync ? (
                      <>
                        <History className="w-4 h-4 inline me-1" />
                        {language === "ar" ? "آخر مزامنة: " : "Last sync: "}
                        {new Date(zktecoSyncSettings.last_sync).toLocaleString('ar-SA')}
                      </>
                    ) : (
                      <>{language === "ar" ? "لم تتم المزامنة بعد" : "Not synced yet"}</>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleUpdateZktecoSettings}>
                      {language === "ar" ? "حفظ الإعدادات" : "Save Settings"}
                    </Button>
                    <Button 
                      className="gradient-primary text-white gap-2" 
                      onClick={handleZktecoSyncNow}
                      disabled={zktecoSyncing || zktecoDevices.length === 0}
                    >
                      {zktecoSyncing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      {language === "ar" ? "مزامنة الآن" : "Sync Now"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Devices Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    {language === "ar" ? "أجهزة البصمة" : "Fingerprint Devices"}
                    <Badge variant="outline">{zktecoDevices.length}</Badge>
                  </CardTitle>
                  <Button size="sm" onClick={() => setZktecoAddDialogOpen(true)}>
                    <Plus className="w-4 h-4 me-1" />
                    {language === "ar" ? "إضافة جهاز" : "Add Device"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {zktecoDevices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Fingerprint className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>{language === "ar" ? "لا توجد أجهزة مضافة" : "No devices added"}</p>
                    <p className="text-sm">{language === "ar" ? "أضف جهاز بصمة للبدء" : "Add a fingerprint device to get started"}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {zktecoDevices.map((device) => (
                      <div key={device.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${device.is_online ? 'bg-green-100' : 'bg-gray-100'}`}>
                            {device.is_online ? (
                              <Wifi className="w-5 h-5 text-green-600" />
                            ) : (
                              <WifiOff className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{device.name}</p>
                            <p className="text-sm text-gray-500">{device.ip_address}:{device.port}</p>
                            {device.location && <p className="text-xs text-gray-400">{device.location}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestZktecoDevice(device)}
                            disabled={zktecoTesting && selectedZktecoDevice === device.id}
                          >
                            {zktecoTesting && selectedZktecoDevice === device.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Wifi className="w-4 h-4" />
                            )}
                            {language === "ar" ? "اختبار" : "Test"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteZktecoDevice(device.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Logs Section */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {language === "ar" ? "سجل العمليات" : "Operation Log"}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={clearZktecoLogs}>
                    {language === "ar" ? "مسح السجل" : "Clear Log"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm h-48 overflow-y-auto">
                  {zktecoLogs.length === 0 ? (
                    <p className="text-gray-500">{language === "ar" ? "لا توجد عمليات مسجلة" : "No operations logged"}</p>
                  ) : (
                    zktecoLogs.map((log, idx) => (
                      <div key={idx} className="py-0.5">{log}</div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setZktecoDialogOpen(false)}>
              {language === "ar" ? "إغلاق" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add ZKTeco Device Dialog */}
      <Dialog open={zktecoAddDialogOpen} onOpenChange={setZktecoAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === "ar" ? "إضافة جهاز بصمة" : "Add Fingerprint Device"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleAddZktecoDevice(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "اسم الجهاز" : "Device Name"} *</Label>
              <Input 
                value={zktecoDeviceForm.name} 
                onChange={(e) => setZktecoDeviceForm({ ...zktecoDeviceForm, name: e.target.value })} 
                required 
                placeholder={language === "ar" ? "مثال: جهاز البصمة الرئيسي" : "e.g., Main Fingerprint Device"}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "عنوان IP" : "IP Address"} *</Label>
              <Input 
                value={zktecoDeviceForm.ip_address} 
                onChange={(e) => setZktecoDeviceForm({ ...zktecoDeviceForm, ip_address: e.target.value })} 
                required 
                placeholder="192.168.1.100"
              />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "المنفذ" : "Port"}</Label>
              <Input 
                type="number" 
                value={zktecoDeviceForm.port} 
                onChange={(e) => setZktecoDeviceForm({ ...zktecoDeviceForm, port: parseInt(e.target.value) || 4370 })} 
                placeholder="4370"
              />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الموقع" : "Location"}</Label>
              <Input 
                value={zktecoDeviceForm.location} 
                onChange={(e) => setZktecoDeviceForm({ ...zktecoDeviceForm, location: e.target.value })} 
                placeholder={language === "ar" ? "مثال: المدخل الرئيسي" : "e.g., Main Entrance"}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setZktecoAddDialogOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" className="gradient-primary text-white">{language === "ar" ? "إضافة" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HR;
