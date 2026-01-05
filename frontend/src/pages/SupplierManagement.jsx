import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { toast } from "sonner";
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
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const FEED_TYPES = [
  { id: "barley", name: "شعير", price: 85 },
  { id: "wheat_bran", name: "نخالة قمح", price: 70 },
  { id: "corn", name: "ذرة", price: 95 },
  { id: "alfalfa", name: "برسيم", price: 120 },
  { id: "mixed", name: "علف مخلوط", price: 100 },
];

const MESSAGE_TYPES = {
  general: "استفسار عام",
  complaint: "شكوى",
  inquiry: "استفسار مالي",
  increase_quantity: "طلب زيادة كمية",
};

const SupplierManagement = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("feed-requests");
  const [loading, setLoading] = useState(false);
  
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

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchFeedRequests();
    fetchMessages();
  }, []);

  const fetchFeedRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/admin/supplier-feed-requests`, { headers });
      setFeedRequests(res.data || []);
    } catch (error) {
      console.error("Error fetching feed requests:", error);
      toast.error("فشل في تحميل طلبات الأعلاف");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/supplier-messages`, { headers });
      setMessages(res.data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("فشل في تحميل الرسائل");
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      setLoading(true);
      await axios.put(`${API}/api/admin/supplier-feed-requests/${requestId}/approve`, {}, { headers });
      toast.success("تمت الموافقة على الطلب وخصم المبلغ من رصيد المورد");
      setApproveDialogOpen(false);
      setSelectedRequest(null);
      fetchFeedRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل في الموافقة على الطلب");
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
        `${API}/api/admin/supplier-feed-requests/${selectedRequest.id}/reject?reason=${encodeURIComponent(rejectReason)}`,
        {},
        { headers }
      );
      toast.success("تم رفض الطلب");
      setRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectReason("");
      fetchFeedRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل في رفض الطلب");
    } finally {
      setLoading(false);
    }
  };

  const handleReplyMessage = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    try {
      setLoading(true);
      await axios.put(
        `${API}/api/admin/supplier-messages/${selectedMessage.id}/reply?reply=${encodeURIComponent(replyText)}`,
        {},
        { headers }
      );
      toast.success("تم إرسال الرد بنجاح");
      setReplyDialogOpen(false);
      setSelectedMessage(null);
      setReplyText("");
      fetchMessages();
    } catch (error) {
      toast.error(error.response?.data?.detail || "فشل في إرسال الرد");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: "قيد الانتظار", variant: "secondary", icon: Clock },
      approved: { label: "تمت الموافقة", variant: "default", icon: CheckCircle },
      rejected: { label: "مرفوض", variant: "destructive", icon: XCircle },
      unread: { label: "جديد", variant: "secondary", icon: AlertCircle },
      read: { label: "تمت القراءة", variant: "outline", icon: Eye },
      replied: { label: "تم الرد", variant: "default", icon: Reply },
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
    return new Date(dateStr).toLocaleDateString("ar-SA", {
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
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">إدارة بوابة الموردين</h1>
          <p className="text-muted-foreground">إدارة طلبات الأعلاف ورسائل الموردين</p>
        </div>
        <Button onClick={() => { fetchFeedRequests(); fetchMessages(); }} variant="outline">
          <RefreshCw className={`w-4 h-4 me-2 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">طلبات الأعلاف المعلقة</p>
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
                <p className="text-sm opacity-80">الرسائل غير المقروءة</p>
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
                <p className="text-sm opacity-80">إجمالي طلبات الأعلاف</p>
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
                <p className="text-sm opacity-80">إجمالي الرسائل</p>
                <p className="text-3xl font-bold">{messages.length}</p>
              </div>
              <MessageSquare className="w-10 h-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="feed-requests" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            طلبات الأعلاف
            {pendingFeedRequests > 0 && (
              <Badge variant="destructive" className="ms-1">{pendingFeedRequests}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            الرسائل
            {unreadMessages > 0 && (
              <Badge variant="destructive" className="ms-1">{unreadMessages}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Feed Requests Tab */}
        <TabsContent value="feed-requests">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>طلبات تحويل الرصيد إلى أعلاف</CardTitle>
                  <CardDescription>إدارة طلبات الأعلاف من الموردين</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث بالاسم أو الكود..."
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
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="pending">قيد الانتظار</SelectItem>
                      <SelectItem value="approved">تمت الموافقة</SelectItem>
                      <SelectItem value="rejected">مرفوض</SelectItem>
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
                      <TableHead>المورد</TableHead>
                      <TableHead>نوع العلف</TableHead>
                      <TableHead>الكمية (كجم)</TableHead>
                      <TableHead>المبلغ (ريال)</TableHead>
                      <TableHead>تاريخ الطلب</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFeedRequests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          لا توجد طلبات
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
                            {request.amount_to_deduct?.toLocaleString()} ريال
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
                                  variant="default"
                                  onClick={() => handleApproveRequest(request.id)}
                                  disabled={loading}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="w-4 h-4 me-1" />
                                  موافقة
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
                                  رفض
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {request.approved_by_name && `بواسطة: ${request.approved_by_name}`}
                              </span>
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
                  <CardTitle>رسائل الموردين</CardTitle>
                  <CardDescription>عرض والرد على رسائل الموردين</CardDescription>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث..."
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
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="unread">جديد</SelectItem>
                      <SelectItem value="read">تمت القراءة</SelectItem>
                      <SelectItem value="replied">تم الرد</SelectItem>
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
                      <TableHead>المورد</TableHead>
                      <TableHead>نوع الرسالة</TableHead>
                      <TableHead>الموضوع</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMessages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          لا توجد رسائل
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
                                عرض
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
                                  رد
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
      </Tabs>

      {/* Reject Request Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              رفض طلب الأعلاف
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>المورد:</strong> {selectedRequest.supplier_name}</p>
                <p><strong>نوع العلف:</strong> {getFeedTypeName(selectedRequest.feed_type)}</p>
                <p><strong>الكمية:</strong> {selectedRequest.quantity} كجم</p>
                <p><strong>المبلغ:</strong> {selectedRequest.amount_to_deduct} ريال</p>
              </div>
              <div className="space-y-2">
                <Label>سبب الرفض (اختياري)</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="أدخل سبب الرفض..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleRejectRequest} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : <X className="w-4 h-4 me-2" />}
              تأكيد الرفض
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
              تفاصيل الرسالة
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
                  <p className="text-sm text-muted-foreground">كود: {selectedMessage.supplier_code}</p>
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
                    الرد - بواسطة {selectedMessage.replied_by}
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
              إغلاق
            </Button>
            {selectedMessage && selectedMessage.status !== "replied" && (
              <Button onClick={() => {
                setViewMessageDialogOpen(false);
                setReplyDialogOpen(true);
              }}>
                <Reply className="w-4 h-4 me-2" />
                رد على الرسالة
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
              الرد على الرسالة
            </DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>من:</strong> {selectedMessage.supplier_name}</p>
                <p><strong>الموضوع:</strong> {selectedMessage.subject}</p>
                <p className="text-sm text-muted-foreground">{selectedMessage.message}</p>
              </div>
              <div className="space-y-2">
                <Label>الرد</Label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="اكتب ردك هنا..."
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleReplyMessage} disabled={loading || !replyText.trim()}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : <Reply className="w-4 h-4 me-2" />}
              إرسال الرد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierManagement;
