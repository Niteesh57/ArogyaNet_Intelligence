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
      adminApi.dashboardStats().then((r) => setStats(r.data)).catch(() => { });
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-6 border-b border-border/40">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {user?.full_name ? `Welcome back, ${user.full_name}` : "Overview of your medical system"}
          </p>
        </div>
        <div className="text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full border border-border">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats (admin only) */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-up">
          {statCards.map((s) => (
            <div
              key={s.label}
              className={`dashboard-card p-4 hover:border-primary/50 transition-colors ${s.alert && s.value > 0 ? "border-destructive/50 bg-destructive/5" : ""
                }`}
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className={`p-2 rounded-full ${s.alert && s.value > 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">
                    <AnimatedCounter target={s.value} />
                  </p>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feature Grid */}
      <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featureCards.map((card) => (
            <Link
              key={card.title}
              to={card.path}
              className="dashboard-card p-5 flex items-start gap-4 group hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{card.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{card.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
