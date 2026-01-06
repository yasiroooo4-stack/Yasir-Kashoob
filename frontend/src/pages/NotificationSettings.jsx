import { useState, useEffect } from "react";
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
import { Switch } from "../components/ui/switch";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import {
  MessageSquare,
  Mail,
  Calendar,
  Clock,
  Settings,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Phone,
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const NotificationSettings = () => {
  const [activeTab, setActiveTab] = useState("sms");
  const [loading, setLoading] = useState(false);
  
  // SMS Settings
  const [smsSettings, setSmsSettings] = useState({
    provider: "tamimah",
    api_url: "",
    username: "",
    password: "",
    sender_id: "MAROOJ",
  });
  const [smsLogs, setSmsLogs] = useState([]);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("رسالة اختبار من نظام المروج للألبان");
  
  // Email/SMTP Settings
  const [smtpSettings, setSmtpSettings] = useState({
    host: "",
    port: 587,
    username: "",
    password: "",
  });
  
  // Report Schedules
  const [schedules, setSchedules] = useState([]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    name: "",
    report_type: "daily_summary",
    frequency: "daily",
    day_of_week: 0,
    day_of_month: 1,
    time: "08:00",
    recipients: "",
    is_active: true,
  });
  const [reportLogs, setReportLogs] = useState([]);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchSmsSettings();
    fetchSmsLogs();
    fetchSchedules();
    fetchReportLogs();
  }, []);

  const fetchSmsSettings = async () => {
    try {
      const response = await axios.get(`${API}/api/sms/settings`, { headers });
      setSmsSettings(prev => ({ ...prev, ...response.data }));
    } catch (error) {
      console.error("Error fetching SMS settings:", error);
    }
  };

  const fetchSmsLogs = async () => {
    try {
      const response = await axios.get(`${API}/api/sms/logs?limit=20`, { headers });
      setSmsLogs(response.data);
    } catch (error) {
      console.error("Error fetching SMS logs:", error);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await axios.get(`${API}/api/reports/schedules`, { headers });
      setSchedules(response.data);
    } catch (error) {
      console.error("Error fetching schedules:", error);
    }
  };

  const fetchReportLogs = async () => {
    try {
      const response = await axios.get(`${API}/api/reports/logs?limit=20`, { headers });
      setReportLogs(response.data);
    } catch (error) {
      console.error("Error fetching report logs:", error);
    }
  };

  const saveSmsSettings = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/api/sms/settings`, smsSettings, { headers });
      toast.success("تم حفظ إعدادات SMS بنجاح");
      fetchSmsSettings();
    } catch (error) {
      toast.error("فشل حفظ الإعدادات");
    } finally {
      setLoading(false);
    }
  };

  const sendTestSms = async () => {
    if (!testPhone) {
      toast.error("يرجى إدخال رقم الهاتف");
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/sms/send`, {
        phone: testPhone,
        message: testMessage,
      }, { headers });
      
      if (response.data.success) {
        toast.success("تم إرسال الرسالة بنجاح");
      } else {
        toast.error(response.data.message);
      }
      fetchSmsLogs();
    } catch (error) {
      toast.error("فشل إرسال الرسالة");
    } finally {
      setLoading(false);
    }
  };

  const createSchedule = async () => {
    setLoading(true);
    try {
      const data = {
        ...scheduleForm,
        recipients: scheduleForm.recipients.split(",").map(e => e.trim()).filter(e => e),
      };
      await axios.post(`${API}/api/reports/schedules`, data, { headers });
      toast.success("تم إنشاء الجدول بنجاح");
      setScheduleDialogOpen(false);
      setScheduleForm({
        name: "",
        report_type: "daily_summary",
        frequency: "daily",
        day_of_week: 0,
        day_of_month: 1,
        time: "08:00",
        recipients: "",
        is_active: true,
      });
      fetchSchedules();
    } catch (error) {
      toast.error("فشل إنشاء الجدول");
    } finally {
      setLoading(false);
    }
  };

  const deleteSchedule = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الجدول؟")) return;
    
    try {
      await axios.delete(`${API}/api/reports/schedules/${id}`, { headers });
      toast.success("تم حذف الجدول");
      fetchSchedules();
    } catch (error) {
      toast.error("فشل الحذف");
    }
  };

  const runSchedule = async (id) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/reports/schedules/${id}/run`, {}, { headers });
      if (response.data.success) {
        toast.success(response.data.message);
      } else {
        toast.warning(response.data.error || response.data.message);
      }
      fetchSchedules();
      fetchReportLogs();
    } catch (error) {
      toast.error("فشل تشغيل التقرير");
    } finally {
      setLoading(false);
    }
  };

  const toggleSchedule = async (schedule) => {
    try {
      await axios.put(`${API}/api/reports/schedules/${schedule.id}`, {
        is_active: !schedule.is_active,
      }, { headers });
      fetchSchedules();
    } catch (error) {
      toast.error("فشل التحديث");
    }
  };

  const reportTypes = [
    { value: "daily_summary", label: "التقرير اليومي" },
    { value: "weekly_summary", label: "التقرير الأسبوعي" },
    { value: "monthly_financial", label: "التقرير المالي الشهري" },
    { value: "inventory_alerts", label: "تنبيهات المخزون" },
  ];

  const frequencies = [
    { value: "daily", label: "يومي" },
    { value: "weekly", label: "أسبوعي" },
    { value: "monthly", label: "شهري" },
  ];

  const daysOfWeek = [
    { value: 0, label: "الإثنين" },
    { value: 1, label: "الثلاثاء" },
    { value: 2, label: "الأربعاء" },
    { value: 3, label: "الخميس" },
    { value: 4, label: "الجمعة" },
    { value: 5, label: "السبت" },
    { value: 6, label: "الأحد" },
  ];

  return (
    <div className="space-y-6 p-6" data-testid="notification-settings-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">إعدادات الإشعارات والتقارير</h1>
        <p className="text-gray-600">إدارة SMS وجدولة التقارير التلقائية</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sms" data-testid="sms-tab">
            <MessageSquare className="w-4 h-4 me-2" />
            إعدادات SMS
          </TabsTrigger>
          <TabsTrigger value="schedules" data-testid="schedules-tab">
            <Calendar className="w-4 h-4 me-2" />
            جدولة التقارير
          </TabsTrigger>
          <TabsTrigger value="logs" data-testid="logs-tab">
            <Clock className="w-4 h-4 me-2" />
            سجل الإرسال
          </TabsTrigger>
        </TabsList>

        {/* SMS Settings Tab */}
        <TabsContent value="sms">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SMS Provider Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  إعدادات Tamimah SMS
                </CardTitle>
                <CardDescription>
                  أدخل بيانات حسابك من tamimahsms.com
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>رابط API</Label>
                  <Input
                    value={smsSettings.api_url}
                    onChange={(e) => setSmsSettings({ ...smsSettings, api_url: e.target.value })}
                    placeholder="https://api.tamimahsms.com/send"
                    dir="ltr"
                  />
                  <p className="text-xs text-gray-500">احصل على الرابط من دعم Tamimah</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>اسم المستخدم</Label>
                    <Input
                      value={smsSettings.username}
                      onChange={(e) => setSmsSettings({ ...smsSettings, username: e.target.value })}
                      placeholder="username"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>كلمة المرور</Label>
                    <Input
                      type="password"
                      value={smsSettings.password}
                      onChange={(e) => setSmsSettings({ ...smsSettings, password: e.target.value })}
                      placeholder="********"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>معرف المرسل (Sender ID)</Label>
                  <Input
                    value={smsSettings.sender_id}
                    onChange={(e) => setSmsSettings({ ...smsSettings, sender_id: e.target.value })}
                    placeholder="MAROOJ"
                    dir="ltr"
                  />
                </div>
                
                <Button onClick={saveSmsSettings} disabled={loading} className="w-full">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : <CheckCircle className="w-4 h-4 me-2" />}
                  حفظ الإعدادات
                </Button>
                
                <div className="flex items-center gap-2 mt-4">
                  <Badge className={smsSettings.is_configured ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                    {smsSettings.is_configured ? "✅ مكوّن" : "❌ غير مكوّن"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Test SMS */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  إرسال رسالة اختبار
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="96899123456"
                    dir="ltr"
                  />
                  <p className="text-xs text-gray-500">أدخل الرقم بصيغة 968XXXXXXXX</p>
                </div>
                
                <div className="space-y-2">
                  <Label>نص الرسالة</Label>
                  <Textarea
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <Button onClick={sendTestSms} disabled={loading || !smsSettings.is_configured} className="w-full">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : <Phone className="w-4 h-4 me-2" />}
                  إرسال رسالة اختبار
                </Button>
                
                {!smsSettings.is_configured && (
                  <p className="text-sm text-orange-600 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    يرجى إكمال إعدادات SMS أولاً
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Schedules Tab */}
        <TabsContent value="schedules">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>جدولة التقارير التلقائية</CardTitle>
                  <CardDescription>إرسال تقارير دورية تلقائياً بالبريد الإلكتروني</CardDescription>
                </div>
                <Button onClick={() => setScheduleDialogOpen(true)}>
                  <Plus className="w-4 h-4 me-2" />
                  إضافة جدول
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {schedules.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>لا توجد تقارير مجدولة</p>
                  <p className="text-sm">أضف جدول جديد لإرسال التقارير تلقائياً</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>نوع التقرير</TableHead>
                      <TableHead>التكرار</TableHead>
                      <TableHead>الوقت</TableHead>
                      <TableHead>المستلمين</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>آخر إرسال</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">{schedule.name}</TableCell>
                        <TableCell>
                          {reportTypes.find(t => t.value === schedule.report_type)?.label || schedule.report_type}
                        </TableCell>
                        <TableCell>
                          {frequencies.find(f => f.value === schedule.frequency)?.label || schedule.frequency}
                        </TableCell>
                        <TableCell>{schedule.time}</TableCell>
                        <TableCell>
                          <span className="text-sm">{schedule.recipients?.length || 0} مستلم</span>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={schedule.is_active}
                            onCheckedChange={() => toggleSchedule(schedule)}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {schedule.last_sent ? new Date(schedule.last_sent).toLocaleString("ar-OM") : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => runSchedule(schedule.id)}
                              disabled={loading}
                              title="تشغيل الآن"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500"
                              onClick={() => deleteSchedule(schedule.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SMS Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  سجل الرسائل النصية
                </CardTitle>
              </CardHeader>
              <CardContent>
                {smsLogs.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">لا توجد رسائل مرسلة</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-auto">
                    {smsLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium" dir="ltr">{log.phone}</p>
                            <p className="text-sm text-gray-600 mt-1">{log.message?.substring(0, 50)}...</p>
                          </div>
                          <Badge className={log.status === "sent" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                            {log.status === "sent" ? "✅ مرسل" : "❌ فشل"}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(log.sent_at).toLocaleString("ar-OM")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Report Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  سجل التقارير المرسلة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportLogs.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">لا توجد تقارير مرسلة</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-auto">
                    {reportLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              {reportTypes.find(t => t.value === log.report_type)?.label || log.report_type}
                            </p>
                            <p className="text-sm text-gray-600">
                              {log.recipients?.length || 0} مستلم
                            </p>
                          </div>
                          <Badge className={log.status === "sent" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                            {log.status === "sent" ? "✅ مرسل" : "❌ فشل"}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(log.sent_at).toLocaleString("ar-OM")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة جدول تقرير</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>اسم الجدول</Label>
              <Input
                value={scheduleForm.name}
                onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                placeholder="مثال: التقرير اليومي الصباحي"
              />
            </div>
            
            <div className="space-y-2">
              <Label>نوع التقرير</Label>
              <Select
                value={scheduleForm.report_type}
                onValueChange={(v) => setScheduleForm({ ...scheduleForm, report_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>التكرار</Label>
                <Select
                  value={scheduleForm.frequency}
                  onValueChange={(v) => setScheduleForm({ ...scheduleForm, frequency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencies.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>الوقت</Label>
                <Input
                  type="time"
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                />
              </div>
            </div>
            
            {scheduleForm.frequency === "weekly" && (
              <div className="space-y-2">
                <Label>يوم الأسبوع</Label>
                <Select
                  value={String(scheduleForm.day_of_week)}
                  onValueChange={(v) => setScheduleForm({ ...scheduleForm, day_of_week: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {scheduleForm.frequency === "monthly" && (
              <div className="space-y-2">
                <Label>يوم الشهر</Label>
                <Input
                  type="number"
                  min="1"
                  max="28"
                  value={scheduleForm.day_of_month}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_month: parseInt(e.target.value) || 1 })}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label>البريد الإلكتروني للمستلمين</Label>
              <Textarea
                value={scheduleForm.recipients}
                onChange={(e) => setScheduleForm({ ...scheduleForm, recipients: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
                rows={2}
              />
              <p className="text-xs text-gray-500">افصل بين العناوين بفاصلة</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>إلغاء</Button>
            <Button onClick={createSchedule} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin me-2" /> : <Plus className="w-4 h-4 me-2" />}
              إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationSettings;
