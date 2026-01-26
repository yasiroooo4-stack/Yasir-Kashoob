import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { API, useLanguage, AuthContext } from "../App";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Palette, Sun, Moon, Sparkles, Loader2 } from "lucide-react";

// Theme configurations
const THEMES = [
  { 
    id: "default", 
    name: "الافتراضي", 
    name_en: "Default",
    primary: "#2563eb",
    secondary: "#64748b",
    accent: "#f59e0b",
    gradient: "from-blue-600 to-blue-800"
  },
  { 
    id: "ocean", 
    name: "المحيط", 
    name_en: "Ocean",
    primary: "#0ea5e9",
    secondary: "#0284c7",
    accent: "#38bdf8",
    gradient: "from-cyan-500 to-blue-600"
  },
  { 
    id: "forest", 
    name: "الغابة", 
    name_en: "Forest",
    primary: "#16a34a",
    secondary: "#15803d",
    accent: "#22c55e",
    gradient: "from-green-500 to-emerald-600"
  },
  { 
    id: "sunset", 
    name: "الغروب", 
    name_en: "Sunset",
    primary: "#f97316",
    secondary: "#ea580c",
    accent: "#fb923c",
    gradient: "from-orange-500 to-red-500"
  },
  { 
    id: "royal", 
    name: "الملكي", 
    name_en: "Royal",
    primary: "#7c3aed",
    secondary: "#6d28d9",
    accent: "#a78bfa",
    gradient: "from-purple-600 to-indigo-600"
  },
  { 
    id: "rose", 
    name: "الوردي", 
    name_en: "Rose",
    primary: "#e11d48",
    secondary: "#be123c",
    accent: "#fb7185",
    gradient: "from-rose-500 to-pink-600"
  },
  { 
    id: "dark", 
    name: "الداكن", 
    name_en: "Dark",
    primary: "#6366f1",
    secondary: "#4f46e5",
    accent: "#818cf8",
    gradient: "from-slate-700 to-slate-900"
  },
  { 
    id: "slate", 
    name: "الرمادي", 
    name_en: "Slate",
    primary: "#475569",
    secondary: "#334155",
    accent: "#60a5fa",
    gradient: "from-slate-800 to-slate-900"
  }
];

const ThemeSettings = ({ embedded = false }) => {
  const { language } = useLanguage();
  const { user } = useContext(AuthContext);
  
  const [currentTheme, setCurrentTheme] = useState("default");
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // Helper: Convert hex to HSL for shadcn
  const hexToHSL = (hex) => {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
        default: h = 0;
      }
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  // Load user settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!token) {
        // Fallback to localStorage if not logged in
        const savedTheme = localStorage.getItem("app_theme") || "default";
        const savedDarkMode = localStorage.getItem("dark_mode") === "true";
        setCurrentTheme(savedTheme);
        setDarkMode(savedDarkMode);
        applyThemeToDOM(savedTheme, savedDarkMode);
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${API}/user/settings`, { headers });
        const settings = res.data;
        
        const themeId = settings.app_theme || "default";
        const isDarkMode = settings.dark_mode || false;
        
        setCurrentTheme(themeId);
        setDarkMode(isDarkMode);
        applyThemeToDOM(themeId, isDarkMode);
      } catch (error) {
        console.error("Failed to load settings:", error);
        // Fallback to localStorage
        const savedTheme = localStorage.getItem("app_theme") || "default";
        const savedDarkMode = localStorage.getItem("dark_mode") === "true";
        setCurrentTheme(savedTheme);
        setDarkMode(savedDarkMode);
        applyThemeToDOM(savedTheme, savedDarkMode);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [token]);

  // Apply theme to DOM
  const applyThemeToDOM = (themeId, isDark) => {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return;
    
    document.documentElement.setAttribute('data-theme', themeId);
    document.documentElement.style.setProperty('--theme-primary', theme.primary);
    document.documentElement.style.setProperty('--theme-primary-dark', theme.secondary);
    
    const primaryHSL = hexToHSL(theme.primary);
    document.documentElement.style.setProperty('--primary', primaryHSL);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Save settings to backend
  const saveSettings = async (themeId, isDarkMode) => {
    if (!token) {
      // No auth - just use localStorage
      localStorage.setItem("app_theme", themeId);
      localStorage.setItem("dark_mode", isDarkMode.toString());
      return;
    }

    setSaving(true);
    try {
      await axios.put(`${API}/user/settings`, {
        app_theme: themeId,
        dark_mode: isDarkMode,
        // Keep other settings unchanged
        background_id: "bg1",
        theme: "light",
        sidebar_collapsed: false
      }, { headers });
      
      // Also save to localStorage as backup
      localStorage.setItem("app_theme", themeId);
      localStorage.setItem("dark_mode", isDarkMode.toString());
    } catch (error) {
      console.error("Failed to save settings:", error);
      // Save to localStorage anyway
      localStorage.setItem("app_theme", themeId);
      localStorage.setItem("dark_mode", isDarkMode.toString());
    } finally {
      setSaving(false);
    }
  };

  // Apply theme
  const applyTheme = async (themeId) => {
    applyThemeToDOM(themeId, darkMode);
    setCurrentTheme(themeId);
    await saveSettings(themeId, darkMode);
    toast.success(language === "ar" ? "تم تغيير الثيم بنجاح" : "Theme changed successfully");
  };

  // Toggle dark mode
  const toggleDarkMode = async (enabled) => {
    setDarkMode(enabled);
    applyThemeToDOM(currentTheme, enabled);
    await saveSettings(currentTheme, enabled);
    toast.success(language === "ar" ? "تم تغيير الوضع" : "Mode changed");
  };

  const content = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          {language === "ar" ? "المظهر والألوان" : "Appearance & Colors"}
          {saving && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </CardTitle>
        <CardDescription>
          {language === "ar" ? "تخصيص مظهر التطبيق (يُحفظ تلقائياً لحسابك)" : "Customize the app appearance (auto-saved to your account)"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-100 dark:bg-slate-800">
              <div className="flex items-center gap-3">
                {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                <div>
                  <Label className="text-base">{language === "ar" ? "الوضع الداكن" : "Dark Mode"}</Label>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" ? "تفعيل الوضع الداكن للواجهة" : "Enable dark mode interface"}
                  </p>
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={toggleDarkMode} disabled={saving} />
            </div>

        {/* Theme Selection */}
        <div>
          <Label className="text-base flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4" />
            {language === "ar" ? "اختر الثيم" : "Choose Theme"}
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => applyTheme(theme.id)}
                className={`relative p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                  currentTheme === theme.id 
                    ? "border-primary ring-2 ring-primary/30" 
                    : "border-slate-200 dark:border-slate-700 hover:border-primary/50"
                }`}
              >
                {/* Theme Preview */}
                <div 
                  className={`w-full h-16 rounded-lg mb-3 bg-gradient-to-r ${theme.gradient}`}
                />
                
                {/* Theme Name */}
                <p className="font-medium text-sm">
                  {language === "ar" ? theme.name : theme.name_en}
                </p>
                
                {/* Color Dots */}
                <div className="flex gap-1 mt-2">
                  <div 
                    className="w-4 h-4 rounded-full border border-white shadow-sm" 
                    style={{ backgroundColor: theme.primary }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full border border-white shadow-sm" 
                    style={{ backgroundColor: theme.secondary }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full border border-white shadow-sm" 
                    style={{ backgroundColor: theme.accent }}
                  />
                </div>

                {/* Selected Badge */}
                {currentTheme === theme.id && (
                  <div className="absolute -top-2 -right-2 bg-primary text-white text-xs px-2 py-1 rounded-full shadow-lg">
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="mt-6 p-6 rounded-xl bg-slate-100 dark:bg-slate-800">
          <h4 className="font-medium mb-4">{language === "ar" ? "معاينة الأزرار" : "Button Preview"}</h4>
          <div className="flex flex-wrap gap-3">
            <Button 
              className="text-white"
              style={{ background: `linear-gradient(135deg, var(--theme-primary, #2563eb), var(--theme-primary-dark, #1d4ed8))` }}
            >
              {language === "ar" ? "زر أساسي" : "Primary Button"}
            </Button>
            <Button 
              variant="outline"
              style={{ borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)' }}
            >
              {language === "ar" ? "زر ثانوي" : "Secondary Button"}
            </Button>
            <Button 
              variant="ghost"
              style={{ color: 'var(--theme-primary)' }}
            >
              {language === "ar" ? "زر شفاف" : "Ghost Button"}
            </Button>
          </div>
          
          {/* Color Preview */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{language === "ar" ? "الألوان:" : "Colors:"}</span>
            <div 
              className="w-8 h-8 rounded-full shadow-md border-2 border-white"
              style={{ backgroundColor: 'var(--theme-primary)' }}
              title="Primary"
            />
            <div 
              className="w-8 h-8 rounded-full shadow-md border-2 border-white"
              style={{ backgroundColor: 'var(--theme-primary-dark)' }}
              title="Secondary"
            />
          </div>
        </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="w-7 h-7" />
            {language === "ar" ? "المظهر" : "Appearance"}
          </h1>
          <p className="text-muted-foreground">
            {language === "ar" ? "تخصيص مظهر التطبيق" : "Customize app appearance"}
          </p>
        </div>
      </div>
      {content}
    </div>
  );
};

export default ThemeSettings;
