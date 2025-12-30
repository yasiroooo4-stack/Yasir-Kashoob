import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth, useLanguage } from "../App";
import {
  LayoutDashboard,
  Users,
  Milk,
  ShoppingCart,
  Package,
  Wallet,
  UserCog,
  BarChart3,
  Menu,
  X,
  LogOut,
  Globe,
  ChevronLeft,
  ChevronRight,
  User,
  Wheat,
  Settings,
  Building2,
  Scale,
  FolderKanban,
  Activity,
  Megaphone,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import LetterRequestButton from "./LetterRequestButton";

const Layout = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "dashboard" },
    { path: "/suppliers", icon: Users, label: "suppliers", departments: ["purchasing", "milk_reception", "admin", "it"] },
    { path: "/milk-reception", icon: Milk, label: "milk_reception", departments: ["milk_reception", "admin", "it"] },
    { path: "/customers", icon: ShoppingCart, label: "customers", departments: ["sales", "admin", "it"] },
    { path: "/sales", icon: ShoppingCart, label: "sales", departments: ["sales", "admin", "it"] },
    { path: "/feed-purchases", icon: Wheat, label: "feed_purchases", departments: ["purchasing", "admin", "it"] },
    { path: "/inventory", icon: Package, label: "inventory", departments: ["inventory", "sales", "admin", "it"] },
    { path: "/finance", icon: Wallet, label: "finance", roles: ["admin", "accountant"], departments: ["finance", "admin", "it"] },
    { path: "/hr", icon: Building2, label: "hr", roles: ["admin", "hr_manager"], departments: ["hr", "admin", "it"] },
    { path: "/legal", icon: Scale, label: "legal", roles: ["admin"], departments: ["legal", "admin", "it"] },
    { path: "/projects", icon: FolderKanban, label: "projects", departments: ["projects", "admin", "it"] },
    { path: "/operations", icon: Activity, label: "operations", departments: ["operations", "admin", "it"] },
    { path: "/marketing", icon: Megaphone, label: "marketing", departments: ["marketing", "admin", "it"] },
    { path: "/employees", icon: UserCog, label: "employees", roles: ["admin", "hr_manager"], departments: ["hr", "admin", "it"] },
    { path: "/reports", icon: BarChart3, label: "reports" },
    { path: "/settings", icon: Settings, label: "settings" },
  ];

  // Filter nav items based on role and department
  const filteredNavItems = navItems.filter((item) => {
    // Admin and IT have access to everything
    if (user?.role === 'admin' || user?.department === 'it' || user?.department === 'admin') {
      return true;
    }
    
    // HR Manager has access to HR only
    if (user?.role === 'hr_manager') {
      return item.path === '/hr' || item.path === '/employees' || item.path === '/dashboard' || item.path === '/settings';
    }
    
    // Check role access
    if (item.roles && !item.roles.includes(user?.role)) {
      return false;
    }
    
    // Check department access
    if (item.departments && !item.departments.includes(user?.department)) {
      return false;
    }
    
    return true;
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getRoleLabel = (role) => {
    const roles = {
      admin: t("admin"),
      employee: t("employee"),
      accountant: t("accountant"),
    };
    return roles[role] || role;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 ${
          language === "ar" ? "right-0" : "left-0"
        } z-50 bg-white dark:bg-slate-800 border-e border-border shadow-lg lg:shadow-none transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-20"
        } ${mobileMenuOpen ? "translate-x-0" : language === "ar" ? "translate-x-full lg:translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_dairy-collect-sys/artifacts/gjkguf5p_almoroojdairy.png" 
                alt="المروج للألبان"
                className="w-10 h-10 rounded-xl object-contain"
              />
              <span className="font-bold text-lg text-foreground">
                {language === "ar" ? "المروج للألبان" : "Al-Morooj Dairy"}
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex"
            data-testid="sidebar-toggle-btn"
          >
            {language === "ar" ? (
              sidebarOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />
            ) : (
              sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden"
            data-testid="mobile-menu-close-btn"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? "active" : ""} ${!sidebarOpen ? "justify-center px-2" : ""}`
              }
              data-testid={`nav-${item.label}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{t(item.label)}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 header-brown border-b border-amber-600/30 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden"
              data-testid="mobile-menu-open-btn"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground hidden sm:block">
              {t("welcome")}, {user?.full_name}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleLanguage}
              className="gap-2"
              data-testid="language-toggle-btn"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{language === "ar" ? "English" : "العربية"}</span>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2" data-testid="user-menu-btn">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {user?.full_name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium">{user?.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {getRoleLabel(user?.role)}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={language === "ar" ? "start" : "end"} className="w-48">
                <DropdownMenuLabel>{t("settings")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2">
                  <User className="w-4 h-4" />
                  {user?.username}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 text-destructive focus:text-destructive"
                  onClick={handleLogout}
                  data-testid="logout-btn"
                >
                  <LogOut className="w-4 h-4" />
                  {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
