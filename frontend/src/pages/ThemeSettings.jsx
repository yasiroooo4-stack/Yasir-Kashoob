import { useState, useEffect } from "react";
import { useLanguage } from "../App";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Palette, Sun, Moon, Sparkles } from "lucide-react";

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
  
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem("app_theme") || "default";
  });
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("dark_mode") === "true";
  });

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

  // Apply theme
  const applyTheme = (themeId) => {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return;
    
    // Set CSS variables
    document.documentElement.setAttribute('data-theme', themeId);
    document.documentElement.style.setProperty('--theme-primary', theme.primary);
    document.documentElement.style.setProperty('--theme-primary-dark', theme.secondary);
    
    // Convert primary color to HSL for shadcn
    const primaryHSL = hexToHSL(theme.primary);
    document.documentElement.style.setProperty('--primary', primaryHSL);
    
    // Save to localStorage
    localStorage.setItem("app_theme", themeId);
    setCurrentTheme(themeId);
    
    toast.success(language === "ar" ? "تم تغيير الثيم بنجاح" : "Theme changed successfully");
  };

  // Toggle dark mode
  const toggleDarkMode = (enabled) => {
    setDarkMode(enabled);
    localStorage.setItem("dark_mode", enabled.toString());
    
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    toast.success(language === "ar" ? "تم تغيير الوضع" : "Mode changed");
  };

  // Apply saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("app_theme") || "default";
    const theme = THEMES.find(t => t.id === savedTheme);
    if (theme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      document.documentElement.style.setProperty('--theme-primary', theme.primary);
      document.documentElement.style.setProperty('--theme-primary-dark', theme.secondary);
    }
    
    const savedDarkMode = localStorage.getItem("dark_mode") === "true";
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const content = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          {language === "ar" ? "المظهر والألوان" : "Appearance & Colors"}
        </CardTitle>
        <CardDescription>
          {language === "ar" ? "تخصيص مظهر التطبيق" : "Customize the app appearance"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
          <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
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
