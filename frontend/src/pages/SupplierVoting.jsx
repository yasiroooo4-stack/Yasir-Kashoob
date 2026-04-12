import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Vote, UserPlus, Search, CheckCircle, Users, Clock, Trophy, ArrowLeft, Printer, Timer, Camera, RotateCcw
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const statusLabels = {
  draft: "لم يبدأ بعد",
  nomination: "الترشيح مفتوح",
  pending_voting: "بانتظار التصويت",
  voting: "التصويت مفتوح",
  closed: "مغلق",
};

// مكون العد التنازلي
function Countdown({ election }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [label, setLabel] = useState("");

  useEffect(() => {
    const calcTime = () => {
      const now = new Date();
      const nomStart = new Date(election.nomination_start);
      const nomEnd = new Date(election.nomination_end);
      const voteStart = new Date(election.voting_start);
      const voteEnd = new Date(election.voting_end);

      let target, text;
      if (now < nomStart) {
        target = nomStart; text = "يبدأ الترشيح بعد";
      } else if (now <= nomEnd) {
        target = nomEnd; text = "ينتهي الترشيح بعد";
      } else if (now < voteStart) {
        target = voteStart; text = "يبدأ التصويت بعد";
      } else if (now <= voteEnd) {
        target = voteEnd; text = "ينتهي التصويت بعد";
      } else {
        setLabel(""); setTimeLeft("انتهى"); return;
      }

      const diff = target - now;
      if (diff <= 0) { setTimeLeft("الآن!"); setLabel(text); return; }

      const days = Math.floor(diff / 86400000);
      const hrs = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      let parts = [];
      if (days > 0) parts.push(`${days} يوم`);
      if (hrs > 0) parts.push(`${hrs} ساعة`);
      if (mins > 0) parts.push(`${mins} دقيقة`);
      if (days === 0) parts.push(`${secs} ثانية`);

      setTimeLeft(parts.join("  "));
      setLabel(text);
    };

    calcTime();
    const interval = setInterval(calcTime, 1000);
    return () => clearInterval(interval);
  }, [election]);

  if (!timeLeft || timeLeft === "انتهى") return null;

  return (
    <div className="mt-3 p-3 rounded-lg bg-gradient-to-l from-amber-50 to-orange-50 border border-amber-200" data-testid="countdown-timer">
      <div className="flex items-center gap-2 justify-center">
        <Timer className="w-4 h-4 text-amber-600 animate-pulse" />
        <span className="text-sm font-medium text-amber-700">{label}</span>
      </div>
      <p className="text-center text-lg font-bold text-amber-800 mt-1 font-mono tracking-wide">{timeLeft}</p>
    </div>
  );
}

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
  const [voterCenter, setVoterCenter] = useState(""); // مركز المصوت
  const [capturedPhoto, setCapturedPhoto] = useState(null); // صورة الإثبات
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const fetchElections = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/elections/list`);
      setElections(res.data);
    } catch {}
  }, []);

  useEffect(() => { fetchElections(); }, [fetchElections]);

  // ===== Camera Functions =====
  const startCamera = async () => {
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      // Wait for video element to render then attach stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch (err) {
      setShowCamera(false);
      toast.error("لا يمكن الوصول للكاميرا. يرجى السماح بالوصول من إعدادات المتصفح");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    // Mirror the image (front camera)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

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
        toast.success(`تم العثور على المورد: ${s.name}`);
      } else {
        setSupplierFound(false);
        setRegForm({ name: "", supplier_code: "", national_id: "", supply_type: "", center_name: "" });
        toast.error("كود المورد غير موجود في النظام");
      }
    } catch {
      setSupplierFound(false);
    } finally { setLookupLoading(false); }
  };

  const handleRegister = async () => {
    if (!regForm.name) { toast.error("يرجى إدخال الاسم"); return; }
    if (!capturedPhoto) { toast.error("يرجى التقاط صورة شخصية للإثبات"); return; }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/api/elections/register-candidate`, {
        election_id: selected.id,
        ...regForm,
        photo: capturedPhoto
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
      setCapturedPhoto(null);
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

  const [voterName, setVoterName] = useState("");
  const [voterVerified, setVoterVerified] = useState(false);

  const checkVoteStatus = async () => {
    if (!voterCode.trim()) { toast.error("أدخل كود المورد"); return; }
    try {
      // البحث عن بيانات المورد تلقائياً
      const lookupRes = await axios.get(`${API}/api/elections/lookup-supplier/${voterCode.trim()}`);
      if (!lookupRes.data.found) {
        toast.error("كود المورد غير موجود في النظام");
        setVoterVerified(false);
        return;
      }
      const supplier = lookupRes.data.supplier;
      setVoterCenter(supplier.center_name || "");
      setVoterName(supplier.name || "");
      setVoterVerified(true);

      if (!supplier.center_name) {
        toast.error("لم يتم تحديد مركز لهذا المورد");
        return;
      }

      // التحقق إذا صوت مسبقاً
      const res = await axios.get(`${API}/api/elections/check-vote/${selected.id}/${voterCode.trim()}/${supplier.center_name}`);
      setHasVoted(res.data.has_voted);
      if (res.data.has_voted) {
        setVotedFor(res.data.vote?.candidate_id);
        toast.info("لقد قمت بالتصويت مسبقاً");
      } else {
        toast.success(`مرحباً ${supplier.name} - مركز ${supplier.center_name}`);
      }
    } catch {
      toast.error("خطأ في التحقق");
    }
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
    stopCamera();
    setSelected(null);
    setView("list");
    setCandidates([]);
    setRegForm({ name: "", supplier_code: "", national_id: "", supply_type: "", center_name: "" });
    setSupplierCode("");
    setSupplierFound(null);
    setVoterCode("");
    setVoterCenter("");
    setVoterName("");
    setVoterVerified(false);
    setHasVoted(false);
    setVotedFor(null);
    setReceipt(null);
    setCapturedPhoto(null);
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
                  <Countdown election={e} />
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
            <Badge className={selected.status === "nomination" || selected.status === "draft" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}>
              {statusLabels[selected.status] || "لم يبدأ بعد"}
            </Badge>
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
                  <Label className="font-bold">أدخل كود المورد</Label>
                  <div className="flex gap-2">
                    <Input value={supplierCode} onChange={e => { setSupplierCode(e.target.value); setSupplierFound(null); setRegForm({ name: "", supplier_code: "", national_id: "", supply_type: "", center_name: "" }); }}
                      placeholder="أدخل كود المورد" data-testid="lookup-code-input"
                      onKeyDown={e => e.key === "Enter" && lookupSupplier()} />
                    <Button onClick={lookupSupplier} disabled={lookupLoading} data-testid="lookup-btn">
                      {lookupLoading ? "جاري البحث..." : <><Search className="w-4 h-4 me-1" /> بحث</>}
                    </Button>
                  </div>
                </div>

                {/* Supplier Data - Read Only */}
                {supplierFound === true && (
                  <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50/50 space-y-3" data-testid="supplier-data-card">
                    <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
                      <CheckCircle className="w-4 h-4" /> بيانات المورد
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white rounded-lg p-2.5 border">
                        <p className="text-[11px] text-muted-foreground">الاسم</p>
                        <p className="font-bold">{regForm.name}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 border">
                        <p className="text-[11px] text-muted-foreground">كود المورد</p>
                        <p className="font-bold">{regForm.supplier_code}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 border">
                        <p className="text-[11px] text-muted-foreground">رقم المدني</p>
                        <p className="font-bold">{regForm.national_id || "-"}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 border">
                        <p className="text-[11px] text-muted-foreground">نوع التوريد</p>
                        <p className="font-bold">{regForm.supply_type || "-"}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 border col-span-2">
                        <p className="text-[11px] text-muted-foreground">مركز التوريد</p>
                        <p className="font-bold">{regForm.center_name}</p>
                      </div>
                    </div>
                  </div>
                )}

                {supplierFound === false && (
                  <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50 text-center">
                    <p className="text-red-600 font-medium">كود المورد غير موجود في النظام</p>
                    <p className="text-xs text-red-400 mt-1">يرجى التأكد من الكود والمحاولة مرة أخرى</p>
                  </div>
                )}

                {/* Camera - Only after supplier found */}
                {supplierFound === true && (<>
                <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 bg-blue-50/50" data-testid="camera-section">
                  <Label className="font-bold text-blue-700 flex items-center gap-2 mb-3">
                    <Camera className="w-4 h-4" /> صورة إثبات شخصية (إجباري) *
                  </Label>
                  {!capturedPhoto && !showCamera && (
                    <Button type="button" onClick={startCamera} variant="outline" className="w-full gap-2 border-blue-300 text-blue-700 hover:bg-blue-100" data-testid="open-camera-btn">
                      <Camera className="w-5 h-5" /> فتح الكاميرا للتصوير
                    </Button>
                  )}
                  {showCamera && (
                    <div className="space-y-3">
                      <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          className="w-full h-full object-cover" 
                          style={{ transform: "scaleX(-1)" }}
                          onLoadedMetadata={(e) => e.target.play()}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" onClick={capturePhoto} className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700" data-testid="capture-btn">
                          <Camera className="w-4 h-4" /> التقاط الصورة
                        </Button>
                        <Button type="button" onClick={stopCamera} variant="outline" className="gap-2">
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  )}
                  {capturedPhoto && (
                    <div className="space-y-3">
                      <div className="relative rounded-lg overflow-hidden border-2 border-green-400">
                        <img src={capturedPhoto} alt="صورة المرشح" className="w-full aspect-[4/3] object-cover" />
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-green-500 text-white gap-1"><CheckCircle className="w-3 h-3" /> تم التصوير</Badge>
                        </div>
                      </div>
                      <Button type="button" onClick={retakePhoto} variant="outline" className="w-full gap-2" data-testid="retake-btn">
                        <RotateCcw className="w-4 h-4" /> إعادة التصوير
                      </Button>
                    </div>
                  )}
                </div>
                <Button onClick={handleRegister} disabled={submitting || !capturedPhoto} className="w-full" data-testid="register-candidate-btn">
                  {submitting ? "جاري التسجيل..." : <><UserPlus className="w-4 h-4 me-2" /> تسجيل كمرشح</>}
                </Button>
                </>)}
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
          {!hasVoted && !voterVerified && (
            <Card data-testid="voter-id-card">
              <CardHeader>
                <CardTitle className="text-lg">التحقق من هوية المصوت</CardTitle>
                <CardDescription>أدخل كود المورد للتحقق وعرض المرشحين في مركزك</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input value={voterCode} onChange={e => setVoterCode(e.target.value)}
                    placeholder="أدخل كود المورد" data-testid="voter-code-input"
                    onKeyDown={e => e.key === "Enter" && checkVoteStatus()} />
                  <Button onClick={checkVoteStatus} variant="outline" data-testid="check-vote-btn">
                    <Search className="w-4 h-4 me-1" /> تحقق
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Voter Info Card */}
          {voterVerified && !hasVoted && (
            <Card className="border-blue-200 bg-blue-50" data-testid="voter-info-card">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-blue-800">{voterName}</p>
                    <p className="text-sm text-blue-600">كود: {voterCode} | مركز: {voterCenter}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => { setVoterVerified(false); setVoterCode(""); setVoterCenter(""); setVoterName(""); }}>
                    تغيير
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
          {!hasVoted && voterVerified && voterCenter && selected.status === "voting" && (
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
