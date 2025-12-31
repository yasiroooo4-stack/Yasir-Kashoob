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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Megaphone, Users, Share2, Tag, RotateCcw, TrendingUp, Plus, Pencil, Target } from "lucide-react";

const Marketing = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("campaigns");
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [campaigns, setCampaigns] = useState([]);
  const [leads, setLeads] = useState([]);
  const [socialPosts, setSocialPosts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [returns, setReturns] = useState([]);
  const [dashboard, setDashboard] = useState({});
  
  // Dialog states
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Form states
  const [campaignForm, setCampaignForm] = useState({
    name: "", campaign_type: "", description: "", objective: "",
    target_audience: "", start_date: "", end_date: "", budget: 0
  });
  const [leadForm, setLeadForm] = useState({
    name: "", company_name: "", phone: "", email: "",
    lead_source: "", interest: "", notes: "", expected_value: 0
  });
  const [offerForm, setOfferForm] = useState({
    offer_type: "", title: "", description: "", product_type: "all",
    discount_percentage: 0, start_date: "", end_date: ""
  });
  const [returnForm, setReturnForm] = useState({
    return_date: new Date().toISOString().split('T')[0],
    customer_id: "", customer_name: "", quantity_liters: 0,
    reason: "", notes: "", refund_amount: 0
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [campaignsRes, leadsRes, offersRes, returnsRes, dashboardRes] = await Promise.all([
        axios.get(`${API}/marketing/campaigns`),
        axios.get(`${API}/marketing/leads`),
        axios.get(`${API}/marketing/offers`),
        axios.get(`${API}/marketing/returns`),
        axios.get(`${API}/marketing/dashboard`)
      ]);
      setCampaigns(campaignsRes.data);
      setLeads(leadsRes.data);
      setOffers(offersRes.data);
      setReturns(returnsRes.data);
      setDashboard(dashboardRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Campaign handlers
  const handleCampaignSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        await axios.put(`${API}/marketing/campaigns/${selectedItem.id}`, campaignForm);
      } else {
        await axios.post(`${API}/marketing/campaigns`, campaignForm);
      }
      toast.success(language === "ar" ? "تم الحفظ بنجاح" : "Saved successfully");
      setCampaignDialogOpen(false);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  // Lead handlers
  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        await axios.put(`${API}/marketing/leads/${selectedItem.id}`, leadForm);
      } else {
        await axios.post(`${API}/marketing/leads`, leadForm);
      }
      toast.success(language === "ar" ? "تم الحفظ بنجاح" : "Saved successfully");
      setLeadDialogOpen(false);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  // Offer handlers
  const handleOfferSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/marketing/offers`, offerForm);
      toast.success(language === "ar" ? "تم الحفظ بنجاح" : "Saved successfully");
      setOfferDialogOpen(false);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  // Return handlers
  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/marketing/returns`, returnForm);
      toast.success(language === "ar" ? "تم الحفظ بنجاح" : "Saved successfully");
      setReturnDialogOpen(false);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      draft: "bg-gray-100 text-gray-800",
      active: "bg-green-100 text-green-800",
      paused: "bg-yellow-100 text-yellow-800",
      completed: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800",
      new: "bg-blue-100 text-blue-800",
      contacted: "bg-yellow-100 text-yellow-800",
      qualified: "bg-purple-100 text-purple-800",
      won: "bg-green-100 text-green-800",
      lost: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800"
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
          {language === "ar" ? "التسويق" : "Marketing"}
        </h1>
        <p className="text-muted-foreground">
          {language === "ar" ? "إدارة الحملات والعملاء المحتملين والعروض" : "Manage campaigns, leads and offers"}
        </p>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <Megaphone className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.campaigns?.active || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "حملات نشطة" : "Active Campaigns"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.leads?.total || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "عملاء محتملين" : "Total Leads"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.leads?.conversion_rate || 0}%</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "معدل التحويل" : "Conversion Rate"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-100">
                <RotateCcw className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.returns?.monthly_quantity || 0} L</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "مرتجعات الشهر" : "Monthly Returns"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-3xl grid-cols-5">
          <TabsTrigger value="campaigns" className="gap-2">
            <Megaphone className="w-4 h-4" />
            {language === "ar" ? "الحملات" : "Campaigns"}
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-2">
            <Users className="w-4 h-4" />
            {language === "ar" ? "العملاء" : "Leads"}
          </TabsTrigger>
          <TabsTrigger value="offers" className="gap-2">
            <Tag className="w-4 h-4" />
            {language === "ar" ? "العروض" : "Offers"}
          </TabsTrigger>
          <TabsTrigger value="returns" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            {language === "ar" ? "المرتجعات" : "Returns"}
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-2">
            <Share2 className="w-4 h-4" />
            {language === "ar" ? "التواصل" : "Social"}
          </TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "الحملات التسويقية" : "Marketing Campaigns"}</CardTitle>
              </div>
              <Button onClick={() => { setSelectedItem(null); setCampaignDialogOpen(true); }} className="gradient-primary text-white">
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "حملة جديدة" : "New Campaign"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "الكود" : "Code"}</TableHead>
                    <TableHead>{language === "ar" ? "الاسم" : "Name"}</TableHead>
                    <TableHead>{language === "ar" ? "النوع" : "Type"}</TableHead>
                    <TableHead>{language === "ar" ? "الميزانية" : "Budget"}</TableHead>
                    <TableHead>{language === "ar" ? "العملاء" : "Leads"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا توجد حملات" : "No campaigns"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-mono">{campaign.campaign_code}</TableCell>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>{campaign.campaign_type}</TableCell>
                        <TableCell>{campaign.budget?.toFixed(3)} {language === "ar" ? "ر.ع" : "OMR"}</TableCell>
                        <TableCell>{campaign.leads_generated || 0}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(campaign.status)}>{campaign.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => {
                            setSelectedItem(campaign);
                            setCampaignForm(campaign);
                            setCampaignDialogOpen(true);
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

        {/* Leads Tab */}
        <TabsContent value="leads">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "العملاء المحتملين" : "Leads"}</CardTitle>
              </div>
              <Button onClick={() => { setSelectedItem(null); setLeadDialogOpen(true); }} className="gradient-primary text-white">
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "عميل جديد" : "New Lead"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "الكود" : "Code"}</TableHead>
                    <TableHead>{language === "ar" ? "الاسم" : "Name"}</TableHead>
                    <TableHead>{language === "ar" ? "الهاتف" : "Phone"}</TableHead>
                    <TableHead>{language === "ar" ? "المصدر" : "Source"}</TableHead>
                    <TableHead>{language === "ar" ? "الاهتمام" : "Interest"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا يوجد عملاء" : "No leads"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-mono">{lead.lead_code}</TableCell>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{lead.phone}</TableCell>
                        <TableCell>{lead.lead_source}</TableCell>
                        <TableCell>{lead.interest}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(lead.status)}>{lead.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => {
                            setSelectedItem(lead);
                            setLeadForm(lead);
                            setLeadDialogOpen(true);
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

        {/* Offers Tab */}
        <TabsContent value="offers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "عروض المبيعات" : "Sales Offers"}</CardTitle>
              </div>
              <Button onClick={() => setOfferDialogOpen(true)} className="gradient-primary text-white">
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "عرض جديد" : "New Offer"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "الكود" : "Code"}</TableHead>
                    <TableHead>{language === "ar" ? "العنوان" : "Title"}</TableHead>
                    <TableHead>{language === "ar" ? "النوع" : "Type"}</TableHead>
                    <TableHead>{language === "ar" ? "الخصم" : "Discount"}</TableHead>
                    <TableHead>{language === "ar" ? "الانتهاء" : "End Date"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا توجد عروض" : "No offers"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    offers.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell className="font-mono">{offer.offer_code}</TableCell>
                        <TableCell className="font-medium">{offer.title}</TableCell>
                        <TableCell>{offer.offer_type}</TableCell>
                        <TableCell>{offer.discount_percentage}%</TableCell>
                        <TableCell>{offer.end_date?.split('T')[0]}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(offer.status)}>{offer.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Returns Tab */}
        <TabsContent value="returns">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "مرتجعات السوق" : "Market Returns"}</CardTitle>
              </div>
              <Button onClick={() => setReturnDialogOpen(true)} className="gradient-primary text-white">
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "تسجيل مرتجع" : "Log Return"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "الكود" : "Code"}</TableHead>
                    <TableHead>{language === "ar" ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{language === "ar" ? "العميل" : "Customer"}</TableHead>
                    <TableHead>{language === "ar" ? "الكمية" : "Quantity"}</TableHead>
                    <TableHead>{language === "ar" ? "السبب" : "Reason"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا توجد مرتجعات" : "No returns"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    returns.map((ret) => (
                      <TableRow key={ret.id}>
                        <TableCell className="font-mono">{ret.return_code}</TableCell>
                        <TableCell>{ret.return_date}</TableCell>
                        <TableCell>{ret.customer_name}</TableCell>
                        <TableCell>{ret.quantity_liters} L</TableCell>
                        <TableCell>{ret.reason}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(ret.status)}>{ret.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Media Tab */}
        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle>{language === "ar" ? "وسائل التواصل الاجتماعي" : "Social Media"}</CardTitle>
              <CardDescription>
                {language === "ar" ? "قريباً - إدارة منشورات وسائل التواصل" : "Coming soon - Manage social media posts"}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-12">
              <Share2 className="w-16 h-16 mx-auto text-muted-foreground opacity-50 mb-4" />
              <p className="text-muted-foreground">
                {language === "ar" ? "هذه الميزة قيد التطوير" : "This feature is under development"}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Campaign Dialog */}
      <Dialog open={campaignDialogOpen} onOpenChange={setCampaignDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedItem ? (language === "ar" ? "تعديل الحملة" : "Edit Campaign") : (language === "ar" ? "حملة جديدة" : "New Campaign")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCampaignSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "اسم الحملة" : "Campaign Name"} *</Label>
                <Input value={campaignForm.name} onChange={(e) => setCampaignForm({...campaignForm, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "النوع" : "Type"} *</Label>
                <Select value={campaignForm.campaign_type} onValueChange={(v) => setCampaignForm({...campaignForm, campaign_type: v})}>
                  <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="social_media">{language === "ar" ? "تواصل اجتماعي" : "Social Media"}</SelectItem>
                    <SelectItem value="email">{language === "ar" ? "بريد" : "Email"}</SelectItem>
                    <SelectItem value="sms">{language === "ar" ? "رسائل نصية" : "SMS"}</SelectItem>
                    <SelectItem value="event">{language === "ar" ? "فعالية" : "Event"}</SelectItem>
                    <SelectItem value="billboard">{language === "ar" ? "لوحات إعلانية" : "Billboard"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الوصف" : "Description"} *</Label>
              <Textarea value={campaignForm.description} onChange={(e) => setCampaignForm({...campaignForm, description: e.target.value})} rows={2} required />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "البداية" : "Start"} *</Label>
                <Input type="date" value={campaignForm.start_date} onChange={(e) => setCampaignForm({...campaignForm, start_date: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "النهاية" : "End"} *</Label>
                <Input type="date" value={campaignForm.end_date} onChange={(e) => setCampaignForm({...campaignForm, end_date: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "الميزانية" : "Budget"}</Label>
                <Input type="number" step="0.001" value={campaignForm.budget} onChange={(e) => setCampaignForm({...campaignForm, budget: parseFloat(e.target.value)})} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCampaignDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {language === "ar" ? "حفظ" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lead Dialog */}
      <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedItem ? (language === "ar" ? "تعديل عميل" : "Edit Lead") : (language === "ar" ? "عميل محتمل جديد" : "New Lead")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLeadSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "الاسم" : "Name"} *</Label>
                <Input value={leadForm.name} onChange={(e) => setLeadForm({...leadForm, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "الهاتف" : "Phone"} *</Label>
                <Input value={leadForm.phone} onChange={(e) => setLeadForm({...leadForm, phone: e.target.value})} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "البريد" : "Email"}</Label>
                <Input type="email" value={leadForm.email} onChange={(e) => setLeadForm({...leadForm, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "الشركة" : "Company"}</Label>
                <Input value={leadForm.company_name} onChange={(e) => setLeadForm({...leadForm, company_name: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "المصدر" : "Source"} *</Label>
                <Select value={leadForm.lead_source} onValueChange={(v) => setLeadForm({...leadForm, lead_source: v})}>
                  <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">{language === "ar" ? "الموقع" : "Website"}</SelectItem>
                    <SelectItem value="social_media">{language === "ar" ? "تواصل اجتماعي" : "Social Media"}</SelectItem>
                    <SelectItem value="referral">{language === "ar" ? "إحالة" : "Referral"}</SelectItem>
                    <SelectItem value="cold_call">{language === "ar" ? "اتصال مباشر" : "Cold Call"}</SelectItem>
                    <SelectItem value="event">{language === "ar" ? "فعالية" : "Event"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "الاهتمام" : "Interest"} *</Label>
                <Select value={leadForm.interest} onValueChange={(v) => setLeadForm({...leadForm, interest: v})}>
                  <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="milk_supply">{language === "ar" ? "توريد حليب" : "Milk Supply"}</SelectItem>
                    <SelectItem value="milk_purchase">{language === "ar" ? "شراء حليب" : "Milk Purchase"}</SelectItem>
                    <SelectItem value="partnership">{language === "ar" ? "شراكة" : "Partnership"}</SelectItem>
                    <SelectItem value="other">{language === "ar" ? "أخرى" : "Other"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "ملاحظات" : "Notes"}</Label>
              <Textarea value={leadForm.notes} onChange={(e) => setLeadForm({...leadForm, notes: e.target.value})} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLeadDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {language === "ar" ? "حفظ" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Offer Dialog */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "عرض جديد" : "New Offer"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOfferSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "العنوان" : "Title"} *</Label>
                <Input value={offerForm.title} onChange={(e) => setOfferForm({...offerForm, title: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "النوع" : "Type"} *</Label>
                <Select value={offerForm.offer_type} onValueChange={(v) => setOfferForm({...offerForm, offer_type: v})}>
                  <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discount">{language === "ar" ? "خصم" : "Discount"}</SelectItem>
                    <SelectItem value="bundle">{language === "ar" ? "حزمة" : "Bundle"}</SelectItem>
                    <SelectItem value="bulk">{language === "ar" ? "كميات" : "Bulk"}</SelectItem>
                    <SelectItem value="seasonal">{language === "ar" ? "موسمي" : "Seasonal"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الوصف" : "Description"} *</Label>
              <Textarea value={offerForm.description} onChange={(e) => setOfferForm({...offerForm, description: e.target.value})} rows={2} required />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "نسبة الخصم %" : "Discount %"}</Label>
                <Input type="number" value={offerForm.discount_percentage} onChange={(e) => setOfferForm({...offerForm, discount_percentage: parseFloat(e.target.value)})} />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "البداية" : "Start"} *</Label>
                <Input type="date" value={offerForm.start_date} onChange={(e) => setOfferForm({...offerForm, start_date: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "النهاية" : "End"} *</Label>
                <Input type="date" value={offerForm.end_date} onChange={(e) => setOfferForm({...offerForm, end_date: e.target.value})} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOfferDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {language === "ar" ? "حفظ" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{language === "ar" ? "تسجيل مرتجع" : "Log Return"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReturnSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "التاريخ" : "Date"} *</Label>
                <Input type="date" value={returnForm.return_date} onChange={(e) => setReturnForm({...returnForm, return_date: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "اسم العميل" : "Customer"} *</Label>
                <Input value={returnForm.customer_name} onChange={(e) => setReturnForm({...returnForm, customer_name: e.target.value, customer_id: e.target.value})} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "الكمية (لتر)" : "Quantity (L)"} *</Label>
                <Input type="number" step="0.1" value={returnForm.quantity_liters} onChange={(e) => setReturnForm({...returnForm, quantity_liters: parseFloat(e.target.value)})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "السبب" : "Reason"} *</Label>
                <Select value={returnForm.reason} onValueChange={(v) => setReturnForm({...returnForm, reason: v})}>
                  <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر" : "Select"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quality_issue">{language === "ar" ? "مشكلة جودة" : "Quality Issue"}</SelectItem>
                    <SelectItem value="expired">{language === "ar" ? "منتهي الصلاحية" : "Expired"}</SelectItem>
                    <SelectItem value="damaged">{language === "ar" ? "تالف" : "Damaged"}</SelectItem>
                    <SelectItem value="excess">{language === "ar" ? "زيادة" : "Excess"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "ملاحظات" : "Notes"}</Label>
              <Textarea value={returnForm.notes} onChange={(e) => setReturnForm({...returnForm, notes: e.target.value})} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReturnDialogOpen(false)}>
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

export default Marketing;
