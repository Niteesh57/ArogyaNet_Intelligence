import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi } from "@/lib/api";
import {
  Stethoscope, HeartPulse, Users, Package, FlaskConical, CalendarClock,
  Brain, FileText, MessageSquare, Building2, Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";

const featureCards = [
  { title: "Zero Paper Work", desc: "Fully digital workflows", icon: FileText, path: "/dashboard" },
  { title: "AI Workload Optimization", desc: "Smart scheduling & allocation", icon: Brain, path: "/dashboard" },
  { title: "Auto Feedback System", desc: "Automated patient feedback", icon: MessageSquare, path: "/dashboard" },
  { title: "Doctor Management", desc: "Manage all physicians", icon: Stethoscope, path: "/doctors" },
  { title: "Nurse Management", desc: "Staff coordination", icon: HeartPulse, path: "/nurses" },
  { title: "Patient Management", desc: "Complete patient records", icon: Users, path: "/patients" },
  { title: "Inventory Management", desc: "Medicine & supply tracking", icon: Package, path: "/inventory" },
  { title: "Lab Management", desc: "Test scheduling & results", icon: FlaskConical, path: "/lab-tests" },
  { title: "Availability Scheduling", desc: "Staff availability planner", icon: CalendarClock, path: "/availability" },
];

interface Stats {
  total_doctors?: number;
  total_nurses?: number;
  total_patients?: number;
  total_medicines?: number;
  low_stock_alerts?: number;
  total_lab_tests?: number;
}

const AnimatedCounter = ({ target }: { target: number }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const step = Math.max(1, Math.floor(target / 40));
    const interval = setInterval(() => {
      setCount((c) => {
        if (c + step >= target) { clearInterval(interval); return target; }
        return c + step;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [target]);
  return <span>{count}</span>;
};

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState<Stats>({});

  useEffect(() => {
    if (isAdmin) {
      adminApi.dashboardStats().then((r) => setStats(r.data)).catch(() => {});
    }
  }, [isAdmin]);

  const statCards = [
    { label: "Total Doctors", value: stats.total_doctors || 0, icon: Stethoscope },
    { label: "Total Nurses", value: stats.total_nurses || 0, icon: HeartPulse },
    { label: "Total Patients", value: stats.total_patients || 0, icon: Users },
    { label: "Total Medicines", value: stats.total_medicines || 0, icon: Package },
    { label: "Low Stock Alerts", value: stats.low_stock_alerts || 0, icon: Sparkles, alert: true },
    { label: "Total Lab Tests", value: stats.total_lab_tests || 0, icon: FlaskConical },
  ];

  return (
    <div className="space-y-10">
      {/* Welcome */}
      <div className="text-center space-y-3 py-6 opacity-0 animate-fade-up" style={{ animationDelay: "100ms", animationFillMode: "forwards" }}>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground">
          Welcome to <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">LIFE HEALTH CRM</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          {user?.full_name ? `Hello, ${user.full_name}` : "Secure Systems for Modern Care"}
        </p>
      </div>

      {/* Stats (admin only) */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 opacity-0 animate-fade-up" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
          {statCards.map((s) => (
            <div
              key={s.label}
              className={`glass-panel rounded-xl p-4 text-center space-y-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_hsla(170,66%,51%,0.15)] ${
                s.alert && s.value > 0 ? "border-destructive/50 shadow-[0_0_20px_hsla(0,84%,60%,0.15)]" : ""
              }`}
            >
              <s.icon className={`w-5 h-5 mx-auto ${s.alert && s.value > 0 ? "text-destructive" : "text-primary"}`} />
              <p className="text-2xl font-bold text-foreground">
                <AnimatedCounter target={s.value} />
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Feature Grid */}
      <div>
        <h2 className="font-serif text-2xl font-semibold text-foreground mb-5 opacity-0 animate-fade-up" style={{ animationDelay: "400ms", animationFillMode: "forwards" }}>
          Quick Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featureCards.map((card, i) => (
            <Link
              key={card.title}
              to={card.path}
              className="glass-panel rounded-xl p-5 flex items-start gap-4 group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_hsla(170,66%,51%,0.12)] opacity-0 animate-fade-up"
              style={{ animationDelay: `${500 + i * 60}ms`, animationFillMode: "forwards" }}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <card.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{card.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
