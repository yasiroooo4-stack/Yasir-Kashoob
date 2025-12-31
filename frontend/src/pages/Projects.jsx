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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { FolderKanban, ListTodo, Users, Flag, Plus, Pencil, CheckCircle, Clock } from "lucide-react";

const Projects = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("projects");
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dashboard, setDashboard] = useState({});
  const [selectedProject, setSelectedProject] = useState(null);
  
  // Dialog states
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Form states
  const [projectForm, setProjectForm] = useState({
    name: "", description: "", project_type: "", client_name: "",
    start_date: "", end_date: "", budget: 0, priority: "medium",
    manager_name: "", department: "", objectives: ""
  });
  const [taskForm, setTaskForm] = useState({
    project_id: "", project_name: "", task_name: "", description: "",
    assigned_to_name: "", start_date: "", due_date: "", priority: "medium", estimated_hours: 0
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [projectsRes, dashboardRes] = await Promise.all([
        axios.get(`${API}/projects`),
        axios.get(`${API}/projects/dashboard/stats`)
      ]);
      setProjects(projectsRes.data);
      setDashboard(dashboardRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectTasks = async (projectId) => {
    try {
      const response = await axios.get(`${API}/projects/${projectId}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        await axios.put(`${API}/projects/${selectedItem.id}`, projectForm);
      } else {
        await axios.post(`${API}/projects`, projectForm);
      }
      toast.success(language === "ar" ? "تم الحفظ بنجاح" : "Saved successfully");
      setProjectDialogOpen(false);
      resetProjectForm();
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  const resetProjectForm = () => {
    setProjectForm({
      name: "", description: "", project_type: "", client_name: "",
      start_date: "", end_date: "", budget: 0, priority: "medium",
      manager_name: "", department: "", objectives: ""
    });
    setSelectedItem(null);
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedItem) {
        await axios.put(`${API}/projects/tasks/${selectedItem.id}`, taskForm);
      } else {
        await axios.post(`${API}/projects/tasks`, taskForm);
      }
      toast.success(language === "ar" ? "تم الحفظ بنجاح" : "Saved successfully");
      setTaskDialogOpen(false);
      if (selectedProject) fetchProjectTasks(selectedProject.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  const completeTask = async (taskId) => {
    try {
      await axios.put(`${API}/projects/tasks/${taskId}/complete`);
      toast.success(language === "ar" ? "تم إكمال المهمة" : "Task completed");
      if (selectedProject) fetchProjectTasks(selectedProject.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error");
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      planning: "bg-gray-100 text-gray-800",
      in_progress: "bg-blue-100 text-blue-800",
      on_hold: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      low: "bg-gray-100 text-gray-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800"
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
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
          {language === "ar" ? "إدارة المشاريع" : "Project Management"}
        </h1>
        <p className="text-muted-foreground">
          {language === "ar" ? "متابعة المشاريع والمهام وفرق العمل" : "Track projects, tasks and teams"}
        </p>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <FolderKanban className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.total_projects || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "إجمالي المشاريع" : "Total Projects"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.active_projects || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "مشاريع نشطة" : "Active Projects"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.completed_projects || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "مشاريع مكتملة" : "Completed"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-100">
                <ListTodo className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.overdue_tasks || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "مهام متأخرة" : "Overdue Tasks"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">
              {language === "ar" ? "إجمالي الميزانية" : "Total Budget"}
            </p>
            <p className="text-2xl font-bold text-green-600">
              {(dashboard.total_budget || 0).toFixed(3)} {language === "ar" ? "ر.ع" : "OMR"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">
              {language === "ar" ? "التكلفة الفعلية" : "Actual Cost"}
            </p>
            <p className="text-2xl font-bold text-blue-600">
              {(dashboard.total_actual_cost || 0).toFixed(3)} {language === "ar" ? "ر.ع" : "OMR"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="projects" className="gap-2">
            <FolderKanban className="w-4 h-4" />
            {language === "ar" ? "المشاريع" : "Projects"}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <ListTodo className="w-4 h-4" />
            {language === "ar" ? "المهام" : "Tasks"}
          </TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{language === "ar" ? "المشاريع" : "Projects"}</CardTitle>
                <CardDescription>
                  {language === "ar" ? "قائمة جميع المشاريع" : "List of all projects"}
                </CardDescription>
              </div>
              <Button onClick={() => { resetProjectForm(); setProjectDialogOpen(true); }} className="gradient-primary text-white">
                <Plus className="w-4 h-4 me-2" />
                {language === "ar" ? "مشروع جديد" : "New Project"}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === "ar" ? "الكود" : "Code"}</TableHead>
                    <TableHead>{language === "ar" ? "اسم المشروع" : "Project Name"}</TableHead>
                    <TableHead>{language === "ar" ? "النوع" : "Type"}</TableHead>
                    <TableHead>{language === "ar" ? "المدير" : "Manager"}</TableHead>
                    <TableHead>{language === "ar" ? "الميزانية" : "Budget"}</TableHead>
                    <TableHead>{language === "ar" ? "التقدم" : "Progress"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {language === "ar" ? "لا توجد مشاريع" : "No projects"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    projects.map((project) => (
                      <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                        setSelectedProject(project);
                        fetchProjectTasks(project.id);
                        setActiveTab("tasks");
                      }}>
                        <TableCell className="font-mono">{project.project_code}</TableCell>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell>{project.project_type}</TableCell>
                        <TableCell>{project.manager_name || "-"}</TableCell>
                        <TableCell>{project.budget?.toFixed(3)} {language === "ar" ? "ر.ع" : "OMR"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={project.progress_percentage || 0} className="w-16 h-2" />
                            <span className="text-sm">{project.progress_percentage || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(project.status)}>{project.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(project);
                            setProjectForm(project);
                            setProjectDialogOpen(true);
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

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>
                  {selectedProject ? (
                    <span>{language === "ar" ? "مهام: " : "Tasks: "}{selectedProject.name}</span>
                  ) : (
                    <span>{language === "ar" ? "المهام" : "Tasks"}</span>
                  )}
                </CardTitle>
                <CardDescription>
                  {selectedProject ? (
                    <span>{language === "ar" ? "إدارة مهام المشروع" : "Manage project tasks"}</span>
                  ) : (
                    <span>{language === "ar" ? "اختر مشروع لعرض مهامه" : "Select a project to view tasks"}</span>
                  )}
                </CardDescription>
              </div>
              {selectedProject && (
                <Button onClick={() => {
                  setTaskForm({
                    ...taskForm,
                    project_id: selectedProject.id,
                    project_name: selectedProject.name
                  });
                  setTaskDialogOpen(true);
                }} className="gradient-primary text-white">
                  <Plus className="w-4 h-4 me-2" />
                  {language === "ar" ? "مهمة جديدة" : "New Task"}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!selectedProject ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ListTodo className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{language === "ar" ? "اختر مشروع من القائمة لعرض مهامه" : "Select a project to view its tasks"}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === "ar" ? "المهمة" : "Task"}</TableHead>
                      <TableHead>{language === "ar" ? "المسؤول" : "Assigned To"}</TableHead>
                      <TableHead>{language === "ar" ? "تاريخ الاستحقاق" : "Due Date"}</TableHead>
                      <TableHead>{language === "ar" ? "الأولوية" : "Priority"}</TableHead>
                      <TableHead>{language === "ar" ? "التقدم" : "Progress"}</TableHead>
                      <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                      <TableHead>{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {language === "ar" ? "لا توجد مهام" : "No tasks"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.task_name}</TableCell>
                          <TableCell>{task.assigned_to_name || "-"}</TableCell>
                          <TableCell>{task.due_date?.split('T')[0]}</TableCell>
                          <TableCell>
                            <Badge className={getPriorityBadge(task.priority)}>{task.priority}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={task.progress_percentage || 0} className="w-16 h-2" />
                              <span className="text-sm">{task.progress_percentage || 0}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(task.status)}>{task.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {task.status !== "completed" && (
                                <Button variant="ghost" size="icon" onClick={() => completeTask(task.id)} title={language === "ar" ? "إكمال" : "Complete"}>
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => {
                                setSelectedItem(task);
                                setTaskForm(task);
                                setTaskDialogOpen(true);
                              }}>
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
        </TabsContent>
      </Tabs>

      {/* Project Dialog */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem ? (language === "ar" ? "تعديل المشروع" : "Edit Project") : (language === "ar" ? "مشروع جديد" : "New Project")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProjectSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "اسم المشروع" : "Project Name"} *</Label>
                <Input value={projectForm.name} onChange={(e) => setProjectForm({...projectForm, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "نوع المشروع" : "Project Type"} *</Label>
                <Select value={projectForm.project_type} onValueChange={(v) => setProjectForm({...projectForm, project_type: v})}>
                  <SelectTrigger><SelectValue placeholder={language === "ar" ? "اختر النوع" : "Select type"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="construction">{language === "ar" ? "بناء" : "Construction"}</SelectItem>
                    <SelectItem value="it">{language === "ar" ? "تقنية معلومات" : "IT"}</SelectItem>
                    <SelectItem value="marketing">{language === "ar" ? "تسويق" : "Marketing"}</SelectItem>
                    <SelectItem value="research">{language === "ar" ? "بحث" : "Research"}</SelectItem>
                    <SelectItem value="operational">{language === "ar" ? "تشغيلي" : "Operational"}</SelectItem>
                    <SelectItem value="other">{language === "ar" ? "أخرى" : "Other"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الوصف" : "Description"} *</Label>
              <Textarea value={projectForm.description} onChange={(e) => setProjectForm({...projectForm, description: e.target.value})} rows={3} required />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ البداية" : "Start Date"} *</Label>
                <Input type="date" value={projectForm.start_date} onChange={(e) => setProjectForm({...projectForm, start_date: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ النهاية" : "End Date"} *</Label>
                <Input type="date" value={projectForm.end_date} onChange={(e) => setProjectForm({...projectForm, end_date: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "الميزانية (ر.ع)" : "Budget (OMR)"} *</Label>
                <Input type="number" step="0.001" value={projectForm.budget} onChange={(e) => setProjectForm({...projectForm, budget: parseFloat(e.target.value)})} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "مدير المشروع" : "Project Manager"}</Label>
                <Input value={projectForm.manager_name} onChange={(e) => setProjectForm({...projectForm, manager_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "الأولوية" : "Priority"}</Label>
                <Select value={projectForm.priority} onValueChange={(v) => setProjectForm({...projectForm, priority: v})}>
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
              <Label>{language === "ar" ? "الأهداف" : "Objectives"}</Label>
              <Textarea value={projectForm.objectives} onChange={(e) => setProjectForm({...projectForm, objectives: e.target.value})} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProjectDialogOpen(false)}>
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" className="gradient-primary text-white">
                {language === "ar" ? "حفظ" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedItem ? (language === "ar" ? "تعديل المهمة" : "Edit Task") : (language === "ar" ? "مهمة جديدة" : "New Task")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTaskSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{language === "ar" ? "اسم المهمة" : "Task Name"} *</Label>
              <Input value={taskForm.task_name} onChange={(e) => setTaskForm({...taskForm, task_name: e.target.value})} required />
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الوصف" : "Description"}</Label>
              <Textarea value={taskForm.description} onChange={(e) => setTaskForm({...taskForm, description: e.target.value})} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "المسؤول" : "Assigned To"}</Label>
                <Input value={taskForm.assigned_to_name} onChange={(e) => setTaskForm({...taskForm, assigned_to_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "الساعات المقدرة" : "Estimated Hours"}</Label>
                <Input type="number" value={taskForm.estimated_hours} onChange={(e) => setTaskForm({...taskForm, estimated_hours: parseFloat(e.target.value)})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ البداية" : "Start Date"} *</Label>
                <Input type="date" value={taskForm.start_date} onChange={(e) => setTaskForm({...taskForm, start_date: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>{language === "ar" ? "تاريخ الاستحقاق" : "Due Date"} *</Label>
                <Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({...taskForm, due_date: e.target.value})} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === "ar" ? "الأولوية" : "Priority"}</Label>
              <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({...taskForm, priority: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{language === "ar" ? "منخفضة" : "Low"}</SelectItem>
                  <SelectItem value="medium">{language === "ar" ? "متوسطة" : "Medium"}</SelectItem>
                  <SelectItem value="high">{language === "ar" ? "عالية" : "High"}</SelectItem>
                  <SelectItem value="critical">{language === "ar" ? "حرجة" : "Critical"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)}>
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

export default Projects;
