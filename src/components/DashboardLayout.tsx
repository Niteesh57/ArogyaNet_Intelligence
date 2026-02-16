import { useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import bgImage from "@/assets/bg-gradient.png";
import {
  LayoutDashboard, Stethoscope, HeartPulse, Users, Package, FlaskConical,
  Building2, CalendarClock, LogOut, Menu, X, ChevronLeft
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["super_admin", "hospital_admin", "doctor", "nurse", "patient"] },
  { title: "Doctors", path: "/doctors", icon: Stethoscope, roles: ["super_admin", "hospital_admin"] },
  { title: "Nurses", path: "/nurses", icon: HeartPulse, roles: ["super_admin", "hospital_admin"] },
  { title: "Patients", path: "/patients", icon: Users, roles: ["super_admin", "hospital_admin", "doctor", "nurse"] },
  { title: "Inventory", path: "/inventory", icon: Package, roles: ["super_admin", "hospital_admin"] },
  { title: "Lab Tests", path: "/lab-tests", icon: FlaskConical, roles: ["super_admin", "hospital_admin"] },
  { title: "Floors", path: "/floors", icon: Building2, roles: ["super_admin", "hospital_admin"] },
  { title: "Availability", path: "/availability", icon: CalendarClock, roles: ["super_admin", "hospital_admin", "doctor", "nurse"] },
];

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const bgRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!bgRef.current) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 12;
      const y = (e.clientY / window.innerHeight - 0.5) * 12;
      bgRef.current.style.transform = `translate(${x}px, ${y}px) scale(1.05)`;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const visibleItems = navItems.filter((item) =>
    user?.role && item.roles.includes(user.role)
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-border/30">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <span className="text-primary-foreground font-serif font-bold text-sm">LH</span>
          </div>
          {!collapsed && (
            <div>
              <h2 className="font-serif text-lg font-semibold text-foreground leading-tight">LIFE HEALTH</h2>
              <p className="text-[10px] tracking-[0.3em] text-primary/70">CRM</p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-themed">
        {visibleItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                active
                  ? "bg-primary/15 text-primary shadow-[0_0_15px_hsla(170,66%,51%,0.1)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40"
              }`}
            >
              <item.icon className={`w-4 h-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-3 border-t border-border/30 space-y-2">
        {!collapsed && user && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-foreground truncate">{user.full_name || user.email}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{user.role?.replace("_", " ")}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Parallax background */}
      <div
        ref={bgRef}
        className="fixed inset-[-40px] bg-cover bg-center bg-no-repeat transition-transform duration-[800ms] ease-out will-change-transform -z-10"
        style={{ backgroundImage: `url(${bgImage})`, transform: "scale(1.05)" }}
      />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_30%_50%,hsla(170,66%,51%,0.06)_0%,transparent_60%)] -z-10" />

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 glass-panel flex items-center px-4 border-b border-border/30">
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-foreground p-1">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <span className="ml-3 font-serif text-lg font-semibold text-foreground">LIFE HEALTH</span>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div className="w-64 h-full glass-panel" onClick={(e) => e.stopPropagation()}>
            <SidebarContent />
          </div>
        </div>
      )}

      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-30 glass-panel border-r border-border/30 transition-all duration-300 ${collapsed ? "w-[68px]" : "w-60"}`}>
          <SidebarContent />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-background border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className={`w-3 h-3 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </aside>

        {/* Main content */}
        <main className={`flex-1 transition-all duration-300 ${collapsed ? "lg:ml-[68px]" : "lg:ml-60"} pt-14 lg:pt-0`}>
          <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
