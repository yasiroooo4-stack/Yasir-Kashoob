import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../App";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import ExpandableText from "../components/ui/ExpandableText";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import { 
  ClipboardList, Plus, Search, Calendar, User, Clock, 
  CheckCircle2, AlertCircle, MessageSquare, Paperclip,
  Send, Filter, ChevronRight, Bell, FileText, Download,
  BarChart3, Wrench, Package, Trash2, FileSpreadsheet
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;


// ترجمة
const translations = {
  ar: {
    tasks: "المهام",
    myTasks: "مهامي",
    assignedByMe: "المهام التي أنشأتها",
    allTasks: "جميع المهام",
    newTask: "مهمة جديدة",
    taskDetails: "تفاصيل المهمة",
    title: "العنوان",
    description: "الوصف",
    assignTo: "تكليف موظف",
    dueDate: "تاريخ الإنجاز",
    priority: "الأولوية",
    low: "منخفضة",
    medium: "متوسطة",
    high: "عالية",
    urgent: "عاجلة",
    status: "الحالة",
    pending: "معلقة",
    in_progress: "قيد التنفيذ",
    completed: "مكتملة",
    delayed: "متأخرة",
    cancelled: "ملغاة",
    create: "إنشاء",
    save: "حفظ",
    cancel: "إلغاء",
    responses: "الردود",
    addResponse: "إضافة رد",
    completeTask: "إنجاز المهمة",
    completionNotes: "ملاحظات الإنجاز",
    attachment: "مرفق",
    noTasks: "لا توجد مهام",
    search: "بحث...",
    filterByStatus: "فلترة حسب الحالة",
    all: "الكل",
    onTime: "في الوقت",
    delayedBy: "متأخرة بـ",
    days: "يوم",
    createdBy: "بواسطة",
    assignedTo: "مكلف بها",
    taskNumber: "رقم المهمة",
    notifications: "الإشعارات",
    markAsRead: "تحديد كمقروء",
    startTask: "بدء العمل",
    taskCreated: "تم إنشاء المهمة بنجاح",
    taskCompleted: "تم إنجاز المهمة بنجاح",
    reports: "التقارير",
    totalTasks: "إجمالي المهام",
    completionRate: "نسبة الإنجاز في الوقت",
    topPerformers: "أفضل الموظفين إنجازاً",
    taskType: "نوع المهمة",
    general: "مهمة عامة",
    routine_maintenance: "صيانة روتينية",
    equipment_inspection: "فحص المعدات",
    cleaning: "تنظيف",
    report: "تقرير",
    inventory: "جرد المخزون",
    delivery: "توصيل",
    meeting: "اجتماع",
    export: "تصدير",
    filterByType: "فلترة حسب النوع",
    filterByPriority: "فلترة حسب الأولوية",
    startDate: "من تاريخ",
    endDate: "إلى تاريخ",
    requiredDocument: "المستند المطلوب",
    uploadDocument: "رفع مستند الإنجاز",
    documentRequired: "مستند مطلوب لإتمام المهمة",
    noDocumentUploaded: "لم يتم رفع مستند",
    documentUploaded: "تم رفع المستند",
    documentUploadError: "خطأ في رفع المستند",
    cannotCompleteWithoutDocument: "لا يمكن إتمام المهمة بدون رفع المستند المطلوب",
  },
  en: {
    tasks: "Tasks",
    myTasks: "My Tasks",
    assignedByMe: "Assigned by Me",
    allTasks: "All Tasks",
    newTask: "New Task",
    taskDetails: "Task Details",
    title: "Title",
    description: "Description",
    assignTo: "Assign To",
    dueDate: "Due Date",
    priority: "Priority",
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
    status: "Status",
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    delayed: "Delayed",
    cancelled: "Cancelled",
    create: "Create",
    save: "Save",
    cancel: "Cancel",
    responses: "Responses",
    addResponse: "Add Response",
    completeTask: "Complete Task",
    completionNotes: "Completion Notes",
    attachment: "Attachment",
    noTasks: "No tasks",
    search: "Search...",
    filterByStatus: "Filter by Status",
    all: "All",
    onTime: "On Time",
    delayedBy: "Delayed by",
    days: "days",
    createdBy: "Created by",
    assignedTo: "Assigned to",
    taskNumber: "Task #",
    notifications: "Notifications",
    markAsRead: "Mark as Read",
    startTask: "Start Task",
    taskCreated: "Task created successfully",
    taskCompleted: "Task completed successfully",
    reports: "Reports",
    totalTasks: "Total Tasks",
    completionRate: "On-time Completion Rate",
    topPerformers: "Top Performers",
    taskType: "Task Type",
    general: "General Task",
    routine_maintenance: "Routine Maintenance",
    equipment_inspection: "Equipment Inspection",
    cleaning: "Cleaning",
    report: "Report",
    inventory: "Inventory Check",
    delivery: "Delivery",
    meeting: "Meeting",
    export: "Export",
    filterByType: "Filter by Type",
    filterByPriority: "Filter by Priority",
    startDate: "From Date",
    endDate: "To Date",
    requiredDocument: "Required Document",
    uploadDocument: "Upload Document",
    documentRequired: "Document required for completion",
    noDocumentUploaded: "No document uploaded",
    documentUploaded: "Document uploaded",
    documentUploadError: "Error uploading document",
    cannotCompleteWithoutDocument: "Cannot complete task without uploading required document",
  }
};

export default function TasksManagement() {
  const { user } = useAuth();
  const [language] = useState("ar");
  const t = (ar, en) => language === "ar" ? ar : en;
  const tr = translations[language];

  const [activeTab, setActiveTab] = useState("my-tasks");
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [reports, setReports] = useState({ byType: [], byEmployee: [] });

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    task_type: "general",
    assigned_to_id: "",
    assigned_to_name: "",
    due_date: "",
    priority: "medium",
    category: "",
    department: user?.department || "",
    center_id: "",
    center_name: "",
    requires_document: false
  });

  const [responseMessage, setResponseMessage] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionDocument, setCompletionDocument] = useState(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);

  const getAuthHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  }), []);

  // Fetch tasks based on active tab
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = "/api/tasks";
      if (activeTab === "my-tasks") {
        endpoint = "/api/tasks/my-tasks";
      } else if (activeTab === "assigned-by-me") {
        endpoint = "/api/tasks/assigned-by-me";
      }

      if (statusFilter && statusFilter !== "all") {
        endpoint += `?status=${statusFilter}`;
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, getAuthHeaders]);

  // Fetch task types
  const fetchTaskTypes = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/task-types`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setTaskTypes(data);
      }
    } catch (error) {
      console.error("Error fetching task types:", error);
    }
  }, [getAuthHeaders]);

  // Fetch reports
  const fetchReports = useCallback(async () => {
    try {
      const [byTypeRes, byEmployeeRes] = await Promise.all([
        fetch(`${API_URL}/api/tasks/reports/by-type`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/api/tasks/reports/by-employee`, { headers: getAuthHeaders() })
      ]);
      
      if (byTypeRes.ok && byEmployeeRes.ok) {
        setReports({
          byType: await byTypeRes.json(),
          byEmployee: await byEmployeeRes.json()
        });
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  }, [getAuthHeaders]);

  // Fetch employees for assignment
  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/hr/employees`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || data || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  }, [getAuthHeaders]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/stats`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, [getAuthHeaders]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/notifications?unread_only=true`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
    fetchStats();
    fetchNotifications();
    fetchTaskTypes();
  }, [fetchTasks, fetchEmployees, fetchStats, fetchNotifications, fetchTaskTypes]);

  // Export tasks
  const handleExport = async (format = "json") => {
    try {
      let url = `${API_URL}/api/tasks/export?format=${format}`;
      if (statusFilter !== "all") url += `&status=${statusFilter}`;
      if (typeFilter !== "all") url += `&task_type=${typeFilter}`;
      
      const response = await fetch(url, { headers: getAuthHeaders() });
      
      if (format === "csv") {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `tasks_export_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `tasks_export_${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      console.error("Error exporting tasks:", error);
    }
  };

  // Create task
  const handleCreateTask = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tasks`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...formData,
          assigned_by_id: user.id,
          assigned_by_name: user.full_name,
          requires_document: formData.requires_document || false
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({
          title: "",
          description: "",
          assigned_to_id: "",
          assigned_to_name: "",
          due_date: "",
          priority: "medium",
          category: "",
          department: user?.department || "",
          center_id: "",
          center_name: "",
          requires_document: false
        });
        fetchTasks();
        fetchStats();
      }
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  // Update task status
  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchTasks();
        fetchStats();
        if (selectedTask) {
          const updated = await response.json();
          setSelectedTask(updated);
        }
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  // Complete task
  const handleCompleteTask = async () => {
    try {
      // التحقق من أن المستند مرفوع إذا كان مطلوباً
      if (selectedTask?.requires_document && !completionDocument) {
        alert(tr.cannotCompleteWithoutDocument);
        return;
      }

      // إذا كان هناك مستند، نرفعه أولاً
      let documentUrl = null;
      if (completionDocument) {
        setUploadingDocument(true);
        const formData = new FormData();
        formData.append("file", completionDocument);
        formData.append("task_id", selectedTask.id);
        
        const uploadResponse = await fetch(`${API_URL}/api/tasks/${selectedTask.id}/upload-document`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        });
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          documentUrl = uploadResult.document_url;
        } else {
          alert(tr.documentUploadError);
          setUploadingDocument(false);
          return;
        }
        setUploadingDocument(false);
      }

      const response = await fetch(`${API_URL}/api/tasks/${selectedTask.id}/complete`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          completion_notes: completionNotes,
          completion_document_url: documentUrl
        }),
      });

      if (response.ok) {
        setShowCompleteModal(false);
        setShowDetailsModal(false);
        setCompletionNotes("");
        setCompletionDocument(null);
        fetchTasks();
        fetchStats();
      }
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  // Add response
  const handleAddResponse = async () => {
    if (!responseMessage.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/tasks/${selectedTask.id}/respond?message=${encodeURIComponent(responseMessage)}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setResponseMessage("");
        // Refresh task details
        const taskResponse = await fetch(`${API_URL}/api/tasks/${selectedTask.id}`, {
          headers: getAuthHeaders(),
        });
        if (taskResponse.ok) {
          setSelectedTask(await taskResponse.json());
        }
      }
    } catch (error) {
      console.error("Error adding response:", error);
    }
  };

  // View task details
  const viewTaskDetails = async (task) => {
    try {
      const response = await fetch(`${API_URL}/api/tasks/${task.id}`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        setSelectedTask(await response.json());
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error("Error fetching task details:", error);
    }
  };

  // Mark notification as read
  const markNotificationRead = async (notificationId) => {
    try {
      await fetch(`${API_URL}/api/tasks/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification:", error);
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "delayed": return "bg-red-100 text-red-800";
      case "cancelled": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    let matches = true;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matches = task.title?.toLowerCase().includes(query) ||
               task.description?.toLowerCase().includes(query) ||
               task.assigned_to_name?.toLowerCase().includes(query);
    }
    
    if (typeFilter !== "all" && task.task_type !== typeFilter) {
      matches = false;
    }
    
    if (priorityFilter !== "all" && task.priority !== priorityFilter) {
      matches = false;
    }
    
    // Date range filter
    if (dateRange.start && task.due_date < dateRange.start) {
      matches = false;
    }
    if (dateRange.end && task.due_date > dateRange.end) {
      matches = false;
    }
    
    return matches;
  });

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">{tr.tasks}</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Reports Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchReports(); setShowReportsModal(true); }}
            data-testid="reports-btn"
          >
            <BarChart3 className="h-4 w-4 ml-1" />
            {tr.reports}
          </Button>
          
          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            data-testid="export-btn"
          >
            <Download className="h-4 w-4 ml-1" />
            {tr.export}
          </Button>
          
          {/* Notifications Button */}
          <Button
            variant="outline"
            size="icon"
            className="relative"
            onClick={() => setShowNotificationsModal(true)}
            data-testid="notifications-btn"
          >
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </Button>
          
          {/* Create Task Button */}
          {/* زر مهمة جديدة - يظهر فقط لمن لديه صلاحية */}
          {(user?.permissions?.includes('tasks_new') || 
            user?.permissions?.includes('tasks_create') || 
            user?.permissions?.includes('tasks_assign') || 
            user?.permissions?.includes('tasks_manage') || 
            user?.role === 'admin') && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
              data-testid="create-task-btn"
            >
              <Plus className="h-4 w-4" />
              {tr.newTask}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{tr.myTasks}</p>
                  <p className="text-2xl font-bold">{stats.my_tasks?.total || 0}</p>
                </div>
                <ClipboardList className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{tr.pending}</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.my_tasks?.pending || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{tr.completed}</p>
                  <p className="text-2xl font-bold text-green-600">{stats.my_tasks?.completed || 0}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{tr.delayed}</p>
                  <p className="text-2xl font-bold text-red-600">{stats.my_tasks?.delayed || 0}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Card>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b px-4">
              <TabsList className="h-12">
                <TabsTrigger value="my-tasks" className="data-[state=active]:bg-primary/10">
                  {tr.myTasks}
                </TabsTrigger>
                <TabsTrigger value="assigned-by-me" className="data-[state=active]:bg-primary/10">
                  {tr.assignedByMe}
                </TabsTrigger>
                <TabsTrigger value="all" className="data-[state=active]:bg-primary/10">
                  {tr.allTasks}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Filters */}
            <div className="p-4 border-b flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={tr.search}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={tr.filterByStatus} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr.all}</SelectItem>
                  <SelectItem value="pending">{tr.pending}</SelectItem>
                  <SelectItem value="in_progress">{tr.in_progress}</SelectItem>
                  <SelectItem value="completed">{tr.completed}</SelectItem>
                  <SelectItem value="delayed">{tr.delayed}</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={tr.filterByType} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr.all}</SelectItem>
                  {taskTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {language === "ar" ? type.name_ar : type.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={tr.filterByPriority} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr.all}</SelectItem>
                  <SelectItem value="low">{tr.low}</SelectItem>
                  <SelectItem value="medium">{tr.medium}</SelectItem>
                  <SelectItem value="high">{tr.high}</SelectItem>
                  <SelectItem value="urgent">{tr.urgent}</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Date Filters */}
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-[140px]"
                  placeholder={tr.startDate}
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-[140px]"
                  placeholder={tr.endDate}
                />
              </div>
            </div>

            {/* Tasks List */}
            <TabsContent value={activeTab} className="m-0">
              <ScrollArea className="h-[500px]">
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mb-2 opacity-50" />
                    <p>{tr.noTasks}</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => viewTaskDetails(task)}
                        data-testid={`task-item-${task.id}`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Priority Indicator */}
                          <div className={`w-1 h-16 rounded-full ${getPriorityColor(task.priority)}`} />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{task.title}</h3>
                              <Badge className={getStatusColor(task.status)}>
                                {tr[task.status] || task.status}
                              </Badge>
                              {task.is_delayed && (
                                <Badge variant="destructive">
                                  {tr.delayedBy} {task.delay_days} {tr.days}
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              <ExpandableText text={task.description} maxLength={80} />
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {activeTab === "my-tasks" ? task.assigned_by_name : task.assigned_to_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {task.due_date}
                              </span>
                              {task.task_number && (
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  {task.task_number}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Task Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{tr.newTask}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>{tr.title}</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t("أدخل عنوان المهمة", "Enter task title")}
              />
            </div>
            
            <div>
              <Label>{tr.description}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t("أدخل وصف المهمة", "Enter task description")}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{tr.taskType}</Label>
                <Select
                  value={formData.task_type}
                  onValueChange={(value) => setFormData({ ...formData, task_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taskTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {language === "ar" ? type.name_ar : type.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>{tr.assignTo}</Label>
                <Select
                  value={formData.assigned_to_id}
                  onValueChange={(value) => {
                    const emp = employees.find(e => e.id === value);
                    setFormData({
                      ...formData,
                      assigned_to_id: value,
                      assigned_to_name: emp?.name || ""
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("اختر الموظف", "Select employee")} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} - {emp.employee_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{tr.dueDate}</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              
              <div>
                <Label>{tr.priority}</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{tr.low}</SelectItem>
                    <SelectItem value="medium">{tr.medium}</SelectItem>
                    <SelectItem value="high">{tr.high}</SelectItem>
                    <SelectItem value="urgent">{tr.urgent}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* حقل مستند مطلوب للإنجاز */}
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <input
                type="checkbox"
                id="requires_document"
                checked={formData.requires_document}
                onChange={(e) => setFormData({ ...formData, requires_document: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <div className="flex-1">
                <Label htmlFor="requires_document" className="cursor-pointer font-medium">
                  {t("مستند مطلوب لإتمام المهمة", "Document required for completion")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("عند التفعيل، لن يتمكن الموظف من إنجاز المهمة بدون رفع مستند الإنجاز", 
                     "When enabled, employee cannot complete task without uploading completion document")}
                </p>
              </div>
              <Paperclip className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              {tr.cancel}
            </Button>
            <Button onClick={handleCreateTask} disabled={!formData.title || !formData.assigned_to_id || !formData.due_date}>
              {tr.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          {selectedTask && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>{selectedTask.title}</DialogTitle>
                  <Badge className={getStatusColor(selectedTask.status)}>
                    {tr[selectedTask.status] || selectedTask.status}
                  </Badge>
                </div>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Task Info */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    <span className="text-muted-foreground">{tr.taskNumber}:</span>
                    <span className="font-medium">{selectedTask.task_number}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    <span className="text-muted-foreground">{tr.assignedTo}:</span>
                    <span className="font-medium">{selectedTask.assigned_to_name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    <span className="text-muted-foreground">{tr.createdBy}:</span>
                    <span className="font-medium">{selectedTask.assigned_by_name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    <span className="text-muted-foreground">{tr.dueDate}:</span>
                    <span className="font-medium">{selectedTask.due_date}</span>
                    {selectedTask.is_delayed && (
                      <Badge variant="destructive" className="mr-2">
                        {tr.delayedBy} {selectedTask.delay_days} {tr.days}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    <span className="text-muted-foreground">{tr.priority}:</span>
                    <Badge className={getPriorityColor(selectedTask.priority)}>
                      {tr[selectedTask.priority]}
                    </Badge>
                  </div>
                </div>
                
                {/* Description */}
                <div>
                  <h4 className="font-medium mb-2">{tr.description}</h4>
                  <p className="text-sm bg-muted/30 p-3 rounded-lg whitespace-pre-wrap">
                    {selectedTask.description}
                  </p>
                </div>
                
                {/* Completion Notes */}
                {selectedTask.completion_notes && (
                  <div>
                    <h4 className="font-medium mb-2">{tr.completionNotes}</h4>
                    <p className="text-sm bg-green-50 p-3 rounded-lg whitespace-pre-wrap">
                      {selectedTask.completion_notes}
                    </p>
                  </div>
                )}
                
                {/* Attachment */}
                {selectedTask.attachment_url && (
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    <a href={selectedTask.attachment_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      {selectedTask.attachment_name || tr.attachment}
                    </a>
                  </div>
                )}
                
                {/* Responses */}
                {selectedTask.responses && selectedTask.responses.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">{tr.responses}</h4>
                    <div className="space-y-2">
                      {selectedTask.responses.map((response) => (
                        <div key={response.id} className="bg-muted/30 p-3 rounded-lg">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <User className="h-3 w-3" />
                            <span>{response.responder_name}</span>
                            <span>•</span>
                            <span>{new Date(response.created_at).toLocaleDateString("ar")}</span>
                          </div>
                          <p className="text-sm">{response.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Add Response */}
                {selectedTask.status !== "completed" && selectedTask.status !== "cancelled" && (
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("أضف رداً...", "Add a response...")}
                      value={responseMessage}
                      onChange={(e) => setResponseMessage(e.target.value)}
                    />
                    <Button size="icon" onClick={handleAddResponse} disabled={!responseMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                {/* Action Buttons */}
                {selectedTask.status !== "completed" && selectedTask.status !== "cancelled" && (
                  <div className="flex gap-2 pt-4 border-t">
                    {selectedTask.status === "pending" && (
                      <Button
                        variant="outline"
                        onClick={() => handleUpdateStatus(selectedTask.id, "in_progress")}
                      >
                        {tr.startTask}
                      </Button>
                    )}
                    
                    {(selectedTask.assigned_to_id === user?.employee_id || selectedTask.assigned_to_id === user?.id) && (
                      <Button
                        onClick={() => setShowCompleteModal(true)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4 ml-2" />
                        {tr.completeTask}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Task Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{tr.completeTask}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* تحذير إذا كان المستند مطلوب */}
            {selectedTask?.requires_document && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-300 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">{tr.documentRequired}</p>
                  <p className="text-sm text-amber-700">
                    {t("يجب رفع مستند إنجاز المهمة قبل الإتمام", "You must upload completion document before completing")}
                  </p>
                </div>
              </div>
            )}
            
            <div>
              <Label>{tr.completionNotes}</Label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder={t("أضف ملاحظات الإنجاز (اختياري)", "Add completion notes (optional)")}
                rows={4}
              />
            </div>
            
            {/* حقل رفع مستند الإنجاز */}
            <div className={`p-4 rounded-lg border-2 border-dashed ${
              selectedTask?.requires_document && !completionDocument 
                ? 'border-red-300 bg-red-50' 
                : completionDocument 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-300 bg-gray-50'
            }`}>
              <div className="text-center">
                {completionDocument ? (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                    <div className="text-right">
                      <p className="font-medium text-green-700">{tr.documentUploaded}</p>
                      <p className="text-sm text-green-600">{completionDocument.name}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setCompletionDocument(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Paperclip className={`w-10 h-10 mx-auto mb-2 ${
                      selectedTask?.requires_document ? 'text-red-400' : 'text-gray-400'
                    }`} />
                    <Label 
                      htmlFor="completion-document" 
                      className={`cursor-pointer font-medium ${
                        selectedTask?.requires_document ? 'text-red-600' : 'text-gray-600'
                      }`}
                    >
                      {tr.uploadDocument}
                      {selectedTask?.requires_document && <span className="text-red-500"> *</span>}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("اضغط لاختيار ملف (PDF, صورة، Word)", "Click to select file (PDF, Image, Word)")}
                    </p>
                    <input
                      id="completion-document"
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setCompletionDocument(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setShowCompleteModal(false);
              setCompletionDocument(null);
              setCompletionNotes("");
            }}>
              {tr.cancel}
            </Button>
            <Button 
              onClick={handleCompleteTask} 
              className="bg-green-600 hover:bg-green-700"
              disabled={selectedTask?.requires_document && !completionDocument}
            >
              <CheckCircle2 className="h-4 w-4 ml-2" />
              {tr.completeTask}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notifications Modal */}
      <Dialog open={showNotificationsModal} onOpenChange={setShowNotificationsModal}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {tr.notifications}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[400px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Bell className="h-12 w-12 mb-2 opacity-50" />
                <p>{t("لا توجد إشعارات جديدة", "No new notifications")}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => markNotificationRead(notification.id)}
                  >
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    <p className="text-xs text-muted-foreground">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.created_at).toLocaleDateString("ar")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Reports Modal */}
      <Dialog open={showReportsModal} onOpenChange={setShowReportsModal}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {tr.reports}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="by-type">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="by-type">{t("حسب النوع", "By Type")}</TabsTrigger>
              <TabsTrigger value="by-employee">{t("حسب الموظف", "By Employee")}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="by-type" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {reports.byType.map((item) => {
                    const typeInfo = taskTypes.find(t => t.id === item.task_type);
                    return (
                      <div key={item.task_type} className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">
                            {typeInfo ? (language === "ar" ? typeInfo.name_ar : typeInfo.name_en) : item.task_type}
                          </h4>
                          <Badge>{item.total} {t("مهمة", "tasks")}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>{t("مكتملة:", "Completed:")} {item.completed}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-500" />
                            <span>{t("معلقة:", "Pending:")} {item.pending}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span>{t("متأخرة:", "Delayed:")} {item.delayed}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {reports.byType.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      {t("لا توجد بيانات", "No data")}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="by-employee" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {reports.byEmployee.map((item) => (
                    <div key={item.employee_id} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {item.employee_name}
                        </h4>
                        <Badge variant="outline">{item.completion_rate}% {t("في الوقت", "on time")}</Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">{t("الإجمالي", "Total")}</span>
                          <p className="font-medium">{item.total}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t("مكتملة", "Completed")}</span>
                          <p className="font-medium text-green-600">{item.completed}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t("في الوقت", "On Time")}</span>
                          <p className="font-medium text-blue-600">{item.on_time}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t("متأخرة", "Delayed")}</span>
                          <p className="font-medium text-red-600">{item.delayed}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {reports.byEmployee.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      {t("لا توجد بيانات", "No data")}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
