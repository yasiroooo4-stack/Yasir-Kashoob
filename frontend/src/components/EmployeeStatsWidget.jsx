import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  CalendarCheck, 
  CalendarX, 
  Calendar, 
  TrendingUp,
  ChevronDown
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Progress } from "./ui/progress";
import axios from "axios";
import { useLanguage } from "../App";

const API = process.env.REACT_APP_BACKEND_URL;

const EmployeeStatsWidget = ({ currentUser }) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [stats, setStats] = useState({
    present_days: 0,
    absent_days: 0,
    leave_balance: 30,
    performance_rate: 0,
    total_working_days: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (currentUser?.id) {
      fetchEmployeeStats();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchEmployeeStats = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      
      // Get current month attendance
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      // Calculate start and end dates for current month
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      // Fetch attendance data with error handling
      let userAttendance = [];
      try {
        const attendanceRes = await axios.get(
          `${API}/api/hr/attendance?start_date=${startDate}&end_date=${endDate}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // First get the employee record to find their employee_id
        let employeeRecord = null;
        let leaveBalance = 30; // Default
        try {
          const employeesRes = await axios.get(
            `${API}/api/hr/employees`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (Array.isArray(employeesRes.data)) {
            employeeRecord = employeesRes.data.find(
              e => e.id === currentUser?.id || 
                   e.name === currentUser?.full_name ||
                   e.username === currentUser?.username
            );
            if (employeeRecord?.leave_balance !== undefined) {
              leaveBalance = employeeRecord.leave_balance;
            }
          }
        } catch (e) {
          console.log("Could not fetch employee data");
        }
        
        // Filter attendance for current user - match by multiple fields
        if (Array.isArray(attendanceRes.data)) {
          userAttendance = attendanceRes.data.filter(a => {
            // Match by user ID
            if (a.employee_id === currentUser?.id) return true;
            // Match by employee_id field from employee record
            if (employeeRecord?.employee_id && a.employee_id === employeeRecord.employee_id) return true;
            // Match by fingerprint_id if exists
            if (employeeRecord?.fingerprint_id && a.employee_id === employeeRecord.fingerprint_id) return true;
            // Match by name
            if (a.employee_name === currentUser?.full_name) return true;
            if (employeeRecord?.name && a.employee_name === employeeRecord.name) return true;
            // Match by username
            if (a.employee_id === currentUser?.username) return true;
            return false;
          });
        }
      } catch (attendanceError) {
        console.log("Could not fetch attendance:", attendanceError.message);
      }
      
      // Calculate stats - check_in means present (from ZKTeco import)
      const presentDays = userAttendance.filter(a => 
        a.status === "present" || a.check_in
      ).length;
      const absentDays = userAttendance.filter(a => 
        a.status === "absent" || (!a.check_in && !a.status)
      ).length;
      
      // Calculate working days in month (excluding weekends)
      const daysInMonth = new Date(year, month, 0).getDate();
      let workingDays = 0;
      for (let d = 1; d <= Math.min(daysInMonth, currentDate.getDate()); d++) {
        const date = new Date(year, month - 1, d);
        const dayOfWeek = date.getDay();
        // Friday (5) and Saturday (6) are weekends in Oman
        if (dayOfWeek !== 5 && dayOfWeek !== 6) {
          workingDays++;
        }
      }
      
      // Calculate performance rate
      const performanceRate = workingDays > 0 
        ? Math.round((presentDays / workingDays) * 100) 
        : 100;
      
      setStats({
        present_days: presentDays,
        absent_days: absentDays,
        leave_balance: leaveBalance,
        performance_rate: Math.min(performanceRate, 100),
        total_working_days: workingDays
      });
    } catch (error) {
      console.error("Error fetching employee stats:", error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  
  // Don't render if there's an error or no user
  if (error || !currentUser) {
    return null;
  }

  const getPerformanceColor = (rate) => {
    if (rate >= 90) return "text-green-600";
    if (rate >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getPerformanceBarColor = (rate) => {
    if (rate >= 90) return "bg-green-500";
    if (rate >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" className="gap-2" disabled>
        <TrendingUp className="w-4 h-4 animate-pulse" />
        <span className="hidden md:inline">...</span>
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          title={language === "ar" ? "إحصائيات الموظف" : "Employee Stats"}
        >
          <TrendingUp className={`w-4 h-4 ${getPerformanceColor(stats.performance_rate)}`} />
          <span className="hidden md:inline font-medium">
            {stats.performance_rate}%
          </span>
          <ChevronDown className="w-3 h-3 hidden md:inline" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="text-center border-b pb-3">
            <h4 className="font-semibold text-sm">
              {language === "ar" ? "إحصائياتي هذا الشهر" : "My Stats This Month"}
            </h4>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString(language === "ar" ? "ar-OM" : "en-US", { 
                month: "long", 
                year: "numeric" 
              })}
            </p>
          </div>

          {/* Performance Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                {language === "ar" ? "نسبة الأداء" : "Performance"}
              </span>
              <span className={`font-bold ${getPerformanceColor(stats.performance_rate)}`}>
                {stats.performance_rate}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getPerformanceBarColor(stats.performance_rate)} transition-all duration-500`}
                style={{ width: `${stats.performance_rate}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Present Days */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <CalendarCheck className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-green-600">
                {stats.present_days}
              </div>
              <div className="text-xs text-muted-foreground">
                {language === "ar" ? "أيام الحضور" : "Present Days"}
              </div>
            </div>

            {/* Absent Days */}
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
              <CalendarX className="w-5 h-5 text-red-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-red-600">
                {stats.absent_days}
              </div>
              <div className="text-xs text-muted-foreground">
                {language === "ar" ? "أيام الغياب" : "Absent Days"}
              </div>
            </div>

            {/* Leave Balance */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center col-span-2">
              <Calendar className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-blue-600">
                {stats.leave_balance} {language === "ar" ? "يوم" : "days"}
              </div>
              <div className="text-xs text-muted-foreground">
                {language === "ar" ? "رصيد الإجازات المتبقي" : "Leave Balance"}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="text-xs text-center text-muted-foreground border-t pt-2">
            {language === "ar" 
              ? `${stats.present_days} من ${stats.total_working_days} يوم عمل`
              : `${stats.present_days} of ${stats.total_working_days} working days`
            }
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmployeeStatsWidget;
