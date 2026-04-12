import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "../components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../components/ui/table";
import {
  Vote, Plus, Trophy, Users, Clock, Trash2, Eye, CalendarDays, BarChart3
} from "lucide-react";
import { useAuth, API } from "../App";

const statusConfig = {
  draft: { label: "مسودة", labelEn: "Draft", color: "bg-gray-100 text-gray-700" },
  nomination: { label: "ترشيح مفتوح", labelEn: "Nominations Open", color: "bg-blue-100 text-blue-700" },
  pending_voting: { label: "بانتظار التصويت", labelEn: "Pending Voting", color: "bg-yellow-100 text-yellow-700" },
  voting: { label: "تصويت مفتوح", labelEn: "Voting Open", color: "bg-green-100 text-green-700" },
  closed: { label: "مغلق", labelEn: "Closed", color: "bg-red-100 text-red-700" },
};

export default function SupplierElections() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [elections, setElections] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showResults, setShowResults] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "",
    nomination_start: "", nomination_end: "",
    voting_start: "", voting_end: ""
  });

  const fetchElections = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/elections/list`);
      setElections(res.data);
    } catch { toast.error("خطأ في جلب البيانات"); }
  }, []);

  useEffect(() => { fetchElections(); }, [fetchElections]);

  const handleCreate = async () => {
    if (!form.title || !form.nomination_start || !form.nomination_end || !form.voting_start || !form.voting_end) {
      toast.error("يرجى تعبئة جميع الحقول المطلوبة");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/elections/create`, form);
      toast.success("تم إنشاء الانتخاب بنجاح");
      setShowCreate(false);
      setForm({ title: "", description: "", nomination_start: "", nomination_end: "", voting_start: "", voting_end: "" });
      fetchElections();
    } catch (err) {
      toast.error(err.response?.data?.detail || "خطأ في الإنشاء");
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل تريد حذف هذا الانتخاب؟")) return;
    try {
      await axios.delete(`${API}/elections/${id}`);
      toast.success("تم الحذف");
      fetchElections();
    } catch { toast.error("خطأ في الحذف"); }
  };

  const viewResults = async (election) => {
    try {
      const res = await axios.get(`${API}/elections/${election.id}/results`);
      setResults(res.data);
      setShowResults(election);
    } catch { toast.error("خطأ في جلب النتائج"); }
  };

  const formatDate = (d) => {
    if (!d) return "-";
    try { return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return d; }
  };

  return (
    <div className="space-y-6" data-testid="supplier-elections-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Vote className="w-6 h-6 text-indigo-600" />
            ترشيح وتصويت الموردين
          </h2>
          <p className="text-muted-foreground mt-1">إدارة عمليات الترشيح والتصويت لاختيار رئيس الموردين</p>
        </div>
        <Button onClick={() => setShowCreate(true)} data-testid="create-election-btn">
          <Plus className="w-4 h-4 me-2" /> انتخاب جديد
        </Button>
      </div>

      {/* Elections List */}
      {elections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Vote className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>لا توجد عمليات انتخاب حالياً</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {elections.map(e => {
            const sc = statusConfig[e.status] || statusConfig.draft;
            return (
              <Card key={e.id} className="hover:shadow-md transition-shadow" data-testid={`election-card-${e.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{e.title}</CardTitle>
                      {e.description && <CardDescription>{e.description}</CardDescription>}
                    </div>
                    <Badge className={sc.color}>{sc.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarDays className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="text-muted-foreground text-xs">فترة الترشيح</p>
                        <p className="font-medium">{formatDate(e.nomination_start)}</p>
                        <p className="font-medium">{formatDate(e.nomination_end)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="text-muted-foreground text-xs">فترة التصويت</p>
                        <p className="font-medium">{formatDate(e.voting_start)}</p>
                        <p className="font-medium">{formatDate(e.voting_end)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-indigo-500" />
                      <div>
                        <p className="text-muted-foreground text-xs">المرشحون</p>
                        <p className="font-bold text-lg">{e.candidates_count}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <BarChart3 className="w-4 h-4 text-orange-500" />
                      <div>
                        <p className="text-muted-foreground text-xs">الأصوات</p>
                        <p className="font-bold text-lg">{e.votes_count}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => viewResults(e)} data-testid={`view-results-${e.id}`}>
                      <Eye className="w-4 h-4 me-1" /> النتائج
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(e.id)} data-testid={`delete-election-${e.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg" data-testid="create-election-dialog">
          <DialogHeader>
            <DialogTitle>إنشاء انتخاب جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>عنوان الانتخاب *</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                placeholder="مثال: انتخاب رئيس الموردين 2026" data-testid="election-title-input" />
            </div>
            <div>
              <Label>الوصف</Label>
              <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="وصف مختصر (اختياري)" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>بداية الترشيح *</Label>
                <Input type="datetime-local" value={form.nomination_start}
                  onChange={e => setForm({...form, nomination_start: e.target.value})} data-testid="nom-start-input" />
              </div>
              <div>
                <Label>نهاية الترشيح *</Label>
                <Input type="datetime-local" value={form.nomination_end}
                  onChange={e => setForm({...form, nomination_end: e.target.value})} data-testid="nom-end-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>بداية التصويت *</Label>
                <Input type="datetime-local" value={form.voting_start}
                  onChange={e => setForm({...form, voting_start: e.target.value})} data-testid="vote-start-input" />
              </div>
              <div>
                <Label>نهاية التصويت *</Label>
                <Input type="datetime-local" value={form.voting_end}
                  onChange={e => setForm({...form, voting_end: e.target.value})} data-testid="vote-end-input" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={loading} data-testid="submit-election-btn">
              {loading ? "جاري الإنشاء..." : "إنشاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={!!showResults} onOpenChange={() => setShowResults(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" data-testid="results-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              نتائج: {showResults?.title}
            </DialogTitle>
          </DialogHeader>
          {results && (
            <div className="space-y-6">
              <div className="flex gap-4 text-center">
                <Card className="flex-1">
                  <CardContent className="py-3">
                    <p className="text-2xl font-bold text-indigo-600">{results.all_candidates?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">مرشح</p>
                  </CardContent>
                </Card>
                <Card className="flex-1">
                  <CardContent className="py-3">
                    <p className="text-2xl font-bold text-green-600">{results.total_votes}</p>
                    <p className="text-xs text-muted-foreground">صوت</p>
                  </CardContent>
                </Card>
              </div>

              {/* Results by Center */}
              {results.results_by_center && Object.entries(results.results_by_center).map(([center, data]) => (
                <Card key={center} className="border-2">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">مركز {center}</CardTitle>
                      <Badge variant="outline">{data.total_votes} صوت</Badge>
                    </div>
                    {data.winner && (
                      <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200 mt-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <span className="font-bold text-yellow-700">الفائز: {data.winner.name}</span>
                        <Badge className="bg-yellow-100 text-yellow-800">{data.winner.votes_count} صوت</Badge>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {data.candidates.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">لا يوجد مرشحون في هذا المركز</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">#</TableHead>
                            <TableHead className="text-right">المرشح</TableHead>
                            <TableHead className="text-right">الكود</TableHead>
                            <TableHead className="text-right">الأصوات</TableHead>
                            <TableHead className="text-right">النسبة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.candidates.map((c, i) => (
                            <TableRow key={c.id} className={i === 0 && c.votes_count > 0 ? "bg-yellow-50" : ""}>
                              <TableCell>{i === 0 && c.votes_count > 0 ? <Trophy className="w-4 h-4 text-yellow-500" /> : i + 1}</TableCell>
                              <TableCell className="font-medium">{c.name}</TableCell>
                              <TableCell>{c.supplier_code || "-"}</TableCell>
                              <TableCell className="font-bold">{c.votes_count}</TableCell>
                              <TableCell>
                                {data.total_votes > 0 ? `${((c.votes_count / data.total_votes) * 100).toFixed(1)}%` : "0%"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
