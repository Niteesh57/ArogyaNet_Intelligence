import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Stethoscope, HeartPulse, Users, Package, FlaskConical,
  Building2, CalendarClock, LogOut, Menu, X, ChevronLeft
} from "lucide-react";

const navItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["super_admin", "hospital_admin", "doctor", "nurse", "patient"] },
  { title: "Doctors", path: "/doctors", icon: Stethoscope, roles: ["super_admin", "hospital_admin"] },
  { title: "Nurses", path: "/nurses", icon: HeartPulse, roles: ["super_admin", "hospital_admin"] },
  { title: "Patients", path: "/patients", icon: Users, roles: ["super_admin", "hospital_admin", "doctor", "nurse"] },
  { title: "Medicines", path: "/medicines", icon: Package, roles: ["super_admin", "hospital_admin"] },
  { title: "Lab Tests", path: "/lab-tests", icon: FlaskConical, roles: ["super_admin", "hospital_admin"] },
  { title: "Floors", path: "/floors", icon: Building2, roles: ["super_admin", "hospital_admin"] },
  { title: "Availability", path: "/availability", icon: CalendarClock, roles: ["super_admin", "hospital_admin", "doctor", "nurse"] },
];

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = navItems.filter((item) =>
    user?.role && item.roles.includes(user.role)
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border/50">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-sidebar-primary flex items-center justify-center shadow-md">
            <span className="text-sidebar-primary-foreground font-bold text-sm">LH</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sm leading-none tracking-tight">LIFE HEALTH</span>
              <span className="text-[10px] text-muted-foreground uppercase opacity-80">Secure CRM</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200 group ${active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
            >
              <item.icon className={`w-4 h-4 shrink-0 transition-colors ${active ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"}`} />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-sidebar-border/50">
        {!collapsed && user && (
          <div className="mb-4 px-2">
            <p className="text-sm font-medium truncate">{user.full_name || user.email}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role?.replace("_", " ")}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-background flex">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-sidebar px-4 flex items-center justify-between border-b border-sidebar-border shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-sidebar-foreground p-1 hover:bg-sidebar-accent rounded-md">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-semibold text-sidebar-foreground">Life Health CRM</span>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div className="w-64 h-full" onClick={(e) => e.stopPropagation()}>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={`hidden lg:block sticky top-0 h-screen transition-all duration-300 ${collapsed ? "w-[70px]" : "w-64"}`}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-sidebar-foreground transition-colors z-50"
        >
          <ChevronLeft className={`w-3 h-3 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 pt-16 lg:pt-0">
        <div className="h-full px-4 py-8 lg:px-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
