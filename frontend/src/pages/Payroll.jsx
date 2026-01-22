import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { toast } from "sonner";
import {
  Calculator,
  Plus,
  Calendar,
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  FileText,
  Trash2,
  RefreshCw,
  Download,
  Printer,
  Building2,
  MapPin,
  Wallet,
  Banknote,
  Eye,
  Info,
  FileDown,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useLanguage } from "../App";

const API = process.env.REACT_APP_BACKEND_URL;

// Work locations categories
const CENTER_LOCATIONS = ["حجيف", "غدو", "زيك", "ثمريت", "طاقة", "مرباط"];
const ADMIN_LOCATIONS = ["الإدارة"];

const Payroll = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [disburseDialogOpen, setDisburseDialogOpen] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  
  // Employee Detail Report
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  // معامل خصم الغياب
  const [absenceDeductionFactor, setAbsenceDeductionFactor] = useState(1.0);
  const [absenceFactorLoading, setAbsenceFactorLoading] = useState(false);
  const [showAbsenceFactorDialog, setShowAbsenceFactorDialog] = useState(false);
  const [newAbsenceFactor, setNewAbsenceFactor] = useState(1.0);
  
  const [periodForm, setPeriodForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
  });
  
  const [disburseForm, setDisburseForm] = useState({
    from_account: "1112",
    to_account: "حساب الموظفين"
  });

  useEffect(() => {
    fetchPeriods();
    fetchAbsenceDeductionFactor();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchPeriodDetails(selectedPeriod);
    }
  }, [selectedPeriod]);

  const fetchPeriods = async () => {
    try {
      const token = localStorage.getItem("token");
      const [periodsRes, accountsRes] = await Promise.all([
        axios.get(`${API}/api/hr/payroll/periods`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/api/finance/accounts`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);
      
      setPeriods(periodsRes.data);
      if (periodsRes.data.length > 0 && !selectedPeriod) {
        setSelectedPeriod(periodsRes.data[0].id);
      }
      
      // Filter bank/cash accounts
      const paymentAccounts = accountsRes.data.filter(acc => 
        acc.account_type === 'asset' && 
        (acc.name.includes('البنك') || acc.name.includes('الصندوق') || acc.name.includes('النقد') || 
         acc.name.toLowerCase().includes('bank') || acc.name.toLowerCase().includes('cash'))
      );
      setBankAccounts(paymentAccounts);
    } catch (error) {
      console.error("Error fetching periods:", error);
    }
  };

  // جلب معامل خصم الغياب
  const fetchAbsenceDeductionFactor = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/api/hr/settings/absence-deduction-factor`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAbsenceDeductionFactor(response.data.absence_deduction_factor);
      setNewAbsenceFactor(response.data.absence_deduction_factor);
    } catch (error) {
      console.error("Error fetching absence deduction factor:", error);
    }
  };

  // تحديث معامل خصم الغياب
  const handleUpdateAbsenceFactor = async () => {
    setAbsenceFactorLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API}/api/hr/settings/absence-deduction-factor`,
        { factor: parseFloat(newAbsenceFactor) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(language === "ar" ? "تم تحديث معامل خصم الغياب بنجاح" : "Absence deduction factor updated");
      setAbsenceDeductionFactor(parseFloat(newAbsenceFactor));
      setShowAbsenceFactorDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === "ar" ? "فشل في التحديث" : "Update failed"));
    } finally {
      setAbsenceFactorLoading(false);
    }
  };

  const fetchPeriodDetails = async (periodId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/api/hr/payroll/periods/${periodId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPayrollRecords(response.data.records || []);
    } catch (error) {
      console.error("Error fetching period details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("name", periodForm.name);
      formData.append("start_date", periodForm.start_date);
      formData.append("end_date", periodForm.end_date);
      
      await axios.post(`${API}/api/hr/payroll/periods`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      toast.success(language === "ar" ? "تم إنشاء فترة الرواتب بنجاح" : "Payroll period created");
      setDialogOpen(false);
      setPeriodForm({ name: "", start_date: "", end_date: "" });
      fetchPeriods();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error creating period");
    }
  };

  const handleCalculatePayroll = async () => {
    if (!selectedPeriod) return;
    
    setCalculating(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API}/api/hr/payroll/periods/${selectedPeriod}/calculate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(response.data.message);
      fetchPeriods();
      fetchPeriodDetails(selectedPeriod);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error calculating payroll");
    } finally {
      setCalculating(false);
    }
  };

  const handleApprovePayroll = async () => {
    if (!selectedPeriod) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API}/api/hr/payroll/periods/${selectedPeriod}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(response.data?.message || (language === "ar" ? "تمت الموافقة" : "Approved"));
      fetchPeriods();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error approving payroll");
    }
  };

  const openDisburseDialog = () => {
    setDisburseForm({
      from_account: "1112",
      to_account: "حساب الموظفين"
    });
    setDisburseDialogOpen(true);
  };

  const handleDisbursePayroll = async () => {
    if (!selectedPeriod) return;
    
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API}/api/hr/payroll/periods/${selectedPeriod}/disburse`,
        {},
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: {
            from_account: disburseForm.from_account,
            to_account: disburseForm.to_account
          }
        }
      );
      
      toast.success(response.data.message || (language === "ar" ? "تم صرف الرواتب بنجاح" : "Payroll disbursed successfully"));
      setDisburseDialogOpen(false);
      fetchPeriods();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error disbursing payroll");
    }
  };

  const handleDeletePeriod = async (periodId) => {
    if (!window.confirm(language === "ar" ? "هل تريد حذف هذه الفترة؟" : "Delete this period?")) {
      return;
    }
    
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/api/hr/payroll/periods/${periodId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      toast.success(language === "ar" ? "تم حذف الفترة" : "Period deleted");
      fetchPeriods();
      if (selectedPeriod === periodId) {
        setSelectedPeriod(null);
        setPayrollRecords([]);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error deleting period");
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: language === "ar" ? "مسودة" : "Draft", variant: "secondary" },
      calculated: { label: language === "ar" ? "محسوب" : "Calculated", variant: "outline" },
      pending_hr: { label: language === "ar" ? "بانتظار HR" : "Pending HR", variant: "outline", className: "bg-yellow-100 text-yellow-800" },
      pending_finance: { label: language === "ar" ? "بانتظار المالية" : "Pending Finance", variant: "outline", className: "bg-blue-100 text-blue-800" },
      pending_gm: { label: language === "ar" ? "بانتظار المدير العام" : "Pending GM", variant: "outline", className: "bg-purple-100 text-purple-800" },
      approved: { label: language === "ar" ? "معتمد ✓" : "Approved ✓", variant: "default", className: "bg-green-500" },
      disbursed: { label: language === "ar" ? "تم الصرف ✓" : "Disbursed ✓", variant: "default", className: "bg-emerald-600" },
      paid: { label: language === "ar" ? "مدفوع" : "Paid", variant: "default" },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  // Export individual payroll report to PDF
  const exportDetailToPDF = (record) => {
    if (!record || !currentPeriod) {
      toast.error(language === "ar" ? "لا توجد بيانات للتصدير" : "No data to export");
      return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير راتب - ${record.employee_name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: A4; margin: 15mm; }
          body { 
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
            padding: 20px;
            background: white;
            color: #1a1a1a;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            border-radius: 12px;
            margin-bottom: 25px;
          }
          .header h1 { font-size: 22px; margin-bottom: 5px; }
          .header .subtitle { font-size: 14px; opacity: 0.9; }
          .employee-info {
            background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            border: 1px solid #bfdbfe;
          }
          .employee-info h2 { 
            font-size: 20px; 
            color: #1e40af;
            margin-bottom: 10px;
          }
          .employee-info .meta { 
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            font-size: 14px;
            color: #3b82f6;
          }
          .section {
            margin-bottom: 20px;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
          }
          .stat-card {
            padding: 15px;
            border-radius: 10px;
            text-align: center;
          }
          .stat-card.green { background: #dcfce7; border: 1px solid #86efac; }
          .stat-card.red { background: #fee2e2; border: 1px solid #fca5a5; }
          .stat-card.purple { background: #f3e8ff; border: 1px solid #d8b4fe; }
          .stat-card.amber { background: #fef3c7; border: 1px solid #fcd34d; }
          .stat-card.blue { background: #dbeafe; border: 1px solid #93c5fd; }
          .stat-card.orange { background: #ffedd5; border: 1px solid #fdba74; }
          .stat-card.pink { background: #fce7f3; border: 1px solid #f9a8d4; }
          .stat-card .value { 
            font-size: 28px; 
            font-weight: bold; 
            margin-bottom: 5px;
          }
          .stat-card.green .value { color: #15803d; }
          .stat-card.red .value { color: #dc2626; }
          .stat-card.purple .value { color: #7c3aed; }
          .stat-card.amber .value { color: #d97706; }
          .stat-card.blue .value { color: #2563eb; }
          .stat-card.orange .value { color: #ea580c; }
          .stat-card.pink .value { color: #db2777; }
          .stat-card .label { font-size: 12px; color: #6b7280; }
          .leave-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
          .salary-table {
            width: 100%;
            border-collapse: collapse;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .salary-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #e5e7eb;
          }
          .salary-table tr:nth-child(even) { background: #f9fafb; }
          .salary-table .label { font-weight: 500; color: #374151; }
          .salary-table .value { 
            text-align: left; 
            font-family: 'Courier New', monospace;
            font-weight: 600;
          }
          .salary-table .positive { color: #16a34a; }
          .salary-table .negative { color: #dc2626; }
          .salary-table .gross-row { background: #dcfce7 !important; }
          .salary-table .deduction-row { background: #fee2e2 !important; }
          .salary-table .net-row { 
            background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
          }
          .salary-table .net-row .value {
            font-size: 20px;
            color: #15803d;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #9ca3af;
          }
          .signature-section {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 40px;
          }
          .signature-box {
            text-align: center;
            padding-top: 40px;
            border-top: 1px solid #374151;
          }
          .signature-box .title { font-weight: bold; font-size: 12px; }
          .signature-box .name { font-size: 11px; color: #6b7280; margin-top: 5px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏢 شركة مروج لتجارة الحليب</h1>
          <div class="subtitle">تقرير الراتب التفصيلي</div>
        </div>
        
        <div class="employee-info">
          <h2>${record.employee_name}</h2>
          <div class="meta">
            <span>📋 الكود: ${record.employee_code || '-'}</span>
            <span>🏬 القسم: ${record.department || '-'}</span>
            <span>📍 الموقع: ${record.work_location || 'غير محدد'}</span>
            <span>💼 المنصب: ${record.position || '-'}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">📅 ملخص الحضور</div>
          <div class="stats-grid">
            <div class="stat-card green">
              <div class="value">${record.working_days || 0}</div>
              <div class="label">أيام الحضور</div>
            </div>
            <div class="stat-card red">
              <div class="value">${record.absent_days || 0}</div>
              <div class="label">أيام الغياب</div>
            </div>
            <div class="stat-card purple">
              <div class="value">${record.day_off || 0}</div>
              <div class="label">إجازة أسبوعية</div>
            </div>
            <div class="stat-card amber">
              <div class="value">${record.public_holiday || 0}</div>
              <div class="label">عطلات رسمية</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">🗓️ تفاصيل الإجازات</div>
          <div class="leave-grid">
            <div class="stat-card blue">
              <div class="value">${record.annual_leave || 0}</div>
              <div class="label">إجازة سنوية</div>
            </div>
            <div class="stat-card orange">
              <div class="value">${record.sick_leave || 0}</div>
              <div class="label">إجازة مرضية</div>
            </div>
            <div class="stat-card pink">
              <div class="value">${record.emergency_leave || 0}</div>
              <div class="label">إجازة طارئة</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">💰 تفاصيل الراتب</div>
          <table class="salary-table">
            <tr>
              <td class="label">الراتب الأساسي</td>
              <td class="value">${(record.basic_salary || 0).toFixed(3)} ر.ع</td>
            </tr>
            <tr>
              <td class="label">البدلات</td>
              <td class="value positive">+${(record.total_allowances || 0).toFixed(3)} ر.ع</td>
            </tr>
            ${record.total_overtime_hours > 0 ? `
            <tr>
              <td class="label">أجر العمل الإضافي (${record.total_overtime_hours?.toFixed(1)} ساعة)</td>
              <td class="value positive">+${(record.overtime_pay || 0).toFixed(3)} ر.ع</td>
            </tr>
            ` : ''}
            <tr class="gross-row">
              <td class="label"><strong>إجمالي الراتب</strong></td>
              <td class="value"><strong>${(record.gross_salary || 0).toFixed(3)} ر.ع</strong></td>
            </tr>
            <tr class="deduction-row">
              <td class="label">الخصومات ${record.absent_days > 0 ? `(${record.absent_days} يوم غياب)` : ''}</td>
              <td class="value negative">-${(record.deductions || 0).toFixed(3)} ر.ع</td>
            </tr>
            <tr class="net-row">
              <td class="label"><strong>صافي الراتب</strong></td>
              <td class="value">${(record.net_salary || 0).toFixed(3)} ر.ع</td>
            </tr>
          </table>
        </div>
        
        <div class="signature-section">
          <div class="signature-box">
            <div class="title">الموظف</div>
            <div class="name">${record.employee_name}</div>
          </div>
          <div class="signature-box">
            <div class="title">الموارد البشرية</div>
            <div class="name">______________</div>
          </div>
          <div class="signature-box">
            <div class="title">المدير المالي</div>
            <div class="name">______________</div>
          </div>
        </div>
        
        <div class="footer">
          <span>الفترة: ${currentPeriod.period_name} (${currentPeriod.start_date} → ${currentPeriod.end_date})</span>
          <span>تاريخ الطباعة: ${new Date().toLocaleString('ar-SA')}</span>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const currentPeriod = periods.find(p => p.id === selectedPeriod);
  
  const summary = {
    totalEmployees: payrollRecords.length,
    totalGross: payrollRecords.reduce((sum, r) => sum + (r.gross_salary || 0), 0),
    totalDeductions: payrollRecords.reduce((sum, r) => sum + (r.deductions || 0), 0),
    totalNet: payrollRecords.reduce((sum, r) => sum + (r.net_salary || 0), 0),
  };

  // Generate default period name based on dates
  const generatePeriodName = () => {
    if (periodForm.start_date && periodForm.end_date) {
      const start = new Date(periodForm.start_date);
      const end = new Date(periodForm.end_date);
      const startMonth = start.toLocaleDateString(language === "ar" ? "ar-OM" : "en-US", { month: "long" });
      const endMonth = end.toLocaleDateString(language === "ar" ? "ar-OM" : "en-US", { month: "long", year: "numeric" });
      return `${startMonth} - ${endMonth}`;
    }
    return "";
  };

  // Calculate end date to ensure 31 days period (16th to 15th or 16th based on month)
  const calculateEndDate = (startDate) => {
    if (!startDate) return "";
    
    const start = new Date(startDate);
    const startDay = start.getDate();
    
    // Default: Add 30 days to get to 15th of next month (31 days total including start)
    let endDate = new Date(start);
    endDate.setDate(endDate.getDate() + 30); // This gives us the 15th typically
    
    // Calculate actual days
    const daysDiff = Math.floor((endDate - start) / (1000 * 60 * 60 * 24)) + 1;
    
    // If less than 31 days, extend to 16th instead of 15th
    if (daysDiff < 31) {
      endDate.setDate(endDate.getDate() + (31 - daysDiff));
    }
    
    // Format as YYYY-MM-DD
    return endDate.toISOString().split('T')[0];
  };

  // Handle start date change - auto-calculate end date
  const handleStartDateChange = (e) => {
    const startDate = e.target.value;
    const endDate = calculateEndDate(startDate);
    setPeriodForm({ 
      ...periodForm, 
      start_date: startDate, 
      end_date: endDate,
      name: "" // Reset name to regenerate
    });
  };

  // Calculate period days for display
  const calculatePeriodDays = () => {
    if (periodForm.start_date && periodForm.end_date) {
      const start = new Date(periodForm.start_date);
      const end = new Date(periodForm.end_date);
      return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }
    return 0;
  };

  // Print payroll report by location type
  const handlePrintPayroll = (type) => {
    if (!currentPeriod || payrollRecords.length === 0) {
      toast.error(language === "ar" ? "لا توجد سجلات للطباعة" : "No records to print");
      return;
    }

    // Filter records by location type
    const locations = type === "centers" ? CENTER_LOCATIONS : ADMIN_LOCATIONS;
    const filteredRecords = payrollRecords.filter(r => 
      locations.includes(r.work_location) || 
      (type === "centers" && !r.work_location && !ADMIN_LOCATIONS.includes(r.work_location))
    );

    if (filteredRecords.length === 0) {
      toast.error(language === "ar" ? "لا توجد سجلات لهذا التقرير" : "No records for this report");
      return;
    }

    // Group records by location
    const groupedRecords = {};
    filteredRecords.forEach(record => {
      const loc = record.work_location || "غير محدد";
      if (!groupedRecords[loc]) {
        groupedRecords[loc] = [];
      }
      groupedRecords[loc].push(record);
    });

    // Calculate totals
    const totals = {
      employees: filteredRecords.length,
      working_days: filteredRecords.reduce((sum, r) => sum + (r.working_days || 0), 0),
      overtime_hours: filteredRecords.reduce((sum, r) => sum + (r.total_overtime_hours || 0), 0),
      basic_salary: filteredRecords.reduce((sum, r) => sum + (r.basic_salary || 0), 0),
      total_allowances: filteredRecords.reduce((sum, r) => sum + (r.total_allowances || 0), 0),
      total_salary: filteredRecords.reduce((sum, r) => sum + ((r.basic_salary || 0) + (r.total_allowances || 0)), 0),
      overtime_pay: filteredRecords.reduce((sum, r) => sum + (r.overtime_pay || 0), 0),
      deductions: filteredRecords.reduce((sum, r) => sum + (r.deductions || 0), 0),
      net_salary: filteredRecords.reduce((sum, r) => sum + (r.net_salary || 0), 0),
    };

    const reportTitle = type === "centers" 
      ? (language === "ar" ? "كشف رواتب المراكز" : "Centers Payroll Report")
      : (language === "ar" ? "كشف رواتب الإدارة" : "Administration Payroll Report");

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${reportTitle} - ${currentPeriod.name}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          * { box-sizing: border-box; }
          body { 
            font-family: 'Arial', sans-serif; 
            direction: rtl;
            margin: 0;
            padding: 15px;
            font-size: 11px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #1a365d;
            padding-bottom: 15px;
          }
          .header h1 {
            color: #1a365d;
            margin: 0 0 5px 0;
            font-size: 18px;
          }
          .header .period {
            color: #666;
            font-size: 12px;
          }
          .location-section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          .location-title {
            background: #1a365d;
            color: white;
            padding: 8px 15px;
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 6px 8px;
            text-align: center;
            font-size: 10px;
          }
          th {
            background: #f0f0f0;
            font-weight: bold;
          }
          .name-cell {
            text-align: right;
            font-weight: 500;
          }
          .total-row {
            background: #e8f4e8;
            font-weight: bold;
          }
          .grand-total {
            background: #1a365d;
            color: white;
            margin-top: 20px;
            padding: 15px;
          }
          .grand-total h3 {
            margin: 0 0 10px 0;
          }
          .grand-total-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
          }
          .grand-total-item {
            text-align: center;
          }
          .grand-total-item .label {
            font-size: 10px;
            opacity: 0.9;
          }
          .grand-total-item .value {
            font-size: 16px;
            font-weight: bold;
          }
          .signature-section {
            margin-top: 40px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 30px;
          }
          .signature-box {
            text-align: center;
            padding-top: 40px;
            border-top: 1px solid #333;
          }
          .print-date {
            text-align: left;
            font-size: 9px;
            color: #666;
            margin-top: 20px;
          }
          @media print { 
            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>شركة المروج للألبان</h1>
          <h2 style="margin: 5px 0; color: #1a365d;">${reportTitle}</h2>
          <div class="period">الفترة: ${currentPeriod.name} (${currentPeriod.start_date} إلى ${currentPeriod.end_date})</div>
        </div>

        ${Object.entries(groupedRecords).map(([location, records]) => {
          const locTotals = {
            working_days: records.reduce((sum, r) => sum + (r.working_days || 0), 0),
            overtime_hours: records.reduce((sum, r) => sum + (r.total_overtime_hours || 0), 0),
            basic_salary: records.reduce((sum, r) => sum + (r.basic_salary || 0), 0),
            total_allowances: records.reduce((sum, r) => sum + (r.total_allowances || 0), 0),
            total_salary: records.reduce((sum, r) => sum + ((r.basic_salary || 0) + (r.total_allowances || 0)), 0),
            overtime_pay: records.reduce((sum, r) => sum + (r.overtime_pay || 0), 0),
            deductions: records.reduce((sum, r) => sum + (r.deductions || 0), 0),
            net_salary: records.reduce((sum, r) => sum + (r.net_salary || 0), 0),
          };
          return `
            <div class="location-section">
              <div class="location-title">${location} (${records.length} موظف)</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 40px;">م</th>
                    <th style="width: 60px;">الكود</th>
                    <th style="width: 150px;">اسم الموظف</th>
                    <th>المنصب</th>
                    <th>الحضور</th>
                    <th>الغياب</th>
                    <th>الإجازات</th>
                    <th>ساعات إضافية</th>
                    <th>الراتب الإجمالي</th>
                    <th>الخصومات</th>
                    <th>الصافي</th>
                    <th>التوقيع</th>
                  </tr>
                </thead>
                <tbody>
                  ${records.map((r, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td>${r.employee_code || '-'}</td>
                      <td class="name-cell">${r.employee_name}</td>
                      <td>${r.position || '-'}</td>
                      <td>${r.working_days || 0}</td>
                      <td>${r.absent_days || 0}</td>
                      <td>${(r.annual_leave || 0) + (r.sick_leave || 0) + (r.emergency_leave || 0)}</td>
                      <td>${(r.total_overtime_hours || 0).toFixed(1)}</td>
                      <td>${((r.basic_salary || 0) + (r.total_allowances || 0)).toFixed(3)}</td>
                      <td style="color: #c00;">${(r.deductions || 0).toFixed(3)}</td>
                      <td style="font-weight: bold; color: #060;">${(r.net_salary || 0).toFixed(3)}</td>
                      <td></td>
                    </tr>
                  `).join('')}
                  <tr class="total-row">
                    <td colspan="4">المجموع</td>
                    <td>${locTotals.working_days}</td>
                    <td>-</td>
                    <td>-</td>
                    <td>${locTotals.overtime_hours.toFixed(1)}</td>
                    <td>${locTotals.total_salary.toFixed(3)}</td>
                    <td style="color: #c00;">${locTotals.deductions.toFixed(3)}</td>
                    <td style="font-weight: bold; color: #060;">${locTotals.net_salary.toFixed(3)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          `;
        }).join('')}

        <div class="grand-total">
          <h3>الإجمالي الكلي</h3>
          <div class="grand-total-grid">
            <div class="grand-total-item">
              <div class="label">عدد الموظفين</div>
              <div class="value">${totals.employees}</div>
            </div>
            <div class="grand-total-item">
              <div class="label">إجمالي الرواتب</div>
              <div class="value">${totals.total_salary.toFixed(3)} ر.ع</div>
            </div>
            <div class="grand-total-item">
              <div class="label">إجمالي العمل الإضافي</div>
              <div class="value">${totals.overtime_pay.toFixed(3)} ر.ع</div>
            </div>
            <div class="grand-total-item">
              <div class="label">صافي الرواتب</div>
              <div class="value">${totals.net_salary.toFixed(3)} ر.ع</div>
            </div>
          </div>
        </div>

        <div class="signature-section">
          <div class="signature-box">
            <div>إعداد</div>
            <div style="margin-top: 5px; font-size: 10px;">الموارد البشرية</div>
          </div>
          <div class="signature-box">
            <div>مراجعة</div>
            <div style="margin-top: 5px; font-size: 10px;">المدير المالي</div>
          </div>
          <div class="signature-box">
            <div>اعتماد</div>
            <div style="margin-top: 5px; font-size: 10px;">المدير العام</div>
          </div>
        </div>

        <div class="print-date">
          تاريخ الطباعة: ${new Date().toLocaleString('ar-SA')}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {language === "ar" ? "كشف الرواتب" : "Payroll"}
          </h1>
          <p className="text-muted-foreground">
            {language === "ar" ? "إدارة رواتب الموظفين (من 16 إلى 15 من الشهر التالي)" : "Manage employee payroll (16th to 15th)"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedPeriod && payrollRecords.length > 0 && (
            <>
              <Button 
                variant="outline" 
                onClick={() => handlePrintPayroll("centers")}
                className="gap-2"
              >
                <MapPin className="w-4 h-4" />
                {language === "ar" ? "طباعة كشف المراكز" : "Print Centers"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handlePrintPayroll("admin")}
                className="gap-2"
              >
                <Building2 className="w-4 h-4" />
                {language === "ar" ? "طباعة كشف الإدارة" : "Print Admin"}
              </Button>
            </>
          )}
          <Button onClick={() => setDialogOpen(true)} className="gradient-primary text-white">
            <Plus className="w-4 h-4 me-2" />
            {language === "ar" ? "فترة رواتب جديدة" : "New Payroll Period"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "عدد الموظفين" : "Employees"}
                </p>
                <p className="text-xl font-bold">{summary.totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "إجمالي الرواتب" : "Gross Total"}
                </p>
                <p className="text-xl font-bold">{summary.totalGross.toFixed(3)} ر.ع</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Calculator className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "إجمالي الخصومات" : "Deductions"}
                </p>
                <p className="text-xl font-bold">{summary.totalDeductions.toFixed(3)} ر.ع</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "صافي الرواتب" : "Net Total"}
                </p>
                <p className="text-xl font-bold">{summary.totalNet.toFixed(3)} ر.ع</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* بطاقة معامل خصم الغياب */}
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calculator className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" ? "معامل خصم الغياب" : "Absence Factor"}
                  </p>
                  <p className="text-xl font-bold text-orange-700">
                    {absenceDeductionFactor === 1 ? (language === "ar" ? "يوم كامل" : "Full Day") : 
                     absenceDeductionFactor === 0.5 ? (language === "ar" ? "نصف يوم" : "Half Day") :
                     absenceDeductionFactor === 0 ? (language === "ar" ? "بدون خصم" : "No Deduction") :
                     `${absenceDeductionFactor}x`}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAbsenceFactorDialog(true)}
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                {language === "ar" ? "تعديل" : "Edit"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Selection */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>{language === "ar" ? "فترات الرواتب" : "Payroll Periods"}</CardTitle>
              <CardDescription>
                {language === "ar" ? "اختر فترة لعرض تفاصيلها" : "Select a period to view details"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedPeriod || ""} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder={language === "ar" ? "اختر فترة" : "Select period"} />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.name} {getStatusBadge(period.status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {currentPeriod && currentPeriod.status !== "approved" && (
                <>
                  <Button
                    onClick={handleCalculatePayroll}
                    disabled={calculating}
                    variant="outline"
                  >
                    <RefreshCw className={`w-4 h-4 me-2 ${calculating ? "animate-spin" : ""}`} />
                    {language === "ar" ? "حساب الرواتب" : "Calculate"}
                  </Button>
                  
                  {currentPeriod.status === "calculated" && (
                    <Button onClick={handleApprovePayroll} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 me-2" />
                      {language === "ar" ? "موافقة HR" : "HR Approve"}
                    </Button>
                  )}
                  
                  {currentPeriod.status === "pending_hr" && (
                    <Button onClick={handleApprovePayroll} className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 me-2" />
                      {language === "ar" ? "موافقة HR" : "HR Approve"}
                    </Button>
                  )}
                  
                  {currentPeriod.status === "pending_finance" && (
                    <Button onClick={handleApprovePayroll} className="bg-blue-600 hover:bg-blue-700">
                      <CheckCircle className="w-4 h-4 me-2" />
                      {language === "ar" ? "موافقة المالية" : "Finance Approve"}
                    </Button>
                  )}
                  
                  {currentPeriod.status === "pending_gm" && (
                    <Button onClick={handleApprovePayroll} className="bg-purple-600 hover:bg-purple-700">
                      <CheckCircle className="w-4 h-4 me-2" />
                      {language === "ar" ? "موافقة المدير العام" : "GM Approve"}
                    </Button>
                  )}
                  
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeletePeriod(selectedPeriod)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
              
              {currentPeriod && currentPeriod.status === "approved" && (
                <Button 
                  onClick={openDisburseDialog} 
                  className="bg-amber-600 hover:bg-amber-700"
                  data-testid="disburse-payroll-btn"
                >
                  <Banknote className="w-4 h-4 me-2" />
                  {language === "ar" ? "صرف الرواتب" : "Disburse Payroll"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        {currentPeriod && (
          <CardContent>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {currentPeriod.start_date} → {currentPeriod.end_date}
              </span>
              <span>({currentPeriod.total_days} {language === "ar" ? "يوم" : "days"})</span>
              {getStatusBadge(currentPeriod.status)}
            </div>
            
            {/* Approval Progress */}
            {currentPeriod.status !== "draft" && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-semibold mb-3">{language === "ar" ? "مراحل الموافقة" : "Approval Stages"}</h4>
                <div className="flex items-center gap-2">
                  {/* HR Stage */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${currentPeriod.hr_approved_at ? 'bg-green-100 text-green-800' : currentPeriod.status === 'pending_hr' || currentPeriod.status === 'calculated' ? 'bg-yellow-100 text-yellow-800 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                    <span className="text-xs font-medium">1. {language === "ar" ? "الموارد البشرية" : "HR"}</span>
                    {currentPeriod.hr_approved_at && <CheckCircle className="w-4 h-4" />}
                  </div>
                  
                  <span className="text-gray-400">→</span>
                  
                  {/* Finance Stage */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${currentPeriod.finance_approved_at ? 'bg-green-100 text-green-800' : currentPeriod.status === 'pending_finance' ? 'bg-blue-100 text-blue-800 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                    <span className="text-xs font-medium">2. {language === "ar" ? "المالية" : "Finance"}</span>
                    {currentPeriod.finance_approved_at && <CheckCircle className="w-4 h-4" />}
                  </div>
                  
                  <span className="text-gray-400">→</span>
                  
                  {/* GM Stage */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${currentPeriod.gm_approved_at ? 'bg-green-100 text-green-800' : currentPeriod.status === 'pending_gm' ? 'bg-purple-100 text-purple-800 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                    <span className="text-xs font-medium">3. {language === "ar" ? "المدير العام" : "GM"}</span>
                    {currentPeriod.gm_approved_at && <CheckCircle className="w-4 h-4" />}
                  </div>
                </div>
                
                {/* Approval Details */}
                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  {currentPeriod.hr_approved_by_name && (
                    <p>✓ HR: {currentPeriod.hr_approved_by_name} - {new Date(currentPeriod.hr_approved_at).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}</p>
                  )}
                  {currentPeriod.finance_approved_by_name && (
                    <p>✓ {language === "ar" ? "المالية" : "Finance"}: {currentPeriod.finance_approved_by_name} - {new Date(currentPeriod.finance_approved_at).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}</p>
                  )}
                  {currentPeriod.gm_approved_by_name && (
                    <p>✓ {language === "ar" ? "المدير العام" : "GM"}: {currentPeriod.gm_approved_by_name} - {new Date(currentPeriod.gm_approved_at).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Payroll Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>{language === "ar" ? "تفاصيل الرواتب" : "Payroll Details"}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : payrollRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {language === "ar" ? "لا توجد سجلات. اضغط 'حساب الرواتب' لإنشاء السجلات" : "No records. Click 'Calculate' to generate records"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "الكود" : "Code"}</TableHead>
                    <TableHead>{language === "ar" ? "الاسم" : "Name"}</TableHead>
                    <TableHead>{language === "ar" ? "الموقع" : "Location"}</TableHead>
                    <TableHead className="text-center">{language === "ar" ? "الحضور" : "Present"}</TableHead>
                    <TableHead className="text-center">{language === "ar" ? "الغياب" : "Absent"}</TableHead>
                    <TableHead className="text-center">{language === "ar" ? "ساعات إضافية" : "Overtime"}</TableHead>
                    <TableHead>{language === "ar" ? "الراتب الإجمالي" : "Total Salary"}</TableHead>
                    <TableHead>{language === "ar" ? "الخصومات" : "Deductions"}</TableHead>
                    <TableHead>{language === "ar" ? "الصافي" : "Net"}</TableHead>
                    <TableHead className="text-center">{language === "ar" ? "التفاصيل" : "Details"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Badge variant="outline">{record.employee_code || "-"}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{record.employee_name}</TableCell>
                      <TableCell>
                        {record.work_location ? (
                          <Badge variant="secondary">{record.work_location}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {record.working_days}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-red-50 text-red-700">
                          {record.absent_days}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {record.total_overtime_hours > 0 ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700">
                            {record.total_overtime_hours?.toFixed(1)}h
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{((record.basic_salary || 0) + (record.total_allowances || 0)).toFixed(3)}</TableCell>
                      <TableCell className="text-red-600">
                        -{record.deductions?.toFixed(3)}
                      </TableCell>
                      <TableCell className="font-bold text-green-600">
                        {record.net_salary?.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setSelectedRecord(record); setDetailDialogOpen(true); }}
                          data-testid={`view-detail-${record.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Period Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === "ar" ? "إنشاء فترة رواتب جديدة" : "Create New Payroll Period"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePeriod} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ البداية" : "Start Date"} *</Label>
                <Input
                  type="date"
                  value={periodForm.start_date}
                  onChange={handleStartDateChange}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "عادة يوم 16 من الشهر" : "Usually 16th of the month"}
                </p>
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ النهاية" : "End Date"} *</Label>
                <Input
                  type="date"
                  value={periodForm.end_date}
                  onChange={(e) => setPeriodForm({ ...periodForm, end_date: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "يُحسب تلقائياً ليكون 31 يوم" : "Auto-calculated for 31 days"}
                </p>
              </div>
            </div>
            {periodForm.start_date && periodForm.end_date && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">
                    {language === "ar" ? "عدد أيام الفترة:" : "Period days:"}
                  </span>{" "}
                  <span className={`font-bold ${calculatePeriodDays() === 31 ? "text-green-600" : "text-orange-600"}`}>
                    {calculatePeriodDays()} {language === "ar" ? "يوم" : "days"}
                  </span>
                  {calculatePeriodDays() !== 31 && (
                    <span className="text-orange-600 text-xs mr-2">
                      {language === "ar" ? "(يُفضل 31 يوم)" : "(31 days preferred)"}
                    </span>
                  )}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>{language === "ar" ? "اسم الفترة" : "Period Name"} *</Label>
              <Input
                value={periodForm.name || generatePeriodName()}
                onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                placeholder={language === "ar" ? "مثال: نوفمبر - ديسمبر 2025" : "e.g., November - December 2025"}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {language === "ar" ? "إنشاء" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Disburse Payroll Dialog */}
      <Dialog open={disburseDialogOpen} onOpenChange={setDisburseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === "ar" ? "صرف الرواتب" : "Disburse Payroll"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                {language === "ar" 
                  ? "سيتم صرف الرواتب وإنشاء قيد محاسبي تلقائياً" 
                  : "Payroll will be disbursed and a journal entry will be created automatically"}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{language === "ar" ? "من حساب (المصدر)" : "From Account (Source)"}</Label>
                <Select 
                  value={disburseForm.from_account} 
                  onValueChange={(val) => setDisburseForm({...disburseForm, from_account: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === "ar" ? "اختر الحساب..." : "Select account..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.length > 0 ? (
                      bankAccounts.map(acc => (
                        <SelectItem key={acc.id || acc.account_number} value={acc.account_number}>
                          {acc.account_number} - {acc.name}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="1111">1111 - الصندوق (نقدي)</SelectItem>
                        <SelectItem value="1112">1112 - البنك</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>{language === "ar" ? "إلى حساب (الوجهة)" : "To Account (Destination)"}</Label>
                <Input 
                  value={disburseForm.to_account}
                  onChange={(e) => setDisburseForm({...disburseForm, to_account: e.target.value})}
                  placeholder={language === "ar" ? "حساب الموظفين" : "Employees account"}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisburseDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button 
              onClick={handleDisbursePayroll}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Banknote className="w-4 h-4 me-2" />
              {language === "ar" ? "تأكيد الصرف" : "Confirm Disbursement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog تعديل معامل خصم الغياب */}
      <Dialog open={showAbsenceFactorDialog} onOpenChange={setShowAbsenceFactorDialog}>
        <DialogContent className="max-w-md" dir={language === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {language === "ar" ? "تعديل معامل خصم الغياب" : "Edit Absence Deduction Factor"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-2">
                {language === "ar" ? "شرح المعامل:" : "Factor Explanation:"}
              </p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <strong>0</strong> = {language === "ar" ? "بدون خصم للغياب" : "No deduction for absence"}</li>
                <li>• <strong>0.5</strong> = {language === "ar" ? "خصم نصف يوم لكل يوم غياب" : "Half day deduction per absence"}</li>
                <li>• <strong>1.0</strong> = {language === "ar" ? "خصم يوم كامل (الافتراضي)" : "Full day deduction (default)"}</li>
                <li>• <strong>1.5</strong> = {language === "ar" ? "خصم يوم ونصف" : "1.5 day deduction"}</li>
                <li>• <strong>2.0</strong> = {language === "ar" ? "خصم ضعف اليوم" : "Double day deduction"}</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <Label>
                {language === "ar" ? "معامل الخصم" : "Deduction Factor"}
              </Label>
              <Select 
                value={newAbsenceFactor.toString()} 
                onValueChange={(v) => setNewAbsenceFactor(parseFloat(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">{language === "ar" ? "0 - بدون خصم" : "0 - No deduction"}</SelectItem>
                  <SelectItem value="0.5">{language === "ar" ? "0.5 - نصف يوم" : "0.5 - Half day"}</SelectItem>
                  <SelectItem value="1">{language === "ar" ? "1.0 - يوم كامل (افتراضي)" : "1.0 - Full day (default)"}</SelectItem>
                  <SelectItem value="1.5">{language === "ar" ? "1.5 - يوم ونصف" : "1.5 - One and half day"}</SelectItem>
                  <SelectItem value="2">{language === "ar" ? "2.0 - ضعف اليوم" : "2.0 - Double day"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <strong>{language === "ar" ? "ملاحظة:" : "Note:"}</strong>{" "}
              {language === "ar" 
                ? "يجب إعادة حساب الرواتب بعد تغيير هذا المعامل ليتم تطبيقه."
                : "Recalculate payroll after changing this factor to apply it."}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAbsenceFactorDialog(false)}>
              {language === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button 
              onClick={handleUpdateAbsenceFactor} 
              disabled={absenceFactorLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {absenceFactorLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                language === "ar" ? "حفظ" : "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Payroll Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={language === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {language === "ar" ? "تقرير الراتب التفصيلي" : "Detailed Payroll Report"}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-blue-900">{selectedRecord.employee_name}</h3>
                    <p className="text-sm text-blue-700">
                      {language === "ar" ? "الكود" : "Code"}: {selectedRecord.employee_code || "-"}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-white">
                    {selectedRecord.work_location || (language === "ar" ? "غير محدد" : "Not specified")}
                  </Badge>
                </div>
                <p className="text-sm text-blue-600 mt-1">
                  {selectedRecord.position || "-"} • {selectedRecord.department || "-"}
                </p>
              </div>
              
              {/* Attendance Summary */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {language === "ar" ? "ملخص الحضور" : "Attendance Summary"}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-center">
                    <p className="text-2xl font-bold text-green-700">{selectedRecord.working_days || 0}</p>
                    <p className="text-xs text-green-600">{language === "ar" ? "أيام الحضور" : "Present Days"}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-center">
                    <p className="text-2xl font-bold text-red-700">{selectedRecord.absent_days || 0}</p>
                    <p className="text-xs text-red-600">{language === "ar" ? "أيام الغياب" : "Absent Days"}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 text-center">
                    <p className="text-2xl font-bold text-purple-700">{selectedRecord.day_off || 0}</p>
                    <p className="text-xs text-purple-600">{language === "ar" ? "إجازة أسبوعية" : "Weekly Off"}</p>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-center">
                    <p className="text-2xl font-bold text-amber-700">{selectedRecord.public_holiday || 0}</p>
                    <p className="text-xs text-amber-600">{language === "ar" ? "عطلات رسمية" : "Public Holiday"}</p>
                  </div>
                </div>
              </div>
              
              {/* Leave Details */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {language === "ar" ? "تفاصيل الإجازات" : "Leave Details"}
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-center">
                    <p className="text-xl font-bold text-blue-700">{selectedRecord.annual_leave || 0}</p>
                    <p className="text-xs text-blue-600">{language === "ar" ? "إجازة سنوية" : "Annual Leave"}</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 text-center">
                    <p className="text-xl font-bold text-orange-700">{selectedRecord.sick_leave || 0}</p>
                    <p className="text-xs text-orange-600">{language === "ar" ? "إجازة مرضية" : "Sick Leave"}</p>
                  </div>
                  <div className="bg-pink-50 p-3 rounded-lg border border-pink-200 text-center">
                    <p className="text-xl font-bold text-pink-700">{selectedRecord.emergency_leave || 0}</p>
                    <p className="text-xs text-pink-600">{language === "ar" ? "إجازة طارئة" : "Emergency"}</p>
                  </div>
                </div>
              </div>
              
              {/* Salary Breakdown */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  {language === "ar" ? "تفاصيل الراتب" : "Salary Breakdown"}
                </h4>
                <div className="bg-gray-50 rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b">
                        <td className="p-2 font-medium">{language === "ar" ? "الراتب الأساسي" : "Basic Salary"}</td>
                        <td className="p-2 text-end font-mono">{(selectedRecord.basic_salary || 0).toFixed(3)} ر.ع</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-medium">{language === "ar" ? "البدلات" : "Allowances"}</td>
                        <td className="p-2 text-end font-mono text-green-600">+{(selectedRecord.total_allowances || 0).toFixed(3)} ر.ع</td>
                      </tr>
                      {selectedRecord.total_overtime_hours > 0 && (
                        <tr className="border-b bg-amber-50">
                          <td className="p-2 font-medium">
                            {language === "ar" ? "أجر العمل الإضافي" : "Overtime Pay"}
                            <span className="text-xs text-muted-foreground block">
                              ({selectedRecord.total_overtime_hours?.toFixed(1)} {language === "ar" ? "ساعة" : "hours"})
                            </span>
                          </td>
                          <td className="p-2 text-end font-mono text-amber-600">+{(selectedRecord.overtime_pay || 0).toFixed(3)} ر.ع</td>
                        </tr>
                      )}
                      <tr className="border-b bg-green-50">
                        <td className="p-2 font-bold">{language === "ar" ? "إجمالي الراتب" : "Gross Salary"}</td>
                        <td className="p-2 text-end font-mono font-bold">{(selectedRecord.gross_salary || 0).toFixed(3)} ر.ع</td>
                      </tr>
                      <tr className="border-b bg-red-50">
                        <td className="p-2 font-medium text-red-700">
                          {language === "ar" ? "الخصومات" : "Deductions"}
                          {selectedRecord.absent_days > 0 && (
                            <span className="text-xs block">
                              ({selectedRecord.absent_days} {language === "ar" ? "يوم غياب" : "absent days"})
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-end font-mono text-red-600">-{(selectedRecord.deductions || 0).toFixed(3)} ر.ع</td>
                      </tr>
                      <tr className="bg-gradient-to-r from-green-100 to-emerald-100">
                        <td className="p-3 font-bold text-green-800">{language === "ar" ? "صافي الراتب" : "Net Salary"}</td>
                        <td className="p-3 text-end font-mono font-bold text-xl text-green-700">{(selectedRecord.net_salary || 0).toFixed(3)} ر.ع</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Period Info */}
              {currentPeriod && (
                <div className="text-xs text-muted-foreground border-t pt-3">
                  <p>
                    {language === "ar" ? "الفترة" : "Period"}: {currentPeriod.period_name} 
                    ({currentPeriod.start_date} → {currentPeriod.end_date})
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              {language === "ar" ? "إغلاق" : "Close"}
            </Button>
            <Button 
              onClick={() => {
                // Print individual report
                const printContent = document.querySelector('[data-dialog-content]');
                if (printContent) {
                  window.print();
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Printer className="w-4 h-4 me-2" />
              {language === "ar" ? "طباعة" : "Print"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payroll;
