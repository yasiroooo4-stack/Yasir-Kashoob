import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Calculator,
  DollarSign,
  Users,
  Plus,
  RefreshCw,
  Search,
  Edit,
  Save,
  Home,
  Car,
  Utensils,
  Phone,
  Fuel,
  GraduationCap,
  Stethoscope,
  Star,
  Calendar,
  Trash2,
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
import { Textarea } from "../components/ui/textarea";

const API = process.env.REACT_APP_BACKEND_URL;

const SalaryStructures = () => {
  const [activeTab, setActiveTab] = useState("structures");
  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  
  const [form, setForm] = useState({
    basic_salary: "",
    housing_allowance: "",
    transportation_allowance: "",
    food_allowance: "",
    phone_allowance: "",
    fuel_allowance: "",
    education_allowance: "",
    medical_allowance: "",
    special_allowance: "",
    other_allowance: "",
    bank_name: "",
    bank_account: "",
    notes: "",
  });

  const [holidayForm, setHolidayForm] = useState({
    name: "",
    name_en: "",
    date: "",
    days: 1,
    is_paid: true,
    notes: "",
  });

  useEffect(() => {
    fetchEmployees();
    fetchStructures();
    fetchHolidays();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/api/hr/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmployees(response.data.filter(e => e.is_active));
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchStructures = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/api/hr/salary-structures`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStructures(response.data);
    } catch (error) {
      console.error("Error fetching structures:", error);
    }
  };

  const fetchHolidays = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/api/hr/public-holidays`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHolidays(response.data);
    } catch (error) {
      console.error("Error fetching holidays:", error);
    }
  };

  const handleEditStructure = async (employee) => {
    setSelectedEmployee(employee);
    setLoading(true);
    
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/api/hr/salary-structures/${employee.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = response.data;
      const allowances = data.allowances || {};
      
      setForm({
        basic_salary: data.basic_salary || employee.salary || "",
        housing_allowance: allowances.housing_allowance || "",
        transportation_allowance: allowances.transportation_allowance || "",
        food_allowance: allowances.food_allowance || "",
        phone_allowance: allowances.phone_allowance || "",
        fuel_allowance: allowances.fuel_allowance || "",
        education_allowance: allowances.education_allowance || "",
        medical_allowance: allowances.medical_allowance || "",
        special_allowance: allowances.special_allowance || "",
        other_allowance: allowances.other_allowance || "",
        bank_name: data.bank_name || "",
        bank_account: data.bank_account || "",
        notes: data.notes || "",
      });
    } catch (error) {
      // If no structure exists, use employee salary
      setForm({
        basic_salary: employee.salary || "",
        housing_allowance: "",
        transportation_allowance: "",
        food_allowance: "",
        phone_allowance: "",
        fuel_allowance: "",
        education_allowance: "",
        medical_allowance: "",
        special_allowance: "",
        other_allowance: "",
        bank_name: "",
        bank_account: "",
        notes: "",
      });
    } finally {
      setLoading(false);
      setDialogOpen(true);
    }
  };

  const handleSaveStructure = async () => {
    if (!selectedEmployee) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/api/hr/salary-structures`, {
        employee_id: selectedEmployee.id,
        basic_salary: parseFloat(form.basic_salary) || 0,
        allowances: {
          housing_allowance: parseFloat(form.housing_allowance) || 0,
          transportation_allowance: parseFloat(form.transportation_allowance) || 0,
          food_allowance: parseFloat(form.food_allowance) || 0,
          phone_allowance: parseFloat(form.phone_allowance) || 0,
          fuel_allowance: parseFloat(form.fuel_allowance) || 0,
          education_allowance: parseFloat(form.education_allowance) || 0,
          medical_allowance: parseFloat(form.medical_allowance) || 0,
          special_allowance: parseFloat(form.special_allowance) || 0,
          other_allowance: parseFloat(form.other_allowance) || 0,
        },
        bank_name: form.bank_name || null,
        bank_account: form.bank_account || null,
        notes: form.notes,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      toast.success("تم حفظ هيكل الراتب بنجاح");
      setDialogOpen(false);
      fetchStructures();
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل حفظ هيكل الراتب");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHoliday = async () => {
    if (!holidayForm.name || !holidayForm.date) {
      toast.error("يرجى إدخال اسم العطلة والتاريخ");
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/api/hr/public-holidays`, holidayForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      toast.success("تم إضافة العطلة الرسمية بنجاح");
      setHolidayDialogOpen(false);
      setHolidayForm({
        name: "",
        name_en: "",
        date: "",
        days: 1,
        is_paid: true,
        notes: "",
      });
      fetchHolidays();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل إضافة العطلة");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه العطلة؟")) return;
    
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/api/hr/public-holidays/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("تم حذف العطلة بنجاح");
      fetchHolidays();
    } catch (error) {
      toast.error("فشل حذف العطلة");
    }
  };

  const calculateTotalAllowances = () => {
    return (
      (parseFloat(form.housing_allowance) || 0) +
      (parseFloat(form.transportation_allowance) || 0) +
      (parseFloat(form.food_allowance) || 0) +
      (parseFloat(form.phone_allowance) || 0) +
      (parseFloat(form.fuel_allowance) || 0) +
      (parseFloat(form.education_allowance) || 0) +
      (parseFloat(form.medical_allowance) || 0) +
      (parseFloat(form.special_allowance) || 0) +
      (parseFloat(form.other_allowance) || 0)
    );
  };

  const calculateTotalSalary = () => {
    return (parseFloat(form.basic_salary) || 0) + calculateTotalAllowances();
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Create a map of structures by employee_id
  const structureMap = structures.reduce((acc, s) => {
    acc[s.employee_id] = s;
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-6" data-testid="salary-structures-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">هيكل الرواتب والبدلات</h1>
          <p className="text-gray-600">إدارة الرواتب الأساسية والبدلات والعطل الرسمية</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي الموظفين</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">هياكل محددة</p>
                <p className="text-2xl font-bold">{structures.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calculator className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي الرواتب</p>
                <p className="text-2xl font-bold">
                  {structures.reduce((sum, s) => sum + (s.total_salary || 0), 0).toLocaleString()} ر.ع
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">العطل الرسمية</p>
                <p className="text-2xl font-bold">{holidays.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="structures" data-testid="structures-tab">
            <DollarSign className="w-4 h-4 me-2" />
            هيكل الرواتب
          </TabsTrigger>
          <TabsTrigger value="holidays" data-testid="holidays-tab">
            <Calendar className="w-4 h-4 me-2" />
            العطل الرسمية
          </TabsTrigger>
        </TabsList>

        {/* Salary Structures Tab */}
        <TabsContent value="structures">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>هيكل رواتب الموظفين</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث بالاسم أو الكود..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-9 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>القسم</TableHead>
                    <TableHead>الراتب الأساسي</TableHead>
                    <TableHead>البدلات</TableHead>
                    <TableHead>إجمالي الراتب</TableHead>
                    <TableHead>البنك</TableHead>
                    <TableHead>رقم الحساب</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => {
                    const struct = structureMap[emp.id];
                    const totalAllowances = struct?.allowances ? 
                      Object.values(struct.allowances).reduce((sum, v) => sum + (v || 0), 0) : 0;
                    
                    return (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{emp.name}</p>
                            <p className="text-sm text-gray-500">{emp.employee_code || emp.employee_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>{emp.department || "-"}</TableCell>
                        <TableCell>
                          {struct?.basic_salary?.toLocaleString() || emp.salary?.toLocaleString() || 0} ر.ع
                        </TableCell>
                        <TableCell>
                          {totalAllowances.toLocaleString()} ر.ع
                        </TableCell>
                        <TableCell className="font-bold">
                          {struct?.total_salary?.toLocaleString() || emp.salary?.toLocaleString() || 0} ر.ع
                        </TableCell>
                        <TableCell>
                          {struct?.bank_name || "-"}
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {struct?.bank_account || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {struct ? (
                            <Badge className="bg-green-100 text-green-700">محدد</Badge>
                          ) : (
                            <Badge variant="secondary">افتراضي</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditStructure(emp)}
                            data-testid={`edit-structure-${emp.id}`}
                          >
                            <Edit className="w-4 h-4 me-1" />
                            تعديل
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Public Holidays Tab */}
        <TabsContent value="holidays">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>العطل الرسمية</CardTitle>
                <Button onClick={() => setHolidayDialogOpen(true)} data-testid="add-holiday-btn">
                  <Plus className="w-4 h-4 me-2" />
                  إضافة عطلة
                </Button>
              </div>
              <CardDescription>
                العطل الرسمية تؤثر على حساب الرواتب - أيام العطل مدفوعة الأجر
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم العطلة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>عدد الأيام</TableHead>
                    <TableHead>مدفوعة؟</TableHead>
                    <TableHead>ملاحظات</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        لا توجد عطل رسمية مسجلة
                      </TableCell>
                    </TableRow>
                  ) : (
                    holidays.map((holiday) => (
                      <TableRow key={holiday.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{holiday.name}</p>
                            {holiday.name_en && (
                              <p className="text-sm text-gray-500">{holiday.name_en}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{holiday.date}</TableCell>
                        <TableCell>{holiday.days} يوم</TableCell>
                        <TableCell>
                          {holiday.is_paid ? (
                            <Badge className="bg-green-100 text-green-700">نعم</Badge>
                          ) : (
                            <Badge variant="secondary">لا</Badge>
                          )}
                        </TableCell>
                        <TableCell>{holiday.notes || "-"}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteHoliday(holiday.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Salary Structure Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              تعديل هيكل الراتب - {selectedEmployee?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Salary */}
            <div className="space-y-2">
              <Label className="text-lg font-semibold">الراتب الأساسي</Label>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <Input
                  type="number"
                  value={form.basic_salary}
                  onChange={(e) => setForm({ ...form, basic_salary: e.target.value })}
                  placeholder="0"
                  className="text-lg"
                />
                <span className="text-gray-500">ر.ع</span>
              </div>
            </div>

            {/* Allowances */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">البدلات</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-blue-500" />
                    بدل السكن
                  </Label>
                  <Input
                    type="number"
                    value={form.housing_allowance}
                    onChange={(e) => setForm({ ...form, housing_allowance: e.target.value })}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-green-500" />
                    بدل النقل
                  </Label>
                  <Input
                    type="number"
                    value={form.transportation_allowance}
                    onChange={(e) => setForm({ ...form, transportation_allowance: e.target.value })}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-orange-500" />
                    بدل الطعام
                  </Label>
                  <Input
                    type="number"
                    value={form.food_allowance}
                    onChange={(e) => setForm({ ...form, food_allowance: e.target.value })}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-purple-500" />
                    بدل الهاتف
                  </Label>
                  <Input
                    type="number"
                    value={form.phone_allowance}
                    onChange={(e) => setForm({ ...form, phone_allowance: e.target.value })}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-red-500" />
                    بدل الوقود
                  </Label>
                  <Input
                    type="number"
                    value={form.fuel_allowance}
                    onChange={(e) => setForm({ ...form, fuel_allowance: e.target.value })}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-500" />
                    بدل التعليم
                  </Label>
                  <Input
                    type="number"
                    value={form.education_allowance}
                    onChange={(e) => setForm({ ...form, education_allowance: e.target.value })}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-pink-500" />
                    بدل طبي
                  </Label>
                  <Input
                    type="number"
                    value={form.medical_allowance}
                    onChange={(e) => setForm({ ...form, medical_allowance: e.target.value })}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    بدل خاص
                  </Label>
                  <Input
                    type="number"
                    value={form.special_allowance}
                    onChange={(e) => setForm({ ...form, special_allowance: e.target.value })}
                    placeholder="0"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-gray-500" />
                    بدلات أخرى
                  </Label>
                  <Input
                    type="number"
                    value={form.other_allowance}
                    onChange={(e) => setForm({ ...form, other_allowance: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Bank Information */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">معلومات البنك</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم البنك</Label>
                  <Select
                    value={form.bank_name}
                    onValueChange={(value) => setForm({ ...form, bank_name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر البنك" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Muscat">Bank Muscat</SelectItem>
                      <SelectItem value="Bank Dhofar">Bank Dhofar</SelectItem>
                      <SelectItem value="Bank Dhofar Islamic">Bank Dhofar Islamic</SelectItem>
                      <SelectItem value="National Bank of Oman">National Bank of Oman</SelectItem>
                      <SelectItem value="Bank Sohar">Bank Sohar</SelectItem>
                      <SelectItem value="Bank Sohar Islamic">Bank Sohar Islamic</SelectItem>
                      <SelectItem value="Bank Nizwa">Bank Nizwa</SelectItem>
                      <SelectItem value="Oman Arab Bank">Oman Arab Bank</SelectItem>
                      <SelectItem value="Alizz Islamic Bank">Alizz Islamic Bank</SelectItem>
                      <SelectItem value="Ahli Bank">Ahli Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>رقم الحساب البنكي</Label>
                  <Input
                    type="text"
                    value={form.bank_account}
                    onChange={(e) => setForm({ ...form, bank_account: e.target.value })}
                    placeholder="أدخل رقم الحساب"
                    className="font-mono"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="ملاحظات إضافية..."
              />
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">الراتب الأساسي:</span>
                <span>{(parseFloat(form.basic_salary) || 0).toLocaleString()} ر.ع</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">إجمالي البدلات:</span>
                <span>{calculateTotalAllowances().toLocaleString()} ر.ع</span>
              </div>
              <hr />
              <div className="flex justify-between font-bold text-lg">
                <span>إجمالي الراتب:</span>
                <span className="text-green-600">{calculateTotalSalary().toLocaleString()} ر.ع</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveStructure} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 me-2" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Holiday Dialog */}
      <Dialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة عطلة رسمية</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>اسم العطلة (عربي) *</Label>
              <Input
                value={holidayForm.name}
                onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                placeholder="مثال: العيد الوطني"
              />
            </div>
            
            <div className="space-y-2">
              <Label>اسم العطلة (إنجليزي)</Label>
              <Input
                value={holidayForm.name_en}
                onChange={(e) => setHolidayForm({ ...holidayForm, name_en: e.target.value })}
                placeholder="e.g. National Day"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>التاريخ *</Label>
                <Input
                  type="date"
                  value={holidayForm.date}
                  onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>عدد الأيام</Label>
                <Input
                  type="number"
                  min="1"
                  value={holidayForm.days}
                  onChange={(e) => setHolidayForm({ ...holidayForm, days: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>مدفوعة الأجر؟</Label>
              <Select
                value={holidayForm.is_paid ? "yes" : "no"}
                onValueChange={(v) => setHolidayForm({ ...holidayForm, is_paid: v === "yes" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">نعم - مدفوعة</SelectItem>
                  <SelectItem value="no">لا - بدون أجر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea
                value={holidayForm.notes}
                onChange={(e) => setHolidayForm({ ...holidayForm, notes: e.target.value })}
                placeholder="ملاحظات إضافية..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setHolidayDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleCreateHoliday} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : <Plus className="w-4 h-4 me-2" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalaryStructures;
