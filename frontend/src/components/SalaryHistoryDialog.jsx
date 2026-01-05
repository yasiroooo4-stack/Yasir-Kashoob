import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  User,
  RefreshCw,
  History,
  DollarSign,
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const SalaryHistoryDialog = ({ open, onOpenChange, employee }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (open && employee?.id) {
      fetchHistory();
    }
  }, [open, employee?.id]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API}/api/hr/salary-history/${employee.id}`,
        { headers }
      );
      setHistory(res.data || []);
    } catch (error) {
      console.error("Error fetching salary history:", error);
      toast.error("فشل في تحميل سجل الرواتب");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("ar-SA", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getChangeIndicator = (oldSalary, newSalary) => {
    const diff = newSalary - oldSalary;
    const percentage = oldSalary ? ((diff / oldSalary) * 100).toFixed(1) : 0;
    
    if (diff > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <TrendingUp className="w-4 h-4" />
          <span>+{formatCurrency(diff)} (+{percentage}%)</span>
        </div>
      );
    } else if (diff < 0) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <TrendingDown className="w-4 h-4" />
          <span>{formatCurrency(diff)} ({percentage}%)</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-gray-500">
        <Minus className="w-4 h-4" />
        <span>لا تغيير</span>
      </div>
    );
  };

  const getReasonBadge = (reason) => {
    const reasonMap = {
      promotion: { label: "ترقية", variant: "default" },
      annual_increase: { label: "زيادة سنوية", variant: "default" },
      performance_bonus: { label: "علاوة أداء", variant: "default" },
      adjustment: { label: "تعديل", variant: "secondary" },
      demotion: { label: "تخفيض", variant: "destructive" },
      correction: { label: "تصحيح", variant: "outline" },
      new_hire: { label: "تعيين جديد", variant: "default" },
      other: { label: "أخرى", variant: "outline" },
    };
    
    const config = reasonMap[reason] || { label: reason || "غير محدد", variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            سجل تغييرات الراتب
          </DialogTitle>
        </DialogHeader>
        
        {employee && (
          <div className="bg-muted p-4 rounded-lg flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg">{employee.name}</p>
              <p className="text-sm text-muted-foreground">
                {employee.job_title} - {employee.department}
              </p>
            </div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground">الراتب الحالي</p>
              <p className="text-2xl font-bold text-primary flex items-center gap-1">
                <DollarSign className="w-5 h-5" />
                {formatCurrency(employee.salary)} ر.ع
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>لا يوجد سجل تغييرات للراتب</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الراتب السابق</TableHead>
                    <TableHead>الراتب الجديد</TableHead>
                    <TableHead>التغيير</TableHead>
                    <TableHead>السبب</TableHead>
                    <TableHead>بواسطة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((record, index) => (
                    <TableRow key={record.id || index}>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(record.created_at || record.change_date)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(record.old_salary)} ر.ع
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        {formatCurrency(record.new_salary)} ر.ع
                      </TableCell>
                      <TableCell>
                        {getChangeIndicator(record.old_salary, record.new_salary)}
                      </TableCell>
                      <TableCell>
                        {getReasonBadge(record.reason)}
                        {record.notes && (
                          <p className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
                            {record.notes}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.changed_by_name || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalaryHistoryDialog;
