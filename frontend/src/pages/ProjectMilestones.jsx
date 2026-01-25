import { useState, useEffect } from "react";
import axios from "axios";
import { API, useLanguage } from "../App";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Plus, CheckCircle, Clock, PlayCircle, FileText, Receipt, Trash2, Upload, Paperclip, Eye } from "lucide-react";

const ProjectMilestones = ({ project, onUpdate }) => {
  const { language } = useLanguage();
  const txt = (ar, en) => language === "ar" ? ar : en;
  
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    due_date: "",
    deliverables: "",
    payment_amount: 0
  });
  
  const [invoiceForm, setInvoiceForm] = useState({
    description: "",
    amount: 0
  });
  
  const [attachmentForm, setAttachmentForm] = useState({
    file_name: "",
    file_type: "invoice",
    file_url: "",
    description: ""
  });
  
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!file) return null;
    
    setUploadingFile(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await axios.post(`${API}/hr/upload-file`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      
      return response.data.file_url;
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error(txt("فشل في رفع الملف", "Failed to upload file"));
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  // Predefined milestone templates
  const milestoneTemplates = [
    { name: txt("مرحلة الحفر والتأسيس", "Excavation & Foundation"), icon: "🏗️" },
    { name: txt("مرحلة الأساسات", "Foundation Phase"), icon: "🧱" },
    { name: txt("مرحلة البناء الهيكلي", "Structural Construction"), icon: "🏢" },
    { name: txt("مرحلة التشطيبات", "Finishing Phase"), icon: "🎨" },
    { name: txt("مرحلة التمديدات الكهربائية", "Electrical Installation"), icon: "⚡" },
    { name: txt("مرحلة السباكة", "Plumbing Phase"), icon: "🔧" },
    { name: txt("مرحلة التسليم النهائي", "Final Delivery"), icon: "✅" },
  ];

  useEffect(() => {
    if (project?.id) {
      fetchMilestones();
    }
  }, [project?.id]);

  const fetchMilestones = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/projects/${project.id}/milestones`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMilestones(response.data || []);
    } catch (error) {
      console.error("Error fetching milestones:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      
      if (selectedMilestone) {
        await axios.put(`${API}/projects/milestones/${selectedMilestone.id}`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(txt("تم تحديث المرحلة بنجاح", "Milestone updated successfully"));
      } else {
        await axios.post(`${API}/projects/${project.id}/milestones`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(txt("تم إنشاء المرحلة بنجاح", "Milestone created successfully"));
      }
      
      setDialogOpen(false);
      resetForm();
      fetchMilestones();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedMilestone) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/projects/milestones/${selectedMilestone.id}/invoice`, invoiceForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(txt("تم إنشاء الفاتورة بنجاح", "Invoice created successfully"));
      setInvoiceDialogOpen(false);
      setInvoiceForm({ description: "", amount: 0 });
      fetchMilestones();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  const handleAddAttachment = async () => {
    if (!selectedMilestone) return;
    if (!selectedFile && !attachmentForm.file_url) {
      toast.error(txt("الرجاء اختيار ملف", "Please select a file"));
      return;
    }
    
    try {
      let fileUrl = attachmentForm.file_url;
      
      // Upload file if selected
      if (selectedFile) {
        fileUrl = await handleFileUpload(selectedFile);
        if (!fileUrl) return;
      }
      
      const token = localStorage.getItem("token");
      await axios.post(`${API}/projects/milestones/${selectedMilestone.id}/attachments`, {
        ...attachmentForm,
        file_url: fileUrl,
        file_name: attachmentForm.file_name || selectedFile?.name || "مستند"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(txt("تم إضافة المرفق بنجاح", "Attachment added successfully"));
      setAttachmentDialogOpen(false);
      setAttachmentForm({ file_name: "", file_type: "invoice", file_url: "", description: "" });
      setSelectedFile(null);
      fetchMilestones();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  const handleStatusChange = async (milestoneId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/projects/milestones/${milestoneId}/status?status=${newStatus}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(txt("تم تحديث حالة المرحلة", "Status updated"));
      fetchMilestones();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  const handleDelete = async (milestoneId) => {
    if (!confirm(txt("هل أنت متأكد من حذف هذه المرحلة؟", "Are you sure you want to delete this milestone?"))) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/projects/milestones/${milestoneId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(txt("تم حذف المرحلة", "Milestone deleted"));
      fetchMilestones();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  const resetForm = () => {
    setForm({ name: "", description: "", due_date: "", deliverables: "", payment_amount: 0 });
    setSelectedMilestone(null);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: txt("قيد الانتظار", "Pending"), variant: "secondary", icon: Clock, color: "bg-gray-100 text-gray-800" },
      in_progress: { label: txt("جاري التنفيذ", "In Progress"), variant: "default", icon: PlayCircle, color: "bg-blue-100 text-blue-800" },
      completed: { label: txt("مكتمل", "Completed"), variant: "outline", icon: CheckCircle, color: "bg-green-100 text-green-800" }
    };
    const s = statusMap[status] || statusMap.pending;
    const Icon = s.icon;
    return (
      <Badge className={`${s.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {s.label}
      </Badge>
    );
  };

  const getInvoiceStatusBadge = (status) => {
    if (!status) return null;
    const statusMap = {
      pending_project_manager: { label: txt("بانتظار المشاريع", "Pending PM"), color: "bg-yellow-100 text-yellow-800" },
      pending_finance: { label: txt("بانتظار المالية", "Pending Finance"), color: "bg-blue-100 text-blue-800" },
      pending_gm: { label: txt("بانتظار المدير", "Pending GM"), color: "bg-purple-100 text-purple-800" },
      approved_ready_to_pay: { label: txt("جاهز للصرف", "Ready to Pay"), color: "bg-green-100 text-green-800" },
      paid: { label: txt("مدفوع", "Paid"), color: "bg-emerald-100 text-emerald-800" }
    };
    const s = statusMap[status] || { label: status, color: "bg-gray-100 text-gray-800" };
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  // Calculate overall progress
  const overallProgress = milestones.length > 0
    ? Math.round(milestones.filter(m => m.status === "completed").length / milestones.length * 100)
    : 0;

  if (!project) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          {txt("اختر مشروعاً لعرض المراحل", "Select a project to view milestones")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{txt("تقدم المشروع", "Project Progress")}</CardTitle>
              <CardDescription>{project.name}</CardDescription>
            </div>
            <div className="text-2xl font-bold text-primary">{overallProgress}%</div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={overallProgress} className="h-3" />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>{milestones.filter(m => m.status === "completed").length} {txt("مكتمل", "completed")}</span>
            <span>{milestones.filter(m => m.status === "in_progress").length} {txt("جاري", "in progress")}</span>
            <span>{milestones.filter(m => m.status === "pending").length} {txt("قيد الانتظار", "pending")}</span>
          </div>
        </CardContent>
      </Card>

      {/* Milestones Timeline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{txt("مراحل المشروع", "Project Milestones")}</CardTitle>
            <CardDescription>{txt("تتبع وإدارة مراحل تنفيذ المشروع", "Track and manage project execution phases")}</CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gradient-primary text-white">
            <Plus className="w-4 h-4 me-2" />
            {txt("مرحلة جديدة", "New Milestone")}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto"></div>
            </div>
          ) : milestones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{txt("لا توجد مراحل لهذا المشروع", "No milestones for this project")}</p>
              <p className="text-sm mt-2">{txt("أضف المراحل لتتبع تقدم المشروع", "Add milestones to track project progress")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {milestones.map((milestone, index) => (
                <div key={milestone.id} className="relative">
                  {/* Timeline connector */}
                  {index < milestones.length - 1 && (
                    <div className={`absolute top-12 ${language === "ar" ? "right-6" : "left-6"} w-0.5 h-full -z-10 ${milestone.status === "completed" ? "bg-green-300" : "bg-gray-200"}`} />
                  )}
                  
                  <div className={`border rounded-lg p-4 ${milestone.status === "completed" ? "border-green-200 bg-green-50/50" : milestone.status === "in_progress" ? "border-blue-200 bg-blue-50/50" : "border-gray-200"}`}>
                    <div className="flex items-start gap-4">
                      {/* Step number */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                        milestone.status === "completed" ? "bg-green-500 text-white" :
                        milestone.status === "in_progress" ? "bg-blue-500 text-white" :
                        "bg-gray-200 text-gray-600"
                      }`}>
                        {milestone.status === "completed" ? <CheckCircle className="w-6 h-6" /> : milestone.order}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-lg">{milestone.name}</h4>
                            {milestone.description && <p className="text-sm text-muted-foreground">{milestone.description}</p>}
                          </div>
                          {getStatusBadge(milestone.status)}
                        </div>
                        
                        {/* Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">{txt("تاريخ الاستحقاق", "Due Date")}:</span>
                            <p className="font-medium">{milestone.due_date || "-"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{txt("مبلغ الدفعة", "Payment")}:</span>
                            <p className="font-medium">{milestone.payment_amount?.toFixed(3) || "0.000"} {txt("ر.ع", "OMR")}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{txt("الفاتورة", "Invoice")}:</span>
                            {milestone.invoice_number ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs">{milestone.invoice_number}</span>
                                {getInvoiceStatusBadge(milestone.invoice_status)}
                              </div>
                            ) : (
                              <p className="text-muted-foreground">-</p>
                            )}
                          </div>
                          <div>
                            <span className="text-muted-foreground">{txt("المرفقات", "Attachments")}:</span>
                            <p className="font-medium">{milestone.attachments?.length || 0}</p>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          {milestone.status === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => handleStatusChange(milestone.id, "in_progress")}>
                              <PlayCircle className="w-4 h-4 me-1" />
                              {txt("بدء التنفيذ", "Start")}
                            </Button>
                          )}
                          {milestone.status === "in_progress" && (
                            <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleStatusChange(milestone.id, "completed")}>
                              <CheckCircle className="w-4 h-4 me-1" />
                              {txt("إكمال", "Complete")}
                            </Button>
                          )}
                          {!milestone.invoice_id && (
                            <Button size="sm" variant="outline" onClick={() => {
                              setSelectedMilestone(milestone);
                              setInvoiceForm({ description: `فاتورة مرحلة: ${milestone.name}`, amount: milestone.payment_amount || 0 });
                              setInvoiceDialogOpen(true);
                            }}>
                              <Receipt className="w-4 h-4 me-1" />
                              {txt("إنشاء فاتورة", "Create Invoice")}
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => {
                            setSelectedMilestone(milestone);
                            setAttachmentDialogOpen(true);
                          }}>
                            <Paperclip className="w-4 h-4 me-1" />
                            {txt("إرفاق", "Attach")}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(milestone.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Milestone Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{txt("إضافة مرحلة جديدة", "Add New Milestone")}</DialogTitle>
            <DialogDescription>{txt("حدد تفاصيل المرحلة", "Enter milestone details")}</DialogDescription>
          </DialogHeader>
          
          {/* Quick Templates */}
          <div className="flex flex-wrap gap-2 pb-4 border-b">
            {milestoneTemplates.map((template, i) => (
              <Button 
                key={i} 
                size="sm" 
                variant="outline"
                onClick={() => setForm({...form, name: template.name})}
              >
                {template.icon} {template.name}
              </Button>
            ))}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{txt("اسم المرحلة", "Milestone Name")} *</Label>
              <Input 
                value={form.name} 
                onChange={(e) => setForm({...form, name: e.target.value})} 
                placeholder={txt("مثال: مرحلة الحفر", "e.g., Excavation Phase")}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>{txt("الوصف", "Description")}</Label>
              <Textarea 
                value={form.description} 
                onChange={(e) => setForm({...form, description: e.target.value})} 
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{txt("تاريخ الاستحقاق", "Due Date")} *</Label>
                <Input 
                  type="date" 
                  value={form.due_date} 
                  onChange={(e) => setForm({...form, due_date: e.target.value})} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>{txt("مبلغ الدفعة", "Payment Amount")}</Label>
                <Input 
                  type="number" 
                  step="0.001"
                  value={form.payment_amount} 
                  onChange={(e) => setForm({...form, payment_amount: parseFloat(e.target.value)})} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{txt("المخرجات المتوقعة", "Expected Deliverables")}</Label>
              <Textarea 
                value={form.deliverables} 
                onChange={(e) => setForm({...form, deliverables: e.target.value})} 
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {txt("إلغاء", "Cancel")}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {txt("حفظ", "Save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{txt("إنشاء فاتورة للمرحلة", "Create Milestone Invoice")}</DialogTitle>
            <DialogDescription>
              {selectedMilestone?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{txt("وصف الفاتورة", "Invoice Description")}</Label>
              <Textarea 
                value={invoiceForm.description} 
                onChange={(e) => setInvoiceForm({...invoiceForm, description: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>{txt("المبلغ", "Amount")}</Label>
              <Input 
                type="number" 
                step="0.001"
                value={invoiceForm.amount} 
                onChange={(e) => setInvoiceForm({...invoiceForm, amount: parseFloat(e.target.value)})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)}>
              {txt("إلغاء", "Cancel")}
            </Button>
            <Button onClick={handleCreateInvoice} className="gradient-primary text-white">
              {txt("إنشاء الفاتورة", "Create Invoice")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Attachment Dialog */}
      <Dialog open={attachmentDialogOpen} onOpenChange={setAttachmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{txt("إرفاق ملف للمرحلة", "Attach File to Milestone")}</DialogTitle>
            <DialogDescription>
              {selectedMilestone?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{txt("اسم الملف", "File Name")} *</Label>
              <Input 
                value={attachmentForm.file_name} 
                onChange={(e) => setAttachmentForm({...attachmentForm, file_name: e.target.value})} 
                placeholder={txt("مثال: فاتورة المقاول", "e.g., Contractor Invoice")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{txt("نوع الملف", "File Type")}</Label>
              <Select value={attachmentForm.file_type} onValueChange={(v) => setAttachmentForm({...attachmentForm, file_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">{txt("فاتورة", "Invoice")}</SelectItem>
                  <SelectItem value="contract">{txt("عقد", "Contract")}</SelectItem>
                  <SelectItem value="document">{txt("مستند", "Document")}</SelectItem>
                  <SelectItem value="image">{txt("صورة", "Image")}</SelectItem>
                  <SelectItem value="report">{txt("تقرير", "Report")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{txt("رابط الملف", "File URL")} *</Label>
              <Input 
                value={attachmentForm.file_url} 
                onChange={(e) => setAttachmentForm({...attachmentForm, file_url: e.target.value})} 
                placeholder="https://..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{txt("وصف", "Description")}</Label>
              <Textarea 
                value={attachmentForm.description} 
                onChange={(e) => setAttachmentForm({...attachmentForm, description: e.target.value})} 
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachmentDialogOpen(false)}>
              {txt("إلغاء", "Cancel")}
            </Button>
            <Button onClick={handleAddAttachment} className="gradient-primary text-white">
              {txt("إرفاق", "Attach")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectMilestones;
