import { useState, useEffect } from "react";
import axios from "axios";
import { API, useLanguage } from "../App";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Plus, FileText, Pencil, Eye } from "lucide-react";

const ProjectContracts = ({ project, onUpdate }) => {
  const { language } = useLanguage();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  
  const [form, setForm] = useState({
    project_id: project?.id || "",
    project_name: project?.name || "",
    contractor_name: "",
    contractor_phone: "",
    contractor_email: "",
    contract_value: 0,
    start_date: "",
    end_date: "",
    payment_terms: "",
    payment_schedule: "",
    scope_of_work: "",
    terms_and_conditions: ""
  });

  useEffect(() => {
    if (project?.id) {
      fetchContracts();
    }
  }, [project?.id]);

  const fetchContracts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/projects/${project.id}/contracts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContracts(response.data || []);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      
      if (selectedContract) {
        await axios.put(`${API}/projects/contracts/${selectedContract.id}`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === "ar" ? "تم تحديث العقد بنجاح" : "Contract updated successfully");
      } else {
        await axios.post(`${API}/projects/contracts`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(language === "ar" ? "تم إنشاء العقد بنجاح" : "Contract created successfully");
      }
      
      setDialogOpen(false);
      resetForm();
      fetchContracts();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  const resetForm = () => {
    setForm({
      project_id: project?.id || "",
      project_name: project?.name || "",
      contractor_name: "",
      contractor_phone: "",
      contractor_email: "",
      contract_value: 0,
      start_date: "",
      end_date: "",
      payment_terms: "",
      payment_schedule: "",
      scope_of_work: "",
      terms_and_conditions: ""
    });
    setSelectedContract(null);
  };

  const openEditDialog = (contract) => {
    setSelectedContract(contract);
    setForm({
      ...contract,
      project_id: project?.id,
      project_name: project?.name
    });
    setDialogOpen(true);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      draft: { label: language === "ar" ? "مسودة" : "Draft", variant: "secondary" },
      active: { label: language === "ar" ? "نشط" : "Active", variant: "default" },
      completed: { label: language === "ar" ? "مكتمل" : "Completed", variant: "outline" },
      cancelled: { label: language === "ar" ? "ملغي" : "Cancelled", variant: "destructive" }
    };
    const s = statusMap[status] || statusMap.draft;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (!project) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          {language === "ar" ? "اختر مشروعاً لعرض العقود" : "Select a project to view contracts"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {language === "ar" ? "عقود المشروع" : "Project Contracts"}
            </CardTitle>
            <CardDescription>
              {project.name}
            </CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gradient-primary text-white">
            <Plus className="w-4 h-4 me-2" />
            {language === "ar" ? "عقد جديد" : "New Contract"}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === "ar" ? "رقم العقد" : "Contract #"}</TableHead>
                  <TableHead>{language === "ar" ? "المقاول/المورد" : "Contractor"}</TableHead>
                  <TableHead>{language === "ar" ? "قيمة العقد" : "Value"}</TableHead>
                  <TableHead>{language === "ar" ? "المدفوع" : "Paid"}</TableHead>
                  <TableHead>{language === "ar" ? "المتبقي" : "Remaining"}</TableHead>
                  <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {language === "ar" ? "لا توجد عقود لهذا المشروع" : "No contracts for this project"}
                    </TableCell>
                  </TableRow>
                ) : (
                  contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-mono">{contract.contract_number}</TableCell>
                      <TableCell className="font-medium">{contract.contractor_name}</TableCell>
                      <TableCell>{contract.contract_value?.toFixed(3)} {language === "ar" ? "ر.ع" : "OMR"}</TableCell>
                      <TableCell className="text-green-600">{(contract.total_paid || 0).toFixed(3)} {language === "ar" ? "ر.ع" : "OMR"}</TableCell>
                      <TableCell className="text-orange-600">{(contract.remaining_amount || 0).toFixed(3)} {language === "ar" ? "ر.ع" : "OMR"}</TableCell>
                      <TableCell>{getStatusBadge(contract.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedContract(contract); setViewDialogOpen(true); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(contract)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Contract Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedContract 
                ? (language === "ar" ? "تعديل العقد" : "Edit Contract")
                : (language === "ar" ? "إنشاء عقد جديد" : "Create New Contract")}
            </DialogTitle>
            <DialogDescription>
              {language === "ar" ? "أدخل بيانات العقد" : "Enter contract details"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "اسم المقاول/المورد" : "Contractor Name"} *</Label>
                <Input 
                  value={form.contractor_name} 
                  onChange={(e) => setForm({...form, contractor_name: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "قيمة العقد" : "Contract Value"} *</Label>
                <Input 
                  type="number" 
                  step="0.001"
                  value={form.contract_value} 
                  onChange={(e) => setForm({...form, contract_value: parseFloat(e.target.value)})} 
                  required 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "هاتف المقاول" : "Contractor Phone"}</Label>
                <Input 
                  value={form.contractor_phone} 
                  onChange={(e) => setForm({...form, contractor_phone: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "بريد المقاول" : "Contractor Email"}</Label>
                <Input 
                  type="email"
                  value={form.contractor_email} 
                  onChange={(e) => setForm({...form, contractor_email: e.target.value})} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ البداية" : "Start Date"} *</Label>
                <Input 
                  type="date" 
                  value={form.start_date} 
                  onChange={(e) => setForm({...form, start_date: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ النهاية" : "End Date"} *</Label>
                <Input 
                  type="date" 
                  value={form.end_date} 
                  onChange={(e) => setForm({...form, end_date: e.target.value})} 
                  required 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "شروط الدفع" : "Payment Terms"} *</Label>
              <Textarea 
                value={form.payment_terms} 
                onChange={(e) => setForm({...form, payment_terms: e.target.value})} 
                placeholder={language === "ar" ? "مثال: 30% مقدم، 40% عند اكتمال 50%، 30% عند التسليم" : "e.g., 30% upfront, 40% at 50% completion, 30% on delivery"}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "نطاق العمل" : "Scope of Work"}</Label>
              <Textarea 
                value={form.scope_of_work} 
                onChange={(e) => setForm({...form, scope_of_work: e.target.value})} 
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الشروط والأحكام" : "Terms & Conditions"}</Label>
              <Textarea 
                value={form.terms_and_conditions} 
                onChange={(e) => setForm({...form, terms_and_conditions: e.target.value})} 
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {language === "ar" ? "حفظ" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Contract Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "تفاصيل العقد" : "Contract Details"}</DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{language === "ar" ? "رقم العقد" : "Contract Number"}</p>
                  <p className="font-mono font-medium">{selectedContract.contract_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === "ar" ? "الحالة" : "Status"}</p>
                  {getStatusBadge(selectedContract.status)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{language === "ar" ? "المقاول/المورد" : "Contractor"}</p>
                  <p className="font-medium">{selectedContract.contractor_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === "ar" ? "قيمة العقد" : "Contract Value"}</p>
                  <p className="font-medium text-lg">{selectedContract.contract_value?.toFixed(3)} {language === "ar" ? "ر.ع" : "OMR"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{language === "ar" ? "تاريخ البداية" : "Start Date"}</p>
                  <p>{selectedContract.start_date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === "ar" ? "تاريخ النهاية" : "End Date"}</p>
                  <p>{selectedContract.end_date}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">{language === "ar" ? "المبلغ المدفوع" : "Paid Amount"}</p>
                  <p className="font-medium text-green-600">{(selectedContract.total_paid || 0).toFixed(3)} {language === "ar" ? "ر.ع" : "OMR"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === "ar" ? "المبلغ المتبقي" : "Remaining Amount"}</p>
                  <p className="font-medium text-orange-600">{(selectedContract.remaining_amount || 0).toFixed(3)} {language === "ar" ? "ر.ع" : "OMR"}</p>
                </div>
              </div>
              {selectedContract.payment_terms && (
                <div>
                  <p className="text-sm text-muted-foreground">{language === "ar" ? "شروط الدفع" : "Payment Terms"}</p>
                  <p className="whitespace-pre-wrap">{selectedContract.payment_terms}</p>
                </div>
              )}
              {selectedContract.scope_of_work && (
                <div>
                  <p className="text-sm text-muted-foreground">{language === "ar" ? "نطاق العمل" : "Scope of Work"}</p>
                  <p className="whitespace-pre-wrap">{selectedContract.scope_of_work}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectContracts;
