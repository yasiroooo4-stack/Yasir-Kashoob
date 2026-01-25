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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Plus, Receipt, Eye, Check, X, Printer, Download } from "lucide-react";
import jsPDF from "jspdf";

// Company logo URL
const COMPANY_LOGO = "https://customer-assets.emergentagent.com/job_dairy-farm-erp-3/artifacts/1hfmx6si_%D8%B4%D8%B9%D8%A7%D8%B1%20%D8%A7%D9%84%D9%85%D8%B1%D9%88%D8%AC%20%D9%84%D9%84%D8%A7%D9%84%D8%A8%D8%A7%D9%86.png";

const ProjectInvoices = ({ project, contracts = [], onUpdate }) => {
  const { language } = useLanguage();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approvalAction, setApprovalAction] = useState("");
  
  const [form, setForm] = useState({
    project_id: project?.id || "",
    project_name: project?.name || "",
    contract_id: "",
    invoice_type: "milestone",
    milestone_name: "",
    description: "",
    amount: 0,
    due_date: "",
    notes: ""
  });

  useEffect(() => {
    if (project?.id) {
      fetchInvoices();
    }
  }, [project?.id]);

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/projects/${project.id}/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(response.data || []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/projects/invoices`, form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(language === "ar" ? "تم إنشاء الفاتورة بنجاح" : "Invoice created successfully");
      setDialogOpen(false);
      resetForm();
      fetchInvoices();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  const resetForm = () => {
    setForm({
      project_id: project?.id || "",
      project_name: project?.name || "",
      contract_id: "",
      invoice_type: "milestone",
      milestone_name: "",
      description: "",
      amount: 0,
      due_date: "",
      notes: ""
    });
  };

  const handleApproval = async (action) => {
    if (!selectedInvoice) return;
    
    try {
      const token = localStorage.getItem("token");
      let endpoint = "";
      
      if (action === "reject") {
        endpoint = `${API}/projects/invoices/${selectedInvoice.id}/reject?reason=${encodeURIComponent(approvalNotes)}`;
      } else if (action === "project_manager") {
        endpoint = `${API}/projects/invoices/${selectedInvoice.id}/approve/project-manager?notes=${encodeURIComponent(approvalNotes)}`;
      } else if (action === "finance") {
        endpoint = `${API}/projects/invoices/${selectedInvoice.id}/approve/finance?notes=${encodeURIComponent(approvalNotes)}`;
      } else if (action === "gm") {
        endpoint = `${API}/projects/invoices/${selectedInvoice.id}/approve/gm?notes=${encodeURIComponent(approvalNotes)}`;
      } else if (action === "pay") {
        endpoint = `${API}/projects/invoices/${selectedInvoice.id}/pay`;
      }
      
      await axios.put(endpoint, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(language === "ar" ? "تمت العملية بنجاح" : "Operation successful");
      setApprovalDialogOpen(false);
      setApprovalNotes("");
      fetchInvoices();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending_project_manager: { 
        label: language === "ar" ? "بانتظار مسؤول المشاريع" : "Pending Project Manager", 
        variant: "secondary",
        color: "bg-yellow-100 text-yellow-800"
      },
      pending_finance: { 
        label: language === "ar" ? "بانتظار المالية" : "Pending Finance", 
        variant: "secondary",
        color: "bg-blue-100 text-blue-800"
      },
      pending_gm: { 
        label: language === "ar" ? "بانتظار المدير العام" : "Pending GM", 
        variant: "secondary",
        color: "bg-purple-100 text-purple-800"
      },
      approved_ready_to_pay: { 
        label: language === "ar" ? "جاهزة للصرف" : "Ready to Pay", 
        variant: "default",
        color: "bg-green-100 text-green-800"
      },
      paid: { 
        label: language === "ar" ? "مدفوعة" : "Paid", 
        variant: "outline",
        color: "bg-emerald-100 text-emerald-800"
      },
      rejected: { 
        label: language === "ar" ? "مرفوضة" : "Rejected", 
        variant: "destructive",
        color: "bg-red-100 text-red-800"
      }
    };
    const s = statusMap[status] || { label: status, variant: "outline", color: "bg-gray-100 text-gray-800" };
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  const getNextApprovalAction = (invoice) => {
    switch (invoice.status) {
      case "pending_project_manager":
        return { action: "project_manager", label: language === "ar" ? "موافقة مسؤول المشاريع" : "Project Manager Approval" };
      case "pending_finance":
        return { action: "finance", label: language === "ar" ? "موافقة المالية" : "Finance Approval" };
      case "pending_gm":
        return { action: "gm", label: language === "ar" ? "موافقة المدير العام" : "GM Approval" };
      case "approved_ready_to_pay":
        return { action: "pay", label: language === "ar" ? "صرف الفاتورة" : "Pay Invoice" };
      default:
        return null;
    }
  };

  const generatePDF = async (invoice) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add logo
    try {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = COMPANY_LOGO;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
      doc.addImage(img, "PNG", pageWidth - 50, 10, 40, 40);
    } catch (e) {
      console.log("Could not load logo");
    }

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Al Morooj Dairy", 20, 25);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Salalah, Oman", 20, 32);
    
    // Invoice title
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", pageWidth / 2, 60, { align: "center" });
    
    // Invoice details
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    let y = 80;
    const leftCol = 20;
    const rightCol = pageWidth / 2 + 10;
    
    // Left column
    doc.setFont("helvetica", "bold");
    doc.text("Invoice Number:", leftCol, y);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.invoice_number || "-", leftCol + 40, y);
    
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Date:", leftCol, y);
    doc.setFont("helvetica", "normal");
    doc.text(new Date(invoice.created_at).toLocaleDateString(), leftCol + 40, y);
    
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Status:", leftCol, y);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.status === "paid" ? "PAID" : "UNPAID", leftCol + 40, y);
    
    // Right column
    y = 80;
    doc.setFont("helvetica", "bold");
    doc.text("Project:", rightCol, y);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.project_name || "-", rightCol + 25, y);
    
    y += 8;
    if (invoice.milestone_name) {
      doc.setFont("helvetica", "bold");
      doc.text("Phase:", rightCol, y);
      doc.setFont("helvetica", "normal");
      doc.text(invoice.milestone_name, rightCol + 25, y);
      y += 8;
    }
    
    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 110, pageWidth - 20, 110);
    
    // Description
    y = 125;
    doc.setFont("helvetica", "bold");
    doc.text("Description:", leftCol, y);
    doc.setFont("helvetica", "normal");
    y += 8;
    const descLines = doc.splitTextToSize(invoice.description || "-", pageWidth - 40);
    doc.text(descLines, leftCol, y);
    y += descLines.length * 6 + 10;
    
    // Amount box
    doc.setFillColor(240, 240, 240);
    doc.rect(20, y, pageWidth - 40, 30, "F");
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Total Amount:", leftCol + 10, y + 12);
    doc.setFontSize(18);
    doc.text(`${invoice.amount?.toFixed(3)} OMR`, pageWidth - 30, y + 12, { align: "right" });
    
    // Approval status
    y += 45;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Approval Status:", leftCol, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    
    const approvals = [
      { name: "Project Manager", approved: invoice.project_manager_approval, by: invoice.project_manager_name, date: invoice.project_manager_date },
      { name: "Finance", approved: invoice.finance_approval, by: invoice.finance_name, date: invoice.finance_date },
      { name: "General Manager", approved: invoice.gm_approval, by: invoice.gm_name, date: invoice.gm_date }
    ];
    
    approvals.forEach(app => {
      const status = app.approved ? "Approved" : "Pending";
      const details = app.approved ? ` by ${app.by || "-"} on ${app.date ? new Date(app.date).toLocaleDateString() : "-"}` : "";
      doc.text(`- ${app.name}: ${status}${details}`, leftCol, y);
      y += 6;
    });
    
    // Payment info
    if (invoice.is_paid) {
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.text("Payment Information:", leftCol, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.text(`Paid on: ${invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString() : "-"}`, leftCol, y);
      y += 6;
      doc.text(`Paid by: ${invoice.paid_by || "-"}`, leftCol, y);
      if (invoice.payment_reference) {
        y += 6;
        doc.text(`Reference: ${invoice.payment_reference}`, leftCol, y);
      }
    }
    
    // Footer
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    
    // Save
    doc.save(`Invoice_${invoice.invoice_number || invoice.id}.pdf`);
    toast.success(language === "ar" ? "تم تحميل الفاتورة" : "Invoice downloaded");
  };

  if (!project) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          {language === "ar" ? "اختر مشروعاً لعرض الفواتير" : "Select a project to view invoices"}
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
              <Receipt className="w-5 h-5" />
              {language === "ar" ? "فواتير المشروع" : "Project Invoices"}
            </CardTitle>
            <CardDescription>
              {project.name}
            </CardDescription>
          </div>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gradient-primary text-white">
            <Plus className="w-4 h-4 me-2" />
            {language === "ar" ? "فاتورة جديدة" : "New Invoice"}
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
                  <TableHead>{language === "ar" ? "رقم الفاتورة" : "Invoice #"}</TableHead>
                  <TableHead>{language === "ar" ? "النوع" : "Type"}</TableHead>
                  <TableHead>{language === "ar" ? "الوصف" : "Description"}</TableHead>
                  <TableHead>{language === "ar" ? "المبلغ" : "Amount"}</TableHead>
                  <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                  <TableHead>{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {language === "ar" ? "لا توجد فواتير لهذا المشروع" : "No invoices for this project"}
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => {
                    const nextAction = getNextApprovalAction(invoice);
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {invoice.invoice_type === "milestone" 
                              ? (language === "ar" ? "مرحلة" : "Milestone")
                              : (language === "ar" ? "دفعة جزئية" : "Partial")}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{invoice.description}</TableCell>
                        <TableCell className="font-medium">{invoice.amount?.toFixed(3)} {language === "ar" ? "ر.ع" : "OMR"}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedInvoice(invoice); setViewDialogOpen(true); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {invoice.status !== "rejected" && (
                              <Button variant="ghost" size="icon" onClick={() => generatePDF(invoice)}>
                                <Printer className="w-4 h-4" />
                              </Button>
                            )}
                            {nextAction && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-green-600 hover:text-green-700"
                                onClick={() => { 
                                  setSelectedInvoice(invoice); 
                                  setApprovalAction(nextAction.action);
                                  setApprovalDialogOpen(true); 
                                }}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            {invoice.status !== "paid" && invoice.status !== "rejected" && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-600 hover:text-red-700"
                                onClick={() => { 
                                  setSelectedInvoice(invoice); 
                                  setApprovalAction("reject");
                                  setApprovalDialogOpen(true); 
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invoice Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {language === "ar" ? "إنشاء فاتورة جديدة" : "Create New Invoice"}
            </DialogTitle>
            <DialogDescription>
              {language === "ar" ? "أدخل بيانات الفاتورة" : "Enter invoice details"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "نوع الفاتورة" : "Invoice Type"} *</Label>
                <Select value={form.invoice_type} onValueChange={(v) => setForm({...form, invoice_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="milestone">{language === "ar" ? "مرحلة" : "Milestone"}</SelectItem>
                    <SelectItem value="partial">{language === "ar" ? "دفعة جزئية" : "Partial Payment"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "المبلغ" : "Amount"} *</Label>
                <Input 
                  type="number" 
                  step="0.001"
                  value={form.amount} 
                  onChange={(e) => setForm({...form, amount: parseFloat(e.target.value)})} 
                  required 
                />
              </div>
            </div>
            {contracts.length > 0 && (
              <div className="space-y-2">
                <Label>{language === "ar" ? "العقد (اختياري)" : "Contract (Optional)"}</Label>
                <Select value={form.contract_id} onValueChange={(v) => setForm({...form, contract_id: v})}>
                  <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر عقد" : "Select contract"} /></SelectTrigger>
                  <SelectContent>
                    {contracts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.contract_number} - {c.contractor_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.invoice_type === "milestone" && (
              <div className="space-y-2">
                <Label>{language === "ar" ? "اسم المرحلة" : "Milestone Name"}</Label>
                <Input 
                  value={form.milestone_name} 
                  onChange={(e) => setForm({...form, milestone_name: e.target.value})} 
                  placeholder={language === "ar" ? "مثال: المرحلة الأولى - التأسيس" : "e.g., Phase 1 - Foundation"}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>{language === "ar" ? "الوصف" : "Description"} *</Label>
              <Textarea 
                value={form.description} 
                onChange={(e) => setForm({...form, description: e.target.value})} 
                required 
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "تاريخ الاستحقاق" : "Due Date"}</Label>
              <Input 
                type="date" 
                value={form.due_date} 
                onChange={(e) => setForm({...form, due_date: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "ملاحظات" : "Notes"}</Label>
              <Textarea 
                value={form.notes} 
                onChange={(e) => setForm({...form, notes: e.target.value})} 
                rows={2}
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

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{language === "ar" ? "تفاصيل الفاتورة" : "Invoice Details"}</span>
              {selectedInvoice && (
                <Button variant="outline" size="sm" onClick={() => generatePDF(selectedInvoice)}>
                  <Download className="w-4 h-4 me-2" />
                  PDF
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{language === "ar" ? "رقم الفاتورة" : "Invoice Number"}</p>
                  <p className="font-mono font-medium">{selectedInvoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === "ar" ? "الحالة" : "Status"}</p>
                  {getStatusBadge(selectedInvoice.status)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{language === "ar" ? "المبلغ" : "Amount"}</p>
                  <p className="font-medium text-xl">{selectedInvoice.amount?.toFixed(3)} {language === "ar" ? "ر.ع" : "OMR"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === "ar" ? "النوع" : "Type"}</p>
                  <p>{selectedInvoice.invoice_type === "milestone" ? (language === "ar" ? "مرحلة" : "Milestone") : (language === "ar" ? "دفعة جزئية" : "Partial")}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{language === "ar" ? "الوصف" : "Description"}</p>
                <p>{selectedInvoice.description}</p>
              </div>
              
              {/* Approval Timeline */}
              <div className="space-y-2">
                <p className="text-sm font-medium">{language === "ar" ? "مراحل الموافقة" : "Approval Timeline"}</p>
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedInvoice.project_manager_approval ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                      {selectedInvoice.project_manager_approval ? <Check className="w-4 h-4" /> : "1"}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{language === "ar" ? "مسؤول المشاريع" : "Project Manager"}</p>
                      {selectedInvoice.project_manager_approval && (
                        <p className="text-sm text-muted-foreground">
                          {selectedInvoice.project_manager_name} - {selectedInvoice.project_manager_date && new Date(selectedInvoice.project_manager_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedInvoice.finance_approval ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                      {selectedInvoice.finance_approval ? <Check className="w-4 h-4" /> : "2"}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{language === "ar" ? "المالية" : "Finance"}</p>
                      {selectedInvoice.finance_approval && (
                        <p className="text-sm text-muted-foreground">
                          {selectedInvoice.finance_name} - {selectedInvoice.finance_date && new Date(selectedInvoice.finance_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedInvoice.gm_approval ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                      {selectedInvoice.gm_approval ? <Check className="w-4 h-4" /> : "3"}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{language === "ar" ? "المدير العام" : "General Manager"}</p>
                      {selectedInvoice.gm_approval && (
                        <p className="text-sm text-muted-foreground">
                          {selectedInvoice.gm_name} - {selectedInvoice.gm_date && new Date(selectedInvoice.gm_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  {selectedInvoice.is_paid && (
                    <div className="flex items-center gap-3 pt-2 border-t">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600">
                        <Check className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-emerald-600">{language === "ar" ? "تم الصرف" : "Paid"}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedInvoice.paid_by} - {selectedInvoice.paid_date && new Date(selectedInvoice.paid_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "reject" 
                ? (language === "ar" ? "رفض الفاتورة" : "Reject Invoice")
                : approvalAction === "pay"
                ? (language === "ar" ? "صرف الفاتورة" : "Pay Invoice")
                : (language === "ar" ? "الموافقة على الفاتورة" : "Approve Invoice")}
            </DialogTitle>
            <DialogDescription>
              {selectedInvoice && `${selectedInvoice.invoice_number} - ${selectedInvoice.amount?.toFixed(3)} OMR`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "ملاحظات" : "Notes"}</Label>
              <Textarea 
                value={approvalNotes} 
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder={approvalAction === "reject" ? (language === "ar" ? "سبب الرفض..." : "Reason for rejection...") : (language === "ar" ? "ملاحظات إضافية..." : "Additional notes...")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              {language === "ar" ? "إلغاء" : "Cancel"}
            </Button>
            <Button 
              onClick={() => handleApproval(approvalAction)}
              className={approvalAction === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {approvalAction === "reject" 
                ? (language === "ar" ? "رفض" : "Reject")
                : approvalAction === "pay"
                ? (language === "ar" ? "صرف" : "Pay")
                : (language === "ar" ? "موافقة" : "Approve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectInvoices;
