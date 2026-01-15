import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  Check,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  RefreshCw,
  Filter,
  CheckCheck,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import axios from "axios";
import { toast } from "sonner";
import { useLanguage, API } from "../App";

const ExtraPayApprovals = ({ embedded = false }) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Set default dates (last 30 days)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    setEndDate(today.toISOString().split("T")[0]);
    setStartDate(thirtyDaysAgo.toISOString().split("T")[0]);
  }, []);

  // Fetch pending extra pay requests
  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const response = await axios.get(`${API}/hr/attendance/pending-extra-pay?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPendingRequests(response.data || []);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      toast.error(language === "ar" ? "خطأ في جلب البيانات" : "Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchPendingRequests();
    }
  }, [startDate, endDate]);

  // Approve single request
  const handleApprove = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/hr/attendance/${id}/approve-extra-pay`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      toast.success(language === "ar" ? "تمت الموافقة بنجاح" : "Approved successfully");
      fetchPendingRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === "ar" ? "خطأ في الموافقة" : "Approval error"));
    }
  };

  // Reject single request
  const handleReject = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/hr/attendance/${id}/reject-extra-pay`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      toast.success(language === "ar" ? "تم الرفض بنجاح" : "Rejected successfully");
      fetchPendingRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === "ar" ? "خطأ في الرفض" : "Rejection error"));
    }
  };

  // Bulk approve
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) {
      toast.warning(language === "ar" ? "يرجى اختيار سجلات أولاً" : "Please select records first");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/hr/attendance/bulk-approve-extra-pay`, selectedIds, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      toast.success(
        language === "ar" 
          ? `تمت الموافقة على ${selectedIds.length} سجل بنجاح` 
          : `Successfully approved ${selectedIds.length} records`
      );
      setSelectedIds([]);
      fetchPendingRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail || (language === "ar" ? "خطأ في الموافقة الجماعية" : "Bulk approval error"));
    }
  };

  // Toggle selection
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Select all
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRequests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRequests.map((r) => r.id));
    }
  };

  // Filter requests
  const filteredRequests = pendingRequests.filter((request) => {
    // Filter by status
    if (filterStatus === "pending" && request.extra_pay_approved === true) return false;
    if (filterStatus === "approved" && request.extra_pay_approved !== true) return false;
    if (filterStatus === "rejected" && request.extra_pay_rejected !== true) return false;

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        request.employee_name?.toLowerCase().includes(search) ||
        request.employee_code?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Stats
  const stats = {
    total: pendingRequests.length,
    pending: pendingRequests.filter((r) => !r.extra_pay_approved && !r.extra_pay_rejected).length,
    approved: pendingRequests.filter((r) => r.extra_pay_approved === true).length,
    rejected: pendingRequests.filter((r) => r.extra_pay_rejected === true).length,
  };

  return (
    <div className={embedded ? "" : "space-y-6"}>
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {language === "ar" ? "الموافقة على البدلات الإضافية" : "Extra Pay Approvals"}
            </h1>
            <p className="text-muted-foreground">
              {language === "ar"
                ? "إدارة طلبات أجر العمل في أيام العطل ونهاية الأسبوع"
                : "Manage overtime pay requests for holidays and weekends"}
            </p>
          </div>
          <Button onClick={fetchPendingRequests} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            {language === "ar" ? "تحديث" : "Refresh"}
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "الإجمالي" : "Total"}
                </p>
                <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "معلق" : "Pending"}
                </p>
                <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "موافق عليه" : "Approved"}
                </p>
                <p className="text-2xl font-bold text-green-700">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === "ar" ? "مرفوض" : "Rejected"}
                </p>
                <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>{language === "ar" ? "بحث" : "Search"}</Label>
              <Input
                placeholder={language === "ar" ? "اسم أو كود الموظف..." : "Employee name or code..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="min-w-[150px]">
              <Label>{language === "ar" ? "من تاريخ" : "From Date"}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="min-w-[150px]">
              <Label>{language === "ar" ? "إلى تاريخ" : "To Date"}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="min-w-[150px]">
              <Label>{language === "ar" ? "الحالة" : "Status"}</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {language === "ar" ? "الكل" : "All"}
                  </SelectItem>
                  <SelectItem value="pending">
                    {language === "ar" ? "معلق" : "Pending"}
                  </SelectItem>
                  <SelectItem value="approved">
                    {language === "ar" ? "موافق عليه" : "Approved"}
                  </SelectItem>
                  <SelectItem value="rejected">
                    {language === "ar" ? "مرفوض" : "Rejected"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedIds.length > 0 && (
              <Button onClick={handleBulkApprove} className="gap-2 bg-green-600 hover:bg-green-700">
                <CheckCheck className="w-4 h-4" />
                {language === "ar"
                  ? `الموافقة على ${selectedIds.length} سجل`
                  : `Approve ${selectedIds.length} records`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            {language === "ar" ? "طلبات البدلات الإضافية" : "Extra Pay Requests"}
          </CardTitle>
          <CardDescription>
            {language === "ar"
              ? `عرض ${filteredRequests.length} من ${pendingRequests.length} سجل`
              : `Showing ${filteredRequests.length} of ${pendingRequests.length} records`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                {language === "ar" ? "لا توجد طلبات" : "No requests found"}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === "ar"
                  ? "لا توجد طلبات بدلات إضافية في هذه الفترة"
                  : "No extra pay requests for this period"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.length === filteredRequests.length && filteredRequests.length > 0}
                        onCheckedChange={toggleSelectAll}
                        data-testid="select-all-checkbox"
                      />
                    </TableHead>
                    <TableHead>{language === "ar" ? "الموظف" : "Employee"}</TableHead>
                    <TableHead>{language === "ar" ? "التاريخ" : "Date"}</TableHead>
                    <TableHead>{language === "ar" ? "اليوم" : "Day"}</TableHead>
                    <TableHead>{language === "ar" ? "النوع" : "Type"}</TableHead>
                    <TableHead>{language === "ar" ? "وقت الحضور" : "Check In"}</TableHead>
                    <TableHead>{language === "ar" ? "وقت الانصراف" : "Check Out"}</TableHead>
                    <TableHead>{language === "ar" ? "الحالة" : "Status"}</TableHead>
                    <TableHead>{language === "ar" ? "الإجراءات" : "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(request.id)}
                          onCheckedChange={() => toggleSelect(request.id)}
                          disabled={request.extra_pay_approved || request.extra_pay_rejected}
                          data-testid={`select-${request.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{request.employee_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {request.employee_code}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{request.date}</TableCell>
                      <TableCell>{request.day_name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {request.is_weekend && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              {language === "ar" ? "عطلة أسبوعية" : "Weekend"}
                            </Badge>
                          )}
                          {request.is_holiday && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              {language === "ar" ? "عطلة رسمية" : "Holiday"}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-green-600">
                        {request.check_in || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-red-600">
                        {request.check_out || "-"}
                      </TableCell>
                      <TableCell>
                        {request.extra_pay_approved ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            <CheckCircle2 className="w-3 h-3 me-1" />
                            {language === "ar" ? "موافق" : "Approved"}
                          </Badge>
                        ) : request.extra_pay_rejected ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            <XCircle className="w-3 h-3 me-1" />
                            {language === "ar" ? "مرفوض" : "Rejected"}
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                            <Clock className="w-3 h-3 me-1" />
                            {language === "ar" ? "معلق" : "Pending"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!request.extra_pay_approved && !request.extra_pay_rejected ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleApprove(request.id)}
                              data-testid={`approve-${request.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleReject(request.id)}
                              data-testid={`reject-${request.id}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {request.extra_pay_approved_by_name || request.extra_pay_rejected_by_name || "-"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExtraPayApprovals;
