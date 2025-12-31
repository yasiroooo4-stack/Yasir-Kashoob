import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API, useLanguage } from "../App";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, UserCog, Phone, Calendar, Wallet } from "lucide-react";

const Employees = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    position: "",
    department: "",
    salary: "",
    hire_date: "",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${API}/api/employees`);
      setEmployees(response.data);
    } catch (error) {
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        salary: parseFloat(formData.salary),
      };

      if (selectedEmployee) {
        await axios.put(`${API}/api/employees/${selectedEmployee.id}`, data);
        toast.success(t("success"));
      } else {
        await axios.post(`${API}/api/employees`, data);
        toast.success(t("success"));
      }
      setDialogOpen(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/api/employees/${selectedEmployee.id}`);
      toast.success(t("success"));
      setDeleteDialogOpen(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("error"));
    }
  };

  const openEditDialog = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      phone: employee.phone,
      position: employee.position,
      department: employee.department,
      salary: employee.salary,
      hire_date: employee.hire_date,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      position: "",
      department: "",
      salary: "",
      hire_date: "",
    });
    setSelectedEmployee(null);
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.phone.includes(searchTerm) ||
      e.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSalaries = employees.reduce((sum, e) => sum + (e.salary || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="employees-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("employees")}</h1>
          <p className="text-muted-foreground">
            {language === "ar" ? "إدارة الموظفين والرواتب" : "Manage employees and salaries"}
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
          className="bg-gradient-to-br from-violet-500 to-purple-600 text-white hover:opacity-90"
          data-testid="add-employee-btn"
        >
          <Plus className="w-4 h-4 me-2" />
          {t("add_employee")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center">
              <UserCog className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{employees.length}</p>
              <p className="text-sm text-muted-foreground">{t("employees")}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalSalaries.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "إجمالي الرواتب" : "Total Salaries"} ({t("currency")})
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center">
              <UserCog className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {employees.length > 0 ? Math.round(totalSalaries / employees.length).toLocaleString() : 0}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "متوسط الراتب" : "Average Salary"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">{t("employees")}</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-9"
                data-testid="search-employees"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("employee_name")}</TableHead>
                  <TableHead>{t("phone")}</TableHead>
                  <TableHead>{t("position")}</TableHead>
                  <TableHead>{t("department")}</TableHead>
                  <TableHead>{t("salary")}</TableHead>
                  <TableHead>{t("hire_date")}</TableHead>
                  <TableHead>{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t("no_data")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} className="table-row-hover" data-testid={`employee-row-${employee.id}`}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {employee.phone}
                        </span>
                      </TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell>
                        <span className="bg-violet-100 text-violet-700 px-2 py-1 rounded-full text-xs font-medium">
                          {employee.department}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {employee.salary?.toLocaleString()} {t("currency")}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {employee.hire_date}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(employee)}
                            data-testid={`edit-employee-${employee.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setDeleteDialogOpen(true);
                            }}
                            data-testid={`delete-employee-${employee.id}`}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee ? t("edit_employee") : t("add_employee")}
            </DialogTitle>
            <DialogDescription>
              {language === "ar" ? "أدخل بيانات الموظف" : "Enter employee details"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("employee_name")} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  data-testid="employee-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("phone")} *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  data-testid="employee-phone-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position">{t("position")} *</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  required
                  data-testid="employee-position-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">{t("department")} *</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                  data-testid="employee-department-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary">{t("salary")} *</Label>
                <Input
                  id="salary"
                  type="number"
                  step="0.01"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  required
                  data-testid="employee-salary-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hire_date">{t("hire_date")} *</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  required
                  data-testid="employee-hire-date-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-br from-violet-500 to-purple-600 text-white"
                data-testid="submit-employee-btn"
              >
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
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-employee-btn"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Employees;
