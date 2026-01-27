import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ClipboardList, Plus, Bell, Clock, CheckCircle2, AlertCircle, ChevronLeft } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function TasksButton({ currentUser }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const getAuthHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  }), []);

  // Fetch stats and notifications
  const fetchData = useCallback(async () => {
    try {
      // Fetch stats
      const statsResponse = await fetch(`${API_URL}/api/tasks/stats`, {
        headers: getAuthHeaders(),
      });
      if (statsResponse.ok) {
        setStats(await statsResponse.json());
      }

      // Fetch notifications
      const notifResponse = await fetch(`${API_URL}/api/tasks/notifications?unread_only=true`, {
        headers: getAuthHeaders(),
      });
      if (notifResponse.ok) {
        setNotifications(await notifResponse.json());
      }
    } catch (error) {
      console.error("Error fetching tasks data:", error);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const totalPending = (stats?.my_tasks?.pending || 0) + (stats?.my_tasks?.in_progress || 0);
  const totalDelayed = stats?.my_tasks?.delayed || 0;
  const unreadCount = notifications.length;

  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 relative"
          data-testid="tasks-menu-btn"
        >
          <ClipboardList className="w-4 h-4" />
          <span className="hidden sm:inline">المهام</span>
          {(totalPending > 0 || unreadCount > 0) && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {totalPending + unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>المهام</span>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Bell className="w-3 h-3" />
              {unreadCount} إشعار
            </Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Stats */}
        <div className="px-2 py-2 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4 text-yellow-500" />
              معلقة
            </span>
            <span className="font-medium">{stats?.my_tasks?.pending || 0}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              مكتملة
            </span>
            <span className="font-medium">{stats?.my_tasks?.completed || 0}</span>
          </div>
          {totalDelayed > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                متأخرة
              </span>
              <span className="font-medium text-red-600">{totalDelayed}</span>
            </div>
          )}
        </div>
        
        <DropdownMenuSeparator />
        
        {/* Quick Actions */}
        <DropdownMenuItem 
          className="gap-2 cursor-pointer"
          onClick={() => navigate("/tasks")}
        >
          <ClipboardList className="w-4 h-4" />
          عرض جميع المهام
          <ChevronLeft className="w-4 h-4 mr-auto" />
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className="gap-2 cursor-pointer"
          onClick={() => navigate("/tasks?tab=my-tasks")}
        >
          <Clock className="w-4 h-4" />
          مهامي المعلقة
          {stats?.my_tasks?.pending > 0 && (
            <Badge variant="secondary" className="mr-auto">{stats.my_tasks.pending}</Badge>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="gap-2 cursor-pointer bg-primary/10 text-primary"
          onClick={() => navigate("/tasks")}
        >
          <Plus className="w-4 h-4" />
          إنشاء مهمة جديدة
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
