import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Vote, UserPlus, Search, CheckCircle, Users, Clock, Trophy, ArrowLeft, Printer
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const statusLabels = {
  draft: "لم يبدأ بعد",
  nomination: "الترشيح مفتوح",
  pending_voting: "بانتظار التصويت",
  voting: "التصويت مفتوح",
  closed: "مغلق",
};

export default function SupplierVoting() {
  const [elections, setElections] = useState([]);
  const [selected, setSelected] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [view, setView] = useState("list"); // list, nominate, vote
  const [supplierCode, setSupplierCode] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [supplierFound, setSupplierFound] = useState(null);
  const [regForm, setRegForm] = useState({
    name: "", supplier_code: "", national_id: "", supply_type: "", center_name: ""
  });
  const [voterCode, setVoterCode] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [voterCenter, setVoterCenter] = useState(""); // مركز المصوت // Registration receipt

  const fetchElections = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/elections/list`);
      setElections(res.data);
    } catch {}
  }, []);

  useEffect(() => { fetchElections(); }, [fetchElections]);

  const selectElection = async (election) => {
    setSelected(election);
    try {
      const res = await axios.get(`${API}/api/elections/${election.id}/candidates`);
      setCandidates(res.data);
    } catch {}
    if (election.status === "nomination" || election.status === "draft") setView("nominate");
    else if (election.status === "voting") setView("vote");
    else setView("nominate");
  };

  const lookupSupplier = async () => {
    if (!supplierCode.trim()) return;
    setLookupLoading(true);
    try {
      const res = await axios.get(`${API}/api/elections/lookup-supplier/${supplierCode.trim()}`);
      if (res.data.found) {
        const s = res.data.supplier;
        setSupplierFound(true);
        setRegForm({
          name: s.name || "",
          supplier_code: s.supplier_code || supplierCode,
          national_id: s.national_id || "",
          supply_type: s.milk_type || "",
          center_name: s.center_name || ""
        });
        toast.success("تم العثور على بيانات المورد");
      } else {
        setSupplierFound(false);
        setRegForm({ ...regForm, supplier_code: supplierCode });
        toast.info("لم يتم العثور - يرجى إدخال البيانات يدوياً");
      }
    } catch {
      setSupplierFound(false);
    } finally { setLookupLoading(false); }
  };

  const handleRegister = async () => {
    if (!regForm.name) { toast.error("يرجى إدخال الاسم"); return; }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/api/elections/register-candidate`, {
        election_id: selected.id,
        ...regForm
      });
      toast.success("تم تسجيل الترشيح بنجاح!");
      // Save receipt data
      setReceipt({
        candidateId: res.data.id,
        name: regForm.name,
        supplierCode: regForm.supplier_code,
        nationalId: regForm.national_id,
        supplyType: regForm.supply_type,
        centerName: regForm.center_name,
        electionTitle: selected.title,
        registeredAt: new Date().toLocaleString("ar-SA")
      });
      const candRes = await axios.get(`${API}/api/elections/${selected.id}/candidates`);
      setCandidates(candRes.data);
      setRegForm({ name: "", supplier_code: "", national_id: "", supply_type: "", center_name: "" });
      setSupplierCode("");
      setSupplierFound(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || "خطأ في التسجيل");
    } finally { setSubmitting(false); }
  };

  const printReceipt = () => {
    if (!receipt) return;
    const logoUrl = window.location.origin + "/company-logo.png";
    const printWindow = window.open("", "_blank", "width=600,height=600");
    printWindow.document.write(`
      <html dir="rtl"><head><title>إيصال ترشيح - المروج للألبان</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 30px; direction: rtl; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
        .header img { width: 80px; height: 80px; object-fit: contain; margin-bottom: 8px; }
        .header h1 { font-size: 20px; margin: 3px 0; color: #8B7D3C; }
        .header h2 { font-size: 14px; color: #666; margin: 3px 0; }
        .header h3 { font-size: 16px; margin: 8px 0 3px; }
        .reg-num { text-align: center; background: #f0f0f0; padding: 15px; margin: 15px 0; border-radius: 8px; }
        .reg-num span { font-size: 28px; font-weight: bold; color: #333; letter-spacing: 3px; }
        .info { margin: 10px 0; }
        .info table { width: 100%; border-collapse: collapse; }
        .info td { padding: 8px 12px; border: 1px solid #ddd; }
        .info td:first-child { background: #f8f8f8; font-weight: bold; width: 35%; }
        .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; border-top: 1px solid #ddd; padding-top: 10px; }
        @media print { body { padding: 15px; } }
      </style></head><body>
        <div class="header">
          <img src="${logoUrl}" alt="المروج للألبان" />
          <h1>المروج للألبان</h1>
          <h2>Al Morooj Dairy</h2>
          <h3>إيصال تسجيل ترشيح</h3>
          <p style="font-size:13px;color:#555;margin:3px 0">${receipt.electionTitle}</p>
        </div>
        <div class="reg-num">
          <p style="margin:0;font-size:14px;color:#666;">رقم التسجيل</p>
          <span>${receipt.candidateId.substring(0, 8).toUpperCase()}</span>
        </div>
        <div class="info">
          <table>
            <tr><td>الاسم</td><td>${receipt.name}</td></tr>
            <tr><td>كود المورد</td><td>${receipt.supplierCode || "-"}</td></tr>
            <tr><td>رقم المدني</td><td>${receipt.nationalId || "-"}</td></tr>
            <tr><td>نوع التوريد</td><td>${receipt.supplyType || "-"}</td></tr>
            <tr><td>مركز التوريد</td><td>${receipt.centerName || "-"}</td></tr>
            <tr><td>تاريخ التسجيل</td><td>${receipt.registeredAt}</td></tr>
          </table>
        </div>
        <div class="footer">
          <p>هذا الإيصال هو إثبات لتسجيل الترشيح</p>
          <p>يرجى الاحتفاظ بهذا الإيصال ورقم التسجيل</p>
          <p style="margin-top:8px;color:#8B7D3C;">المروج للألبان - Al Morooj Dairy</p>
        </div>
        <script>window.onload=function(){setTimeout(function(){window.print();},500);}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const checkVoteStatus = async () => {
    if (!voterCode.trim()) { toast.error("أدخل كود المورد"); return; }
    if (!voterCenter) { toast.error("اختر مركزك أولاً"); return; }
    try {
      const res = await axios.get(`${API}/api/elections/check-vote/${selected.id}/${voterCode.trim()}/${voterCenter}`);
      setHasVoted(res.data.has_voted);
      if (res.data.has_voted) {
        setVotedFor(res.data.vote?.candidate_id);
        toast.info("لقد قمت بالتصويت مسبقاً");
      }
    } catch {}
  };

  const handleVote = async (candidateId) => {
    if (!voterCode.trim()) { toast.error("أدخل كود المورد أولاً"); return; }
    if (!voterCenter) { toast.error("اختر مركزك أولاً"); return; }
    if (!window.confirm("هل أنت متأكد من التصويت لهذا المرشح؟ لا يمكن تغيير التصويت لاحقاً.")) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/elections/vote`, {
        election_id: selected.id,
        voter_supplier_code: voterCode.trim(),
        voter_center: voterCenter,
        candidate_id: candidateId
      });
      toast.success("تم التصويت بنجاح! شكراً لمشاركتك");
      setHasVoted(true);
      setVotedFor(candidateId);
    } catch (err) {
      toast.error(err.response?.data?.detail || "خطأ في التصويت");
    } finally { setSubmitting(false); }
  };

  const goBack = () => {
    setSelected(null);
    setView("list");
    setCandidates([]);
    setRegForm({ name: "", supplier_code: "", national_id: "", supply_type: "", center_name: "" });
    setSupplierCode("");
    setSupplierFound(null);
    setVoterCode("");
    setVoterCenter("");
    setHasVoted(false);
    setVotedFor(null);
    setReceipt(null);
  };

  // ===== Election List =====
  if (!selected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4 md:p-8" dir="rtl">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <img src="/company-logo.png" alt="المروج للألبان" className="mx-auto w-24 h-24 object-contain" />
            <h1 className="text-2xl font-bold">المروج للألبان</h1>
            <p className="text-sm text-muted-foreground">Al Morooj Dairy</p>
            <h2 className="text-lg font-semibold mt-2">ترشيح وتصويت الموردين</h2>
            <p className="text-muted-foreground">اختر عملية الانتخاب للمشاركة</p>
          </div>
          {elections.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              لا توجد انتخابات حالياً
            </CardContent></Card>
          ) : (
            elections.map(e => (
              <Card key={e.id} className="cursor-pointer hover:shadow-lg transition-all hover:border-indigo-300"
                onClick={() => selectElection(e)} data-testid={`election-select-${e.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{e.title}</CardTitle>
                    <Badge variant={e.status === "nomination" ? "default" : e.status === "voting" ? "destructive" : "secondary"}>
                      {statusLabels[e.status]}
                    </Badge>
                  </div>
                  {e.description && <CardDescription>{e.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {e.candidates_count} مرشح</span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" />
                      {e.status === "nomination" ? "الترشيح مفتوح" : e.status === "voting" ? "التصويت مفتوح" : statusLabels[e.status]}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  // ===== Nomination View =====
  if (view === "nominate") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8" dir="rtl">
        <div className="max-w-2xl mx-auto space-y-6">
          <Button variant="ghost" onClick={goBack} className="mb-2">
            <ArrowLeft className="w-4 h-4 ms-1" /> رجوع
          </Button>
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold">{selected.title}</h1>
            <Badge className="bg-blue-100 text-blue-700">الترشيح مفتوح</Badge>
          </div>

          {/* Registration Form */}
          {selected.status === "nomination" && (
            <Card data-testid="nomination-form">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600" /> تسجيل ترشيح جديد
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Supplier Code Lookup */}
                <div>
                  <Label>كود المورد</Label>
                  <div className="flex gap-2">
                    <Input value={supplierCode} onChange={e => setSupplierCode(e.target.value)}
                      placeholder="أدخل كود المورد للبحث" data-testid="lookup-code-input"
                      onKeyDown={e => e.key === "Enter" && lookupSupplier()} />
                    <Button onClick={lookupSupplier} disabled={lookupLoading} variant="outline" data-testid="lookup-btn">
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                  {supplierFound === true && <p className="text-xs text-green-600 mt-1">تم العثور على بيانات المورد</p>}
                  {supplierFound === false && <p className="text-xs text-orange-600 mt-1">لم يتم العثور - أدخل البيانات يدوياً</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>الاسم *</Label>
                    <Input value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})}
                      placeholder="اسم المرشح" data-testid="candidate-name-input" />
                  </div>
                  <div>
                    <Label>رقم المدني</Label>
                    <Input value={regForm.national_id} onChange={e => setRegForm({...regForm, national_id: e.target.value})}
                      placeholder="رقم الهوية المدنية" data-testid="candidate-id-input" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>نوع التوريد</Label>
                    <Input value={regForm.supply_type} onChange={e => setRegForm({...regForm, supply_type: e.target.value})}
                      placeholder="مثال: أبقار / أغنام" />
                  </div>
                  <div>
                    <Label>مركز التوريد *</Label>
                    <select
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={regForm.center_name}
                      onChange={e => setRegForm({...regForm, center_name: e.target.value})}
                      data-testid="center-select"
                    >
                      <option value="">-- اختر المركز --</option>
                      {(selected?.centers || ["زيك", "حجيف", "غدو"]).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button onClick={handleRegister} disabled={submitting} className="w-full" data-testid="register-candidate-btn">
                  {submitting ? "جاري التسجيل..." : <><UserPlus className="w-4 h-4 me-2" /> تسجيل كمرشح</>}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Receipt after registration */}
          {receipt && (
            <Card className="border-green-300 bg-green-50" data-testid="registration-receipt">
              <CardContent className="py-6 text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <h3 className="text-lg font-bold text-green-700">تم تسجيل الترشيح بنجاح!</h3>
                <div className="bg-white rounded-lg p-4 border">
                  <p className="text-sm text-muted-foreground">رقم التسجيل</p>
                  <p className="text-2xl font-bold font-mono tracking-wider">{receipt.candidateId.substring(0, 8).toUpperCase()}</p>
                </div>
                <Button onClick={printReceipt} className="gap-2" data-testid="print-receipt-btn">
                  <Printer className="w-4 h-4" /> طباعة إيصال التسجيل
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setReceipt(null)}>إغلاق</Button>
              </CardContent>
            </Card>
          )}

          {/* Candidates List - grouped by center, numbers only */}
          {(selected?.centers || ["زيك", "حجيف", "غدو"]).map(center => {
            const centerCandidates = candidates.filter(c => c.center_name === center);
            return (
              <Card key={center}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" /> مركز {center} ({centerCandidates.length} مرشح)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {centerCandidates.length === 0 ? (
                    <p className="text-center text-muted-foreground py-3 text-sm">لا يوجد مرشحون في هذا المركز</p>
                  ) : (
                    <div className="space-y-2">
                      {centerCandidates.map((c, i) => (
                        <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white"
                          data-testid={`candidate-${c.id}`}>
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm">
                            {i + 1}
                          </div>
                          <p className="font-medium font-mono text-sm">رقم التسجيل: {c.id.substring(0, 8).toUpperCase()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Switch to voting if available */}
          {(selected.status === "voting" || selected.status === "pending_voting") && (
            <Button className="w-full" onClick={() => setView("vote")}>
              <Vote className="w-4 h-4 me-2" /> الانتقال للتصويت
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ===== Voting View =====
  if (view === "vote") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-4 md:p-8" dir="rtl">
        <div className="max-w-2xl mx-auto space-y-6">
          <Button variant="ghost" onClick={goBack} className="mb-2">
            <ArrowLeft className="w-4 h-4 ms-1" /> رجوع
          </Button>
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold">{selected.title}</h1>
            <Badge className="bg-green-100 text-green-700">التصويت مفتوح</Badge>
          </div>

          {/* Voter Identification */}
          {!hasVoted && (
            <Card data-testid="voter-id-card">
              <CardHeader>
                <CardTitle className="text-lg">التحقق من هوية المصوت</CardTitle>
                <CardDescription>أدخل كود المورد واختر مركزك للتصويت</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input value={voterCode} onChange={e => setVoterCode(e.target.value)}
                    placeholder="كود المورد" data-testid="voter-code-input" />
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[120px]"
                    value={voterCenter}
                    onChange={e => setVoterCenter(e.target.value)}
                    data-testid="voter-center-select"
                  >
                    <option value="">المركز</option>
                    {(selected?.centers || ["زيك", "حجيف", "غدو"]).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <Button onClick={checkVoteStatus} variant="outline" data-testid="check-vote-btn">
                    <Search className="w-4 h-4 me-1" /> تحقق
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Already Voted */}
          {hasVoted && (
            <Card className="border-green-300 bg-green-50">
              <CardContent className="py-8 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-green-700">تم التصويت بنجاح</h3>
                <p className="text-green-600 mt-1">شكراً لمشاركتك. لقد قمت بالتصويت مسبقاً.</p>
              </CardContent>
            </Card>
          )}

          {/* Candidates to vote for - filtered by voter's center */}
          {!hasVoted && voterCode && voterCenter && selected.status === "voting" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Vote className="w-5 h-5 text-green-600" /> مرشحو مركز {voterCenter}
                </CardTitle>
                <CardDescription>اضغط على "تصويت" بجانب المرشح الذي تريد التصويت له</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const centerCandidates = candidates.filter(c => c.center_name === voterCenter);
                  return centerCandidates.length === 0 ? (
                    <p className="text-center text-muted-foreground py-6">لا يوجد مرشحون في مركز {voterCenter}</p>
                  ) : (
                    <div className="space-y-3">
                      {centerCandidates.map(c => (
                        <div key={c.id} className="flex items-center gap-3 p-4 rounded-lg border bg-white hover:border-green-300 transition-colors"
                          data-testid={`vote-candidate-${c.id}`}>
                          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                            <Users className="w-6 h-6 text-indigo-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold">{c.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {c.supplier_code && `كود: ${c.supplier_code}`}
                            </p>
                          </div>
                          <Button onClick={() => handleVote(c.id)} disabled={submitting}
                            className="bg-green-600 hover:bg-green-700" data-testid={`vote-btn-${c.id}`}>
                            <Vote className="w-4 h-4 me-1" /> تصويت
                          </Button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* View candidates in non-voting state */}
          {selected.status !== "voting" && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>التصويت غير مفتوح حالياً</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return null;
}
