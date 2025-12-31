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

const Payroll = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [calculating, setCalculating] = useState(false);
  
  const [periodForm, setPeriodForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchPeriodDetails(selectedPeriod);
    }
  }, [selectedPeriod]);

  const fetchPeriods = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/api/hr/payroll/periods`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPeriods(response.data);
      if (response.data.length > 0 && !selectedPeriod) {
        setSelectedPeriod(response.data[0].id);
      }
    } catch (error) {
      console.error("Error fetching periods:", error);
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
      await axios.post(
        `${API}/api/hr/payroll/periods/${selectedPeriod}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(language === "ar" ? "تم اعتماد كشف الرواتب" : "Payroll approved");
      fetchPeriods();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error approving payroll");
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
      approved: { label: language === "ar" ? "معتمد" : "Approved", variant: "default" },
      paid: { label: language === "ar" ? "مدفوع" : "Paid", variant: "default" },
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
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
        <Button onClick={() => setDialogOpen(true)} className="gradient-primary text-white">
          <Plus className="w-4 h-4 me-2" />
          {language === "ar" ? "فترة رواتب جديدة" : "New Payroll Period"}
        </Button>
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
                      {language === "ar" ? "اعتماد" : "Approve"}
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
                    <TableHead>{language === "ar" ? "القسم" : "Department"}</TableHead>
                    <TableHead className="text-center">{language === "ar" ? "الحضور" : "Present"}</TableHead>
                    <TableHead className="text-center">{language === "ar" ? "الغياب" : "Absent"}</TableHead>
                    <TableHead className="text-center">{language === "ar" ? "الإجازات" : "Leaves"}</TableHead>
                    <TableHead className="text-center">{language === "ar" ? "أيام الدفع" : "Pay Days"}</TableHead>
                    <TableHead>{language === "ar" ? "الراتب الأساسي" : "Basic"}</TableHead>
                    <TableHead>{language === "ar" ? "الخصومات" : "Deductions"}</TableHead>
                    <TableHead>{language === "ar" ? "الصافي" : "Net"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Badge variant="outline">{record.employee_code || "-"}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{record.employee_name}</TableCell>
                      <TableCell>{record.department || "-"}</TableCell>
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
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {(record.annual_leave || 0) + (record.sick_leave || 0) + (record.emergency_leave || 0)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {record.total_pay_days}
                      </TableCell>
                      <TableCell>{record.basic_salary?.toFixed(3)}</TableCell>
                      <TableCell className="text-red-600">
                        -{record.deductions?.toFixed(3)}
                      </TableCell>
                      <TableCell className="font-bold text-green-600">
                        {record.net_salary?.toFixed(3)}
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
                  onChange={(e) => setPeriodForm({ ...periodForm, start_date: e.target.value })}
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
                  {language === "ar" ? "عادة يوم 15 من الشهر التالي" : "Usually 15th of next month"}
                </p>
              </div>
            </div>
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
    </div>
  );
};

export default Payroll;
