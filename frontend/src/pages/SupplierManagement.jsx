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
} from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Package,
  MessageSquare,
  Check,
  X,
  RefreshCw,
  Search,
  Filter,
  User,
  Calendar,
  DollarSign,
  Reply,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserPlus,
  Settings,
  Link,
  Copy,
} from "lucide-react";
import { Switch } from "../components/ui/switch";

const SupplierManagement = () => {
  const { language } = useLanguage();
  const t = (ar, en) => language === "ar" ? ar : en;
  const [activeTab, setActiveTab] = useState("feed-requests");
  const [loading, setLoading] = useState(false);
  
  // Feed Types with bilingual names
  const FEED_TYPES = [
    { id: "barley", name: t("شعير", "Barley"), price: 85 },
    { id: "wheat_bran", name: t("نخالة قمح", "Wheat Bran"), price: 70 },
    { id: "corn", name: t("ذرة", "Corn"), price: 95 },
    { id: "alfalfa", name: t("برسيم", "Alfalfa"), price: 120 },
    { id: "mixed", name: t("علف مخلوط", "Mixed Feed"), price: 100 },
  ];

  const MESSAGE_TYPES = {
    general: t("استفسار عام", "General Inquiry"),
    complaint: t("شكوى", "Complaint"),
    inquiry: t("استفسار مالي", "Financial Inquiry"),
    increase_quantity: t("طلب زيادة كمية", "Quantity Increase Request"),
  };
  
  // Feed Requests State
  const [feedRequests, setFeedRequests] = useState([]);
  const [feedStatusFilter, setFeedStatusFilter] = useState("all");
  const [feedSearchQuery, setFeedSearchQuery] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  
  // Messages State
  const [messages, setMessages] = useState([]);
  const [messageStatusFilter, setMessageStatusFilter] = useState("all");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [viewMessageDialogOpen, setViewMessageDialogOpen] = useState(false);
  const [viewRequestDialogOpen, setViewRequestDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);

  // Supplier Registration State
  const [registrationSettings, setRegistrationSettings] = useState({
    is_open: false,
    start_date: "",
    end_date: "",
    assigned_employee_id: "",
    assigned_employee_name: "",
    milk_types: ["أبقار", "أغنام", "إبل"]
  });
  const [registrationRequests, setRegistrationRequests] = useState([]);
  const [registrationStats, setRegistrationStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [employees, setEmployees] = useState([]);
  const [viewRegistrationDialog, setViewRegistrationDialog] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [rejectRegistrationDialog, setRejectRegistrationDialog] = useState(false);
  const [registrationRejectReason, setRegistrationRejectReason] = useState("");
  
  // Delete States
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState(""); // "feed", "message", "registration"
  const [itemToDelete, setItemToDelete] = useState(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchFeedRequests();
    fetchMessages();
    fetchRegistrationSettings();
    fetchRegistrationRequests();
    fetchRegistrationStats();
    fetchEmployees();
  }, []);

  const fetchFeedRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/admin/supplier-feed-requests`, { headers });
      setFeedRequests(res.data || []);
    } catch (error) {
      console.error("Error fetching feed requests:", error);
      toast.error(t("فشل في تحميل طلبات الأعلاف", "Failed to load feed requests"));
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API}/admin/supplier-messages`, { headers });
      setMessages(res.data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error(t("فشل في تحميل الرسائل", "Failed to load messages"));
    }
  };

  // Supplier Registration Functions
  const fetchRegistrationSettings = async () => {
    try {
      const res = await axios.get(`${API}/supplier-registration/settings`);
      setRegistrationSettings(res.data);
    } catch (error) {
      console.error("Error fetching registration settings:", error);
    }
  };

  const fetchRegistrationRequests = async () => {
    try {
      const res = await axios.get(`${API}/supplier-registration/requests`, { headers });
      setRegistrationRequests(res.data || []);
    } catch (error) {
      console.error("Error fetching registration requests:", error);
    }
  };

  const fetchRegistrationStats = async () => {
    try {
      const res = await axios.get(`${API}/supplier-registration/stats`, { headers });
      setRegistrationStats(res.data);
    } catch (error) {
      console.error("Error fetching registration stats:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API}/hr/employees`, { headers });
      setEmployees(res.data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleToggleRegistration = async () => {
    try {
      const newStatus = !registrationSettings.is_open;
      await axios.post(`${API}/supplier-registration/settings/toggle?is_open=${newStatus}`, {}, { headers });
      setRegistrationSettings({ ...registrationSettings, is_open: newStatus });
      toast.success(newStatus ? t("تم فتح التسجيل", "Registration opened") : t("تم إغلاق التسجيل", "Registration closed"));
    } catch (error) {
      toast.error(t("فشل في تحديث حالة التسجيل", "Failed to update registration status"));
    }
  };

  const handleSaveRegistrationSettings = async () => {
    try {
      await axios.put(`${API}/supplier-registration/settings`, registrationSettings, { headers });
      toast.success(t("تم حفظ الإعدادات", "Settings saved"));
    } catch (error) {
      toast.error(t("فشل في حفظ الإعدادات", "Failed to save settings"));
    }
  };

  const handleApproveRegistration = async (registrationId) => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      await axios.put(`${API}/supplier-registration/requests/${registrationId}/approve?approved_by=${user.id}&approved_by_name=${user.name}`, {}, { headers });
      toast.success(t("تمت الموافقة وإضافة المورد", "Registration approved and supplier added"));
      fetchRegistrationRequests();
      fetchRegistrationStats();
      setViewRegistrationDialog(false);
    } catch (error) {
      toast.error(t("فشل في الموافقة", "Failed to approve"));
    }
  };

  const handleRejectRegistration = async () => {
    if (!selectedRegistration) return;
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      await axios.put(
        `${API}/supplier-registration/requests/${selectedRegistration.id}/reject?rejection_reason=${encodeURIComponent(registrationRejectReason)}&rejected_by=${user.id}&rejected_by_name=${user.name}`,
        {},
        { headers }
      );
      toast.success(t("تم رفض الطلب", "Registration rejected"));
      fetchRegistrationRequests();
      fetchRegistrationStats();
      setRejectRegistrationDialog(false);
      setSelectedRegistration(null);
      setRegistrationRejectReason("");
    } catch (error) {
      toast.error(t("فشل في رفض الطلب", "Failed to reject"));
    }
  };

  const copyRegistrationLink = () => {
    const link = `${window.location.origin}/supplier-registration`;
    navigator.clipboard.writeText(link);
    toast.success(t("تم نسخ الرابط", "Link copied"));
  };

  const handleApproveRequest = async (requestId) => {
    try {
      setLoading(true);
      await axios.put(`${API}/admin/supplier-feed-requests/${requestId}/approve`, {}, { headers });
      toast.success(t("تمت الموافقة على الطلب وخصم المبلغ من رصيد المورد", "Request approved and amount deducted from supplier balance"));
      setApproveDialogOpen(false);
      setSelectedRequest(null);
      fetchFeedRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في الموافقة على الطلب", "Failed to approve request"));
    } finally {
      setLoading(false);
    }
  };

  const openApproveDialog = (request) => {
    setSelectedRequest(request);
    setApproveDialogOpen(true);
  };

  const openViewRequestDialog = (request) => {
    setSelectedRequest(request);
    setViewRequestDialogOpen(true);
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;
    try {
      setLoading(true);
      await axios.put(
        `${API}/admin/supplier-feed-requests/${selectedRequest.id}/reject?reason=${encodeURIComponent(rejectReason)}`,
        {},
        { headers }
      );
      toast.success(t("تم رفض الطلب", "Request rejected"));
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectReason("");
      fetchFeedRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في رفض الطلب", "Failed to reject request"));
    } finally {
      setLoading(false);
    }
  };

  const handleReplyMessage = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    try {
      setLoading(true);
      await axios.put(
        `${API}/admin/supplier-messages/${selectedMessage.id}/reply?reply=${encodeURIComponent(replyText)}`,
        {},
        { headers }
      );
      toast.success(t("تم إرسال الرد بنجاح", "Reply sent successfully"));
      setReplyDialogOpen(false);
      setSelectedMessage(null);
      setReplyText("");
      fetchMessages();
    } catch (error) {
      toast.error(error.response?.data?.detail || t("فشل في إرسال الرد", "Failed to send reply"));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: t("قيد الانتظار", "Pending"), variant: "secondary", icon: Clock },
      approved: { label: t("تمت الموافقة", "Approved"), variant: "default", icon: CheckCircle },
      rejected: { label: t("مرفوض", "Rejected"), variant: "destructive", icon: XCircle },
      unread: { label: t("جديد", "New"), variant: "secondary", icon: AlertCircle },
      read: { label: t("تمت القراءة", "Read"), variant: "outline", icon: Eye },
      replied: { label: t("تم الرد", "Replied"), variant: "default", icon: Reply },
    };
    const config = statusMap[status] || statusMap.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFeedTypeName = (feedType) => {
    const feed = FEED_TYPES.find(f => f.id === feedType);
    return feed?.name || feedType;
  };

  // Filter feed requests
  const filteredFeedRequests = feedRequests.filter(req => {
    const matchesStatus = feedStatusFilter === "all" || req.status === feedStatusFilter;
    const matchesSearch = !feedSearchQuery || 
      req.supplier_name?.toLowerCase().includes(feedSearchQuery.toLowerCase()) ||
      req.supplier_code?.includes(feedSearchQuery);
    return matchesStatus && matchesSearch;
  });

  // Filter messages
  const filteredMessages = messages.filter(msg => {
    const matchesStatus = messageStatusFilter === "all" || msg.status === messageStatusFilter;
    const matchesSearch = !messageSearchQuery || 
      msg.supplier_name?.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
      msg.supplier_code?.includes(messageSearchQuery) ||
      msg.subject?.toLowerCase().includes(messageSearchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Stats
  const pendingFeedRequests = feedRequests.filter(r => r.status === "pending").length;
  const unreadMessages = messages.filter(m => m.status === "unread").length;

  return (
    <div className="space-y-6" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("إدارة بوابة الموردين", "Supplier Portal Management")}</h1>
          <p className="text-muted-foreground">{t("إدارة طلبات الأعلاف ورسائل الموردين", "Manage feed requests and supplier messages")}</p>
        </div>
        <Button onClick={() => { fetchFeedRequests(); fetchMessages(); }} variant="outline">
          <RefreshCw className={`w-4 h-4 me-2 ${loading ? "animate-spin" : ""}`} />
          {t("تحديث", "Refresh")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{t("طلبات الأعلاف المعلقة", "Pending Feed Requests")}</p>
                <p className="text-3xl font-bold">{pendingFeedRequests}</p>
              </div>
              <Package className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{t("الرسائل غير المقروءة", "Unread Messages")}</p>
                <p className="text-3xl font-bold">{unreadMessages}</p>
              </div>
              <MessageSquare className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{t("إجمالي طلبات الأعلاف", "Total Feed Requests")}</p>
                <p className="text-3xl font-bold">{feedRequests.length}</p>
              </div>
              <Package className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">{t("إجمالي الرسائل", "Total Messages")}</p>
                <p className="text-3xl font-bold">{messages.length}</p>
              </div>
              <MessageSquare className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="feed-requests" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            {t("طلبات الأعلاف", "Feed Requests")}
            {pendingFeedRequests > 0 && (
              <Badge variant="destructive" className="ms-1">{pendingFeedRequests}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            {t("الرسائل", "Messages")}
            {unreadMessages > 0 && (
              <Badge variant="destructive" className="ms-1">{unreadMessages}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="registration" className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            {t("تسجيل الموردين", "Registration")}
            {registrationStats.pending > 0 && (
              <Badge variant="destructive" className="ms-1">{registrationStats.pending}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Feed Requests Tab */}
        <TabsContent value="feed-requests">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>{t("طلبات تحويل الرصيد إلى أعلاف", "Balance to Feed Conversion Requests")}</CardTitle>
                  <CardDescription>{t("إدارة طلبات الأعلاف من الموردين", "Manage feed requests from suppliers")}</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t("بحث بالاسم أو الكود...", "Search by name or code...")}
                      value={feedSearchQuery}
                      onChange={(e) => setFeedSearchQuery(e.target.value)}
                      className="pr-9 w-full sm:w-64"
                    />
                  </div>
                  <Select value={feedStatusFilter} onValueChange={setFeedStatusFilter}>
                    <SelectTrigger className="w-40">
                      <Filter className="w-4 h-4 me-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("الكل", "All")}</SelectItem>
                      <SelectItem value="pending">{t("قيد الانتظار", "Pending")}</SelectItem>
                      <SelectItem value="approved">{t("تمت الموافقة", "Approved")}</SelectItem>
                      <SelectItem value="rejected">{t("مرفوض", "Rejected")}</SelectItem>
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
                      <TableHead>{t("المورد", "Supplier")}</TableHead>
                      <TableHead>{t("نوع العلف", "Feed Type")}</TableHead>
                      <TableHead>{t("الكمية (كجم)", "Quantity (kg)")}</TableHead>
                      <TableHead>{t("المبلغ", "Amount")} ({t("ريال", "OMR")})</TableHead>
                      <TableHead>{t("تاريخ الطلب", "Request Date")}</TableHead>
                      <TableHead>{t("الحالة", "Status")}</TableHead>
                      <TableHead>{t("الإجراءات", "Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFeedRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t("لا توجد طلبات", "No requests found")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFeedRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{request.supplier_name}</p>
                                <p className="text-xs text-muted-foreground">{request.supplier_code}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getFeedTypeName(request.feed_type)}</TableCell>
                          <TableCell>{request.quantity?.toLocaleString()}</TableCell>
                          <TableCell className="font-bold text-green-600">
                            {request.amount_to_deduct?.toLocaleString()} {t("ريال", "OMR")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {formatDate(request.created_at)}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>
                            {request.status === "pending" ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openViewRequestDialog(request)}
                                >
                                  <Eye className="w-4 h-4 me-1" />
                                  {t("عرض", "View")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => openApproveDialog(request)}
                                  disabled={loading}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="w-4 h-4 me-1" />
                                  {t("موافقة", "Approve")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setRejectDialogOpen(true);
                                  }}
                                  disabled={loading}
                                >
                                  <X className="w-4 h-4 me-1" />
                                  {t("رفض", "Reject")}
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openViewRequestDialog(request)}
                                >
                                  <Eye className="w-4 h-4 me-1" />
                                  {t("عرض", "View")}
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                  {request.approved_by_name && `${t("بواسطة", "By")}: ${request.approved_by_name}`}
                                </span>
                              </div>
                            )}
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

        {/* Messages Tab */}
        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>{t("رسائل الموردين", "Supplier Messages")}</CardTitle>
                  <CardDescription>{t("عرض والرد على رسائل الموردين", "View and reply to supplier messages")}</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t("بحث...", "Search...")}
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      className="pr-9 w-full sm:w-64"
                    />
                  </div>
                  <Select value={messageStatusFilter} onValueChange={setMessageStatusFilter}>
                    <SelectTrigger className="w-40">
                      <Filter className="w-4 h-4 me-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("الكل", "All")}</SelectItem>
                      <SelectItem value="unread">{t("جديد", "New")}</SelectItem>
                      <SelectItem value="read">{t("تمت القراءة", "Read")}</SelectItem>
                      <SelectItem value="replied">{t("تم الرد", "Replied")}</SelectItem>
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
                      <TableHead>{t("المورد", "Supplier")}</TableHead>
                      <TableHead>{t("نوع الرسالة", "Message Type")}</TableHead>
                      <TableHead>{t("الموضوع", "Subject")}</TableHead>
                      <TableHead>{t("التاريخ", "Date")}</TableHead>
                      <TableHead>{t("الحالة", "Status")}</TableHead>
                      <TableHead>{t("الإجراءات", "Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMessages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {t("لا توجد رسائل", "No messages found")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMessages.map((message) => (
                        <TableRow key={message.id} className={message.status === "unread" ? "bg-blue-50 dark:bg-blue-900/20" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{message.supplier_name}</p>
                                <p className="text-xs text-muted-foreground">{message.supplier_code}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {MESSAGE_TYPES[message.message_type] || message.message_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="max-w-xs truncate">{message.subject}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {formatDate(message.created_at)}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(message.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedMessage(message);
                                  setViewMessageDialogOpen(true);
                                }}
                              >
                                <Eye className="w-4 h-4 me-1" />
                                {t("عرض", "View")}
                              </Button>
                              {message.status !== "replied" && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => {
                                    setSelectedMessage(message);
                                    setReplyDialogOpen(true);
                                  }}
                                >
                                  <Reply className="w-4 h-4 me-1" />
                                  {t("رد", "Reply")}
                                </Button>
                              )}
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

        {/* Registration Tab */}
        <TabsContent value="registration">
          {/* Registration Settings Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {t("إعدادات التسجيل", "Registration Settings")}
                </CardTitle>
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm" onClick={copyRegistrationLink}>
                    <Copy className="w-4 h-4 me-2" />
                    {t("نسخ الرابط", "Copy Link")}
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${registrationSettings.is_open ? "text-green-600" : "text-red-600"}`}>
                      {registrationSettings.is_open ? t("مفتوح", "Open") : t("مغلق", "Closed")}
                    </span>
                    <Switch
                      checked={registrationSettings.is_open}
                      onCheckedChange={handleToggleRegistration}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>{t("تاريخ البداية", "Start Date")}</Label>
                  <Input
                    type="date"
                    value={registrationSettings.start_date?.split('T')[0] || ""}
                    onChange={(e) => setRegistrationSettings({...registrationSettings, start_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>{t("تاريخ النهاية", "End Date")}</Label>
                  <Input
                    type="date"
                    value={registrationSettings.end_date?.split('T')[0] || ""}
                    onChange={(e) => setRegistrationSettings({...registrationSettings, end_date: e.target.value})}
                  />
                </div>
                <div>
                  <Label>{t("الموظف المسؤول", "Assigned Employee")}</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={registrationSettings.assigned_employee_id || ""}
                    onChange={(e) => {
                      const emp = employees.find(em => em.id === e.target.value);
                      setRegistrationSettings({
                        ...registrationSettings,
                        assigned_employee_id: e.target.value,
                        assigned_employee_name: emp?.name || ""
                      });
                    }}
                  >
                    <option value="">{t("اختر موظف", "Select Employee")}</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <a 
                  href="/supplier-registration" 
                  target="_blank" 
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <Link className="w-4 h-4" />
                  {t("فتح صفحة التسجيل", "Open Registration Page")}
                </a>
                <Button onClick={handleSaveRegistrationSettings}>
                  {t("حفظ الإعدادات", "Save Settings")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Registration Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold">{registrationStats.total}</p>
                <p className="text-sm text-muted-foreground">{t("إجمالي الطلبات", "Total")}</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-300">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-yellow-600">{registrationStats.pending}</p>
                <p className="text-sm text-muted-foreground">{t("قيد الانتظار", "Pending")}</p>
              </CardContent>
            </Card>
            <Card className="border-green-300">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{registrationStats.approved}</p>
                <p className="text-sm text-muted-foreground">{t("مقبول", "Approved")}</p>
              </CardContent>
            </Card>
            <Card className="border-red-300">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{registrationStats.rejected}</p>
                <p className="text-sm text-muted-foreground">{t("مرفوض", "Rejected")}</p>
              </CardContent>
            </Card>
          </div>

          {/* Registration Requests Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t("طلبات التسجيل", "Registration Requests")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("رقم الطلب", "Request #")}</TableHead>
                      <TableHead>{t("الاسم", "Name")}</TableHead>
                      <TableHead>{t("الرقم المدني", "Civil ID")}</TableHead>
                      <TableHead>{t("الهاتف", "Phone")}</TableHead>
                      <TableHead>{t("نوع الحليب", "Milk Type")}</TableHead>
                      <TableHead>{t("الكمية", "Quantity")}</TableHead>
                      <TableHead>{t("الحالة", "Status")}</TableHead>
                      <TableHead>{t("التاريخ", "Date")}</TableHead>
                      <TableHead>{t("الإجراءات", "Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrationRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          {t("لا توجد طلبات تسجيل", "No registration requests")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      registrationRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">{req.registration_number}</TableCell>
                          <TableCell>{req.name}</TableCell>
                          <TableCell>{req.civil_id}</TableCell>
                          <TableCell>{req.phone}</TableCell>
                          <TableCell>{req.milk_type}</TableCell>
                          <TableCell>{req.expected_quantity} {t("لتر", "L")}</TableCell>
                          <TableCell>
                            <Badge variant={
                              req.status === "approved" ? "default" :
                              req.status === "rejected" ? "destructive" : "secondary"
                            } className={req.status === "approved" ? "bg-green-500" : ""}>
                              {req.status === "approved" ? t("مقبول", "Approved") :
                               req.status === "rejected" ? t("مرفوض", "Rejected") :
                               t("قيد الانتظار", "Pending")}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(req.created_at).toLocaleDateString('ar-SA')}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRegistration(req);
                                  setViewRegistrationDialog(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {req.status === "pending" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700"
                                    onClick={() => handleApproveRegistration(req.id)}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => {
                                      setSelectedRegistration(req);
                                      setRejectRegistrationDialog(true);
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
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
      </Tabs>

      {/* Reject Request Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              {t("رفض طلب الأعلاف", "Reject Feed Request")}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>{t("المورد", "Supplier")}:</strong> {selectedRequest.supplier_name}</p>
                <p><strong>{t("نوع العلف", "Feed Type")}:</strong> {getFeedTypeName(selectedRequest.feed_type)}</p>
                <p><strong>{t("الكمية", "Quantity")}:</strong> {selectedRequest.quantity} {t("كجم", "kg")}</p>
                <p><strong>{t("المبلغ", "Amount")}:</strong> {selectedRequest.amount_to_deduct} {t("ريال", "OMR")}</p>
              </div>
              <div className="space-y-2">
                <Label>{t("سبب الرفض (اختياري)", "Rejection Reason (Optional)")}</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t("أدخل سبب الرفض...", "Enter rejection reason...")}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button variant="destructive" onClick={handleRejectRequest} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : <X className="w-4 h-4 me-2" />}
              {t("تأكيد الرفض", "Confirm Rejection")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Message Dialog */}
      <Dialog open={viewMessageDialogOpen} onOpenChange={setViewMessageDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {t("تفاصيل الرسالة", "Message Details")}
            </DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b pb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold">{selectedMessage.supplier_name}</p>
                  <p className="text-sm text-muted-foreground">{t("كود", "Code")}: {selectedMessage.supplier_code}</p>
                </div>
                {getStatusBadge(selectedMessage.status)}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{MESSAGE_TYPES[selectedMessage.message_type] || selectedMessage.message_type}</Badge>
                  <span>•</span>
                  <Calendar className="w-3 h-3" />
                  {formatDate(selectedMessage.created_at)}
                </div>
                <h4 className="font-bold text-lg">{selectedMessage.subject}</h4>
                <p className="text-muted-foreground whitespace-pre-wrap bg-muted p-4 rounded-lg">
                  {selectedMessage.message}
                </p>
              </div>

              {selectedMessage.reply && (
                <div className="border-t pt-4 space-y-2">
                  <p className="text-sm font-medium text-green-600 flex items-center gap-2">
                    <Reply className="w-4 h-4" />
                    {t("الرد", "Reply")} - {t("بواسطة", "By")} {selectedMessage.replied_by}
                  </p>
                  <p className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    {selectedMessage.reply}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(selectedMessage.replied_at)}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewMessageDialogOpen(false)}>
              {t("إغلاق", "Close")}
            </Button>
            {selectedMessage && selectedMessage.status !== "replied" && (
              <Button onClick={() => {
                setViewMessageDialogOpen(false);
                setReplyDialogOpen(true);
              }}>
                <Reply className="w-4 h-4 me-2" />
                {t("رد على الرسالة", "Reply to Message")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Reply className="w-5 h-5" />
              {t("الرد على الرسالة", "Reply to Message")}
            </DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>{t("من", "From")}:</strong> {selectedMessage.supplier_name}</p>
                <p><strong>{t("الموضوع", "Subject")}:</strong> {selectedMessage.subject}</p>
                <p className="text-sm text-muted-foreground">{selectedMessage.message}</p>
              </div>
              <div className="space-y-2">
                <Label>{t("الرد", "Reply")}</Label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={t("اكتب ردك هنا...", "Write your reply here...")}
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button onClick={handleReplyMessage} disabled={loading || !replyText.trim()}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : <Reply className="w-4 h-4 me-2" />}
              {t("إرسال الرد", "Send Reply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Feed Request Dialog */}
      <Dialog open={viewRequestDialogOpen} onOpenChange={setViewRequestDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              {t("تفاصيل طلب الأعلاف", "Feed Request Details")}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 border-b pb-4">
                <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
                  <User className="w-7 h-7 text-orange-600" />
                </div>
                <div>
                  <p className="font-bold text-lg">{selectedRequest.supplier_name}</p>
                  <p className="text-sm text-muted-foreground">{t("كود", "Code")}: {selectedRequest.supplier_code}</p>
                </div>
                {getStatusBadge(selectedRequest.status)}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">{t("نوع العلف", "Feed Type")}</p>
                  <p className="font-bold">{getFeedTypeName(selectedRequest.feed_type)}</p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">{t("الكمية", "Quantity")}</p>
                  <p className="font-bold">{selectedRequest.quantity?.toLocaleString()} {t("كجم", "kg")}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg col-span-2">
                  <p className="text-xs text-muted-foreground">{t("المبلغ المطلوب خصمه", "Amount to Deduct")}</p>
                  <p className="font-bold text-xl text-green-600">{selectedRequest.amount_to_deduct?.toLocaleString()} {t("ريال", "OMR")}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {t("تاريخ الطلب", "Request Date")}: {formatDate(selectedRequest.created_at)}
              </div>

              {selectedRequest.status === "approved" && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-sm text-green-600 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {t("تمت الموافقة بواسطة", "Approved by")}: {selectedRequest.approved_by_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(selectedRequest.approved_at)}
                  </p>
                </div>
              )}

              {selectedRequest.status === "rejected" && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    {t("تم الرفض بواسطة", "Rejected by")}: {selectedRequest.approved_by_name}
                  </p>
                  {selectedRequest.rejection_reason && (
                    <p className="text-sm mt-2">{t("السبب", "Reason")}: {selectedRequest.rejection_reason}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(selectedRequest.approved_at)}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRequestDialogOpen(false)}>
              {t("إغلاق", "Close")}
            </Button>
            {selectedRequest?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setViewRequestDialogOpen(false);
                    setRejectDialogOpen(true);
                  }}
                >
                  <X className="w-4 h-4 me-2" />
                  {t("رفض", "Reject")}
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setViewRequestDialogOpen(false);
                    setApproveDialogOpen(true);
                  }}
                >
                  <Check className="w-4 h-4 me-2" />
                  {t("موافقة", "Approve")}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              {t("تأكيد الموافقة على الطلب", "Confirm Request Approval")}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {t("هل أنت متأكد من الموافقة على طلب الأعلاف التالي؟", "Are you sure you want to approve this feed request?")}
              </p>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg space-y-2">
                <p><strong>{t("المورد", "Supplier")}:</strong> {selectedRequest.supplier_name}</p>
                <p><strong>{t("نوع العلف", "Feed Type")}:</strong> {getFeedTypeName(selectedRequest.feed_type)}</p>
                <p><strong>{t("الكمية", "Quantity")}:</strong> {selectedRequest.quantity} {t("كجم", "kg")}</p>
                <p className="text-green-600 font-bold text-lg">
                  {t("المبلغ", "Amount")}: {selectedRequest.amount_to_deduct?.toLocaleString()} {t("ريال", "OMR")}
                </p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-sm">
                <p className="flex items-center gap-2 text-yellow-700">
                  <AlertCircle className="w-4 h-4" />
                  {t("سيتم خصم المبلغ من رصيد المورد تلقائياً", "The amount will be automatically deducted from supplier balance")}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700" 
              onClick={() => handleApproveRequest(selectedRequest?.id)}
              disabled={loading}
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : <Check className="w-4 h-4 me-2" />}
              {t("تأكيد الموافقة", "Confirm Approval")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Registration Dialog */}
      <Dialog open={viewRegistrationDialog} onOpenChange={setViewRegistrationDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              {t("تفاصيل طلب التسجيل", "Registration Details")}
            </DialogTitle>
          </DialogHeader>
          {selectedRegistration && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 border-b pb-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-lg">{selectedRegistration.name}</p>
                  <p className="text-sm text-muted-foreground">#{selectedRegistration.registration_number}</p>
                </div>
                <Badge variant={
                  selectedRegistration.status === "approved" ? "default" :
                  selectedRegistration.status === "rejected" ? "destructive" : "secondary"
                } className={selectedRegistration.status === "approved" ? "bg-green-500" : ""}>
                  {selectedRegistration.status_message}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">{t("الرقم المدني", "Civil ID")}</p>
                  <p className="font-bold">{selectedRegistration.civil_id}</p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">{t("رقم الهاتف", "Phone")}</p>
                  <p className="font-bold">{selectedRegistration.phone}</p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">{t("نوع الحليب", "Milk Type")}</p>
                  <p className="font-bold">{selectedRegistration.milk_type}</p>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">{t("الكمية المتوقعة", "Expected Quantity")}</p>
                  <p className="font-bold">{selectedRegistration.expected_quantity} {t("لتر/يوم", "L/day")}</p>
                </div>
              </div>
              
              {selectedRegistration.address && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">{t("العنوان", "Address")}</p>
                  <p className="font-bold">{selectedRegistration.address}</p>
                </div>
              )}
              
              {selectedRegistration.notes && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">{t("ملاحظات", "Notes")}</p>
                  <p className="font-bold">{selectedRegistration.notes}</p>
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                <p>{t("تاريخ التقديم", "Submitted")}: {new Date(selectedRegistration.created_at).toLocaleString('ar-SA')}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewRegistrationDialog(false)}>
              {t("إغلاق", "Close")}
            </Button>
            {selectedRegistration?.status === "pending" && (
              <>
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    setRejectRegistrationDialog(true);
                  }}
                >
                  <X className="w-4 h-4 me-2" />
                  {t("رفض", "Reject")}
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700" 
                  onClick={() => handleApproveRegistration(selectedRegistration.id)}
                >
                  <Check className="w-4 h-4 me-2" />
                  {t("موافقة", "Approve")}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Registration Dialog */}
      <Dialog open={rejectRegistrationDialog} onOpenChange={setRejectRegistrationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              {t("رفض طلب التسجيل", "Reject Registration")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRegistration && (
              <div className="bg-muted p-4 rounded-lg">
                <p><strong>{t("الاسم", "Name")}:</strong> {selectedRegistration.name}</p>
                <p><strong>{t("رقم الطلب", "Request #")}:</strong> {selectedRegistration.registration_number}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t("سبب الرفض", "Rejection Reason")}</Label>
              <Textarea
                value={registrationRejectReason}
                onChange={(e) => setRegistrationRejectReason(e.target.value)}
                placeholder={t("أدخل سبب الرفض...", "Enter rejection reason...")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectRegistrationDialog(false);
              setRegistrationRejectReason("");
            }}>
              {t("إلغاء", "Cancel")}
            </Button>
            <Button variant="destructive" onClick={handleRejectRegistration}>
              <X className="w-4 h-4 me-2" />
              {t("تأكيد الرفض", "Confirm Rejection")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierManagement;
