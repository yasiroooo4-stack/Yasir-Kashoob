import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { toast } from "sonner";
import {
  Brain,
  Send,
  Loader2,
  Users,
  Calendar,
  DollarSign,
  Milk,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useLanguage } from "../App";

const API = process.env.REACT_APP_BACKEND_URL;

const CATEGORIES = [
  { id: "general", name: "تحليل عام", name_en: "General Analysis", icon: Brain },
  { id: "hr", name: "الموارد البشرية", name_en: "Human Resources", icon: Users },
  { id: "attendance", name: "الحضور والانصراف", name_en: "Attendance", icon: Calendar },
  { id: "sales", name: "المبيعات", name_en: "Sales", icon: DollarSign },
  { id: "milk", name: "الحليب", name_en: "Milk Reception", icon: Milk },
];

const SAMPLE_QUESTIONS = {
  ar: [
    "ما هو معدل الحضور هذا الشهر؟",
    "كم عدد الموظفين في كل قسم؟",
    "ما هو إجمالي المبيعات؟",
    "كم كمية الحليب المستلمة؟",
    "ما هي نسبة الغياب؟",
    "من هم الموظفون الأكثر غياباً؟",
  ],
  en: [
    "What is the attendance rate this month?",
    "How many employees in each department?",
    "What is the total sales?",
    "How much milk was received?",
    "What is the absence rate?",
    "Who are the most absent employees?",
  ],
};

const Analysis = () => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/api/analysis/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSummary(response.data);
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) {
      toast.error(language === "ar" ? "يرجى كتابة سؤال" : "Please enter a question");
      return;
    }

    setLoading(true);
    setAnswer(null);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API}/api/analysis/query`,
        { question, category },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAnswer(response.data);
      setHistory((prev) => [
        { question, answer: response.data.answer, category, timestamp: new Date() },
        ...prev.slice(0, 9),
      ]);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error analyzing query");
    } finally {
      setLoading(false);
    }
  };

  const handleSampleQuestion = (q) => {
    setQuestion(q);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-7 h-7 text-purple-600" />
            {language === "ar" ? "التحليل الذكي" : "Smart Analysis"}
          </h1>
          <p className="text-muted-foreground">
            {language === "ar"
              ? "اسأل أي سؤال عن البيانات واحصل على إجابة ذكية"
              : "Ask any question about your data and get smart insights"}
          </p>
        </div>
        <Badge variant="outline" className="text-purple-600 border-purple-300">
          <Sparkles className="w-4 h-4 me-1" />
          {language === "ar" ? "مدعوم بالذكاء الاصطناعي" : "AI Powered"}
        </Badge>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" ? "الموظفين" : "Employees"}
                  </p>
                  <p className="text-xl font-bold">{summary.employees?.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" ? "نسبة الحضور" : "Attendance Rate"}
                  </p>
                  <p className="text-xl font-bold">{summary.attendance?.attendance_rate || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" ? "المبيعات" : "Sales"}
                  </p>
                  <p className="text-xl font-bold">{summary.sales?.total_amount?.toFixed(3) || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Milk className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" ? "كمية الحليب" : "Milk Quantity"}
                  </p>
                  <p className="text-xl font-bold">{summary.milk?.total_quantity || 0} L</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Query Input */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                {language === "ar" ? "اسأل سؤالك" : "Ask Your Question"}
              </CardTitle>
              <CardDescription>
                {language === "ar"
                  ? "اكتب سؤالك بلغة طبيعية وسيقوم النظام بتحليل البيانات"
                  : "Write your question in natural language"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <span className="flex items-center gap-2">
                            <cat.icon className="w-4 h-4" />
                            {language === "ar" ? cat.name : cat.name_en}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={
                    language === "ar"
                      ? "مثال: ما هو معدل الحضور هذا الشهر؟"
                      : "Example: What is the attendance rate this month?"
                  }
                  rows={3}
                  className="resize-none"
                />

                <Button
                  type="submit"
                  disabled={loading || !question.trim()}
                  className="w-full gradient-primary text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      {language === "ar" ? "جاري التحليل..." : "Analyzing..."}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 me-2" />
                      {language === "ar" ? "تحليل" : "Analyze"}
                    </>
                  )}
                </Button>
              </form>

              {/* Sample Questions */}
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  {language === "ar" ? "أسئلة مقترحة:" : "Suggested questions:"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_QUESTIONS[language === "ar" ? "ar" : "en"].map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSampleQuestion(q)}
                      className="text-xs"
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Answer Display */}
          {answer && (
            <Card className="border-purple-200 bg-purple-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <Sparkles className="w-5 h-5" />
                  {language === "ar" ? "نتيجة التحليل" : "Analysis Result"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {language === "ar" ? "السؤال:" : "Question:"}
                  </p>
                  <p className="mb-4">{answer.question}</p>

                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {language === "ar" ? "الإجابة:" : "Answer:"}
                  </p>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                    {answer.answer}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* History & Stats */}
        <div className="space-y-4">
          {/* Quick Stats */}
          {summary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  {language === "ar" ? "توزيع الموظفين" : "Employee Distribution"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(summary.employees?.by_department || {}).map(([dept, count]) => (
                    <div key={dept} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{dept}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                {language === "ar" ? "سجل الأسئلة" : "Query History"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {language === "ar" ? "لا توجد أسئلة سابقة" : "No previous queries"}
                </p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {history.map((item, i) => (
                    <div
                      key={i}
                      className="p-2 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                      onClick={() => setQuestion(item.question)}
                    >
                      <p className="text-sm font-medium truncate">{item.question}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Analysis;
