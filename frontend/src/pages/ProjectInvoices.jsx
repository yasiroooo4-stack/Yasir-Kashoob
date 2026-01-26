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
    // Create HTML content with proper Arabic support
    const statusText = invoice.status === "paid" ? "مدفوعة" : invoice.status === "approved_ready_to_pay" ? "جاهزة للصرف" : "معلقة";
    const statusColor = invoice.status === "paid" ? "#059669" : invoice.status === "approved_ready_to_pay" ? "#8B772A" : "#D97706";
    
    const approvals = [
      { name: "مسؤول المشاريع", nameEn: "Project Manager", approved: invoice.project_manager_approval, by: invoice.project_manager_name, date: invoice.project_manager_date },
      { name: "المالية", nameEn: "Finance", approved: invoice.finance_approval, by: invoice.finance_name, date: invoice.finance_date },
      { name: "المدير العام", nameEn: "General Manager", approved: invoice.gm_approval, by: invoice.gm_name, date: invoice.gm_date }
    ];
    
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة ${invoice.invoice_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Tajawal', 'Segoe UI', Tahoma, Arial, sans-serif; 
            padding: 30px; 
            background: white;
            direction: rtl;
            line-height: 1.6;
          }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
          .company-info { flex: 1; text-align: right; }
          .company-info h1 { font-size: 20px; color: #333; margin-bottom: 5px; }
          .company-info p { font-size: 11px; color: #666; margin: 3px 0; }
          .logo { width: 90px; height: 90px; }
          .logo img { width: 100%; height: 100%; object-fit: contain; }
          .separator { border-bottom: 2px solid #C8B482; margin: 20px 0; }
          .invoice-title { text-align: center; color: #8B772A; font-size: 26px; margin: 20px 0; font-weight: 700; }
          .details-box { background: #F5F5F0; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .details-grid { display: flex; flex-wrap: wrap; gap: 30px; }
          .details-col { flex: 1; min-width: 200px; }
          .details-col p { margin: 8px 0; font-size: 13px; }
          .details-col strong { color: #333; }
          .description { margin-bottom: 20px; }
          .description-label { font-weight: 700; margin-bottom: 8px; font-size: 14px; }
          .description-text { background: #FAFAFA; padding: 15px; border-radius: 6px; font-size: 13px; }
          .amount-box { background: #FAF8F0; border: 2px solid #C8B482; padding: 20px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .amount-label { font-weight: 700; font-size: 16px; }
          .amount-value { font-size: 24px; font-weight: 700; color: #8B772A; }
          .approval-section { margin-bottom: 20px; }
          .approval-title { font-weight: 700; margin-bottom: 12px; font-size: 14px; }
          .approval-box { background: #F9FAFB; padding: 20px; border-radius: 8px; }
          .approval-item { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
          .approval-item:last-child { margin-bottom: 0; }
          .approval-icon { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
          .approved { background: #D1FAE5; color: #059669; }
          .pending { background: #F3F4F6; color: #9CA3AF; }
          .approval-text { flex: 1; font-size: 13px; }
          .approval-name { font-weight: 600; }
          .approval-status { margin-right: 8px; }
          .paid-section { border-top: 1px solid #E5E7EB; margin-top: 15px; padding-top: 15px; }
          .footer { border-top: 1px solid #C8B482; padding-top: 20px; margin-top: 30px; text-align: center; }
          .footer p { font-size: 10px; color: #6B7280; margin: 4px 0; }
          .footer .generated { font-size: 9px; color: #9CA3AF; }
          @media print {
            body { padding: 15px; }
            @page { margin: 10mm; size: A4; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>شركة المروج للألبان ش.م.ع.م</h1>
            <p style="font-size: 12px; color: #555;">Al Morooj Dairy Company SAOC</p>
            <p>رقم السجل التجاري: 2017520 / 1249988</p>
            <p>صندوق بريد: 298 / 1385، الرمز البريدي: 211</p>
            <p>الرقم الضريبي: OM1100007713 / OM1100091687</p>
            <p>صلالة، سلطنة عمان</p>
          </div>
          <div class="logo">
            <img src="${COMPANY_LOGO}" alt="Logo" crossorigin="anonymous" />
          </div>
        </div>
        
        <div class="separator"></div>
        
        <h2 class="invoice-title">فاتورة / INVOICE</h2>
        
        <div class="details-box">
          <div class="details-grid">
            <div class="details-col">
              <p><strong>رقم الفاتورة:</strong> ${invoice.invoice_number || "-"}</p>
              <p><strong>التاريخ:</strong> ${new Date(invoice.created_at).toLocaleDateString("ar-SA")}</p>
              <p><strong>الحالة:</strong> <span style="color: ${statusColor}; font-weight: 700;">${statusText}</span></p>
            </div>
            <div class="details-col">
              <p><strong>المشروع:</strong> ${invoice.project_name || "-"}</p>
              ${invoice.milestone_name ? `<p><strong>المرحلة:</strong> ${invoice.milestone_name}</p>` : ""}
              <p><strong>النوع:</strong> ${invoice.invoice_type === "milestone" ? "مرحلة" : "دفعة جزئية"}</p>
            </div>
          </div>
        </div>
        
        <div class="description">
          <p class="description-label">الوصف:</p>
          <p class="description-text">${invoice.description || "-"}</p>
        </div>
        
        <div class="amount-box">
          <span class="amount-label">إجمالي المبلغ:</span>
          <span class="amount-value">${invoice.amount?.toFixed(3)} ر.ع</span>
        </div>
        
        <div class="approval-section">
          <p class="approval-title">حالة الموافقات:</p>
          <div class="approval-box">
            ${approvals.map((app, idx) => `
              <div class="approval-item">
                <div class="approval-icon ${app.approved ? 'approved' : 'pending'}">
                  ${app.approved ? "✓" : (idx + 1)}
                </div>
                <div class="approval-text">
                  <span class="approval-name">${app.name} (${app.nameEn})</span>
                  <span class="approval-status" style="color: ${app.approved ? '#059669' : '#9CA3AF'};">
                    ${app.approved 
                      ? `- تمت الموافقة بواسطة ${app.by || "-"} (${app.date ? new Date(app.date).toLocaleDateString("ar-SA") : "-"})` 
                      : "- في الانتظار"
                    }
                  </span>
                </div>
              </div>
            `).join("")}
            
            ${invoice.is_paid ? `
              <div class="paid-section">
                <div class="approval-item">
                  <div class="approval-icon approved">✓</div>
                  <div class="approval-text">
                    <span class="approval-name" style="color: #059669;">تم الصرف</span>
                    <span class="approval-status" style="color: #6B7280;">
                      - بواسطة ${invoice.paid_by || "-"} (${invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString("ar-SA") : "-"})
                      ${invoice.payment_reference ? ` - المرجع: ${invoice.payment_reference}` : ""}
                    </span>
                  </div>
                </div>
              </div>
            ` : ""}
          </div>
        </div>
        
        <div class="footer">
          <p>شركة المروج للألبان ش.م.ع.م | صلالة، سلطنة عمان</p>
          <p>الرقم الضريبي: OM1100007713 / OM1100091687 | السجل التجاري: 2017520 / 1249988</p>
          <p class="generated">تم الإنشاء في ${new Date().toLocaleString("ar-SA")}</p>
        </div>
      </body>
      </html>
    `;
    
    // Open print window
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for fonts and images to load
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
      
      toast.success(language === "ar" ? "جاري فتح نافذة الطباعة..." : "Opening print window...");
    } else {
      toast.error(language === "ar" ? "يرجى السماح بالنوافذ المنبثقة" : "Please allow pop-ups");
    }
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
