import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { API, useLanguage } from "../App";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Shield,
  Users,
  Building2,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  ChevronRight,
  CheckCircle,
  XCircle,
  User,
  Lock,
  Unlock,
  Eye,
  Settings,
  FileText,
  DollarSign,
  Package,
  Milk,
  UserCog,
} from "lucide-react";

const PermissionsManagement = () => {
  const { language } = useLanguage();
  const t = (ar, en) => (language === "ar" ? ar : en);

  const [activeTab, setActiveTab] = useState("employees");
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [permissionCategories, setPermissionCategories] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  
  // Grant Permission Dialog
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeePermissions, setEmployeePermissions] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  
  // View Permissions Dialog
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, deptRes, permRes] = await Promise.all([
        axios.get(`${API}/hr/employees`, { headers }),
        axios.get(`${API}/permissions/departments`, { headers }),
        axios.get(`${API}/permissions/available`, { headers }),
      ]);
      
      setEmployees(empRes.data || []);
      setDepartments(deptRes.data?.departments || []);
      setAvailablePermissions(permRes.data?.permissions || []);
      setPermissionCategories(permRes.data?.categories || {});
    } catch (error) {
      toast.error(t("فشل في تحميل البيانات", "Failed to load data"));
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeePermissions = async (employeeId) => {
    try {
      const res = await axios.get(`${API}/permissions/user/${employeeId}`, { headers });
      return res.data;
    } catch (error) {
      toast.error(t("فشل في تحميل صلاحيات الموظف", "Failed to load employee permissions"));
      return null;
    }
  };

  const openGrantDialog = async (employee) => {
    setSelectedEmployee(employee);
    const perms = await fetchEmployeePermissions(employee.id);
    setEmployeePermissions(perms);
    setSelectedPermissions([]);
    setGrantDialogOpen(true);
  };

  const openViewDialog = async (employee) => {
    setViewingEmployee(employee);
    const perms = await fetchEmployeePermissions(employee.id);
    setEmployeePermissions(perms);
    setViewDialogOpen(true);
  };

  const handleGrantPermissions = async () => {
    if (!selectedEmployee || selectedPermissions.length === 0) {
      toast.error(t("يرجى اختيار صلاحية واحدة على الأقل", "Please select at least one permission"));
      return;
    }

    setLoading(true);
    try {
      for (const permission of selectedPermissions) {
        await axios.post(
          `${API}/permissions/grant`,
          {
            employee_id: selectedEmployee.id,
            permission: permission,
          },
          { headers }
        );
      }
      
      toast.success(t("تم منح الصلاحيات بنجاح", "Permissions granted successfully"));
      setGrantDialogOpen(false);
      setSelectedPermissions([]);
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في منح الصلاحيات", "Failed to grant permissions"));
    } finally {
      setLoading(false);
    }
  };

  const handleRevokePermission = async (grantId, permissionName) => {
    if (!window.confirm(t(`هل تريد إلغاء صلاحية ${permissionName}؟`, `Revoke permission ${permissionName}?`))) {
      return;
    }

    try {
      await axios.delete(`${API}/permissions/revoke/${grantId}`, { headers });
      toast.success(t("تم إلغاء الصلاحية", "Permission revoked"));
      
      // Refresh employee permissions
      if (viewingEmployee) {
        const perms = await fetchEmployeePermissions(viewingEmployee.id);
        setEmployeePermissions(perms);
      }
    } catch (error) {
      toast.error(t("فشل في إلغاء الصلاحية", "Failed to revoke permission"));
    }
  };

  const togglePermission = (permission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const getPermissionLabel = (permission) => {
    const labels = {
      // استلام الحليب
      milk_reception_view: t("عرض استلامات الحليب", "View Milk Receptions"),
      milk_reception_create: t("إنشاء استلام حليب", "Create Milk Reception"),
      milk_reception_edit: t("تعديل استلام حليب", "Edit Milk Reception"),
      milk_reception_delete: t("حذف استلام حليب", "Delete Milk Reception"),
      // الموردين
      suppliers_view: t("عرض الموردين", "View Suppliers"),
      suppliers_create: t("إضافة مورد", "Create Supplier"),
      suppliers_edit: t("تعديل مورد", "Edit Supplier"),
      suppliers_delete: t("حذف مورد", "Delete Supplier"),
      suppliers_payment: t("دفع للموردين", "Pay Suppliers"),
      // العملاء
      customers_view: t("عرض العملاء", "View Customers"),
      customers_create: t("إضافة عميل", "Create Customer"),
      customers_edit: t("تعديل عميل", "Edit Customer"),
      customers_delete: t("حذف عميل", "Delete Customer"),
      customers_receipt: t("استلام من العملاء", "Receive from Customers"),
      // المبيعات
      sales_view: t("عرض المبيعات", "View Sales"),
      sales_create: t("إنشاء عملية بيع", "Create Sale"),
      sales_edit: t("تعديل عملية بيع", "Edit Sale"),
      // التقارير
      reports_view: t("عرض التقارير", "View Reports"),
      reports_financial: t("التقارير المالية", "Financial Reports"),
      reports_operational: t("التقارير التشغيلية", "Operational Reports"),
      reports_export: t("تصدير التقارير", "Export Reports"),
      // الموارد البشرية
      hr_employees_view: t("عرض الموظفين", "View Employees"),
      hr_employees_edit: t("تعديل بيانات الموظفين", "Edit Employees"),
      hr_attendance_view: t("عرض الحضور", "View Attendance"),
      hr_attendance_edit: t("تعديل الحضور", "Edit Attendance"),
      hr_leaves_view: t("عرض الإجازات", "View Leaves"),
      hr_leaves_approve: t("الموافقة على الإجازات", "Approve Leaves"),
      hr_payroll_view: t("عرض كشف الرواتب", "View Payroll"),
      hr_payroll_edit: t("تعديل كشف الرواتب", "Edit Payroll"),
      hr_payroll_approve_hr: t("موافقة HR على الرواتب", "HR Payroll Approval"),
      hr_payroll_approve_finance: t("موافقة المالية على الرواتب", "Finance Payroll Approval"),
      hr_payroll_approve_gm: t("موافقة المدير العام على الرواتب", "GM Payroll Approval"),
      // المخزون
      inventory_view: t("عرض المخزون", "View Inventory"),
      inventory_edit: t("تعديل المخزون", "Edit Inventory"),
      // الخزينة
      treasury_view: t("عرض الخزينة", "View Treasury"),
      treasury_transactions: t("معاملات الخزينة", "Treasury Transactions"),
      // النظام
      settings_view: t("عرض الإعدادات", "View Settings"),
      settings_edit: t("تعديل الإعدادات", "Edit Settings"),
      users_manage: t("إدارة المستخدمين", "Manage Users"),
      permissions_grant: t("منح الصلاحيات", "Grant Permissions"),
      // القانون
      legal_contracts_view: t("عرض العقود", "View Contracts"),
      legal_contracts_create: t("إنشاء عقد", "Create Contract"),
      legal_contracts_edit: t("تعديل عقد", "Edit Contract"),
      legal_cases_view: t("عرض القضايا", "View Cases"),
      legal_cases_create: t("إنشاء قضية", "Create Case"),
      legal_cases_edit: t("تعديل قضية", "Edit Case"),
      // المشاريع
      projects_view: t("عرض المشاريع", "View Projects"),
      projects_create: t("إنشاء مشروع", "Create Project"),
      projects_edit: t("تعديل مشروع", "Edit Project"),
      projects_delete: t("حذف مشروع", "Delete Project"),
      // العمليات
      operations_view: t("عرض العمليات", "View Operations"),
      operations_edit: t("تعديل العمليات", "Edit Operations"),
      operations_reports: t("تقارير العمليات", "Operations Reports"),
      // المشتريات
      purchases_view: t("عرض المشتريات", "View Purchases"),
      purchases_create: t("إنشاء عملية شراء", "Create Purchase"),
      purchases_edit: t("تعديل عملية شراء", "Edit Purchase"),
      purchases_approve: t("الموافقة على المشتريات", "Approve Purchases"),
    };
    return labels[permission] || permission;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      "استلام الحليب": Milk,
      "الموردين": Users,
      "العملاء": User,
      "المبيعات": DollarSign,
      "التقارير": FileText,
      "الموارد البشرية": UserCog,
      "المخزون": Package,
      "الخزينة": DollarSign,
      "النظام": Settings,
      "القانون": FileText,
      "المشاريع": Building2,
      "العمليات": Settings,
      "المشتريات": Package,
    };
    const Icon = icons[category] || Shield;
    return <Icon className="w-4 h-4" />;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      "استلام الحليب": t("استلام الحليب", "Milk Reception"),
      "الموردين": t("الموردين", "Suppliers"),
      "العملاء": t("العملاء", "Customers"),
      "المبيعات": t("المبيعات", "Sales"),
      "التقارير": t("التقارير", "Reports"),
      "الموارد البشرية": t("الموارد البشرية", "HR"),
      "المخزون": t("المخزون", "Inventory"),
      "الخزينة": t("الخزينة", "Treasury"),
      "النظام": t("النظام", "System"),
      "القانون": t("القانون", "Legal"),
      "المشاريع": t("المشاريع", "Projects"),
      "العمليات": t("العمليات", "Operations"),
      "المشتريات": t("المشتريات", "Purchases"),
    };
    return labels[category] || category;
  };

  const getRoleBadge = (position) => {
    if (position?.includes("المدير العام") || position?.includes("General Manager")) {
      return <Badge className="bg-purple-500">{t("المدير العام", "GM")}</Badge>;
    }
    if (position?.includes("مدير")) {
      return <Badge className="bg-blue-500">{t("مدير", "Manager")}</Badge>;
    }
    if (position?.includes("مشرف")) {
      return <Badge className="bg-green-500">{t("مشرف", "Supervisor")}</Badge>;
    }
    return <Badge variant="secondary">{t("موظف", "Employee")}</Badge>;
  };

  // Filter employees
  const filteredEmployees = employees.filter((emp) => {
    if (!emp.is_active) return false;
    const matchesSearch =
      !searchQuery ||
      emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_code?.includes(searchQuery);
    const matchesDept =
      selectedDepartment === "all" || emp.department === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6 p-6" dir={language === "ar" ? "rtl" : "ltr"} data-testid="permissions-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary" />
            {t("إدارة الصلاحيات", "Permissions Management")}
          </h1>
          <p className="text-muted-foreground">
            {t("إدارة صلاحيات الموظفين والأقسام", "Manage employee and department permissions")}
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 me-2 ${loading ? "animate-spin" : ""}`} />
          {t("تحديث", "Refresh")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{t("إجمالي الموظفين", "Total Employees")}</p>
                <p className="text-3xl font-bold">{employees.filter(e => e.is_active).length}</p>
              </div>
              <Users className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{t("الأقسام", "Departments")}</p>
                <p className="text-3xl font-bold">{departments.length}</p>
              </div>
              <Building2 className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{t("الصلاحيات المتاحة", "Available Permissions")}</p>
                <p className="text-3xl font-bold">{availablePermissions.length}</p>
              </div>
              <Lock className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{t("فئات الصلاحيات", "Permission Categories")}</p>
                <p className="text-3xl font-bold">{Object.keys(permissionCategories).length}</p>
              </div>
              <Shield className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t("الموظفين", "Employees")}
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {t("الأقسام", "Departments")}
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Lock className="w-4 h-4" />
            {t("الصلاحيات", "Permissions")}
          </TabsTrigger>
        </TabsList>

        {/* Employees Tab */}
        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>{t("صلاحيات الموظفين", "Employee Permissions")}</CardTitle>
                  <CardDescription>{t("عرض وإدارة صلاحيات كل موظف", "View and manage each employee's permissions")}</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t("بحث...", "Search...")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-9 w-full sm:w-64"
                    />
                  </div>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder={t("جميع الأقسام", "All Departments")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("جميع الأقسام", "All Departments")}</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("الموظف", "Employee")}</TableHead>
                      <TableHead>{t("القسم", "Department")}</TableHead>
                      <TableHead>{t("المنصب", "Position")}</TableHead>
                      <TableHead>{t("المستوى", "Level")}</TableHead>
                      <TableHead className="text-center">{t("الإجراءات", "Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {t("لا توجد نتائج", "No results found")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.slice(0, 50).map((emp) => (
                        <TableRow key={emp.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{emp.name}</p>
                                <p className="text-xs text-muted-foreground">{emp.employee_code}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{emp.department || "-"}</Badge>
                          </TableCell>
                          <TableCell>{emp.position || "-"}</TableCell>
                          <TableCell>{getRoleBadge(emp.position)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openViewDialog(emp)}
                              >
                                <Eye className="w-4 h-4 me-1" />
                                {t("عرض", "View")}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => openGrantDialog(emp)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Plus className="w-4 h-4 me-1" />
                                {t("منح", "Grant")}
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

        {/* Departments Tab */}
        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle>{t("صلاحيات الأقسام الافتراضية", "Default Department Permissions")}</CardTitle>
              <CardDescription>{t("الصلاحيات المخصصة لكل قسم", "Permissions assigned to each department")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {departments.map((dept) => (
                  <Card key={dept} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        {dept}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">
                        {t("الصلاحيات الافتراضية حسب المنصب:", "Default permissions by position:")}
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-500">{t("مدير", "Manager")}</Badge>
                          <span className="text-muted-foreground">
                            {t("صلاحيات كاملة + منح الصلاحيات", "Full access + grant permissions")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-500">{t("مشرف", "Supervisor")}</Badge>
                          <span className="text-muted-foreground">
                            {t("عرض وإنشاء فقط", "View & create only")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{t("موظف", "Employee")}</Badge>
                          <span className="text-muted-foreground">
                            {t("عرض فقط", "View only")}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>{t("قائمة الصلاحيات المتاحة", "Available Permissions List")}</CardTitle>
              <CardDescription>{t("جميع الصلاحيات التي يمكن منحها للموظفين", "All permissions that can be granted to employees")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(permissionCategories).map(([category, permissions]) => (
                  <Card key={category}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        {getCategoryIcon(category)}
                        {getCategoryLabel(category)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {permissions.map((perm) => (
                          <div key={perm} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                            <Lock className="w-3 h-3 text-muted-foreground" />
                            <span>{getPermissionLabel(perm)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Grant Permission Dialog */}
      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-500" />
              {t("منح صلاحيات", "Grant Permissions")}
            </DialogTitle>
            <DialogDescription>
              {selectedEmployee && (
                <span className="font-medium">{selectedEmployee.name} - {selectedEmployee.position}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {employeePermissions && (
            <div className="space-y-4">
              {/* Current Permissions */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">{t("الصلاحيات الحالية:", "Current Permissions:")}</p>
                <div className="flex flex-wrap gap-1">
                  {employeePermissions.all_permissions?.slice(0, 10).map((perm) => (
                    <Badge key={perm} variant="secondary" className="text-xs">
                      {getPermissionLabel(perm)}
                    </Badge>
                  ))}
                  {employeePermissions.all_permissions?.length > 10 && (
                    <Badge variant="outline">+{employeePermissions.all_permissions.length - 10}</Badge>
                  )}
                </div>
              </div>

              {/* Select New Permissions */}
              <div>
                <Label className="text-sm font-medium">{t("اختر الصلاحيات الجديدة:", "Select New Permissions:")}</Label>
                <ScrollArea className="h-[300px] mt-2 border rounded-lg p-4">
                  {Object.entries(permissionCategories).map(([category, permissions]) => (
                    <div key={category} className="mb-4">
                      <h4 className="font-medium text-sm flex items-center gap-2 mb-2 text-primary">
                        {getCategoryIcon(category)}
                        {getCategoryLabel(category)}
                      </h4>
                      <div className="grid grid-cols-2 gap-2 ps-6">
                        {permissions.map((perm) => {
                          const alreadyHas = employeePermissions.all_permissions?.includes(perm);
                          return (
                            <div
                              key={perm}
                              className={`flex items-center gap-2 p-2 rounded text-sm ${
                                alreadyHas ? "bg-green-50 text-green-700" : "hover:bg-muted"
                              }`}
                            >
                              <Checkbox
                                checked={selectedPermissions.includes(perm) || alreadyHas}
                                disabled={alreadyHas}
                                onCheckedChange={() => !alreadyHas && togglePermission(perm)}
                              />
                              <span className={alreadyHas ? "line-through opacity-50" : ""}>
                                {getPermissionLabel(perm)}
                              </span>
                              {alreadyHas && <CheckCircle className="w-3 h-3 text-green-500" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>

              {selectedPermissions.length > 0 && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-700 mb-2">
                    {t(`سيتم منح ${selectedPermissions.length} صلاحية:`, `${selectedPermissions.length} permissions will be granted:`)}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedPermissions.map((perm) => (
                      <Badge key={perm} className="bg-green-500 text-xs">
                        {getPermissionLabel(perm)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDialogOpen(false)}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button
              onClick={handleGrantPermissions}
              disabled={loading || selectedPermissions.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : <Plus className="w-4 h-4 me-2" />}
              {t("منح الصلاحيات", "Grant Permissions")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Permissions Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-500" />
              {t("صلاحيات الموظف", "Employee Permissions")}
            </DialogTitle>
          </DialogHeader>

          {viewingEmployee && employeePermissions && (
            <div className="space-y-4">
              {/* Employee Info */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{viewingEmployee.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {viewingEmployee.position} | {viewingEmployee.department}
                  </p>
                  {getRoleBadge(viewingEmployee.position)}
                </div>
              </div>

              {/* Role Permissions */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {t("صلاحيات الدور (تلقائية)", "Role Permissions (Automatic)")}
                </h4>
                <div className="flex flex-wrap gap-1 p-3 bg-blue-50 rounded-lg">
                  {employeePermissions.role_permissions?.map((perm) => (
                    <Badge key={perm} variant="secondary" className="text-xs">
                      {getPermissionLabel(perm)}
                    </Badge>
                  ))}
                  {employeePermissions.role_permissions?.length === 0 && (
                    <span className="text-sm text-muted-foreground">{t("لا توجد صلاحيات", "No permissions")}</span>
                  )}
                </div>
              </div>

              {/* Granted Permissions */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Unlock className="w-4 h-4" />
                  {t("صلاحيات ممنوحة (يدوية)", "Granted Permissions (Manual)")}
                </h4>
                <div className="flex flex-wrap gap-1 p-3 bg-green-50 rounded-lg">
                  {employeePermissions.granted_permissions?.map((perm) => (
                    <Badge key={perm} className="bg-green-500 text-xs">
                      {getPermissionLabel(perm)}
                    </Badge>
                  ))}
                  {employeePermissions.granted_permissions?.length === 0 && (
                    <span className="text-sm text-muted-foreground">{t("لا توجد صلاحيات ممنوحة", "No granted permissions")}</span>
                  )}
                </div>
              </div>

              {/* All Permissions Summary */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {t("إجمالي الصلاحيات", "Total Permissions")}: {employeePermissions.all_permissions?.length || 0}
                </h4>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              {t("إغلاق", "Close")}
            </Button>
            <Button onClick={() => {
              setViewDialogOpen(false);
              if (viewingEmployee) openGrantDialog(viewingEmployee);
            }} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 me-2" />
              {t("منح صلاحيات إضافية", "Grant More Permissions")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PermissionsManagement;
