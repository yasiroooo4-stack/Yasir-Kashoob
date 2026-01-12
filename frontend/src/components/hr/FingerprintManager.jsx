import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API, useLanguage } from "../../App";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Fingerprint, Search, Save, Link, RefreshCw, Users, CheckCircle, AlertTriangle } from "lucide-react";

const FingerprintManager = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [fingerprintId, setFingerprintId] = useState("");
  const [fingerprintId2, setFingerprintId2] = useState("");
  const [bulkLinkDialogOpen, setBulkLinkDialogOpen] = useState(false);
  const [bulkData, setBulkData] = useState("");
  
  // Stats
  const linkedCount = employees.filter(e => e.fingerprint_id).length;
  const unlinkedCount = employees.filter(e => !e.fingerprint_id).length;

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = employees.filter(e => 
        e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.fingerprint_id?.includes(searchTerm) ||
        e.employee_number?.includes(searchTerm)
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
  }, [searchTerm, employees]);

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API}/hr/employees`);
      setEmployees(res.data);
      setFilteredEmployees(res.data);
    } catch (error) {
      toast.error(language === "ar" ? "خطأ في جلب الموظفين" : "Error fetching employees");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (employee) => {
    setSelectedEmployee(employee);
    setFingerprintId(employee.fingerprint_id || "");
    setFingerprintId2(employee.fingerprint_id_2 || "");
    setEditDialogOpen(true);
  };

  const handleSaveFingerprintId = async () => {
    if (!selectedEmployee) return;
    
    try {
      await axios.put(`${API}/hr/employees/${selectedEmployee.id}`, {
        ...selectedEmployee,
        fingerprint_id: fingerprintId,
        fingerprint_id_2: fingerprintId2
      });
      toast.success(language === "ar" ? "تم حفظ رقم البصمة" : "Fingerprint ID saved");
      setEditDialogOpen(false);
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === "ar" ? "فشل الحفظ" : "Save failed"));
    }
  };

  const handleBulkLink = async () => {
    try {
      // Parse bulk data (format: "fingerprint_id,employee_name" per line)
      const lines = bulkData.trim().split("\n");
      let linked = 0;
      let errors = [];
      
      for (const line of lines) {
        const [fpId, name] = line.split(",").map(s => s.trim());
        if (!fpId || !name) continue;
        
        // Find employee by name
        const employee = employees.find(e => 
          e.name?.toLowerCase().includes(name.toLowerCase())
        );
        
        if (employee) {
          try {
            await axios.put(`${API}/hr/employees/${employee.id}`, {
              ...employee,
              fingerprint_id: fpId
            });
            linked++;
          } catch (e) {
            errors.push(`${name}: ${e.message}`);
          }
        } else {
          errors.push(`${name}: لم يُعثر على الموظف`);
        }
      }
      
      toast.success(language === "ar" 
        ? `تم ربط ${linked} موظف` 
        : `Linked ${linked} employees`
      );
      
      if (errors.length > 0) {
        toast.warning(errors.slice(0, 3).join(", "));
      }
      
      setBulkLinkDialogOpen(false);
      setBulkData("");
      fetchEmployees();
    } catch (error) {
      toast.error(language === "ar" ? "حدث خطأ" : "An error occurred");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-blue-600">{language === "ar" ? "إجمالي الموظفين" : "Total Employees"}</p>
              <p className="text-2xl font-bold text-blue-700">{employees.length}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-600">{language === "ar" ? "مرتبطين بالبصمة" : "Linked"}</p>
              <p className="text-2xl font-bold text-green-700">{linkedCount}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-orange-600">{language === "ar" ? "غير مرتبطين" : "Unlinked"}</p>
              <p className="text-2xl font-bold text-orange-700">{unlinkedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={language === "ar" ? "بحث بالاسم أو رقم البصمة..." : "Search by name or fingerprint ID..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ps-10"
            data-testid="fingerprint-search"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchEmployees}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {language === "ar" ? "تحديث" : "Refresh"}
          </Button>
          <Button
            onClick={() => setBulkLinkDialogOpen(true)}
            className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white"
            data-testid="bulk-link-btn"
          >
            <Link className="w-4 h-4" />
            {language === "ar" ? "ربط مجمع" : "Bulk Link"}
          </Button>
        </div>
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="w-5 h-5" />
            {language === "ar" ? "ربط الموظفين بأرقام البصمة" : "Link Employees to Fingerprint IDs"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "ar" ? "الاسم" : "Name"}</TableHead>
                  <TableHead>{language === "ar" ? "رقم الموظف" : "Employee #"}</TableHead>
                  <TableHead>{language === "ar" ? "القسم" : "Department"}</TableHead>
                  <TableHead>{language === "ar" ? "رقم البصمة" : "Fingerprint ID"}</TableHead>
                  <TableHead>{language === "ar" ? "رقم البصمة 2" : "Fingerprint ID 2"}</TableHead>
                  <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{language === "ar" ? "إجراء" : "Action"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {language === "ar" ? "لا توجد نتائج" : "No results found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.employee_number || "-"}</TableCell>
                      <TableCell>{employee.department || "-"}</TableCell>
                      <TableCell>
                        {employee.fingerprint_id ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Fingerprint className="w-3 h-3 me-1" />
                            {employee.fingerprint_id}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {employee.fingerprint_id_2 ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Fingerprint className="w-3 h-3 me-1" />
                            {employee.fingerprint_id_2}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {employee.fingerprint_id ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 me-1" />
                            {language === "ar" ? "مرتبط" : "Linked"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                            <AlertTriangle className="w-3 h-3 me-1" />
                            {language === "ar" ? "غير مرتبط" : "Unlinked"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={employee.fingerprint_id ? "outline" : "default"}
                          onClick={() => openEditDialog(employee)}
                          className="gap-1"
                          data-testid={`edit-fp-${employee.id}`}
                        >
                          <Fingerprint className="w-3 h-3" />
                          {employee.fingerprint_id 
                            ? (language === "ar" ? "تعديل" : "Edit")
                            : (language === "ar" ? "ربط" : "Link")
                          }
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Fingerprint Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-primary" />
              {language === "ar" ? "ربط رقم البصمة" : "Link Fingerprint ID"}
            </DialogTitle>
            <DialogDescription>
              {language === "ar" 
                ? `تعيين رقم البصمة للموظف: ${selectedEmployee?.name}`
                : `Assign fingerprint ID to: ${selectedEmployee?.name}`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "رقم البصمة (من جهاز ZKTeco)" : "Fingerprint ID (from ZKTeco device)"}</Label>
              <Input
                type="text"
                value={fingerprintId}
                onChange={(e) => setFingerprintId(e.target.value)}
                placeholder={language === "ar" ? "مثال: 1234" : "Example: 1234"}
                data-testid="fingerprint-id-input"
              />
              <p className="text-xs text-muted-foreground">
                {language === "ar" 
                  ? "أدخل الرقم الموجود في جهاز البصمة لهذا الموظف"
                  : "Enter the ID number from the fingerprint device for this employee"
                }
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {language === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleSaveFingerprintId} className="gap-2" data-testid="save-fp-btn">
              <Save className="w-4 h-4" />
              {language === "ar" ? "حفظ" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Link Dialog */}
      <Dialog open={bulkLinkDialogOpen} onOpenChange={setBulkLinkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-5 h-5 text-primary" />
              {language === "ar" ? "ربط مجمع للبصمات" : "Bulk Link Fingerprints"}
            </DialogTitle>
            <DialogDescription>
              {language === "ar" 
                ? "أدخل البيانات بالتنسيق: رقم_البصمة,اسم_الموظف (سطر لكل موظف)"
                : "Enter data in format: fingerprint_id,employee_name (one per line)"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <textarea
              className="w-full h-48 p-3 border rounded-md font-mono text-sm"
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              placeholder={language === "ar" 
                ? "1234,أحمد محمد\n5678,سالم علي\n9012,خالد سعيد"
                : "1234,Ahmed Mohamed\n5678,Salem Ali\n9012,Khaled Saeed"
              }
              data-testid="bulk-data-input"
            />
            <p className="text-xs text-muted-foreground">
              {language === "ar" 
                ? "سيتم البحث عن الموظفين بالاسم وربطهم بأرقام البصمة تلقائياً"
                : "Employees will be searched by name and automatically linked to fingerprint IDs"
              }
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkLinkDialogOpen(false)}>
              {language === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleBulkLink} className="gap-2" data-testid="bulk-link-save-btn">
              <Link className="w-4 h-4" />
              {language === "ar" ? "ربط الكل" : "Link All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FingerprintManager;
