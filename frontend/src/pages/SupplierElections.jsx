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
  Vote, Plus, Trophy, Users, Clock, Trash2, Eye, CalendarDays, BarChart3, Printer, ChevronDown, ChevronUp, Camera
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
  const [expandedCandidate, setExpandedCandidate] = useState(null);
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

  const printResults = () => {
    if (!results || !showResults) return;
    const logoUrl = window.location.origin + "/company-logo.png";
    const now = new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

    const centersHtml = results.results_by_center ? Object.entries(results.results_by_center).map(([center, data]) => {
      const candidatesRows = data.candidates.map((c, i) => {
        const pct = data.total_votes > 0 ? ((c.votes_count / data.total_votes) * 100).toFixed(1) : "0.0";
        const isWinner = i === 0 && c.votes_count > 0;
        return `<tr style="${isWinner ? 'background:#FFFDE7;font-weight:bold;' : ''}">
          <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;">${isWinner ? '🏆' : (i + 1)}</td>
          <td style="padding:8px 12px;border:1px solid #ddd;">${c.name}</td>
          <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;">${c.supplier_code || '-'}</td>
          <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;font-weight:bold;">${c.votes_count}</td>
          <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;">${pct}%</td>
        </tr>`;
      }).join('');

      return `
        <div style="margin-bottom:25px;border:2px solid #ddd;border-radius:10px;overflow:hidden;">
          <div style="background:#f8f9fa;padding:12px 16px;border-bottom:2px solid #ddd;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:16px;font-weight:bold;">مركز ${center}</span>
            <span style="background:#e8f5e9;color:#2e7d32;padding:4px 12px;border-radius:12px;font-size:13px;">${data.total_votes} صوت</span>
          </div>
          ${data.winner ? `
          <div style="background:#FFFDE7;padding:10px 16px;border-bottom:1px solid #FFF9C4;display:flex;align-items:center;gap:8px;">
            <span style="font-size:18px;">🏆</span>
            <span style="font-weight:bold;color:#F57F17;">الفائز: ${data.winner.name}</span>
            <span style="background:#FFF9C4;color:#F57F17;padding:2px 10px;border-radius:10px;font-size:12px;margin-right:8px;">${data.winner.votes_count} صوت</span>
          </div>` : ''}
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f0f0f0;">
                <th style="padding:8px 12px;border:1px solid #ddd;text-align:center;width:40px;">#</th>
                <th style="padding:8px 12px;border:1px solid #ddd;text-align:right;">المرشح</th>
                <th style="padding:8px 12px;border:1px solid #ddd;text-align:center;">الكود</th>
                <th style="padding:8px 12px;border:1px solid #ddd;text-align:center;">الأصوات</th>
                <th style="padding:8px 12px;border:1px solid #ddd;text-align:center;">النسبة</th>
              </tr>
            </thead>
            <tbody>${candidatesRows}</tbody>
          </table>
        </div>`;
    }).join('') : '';

    const printWindow = window.open("", "_blank", "width=800,height=900");
    printWindow.document.write(`
      <html dir="rtl"><head><title>نتائج الانتخاب - المروج للألبان</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; direction: rtl; color: #333; }
        .header { text-align: center; border-bottom: 3px solid #8B7D3C; padding-bottom: 20px; margin-bottom: 25px; }
        .header img { width: 90px; height: 90px; object-fit: contain; margin-bottom: 8px; }
        .header h1 { font-size: 22px; margin: 5px 0; color: #8B7D3C; }
        .header h2 { font-size: 14px; color: #666; margin: 3px 0; }
        .header h3 { font-size: 18px; margin: 12px 0 5px; color: #333; }
        .summary { display: flex; justify-content: center; gap: 30px; margin-bottom: 25px; }
        .summary-box { text-align: center; padding: 15px 30px; border: 2px solid #e0e0e0; border-radius: 10px; min-width: 120px; }
        .summary-box .num { font-size: 28px; font-weight: bold; }
        .summary-box .label { font-size: 13px; color: #666; margin-top: 4px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 2px solid #8B7D3C; color: #888; font-size: 12px; }
        @media print { body { padding: 15px; } }
      </style></head><body>
        <div class="header">
          <img src="${logoUrl}" alt="المروج للألبان" />
          <h1>المروج للألبان</h1>
          <h2>Al Morooj Dairy</h2>
          <h3>نتائج: ${showResults.title}</h3>
          <p style="font-size:12px;color:#888;margin:5px 0;">${now}</p>
        </div>
        <div class="summary">
          <div class="summary-box">
            <div class="num" style="color:#3949AB;">${results.all_candidates?.length || 0}</div>
            <div class="label">مرشح</div>
          </div>
          <div class="summary-box">
            <div class="num" style="color:#2E7D32;">${results.total_votes}</div>
            <div class="label">صوت</div>
          </div>
        </div>
        ${centersHtml}
        <div class="footer">
          <p style="color:#8B7D3C;font-size:14px;font-weight:bold;">المروج للألبان - Al Morooj Dairy</p>
          <p>تم إصدار هذا التقرير بتاريخ ${now}</p>
        </div>
        <script>window.onload=function(){setTimeout(function(){window.print();},500);}</script>
      </body></html>
    `);
    printWindow.document.close();
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
                        {data.winner.photo_url && (
                          <img src={`${API}${data.winner.photo_url}`} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-yellow-400" />
                        )}
                        <span className="font-bold text-yellow-700">الفائز: {data.winner.name}</span>
                        <Badge className="bg-yellow-100 text-yellow-800">{data.winner.votes_count} صوت</Badge>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {data.candidates.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">لا يوجد مرشحون في هذا المركز</p>
                    ) : (
                      <div className="space-y-3">
                        {data.candidates.map((c, i) => {
                          const isWinner = i === 0 && c.votes_count > 0;
                          const isExpanded = expandedCandidate === c.id;
                          const pct = data.total_votes > 0 ? ((c.votes_count / data.total_votes) * 100).toFixed(1) : "0.0";
                          return (
                            <div key={c.id} className={`rounded-lg border-2 overflow-hidden ${isWinner ? 'border-yellow-300 bg-yellow-50/50' : 'border-gray-200'}`}
                              data-testid={`result-candidate-${c.id}`}>
                              {/* Candidate Row */}
                              <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
                                onClick={() => setExpandedCandidate(isExpanded ? null : c.id)}>
                                {/* Photo */}
                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-300 flex-shrink-0 bg-gray-100 flex items-center justify-center">
                                  {c.photo_url ? (
                                    <img src={`${API}${c.photo_url}`} alt={c.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Camera className="w-5 h-5 text-gray-400" />
                                  )}
                                </div>
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    {isWinner && <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                                    <p className="font-bold text-sm truncate">{c.name}</p>
                                  </div>
                                  <p className="text-xs text-muted-foreground">كود: {c.supplier_code || '-'}</p>
                                </div>
                                {/* Votes */}
                                <div className="text-center flex-shrink-0">
                                  <p className="text-lg font-bold text-indigo-700">{c.votes_count}</p>
                                  <p className="text-[10px] text-muted-foreground">صوت ({pct}%)</p>
                                </div>
                                {/* Expand */}
                                <div className="flex-shrink-0">
                                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                </div>
                              </div>
                              {/* Voters List (Expanded) */}
                              {isExpanded && (
                                <div className="border-t bg-gray-50 p-3">
                                  <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                                    <Users className="w-3 h-3" /> قائمة المصوتين ({c.voters?.length || 0})
                                  </p>
                                  {(!c.voters || c.voters.length === 0) ? (
                                    <p className="text-xs text-muted-foreground text-center py-2">لا يوجد مصوتين</p>
                                  ) : (
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                      {c.voters.map((v, vi) => (
                                        <div key={vi} className="flex items-center justify-between bg-white rounded px-3 py-1.5 text-xs border">
                                          <span className="font-medium">{v.name}</span>
                                          <span className="text-muted-foreground">كود: {v.supplier_code}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Print Results Button */}
              <Button onClick={printResults} className="w-full gap-2" variant="outline" data-testid="print-results-btn">
                <Printer className="w-4 h-4" /> طباعة إيصال النتائج
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
