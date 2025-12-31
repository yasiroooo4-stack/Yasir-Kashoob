import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API, useAuth, useLanguage } from "../App";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "../components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { FileText, Scale, MessageSquare, FolderOpen, Plus, Pencil, Eye, AlertTriangle } from "lucide-react";

const Legal = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("contracts");
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [contracts, setContracts] = useState([]);
  const [cases, setCases] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [dashboard, setDashboard] = useState({});
  
  // Dialog states
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [consultationDialogOpen, setConsultationDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Form states
  const [contractForm, setContractForm] = useState({
    contract_type: "", title: "", party_name: "", party_type: "company",
    start_date: "", end_date: "", value: 0, description: "", terms: ""
  });
  const [caseForm, setCaseForm] = useState({
    case_type: "", title: "", description: "", plaintiff: "", defendant: "",
    court_name: "", filing_date: "", hearing_date: "", lawyer_name: "", priority: "medium"
  });
  const [consultationForm, setConsultationForm] = useState({
    requester_name: "", requester_id: "", department: "", subject: "",
    description: "", urgency: "normal", consultation_type: ""
  });
  const [documentForm, setDocumentForm] = useState({
    document_type: "", title: "", description: "", issue_date: "",
    expiry_date: "", issuing_authority: "", reference_number: ""
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [contractsRes, casesRes, consultationsRes, documentsRes, dashboardRes] = await Promise.all([
        axios.get(`${API}/api/legal/contracts`),
        axios.get(`${API}/api/legal/cases`),
        axios.get(`${API}/api/legal/consultations`),
        axios.get(`${API}/api/legal/documents`),
        axios.get(`${API}/api/legal/dashboard`)
      ]);
      setContracts(contractsRes.data);
      setCases(casesRes.data);
      setConsultations(consultationsRes.data);
      setDocuments(documentsRes.data);
      setDashboard(dashboardRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Contract handlers
  const handleContractSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        await axios.put(`${API}/api/legal/contracts/${selectedItem.id}`, contractForm);
      } else {
        await axios.post(`${API}/api/legal/contracts`, contractForm);
      }
      toast.success(language === "ar" ? "تم الحفظ بنجاح" : "Saved successfully");
      setContractDialogOpen(false);
      resetContractForm();
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  const resetContractForm = () => {
    setContractForm({
      contract_type: "", title: "", party_name: "", party_type: "company",
      start_date: "", end_date: "", value: 0, description: "", terms: ""
    });
    setSelectedItem(null);
  };

  // Case handlers
  const handleCaseSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        await axios.put(`${API}/api/legal/cases/${selectedItem.id}`, caseForm);
      } else {
        await axios.post(`${API}/api/legal/cases`, caseForm);
      }
      toast.success(language === "ar" ? "تم الحفظ بنجاح" : "Saved successfully");
      setCaseDialogOpen(false);
      resetCaseForm();
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  const resetCaseForm = () => {
    setCaseForm({
      case_type: "", title: "", description: "", plaintiff: "", defendant: "",
      court_name: "", filing_date: "", hearing_date: "", lawyer_name: "", priority: "medium"
    });
    setSelectedItem(null);
  };

  // Consultation handlers
  const handleConsultationSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/legal/consultations`, consultationForm);
      toast.success(language === "ar" ? "تم إرسال الاستشارة" : "Consultation submitted");
      setConsultationDialogOpen(false);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  // Document handlers
  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/api/legal/documents`, documentForm);
      toast.success(language === "ar" ? "تم الحفظ بنجاح" : "Saved successfully");
      setDocumentDialogOpen(false);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      draft: "bg-gray-100 text-gray-800",
      expired: "bg-red-100 text-red-800",
      terminated: "bg-red-100 text-red-800",
      open: "bg-blue-100 text-blue-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      closed: "bg-gray-100 text-gray-800",
      won: "bg-green-100 text-green-800",
      lost: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      valid: "bg-green-100 text-green-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {language === "ar" ? "القسم القانوني" : "Legal Department"}
        </h1>
        <p className="text-muted-foreground">
          {language === "ar" ? "إدارة العقود والقضايا والاستشارات القانونية" : "Manage contracts, cases and legal consultations"}
        </p>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.contracts_active || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "العقود النشطة" : "Active Contracts"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-100">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.contracts_expiring_soon || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "عقود تنتهي قريباً" : "Expiring Soon"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <Scale className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.cases_open || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "القضايا المفتوحة" : "Open Cases"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.consultations_pending || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "استشارات معلقة" : "Pending Consultations"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="contracts" className="gap-2">
            <FileText className="w-4 h-4" />
            {language === "ar" ? "العقود" : "Contracts"}
          </TabsTrigger>
          <TabsTrigger value="cases" className="gap-2">
            <Scale className="w-4 h-4" />
            {language === "ar" ? "القضايا" : "Cases"}
          </TabsTrigger>
          <TabsTrigger value="consultations" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            {language === "ar" ? "الاستشارات" : "Consultations"}
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            {language === "ar" ? "المستندات" : "Documents"}
          </TabsTrigger>
        </TabsList>

        {/* Contracts Tab */}
        <TabsContent value="contracts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "العقود القانونية" : "Legal Contracts"}</CardTitle>
                <CardDescription>
                  {language === "ar" ? "إدارة العقود والاتفاقيات" : "Manage contracts and agreements"}
                </CardDescription>
              </div>
              <Button onClick={() => { resetContractForm(); setContractDialogOpen(true); }} className="gradient-primary text-white">
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "عقد جديد" : "New Contract"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "رقم العقد" : "Contract #"}</TableHead>
                    <TableHead>{language === "ar" ? "العنوان" : "Title"}</TableHead>
                    <TableHead>{language === "ar" ? "الطرف الآخر" : "Party"}</TableHead>
                    <TableHead>{language === "ar" ? "النوع" : "Type"}</TableHead>
                    <TableHead>{language === "ar" ? "القيمة" : "Value"}</TableHead>
                    <TableHead>{language === "ar" ? "تاريخ الانتهاء" : "End Date"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا توجد عقود" : "No contracts"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    contracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="font-mono">{contract.contract_number}</TableCell>
                        <TableCell className="font-medium">{contract.title}</TableCell>
                        <TableCell>{contract.party_name}</TableCell>
                        <TableCell>{contract.contract_type}</TableCell>
                        <TableCell>{contract.value?.toFixed(3)} {language === "ar" ? "ر.ع" : "OMR"}</TableCell>
                        <TableCell>{contract.end_date?.split('T')[0]}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(contract.status)}>{contract.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => {
                            setSelectedItem(contract);
                            setContractForm(contract);
                            setContractDialogOpen(true);
                          }}>
                            <Pencil className="w-4 h-4" />
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

        {/* Cases Tab */}
        <TabsContent value="cases">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "القضايا القانونية" : "Legal Cases"}</CardTitle>
                <CardDescription>
                  {language === "ar" ? "متابعة القضايا والدعاوى" : "Track cases and lawsuits"}
                </CardDescription>
              </div>
              <Button onClick={() => { resetCaseForm(); setCaseDialogOpen(true); }} className="gradient-primary text-white">
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "قضية جديدة" : "New Case"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "رقم القضية" : "Case #"}</TableHead>
                    <TableHead>{language === "ar" ? "العنوان" : "Title"}</TableHead>
                    <TableHead>{language === "ar" ? "النوع" : "Type"}</TableHead>
                    <TableHead>{language === "ar" ? "المدعي" : "Plaintiff"}</TableHead>
                    <TableHead>{language === "ar" ? "الأولوية" : "Priority"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا توجد قضايا" : "No cases"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    cases.map((caseItem) => (
                      <TableRow key={caseItem.id}>
                        <TableCell className="font-mono">{caseItem.case_number}</TableCell>
                        <TableCell className="font-medium">{caseItem.title}</TableCell>
                        <TableCell>{caseItem.case_type}</TableCell>
                        <TableCell>{caseItem.plaintiff}</TableCell>
                        <TableCell>
                          <Badge className={caseItem.priority === 'high' ? 'bg-red-100 text-red-800' : caseItem.priority === 'critical' ? 'bg-red-200 text-red-900' : 'bg-yellow-100 text-yellow-800'}>
                            {caseItem.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(caseItem.status)}>{caseItem.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => {
                            setSelectedItem(caseItem);
                            setCaseForm(caseItem);
                            setCaseDialogOpen(true);
                          }}>
                            <Pencil className="w-4 h-4" />
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

        {/* Consultations Tab */}
        <TabsContent value="consultations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "الاستشارات القانونية" : "Legal Consultations"}</CardTitle>
              </div>
              <Button onClick={() => setConsultationDialogOpen(true)} className="gradient-primary text-white">
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "طلب استشارة" : "Request Consultation"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "الموضوع" : "Subject"}</TableHead>
                    <TableHead>{language === "ar" ? "الطالب" : "Requester"}</TableHead>
                    <TableHead>{language === "ar" ? "القسم" : "Department"}</TableHead>
                    <TableHead>{language === "ar" ? "الاستعجال" : "Urgency"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا توجد استشارات" : "No consultations"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    consultations.map((consultation) => (
                      <TableRow key={consultation.id}>
                        <TableCell className="font-medium">{consultation.subject}</TableCell>
                        <TableCell>{consultation.requester_name}</TableCell>
                        <TableCell>{consultation.department}</TableCell>
                        <TableCell>{consultation.urgency}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(consultation.status)}>{consultation.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "المستندات القانونية" : "Legal Documents"}</CardTitle>
              </div>
              <Button onClick={() => setDocumentDialogOpen(true)} className="gradient-primary text-white">
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "مستند جديد" : "New Document"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "العنوان" : "Title"}</TableHead>
                    <TableHead>{language === "ar" ? "النوع" : "Type"}</TableHead>
                    <TableHead>{language === "ar" ? "الجهة" : "Authority"}</TableHead>
                    <TableHead>{language === "ar" ? "تاريخ الانتهاء" : "Expiry"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا توجد مستندات" : "No documents"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.title}</TableCell>
                        <TableCell>{doc.document_type}</TableCell>
                        <TableCell>{doc.issuing_authority || "-"}</TableCell>
                        <TableCell>{doc.expiry_date?.split('T')[0] || "-"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(doc.status)}>{doc.status}</Badge>
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

      {/* Contract Dialog */}
      <Dialog open={contractDialogOpen} onOpenChange={setContractDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem ? (language === "ar" ? "تعديل العقد" : "Edit Contract") : (language === "ar" ? "عقد جديد" : "New Contract")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleContractSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "نوع العقد" : "Contract Type"} *</Label>
                <Select value={contractForm.contract_type} onValueChange={(v) => setContractForm({...contractForm, contract_type: v})}>
                  <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر النوع" : "Select type"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employment">{language === "ar" ? "توظيف" : "Employment"}</SelectItem>
                    <SelectItem value="vendor">{language === "ar" ? "موردين" : "Vendor"}</SelectItem>
                    <SelectItem value="service">{language === "ar" ? "خدمات" : "Service"}</SelectItem>
                    <SelectItem value="lease">{language === "ar" ? "إيجار" : "Lease"}</SelectItem>
                    <SelectItem value="partnership">{language === "ar" ? "شراكة" : "Partnership"}</SelectItem>
                    <SelectItem value="other">{language === "ar" ? "أخرى" : "Other"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "العنوان" : "Title"} *</Label>
                <Input value={contractForm.title} onChange={(e) => setContractForm({...contractForm, title: e.target.value})} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "الطرف الآخر" : "Other Party"} *</Label>
                <Input value={contractForm.party_name} onChange={(e) => setContractForm({...contractForm, party_name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "نوع الطرف" : "Party Type"}</Label>
                <Select value={contractForm.party_type} onValueChange={(v) => setContractForm({...contractForm, party_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">{language === "ar" ? "فرد" : "Individual"}</SelectItem>
                    <SelectItem value="company">{language === "ar" ? "شركة" : "Company"}</SelectItem>
                    <SelectItem value="government">{language === "ar" ? "حكومة" : "Government"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ البداية" : "Start Date"} *</Label>
                <Input type="date" value={contractForm.start_date} onChange={(e) => setContractForm({...contractForm, start_date: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ الانتهاء" : "End Date"} *</Label>
                <Input type="date" value={contractForm.end_date} onChange={(e) => setContractForm({...contractForm, end_date: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "القيمة (ر.ع)" : "Value (OMR)"} *</Label>
                <Input type="number" step="0.001" value={contractForm.value} onChange={(e) => setContractForm({...contractForm, value: parseFloat(e.target.value)})} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الوصف" : "Description"}</Label>
              <Textarea value={contractForm.description} onChange={(e) => setContractForm({...contractForm, description: e.target.value})} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setContractDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {language === "ar" ? "حفظ" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Case Dialog */}
      <Dialog open={caseDialogOpen} onOpenChange={setCaseDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem ? (language === "ar" ? "تعديل القضية" : "Edit Case") : (language === "ar" ? "قضية جديدة" : "New Case")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCaseSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "نوع القضية" : "Case Type"} *</Label>
                <Select value={caseForm.case_type} onValueChange={(v) => setCaseForm({...caseForm, case_type: v})}>
                  <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر النوع" : "Select type"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="litigation">{language === "ar" ? "دعوى" : "Litigation"}</SelectItem>
                    <SelectItem value="arbitration">{language === "ar" ? "تحكيم" : "Arbitration"}</SelectItem>
                    <SelectItem value="dispute">{language === "ar" ? "نزاع" : "Dispute"}</SelectItem>
                    <SelectItem value="complaint">{language === "ar" ? "شكوى" : "Complaint"}</SelectItem>
                    <SelectItem value="regulatory">{language === "ar" ? "تنظيمي" : "Regulatory"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "العنوان" : "Title"} *</Label>
                <Input value={caseForm.title} onChange={(e) => setCaseForm({...caseForm, title: e.target.value})} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "المدعي" : "Plaintiff"} *</Label>
                <Input value={caseForm.plaintiff} onChange={(e) => setCaseForm({...caseForm, plaintiff: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "المدعى عليه" : "Defendant"} *</Label>
                <Input value={caseForm.defendant} onChange={(e) => setCaseForm({...caseForm, defendant: e.target.value})} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ الرفع" : "Filing Date"} *</Label>
                <Input type="date" value={caseForm.filing_date} onChange={(e) => setCaseForm({...caseForm, filing_date: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "الأولوية" : "Priority"}</Label>
                <Select value={caseForm.priority} onValueChange={(v) => setCaseForm({...caseForm, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{language === "ar" ? "منخفضة" : "Low"}</SelectItem>
                    <SelectItem value="medium">{language === "ar" ? "متوسطة" : "Medium"}</SelectItem>
                    <SelectItem value="high">{language === "ar" ? "عالية" : "High"}</SelectItem>
                    <SelectItem value="critical">{language === "ar" ? "حرجة" : "Critical"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الوصف" : "Description"} *</Label>
              <Textarea value={caseForm.description} onChange={(e) => setCaseForm({...caseForm, description: e.target.value})} rows={3} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCaseDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {language === "ar" ? "حفظ" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Consultation Dialog */}
      <Dialog open={consultationDialogOpen} onOpenChange={setConsultationDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "طلب استشارة قانونية" : "Request Legal Consultation"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConsultationSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "اسم الطالب" : "Requester Name"} *</Label>
                <Input value={consultationForm.requester_name} onChange={(e) => setConsultationForm({...consultationForm, requester_name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "القسم" : "Department"} *</Label>
                <Input value={consultationForm.department} onChange={(e) => setConsultationForm({...consultationForm, department: e.target.value})} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الموضوع" : "Subject"} *</Label>
              <Input value={consultationForm.subject} onChange={(e) => setConsultationForm({...consultationForm, subject: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "نوع الاستشارة" : "Consultation Type"}</Label>
              <Select value={consultationForm.consultation_type} onValueChange={(v) => setConsultationForm({...consultationForm, consultation_type: v})}>
                <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر النوع" : "Select type"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract_review">{language === "ar" ? "مراجعة عقد" : "Contract Review"}</SelectItem>
                  <SelectItem value="legal_advice">{language === "ar" ? "استشارة قانونية" : "Legal Advice"}</SelectItem>
                  <SelectItem value="compliance">{language === "ar" ? "امتثال" : "Compliance"}</SelectItem>
                  <SelectItem value="other">{language === "ar" ? "أخرى" : "Other"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الوصف" : "Description"} *</Label>
              <Textarea value={consultationForm.description} onChange={(e) => setConsultationForm({...consultationForm, description: e.target.value})} rows={4} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConsultationDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {language === "ar" ? "إرسال" : "Submit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Document Dialog */}
      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "مستند قانوني جديد" : "New Legal Document"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDocumentSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "نوع المستند" : "Document Type"} *</Label>
                <Select value={documentForm.document_type} onValueChange={(v) => setDocumentForm({...documentForm, document_type: v})}>
                  <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر النوع" : "Select type"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="policy">{language === "ar" ? "سياسة" : "Policy"}</SelectItem>
                    <SelectItem value="regulation">{language === "ar" ? "لائحة" : "Regulation"}</SelectItem>
                    <SelectItem value="license">{language === "ar" ? "رخصة" : "License"}</SelectItem>
                    <SelectItem value="permit">{language === "ar" ? "تصريح" : "Permit"}</SelectItem>
                    <SelectItem value="certificate">{language === "ar" ? "شهادة" : "Certificate"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "العنوان" : "Title"} *</Label>
                <Input value={documentForm.title} onChange={(e) => setDocumentForm({...documentForm, title: e.target.value})} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ الإصدار" : "Issue Date"}</Label>
                <Input type="date" value={documentForm.issue_date} onChange={(e) => setDocumentForm({...documentForm, issue_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ الانتهاء" : "Expiry Date"}</Label>
                <Input type="date" value={documentForm.expiry_date} onChange={(e) => setDocumentForm({...documentForm, expiry_date: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الجهة المصدرة" : "Issuing Authority"}</Label>
              <Input value={documentForm.issuing_authority} onChange={(e) => setDocumentForm({...documentForm, issuing_authority: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الوصف" : "Description"}</Label>
              <Textarea value={documentForm.description} onChange={(e) => setDocumentForm({...documentForm, description: e.target.value})} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDocumentDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {language === "ar" ? "حفظ" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Legal;
