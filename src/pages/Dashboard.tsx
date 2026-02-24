import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi, appointmentsApi, namesApi, doctorsApi, patientsApi, usersApi, agentApi, eventsApi } from "@/lib/api";
import {
  Stethoscope, HeartPulse, Users, Package, FlaskConical,
  Sparkles, Clock, Calendar, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Activity, UserCheck, Bot, Phone, Utensils,
  Filter, BarChart3, PieChart, TrendingUp
} from "lucide-react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, AreaChart, Area
} from 'recharts';

// Sub-Dashboards
import LabDashboard from "./LabDashboard";
import NurseDashboard from "./NurseDashboard";
import Onboarding from "./Onboarding";

// Components
import { PatientBookingForm } from "@/components/PatientBookingForm";
import { ConsultationModal } from "@/components/ConsultationModal";
import { AppointmentChatModal } from "@/components/AppointmentChatModal";
import { UserChatModal } from "@/components/UserChatModal";
import { PatientAppointmentDetail } from "@/components/PatientAppointmentDetail";
import { GlassButton, GlassModal, GlassInput, Shimmer, GlassCard } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";

/* ─── Types ─── */
interface EventGraphEntry {
  place_name?: string;
  _event_name?: string;
  _event_id?: string;
  _appended_at?: string;
  [key: string]: any;
}

interface Stats {
  total_doctors?: number;
  total_nurses?: number;
  total_patients?: number;
  total_medicines?: number;
  low_stock_alerts?: number;
  total_lab_tests?: number;
}

interface AppointmentWithDoctor {
  id: string;
  patient_id: string;
  doctor_id: string;
  description?: string;
  date: string;
  slot: string;
  severity: "low" | "medium" | "high" | "critical";
  remarks?: { text?: string; lab?: string[]; medicine?: string[] };
  next_followup?: string;
  doctor_name?: string;
  doctor_specialization?: string;
  hospital_name?: string;
  diet_plan?: string;
  created_at: string;
  updated_at: string;
}

/* ─── Shared Components ─── */
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

const SeverityBadge = ({ severity }: { severity: string }) => {
  const colors: Record<string, string> = {
    critical: "border-red-500/50 text-red-500 bg-red-500/5",
    high: "border-orange-500/50 text-orange-500 bg-orange-500/5",
    medium: "border-yellow-500/50 text-yellow-500 bg-yellow-500/5",
    low: "border-green-500/50 text-green-500 bg-green-500/5",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors[severity] || colors.low}`}>
      {severity.toUpperCase()}
    </span>
  );
};

const DateHeader = ({ name }: { name?: string }) => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-6 border-b border-border/40">
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
      <p className="text-muted-foreground mt-1">
        {name ? `Welcome back, ${name}` : "Overview of your medical system"}
      </p>
    </div>
    <div className="text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full border border-border">
      {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
  </div>
);

// Sub-component for User Search & Role Assignment
const AdminUserSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const res = await usersApi.searchUsersForStaff(query);
      setResults(res.data);
    } catch (e) { toast({ title: "Search failed" }); }
    finally { setLoading(false); }
  };

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      if (newRole === "lab_assistant") {
        await adminApi.createLabAssistant({ user_id: userId });
        toast({ title: "Promoted to Lab Assistant", description: "User can now access Lab Dashboard" });
      } else if (newRole === "nurse") {
        await adminApi.registerNurse({ user_search_query: userId, department: "General" });
        toast({ title: "Promoted to Nurse", description: "User can now access Nurse Dashboard" });
      } else {
        // Fallback for other roles or demotion
        // Note: Demotion to BASE isn't explicitly in the UI buttons yet, but good to have API ready
        await adminApi.updateRole(userId, newRole);
        toast({ title: "Role updated successfully" });
      }

      handleSearch(); // Refresh list
    } catch (e) {
      console.error(e);
      toast({ title: "Update failed", description: "Ensure user is in BASE role", variant: "destructive" });
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex gap-2 mb-4">
        <GlassInput
          label="Search Users"
          placeholder="Search by name or email..."
          value={query}
          onChange={(v) => setQuery(v)}
          className="flex-1"
        />
        <GlassButton onClick={handleSearch} disabled={loading}>{loading ? "..." : "Search"}</GlassButton>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {results.map(u => (
          <div key={u.id} className="flex justify-between items-center p-2 rounded hover:bg-secondary/20 border border-transparent hover:border-border/50">
            <div>
              <p className="font-medium">{u.full_name}</p>
              <p className="text-xs text-muted-foreground">{u.email} • <span className="font-mono">{u.role}</span></p>
            </div>
            <div className="flex gap-1">
              {u.role === "base" && (
                <>
                  <button onClick={() => handleRoleUpdate(u.id, "lab_assistant")} className="text-[10px] px-2 py-1 bg-purple-500/10 text-purple-500 rounded border border-purple-500/20 hover:bg-purple-500/20 transition-colors">
                    Make Lab Asst
                  </button>
                  <button onClick={() => handleRoleUpdate(u.id, "nurse")} className="text-[10px] px-2 py-1 bg-pink-500/10 text-pink-500 rounded border border-pink-500/20 hover:bg-pink-500/20 transition-colors">
                    Make Nurse
                  </button>
                </>
              )}
              {/* Allow demotion if needed, or removing roles. For now, matching previous UI capabilities but safer */}
              {u.role === "lab_assistant" && (
                <button onClick={() => handleRoleUpdate(u.id, "base")} className="text-[10px] px-2 py-1 bg-red-500/10 text-red-500 rounded border border-red-500/20 hover:bg-red-500/20 transition-colors">
                  Remove Role
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

/* ════════════════════════════════════════════════════════
   ADMIN DASHBOARD
   ════════════════════════════════════════════════════════ */
const AdminDashboard = ({ user, isAdmin }: { user: any; isAdmin: boolean }) => {
  const [graphData, setGraphData] = useState<EventGraphEntry[]>([]);
  const [filters, setFilters] = useState<{ places: string[]; available_keys: string[] }>({ places: [], available_keys: [] });
  const [selectedPlace, setSelectedPlace] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string>("");

  // Fetch unique places/keys on mount
  useEffect(() => {
    if (isAdmin) {
      eventsApi.getFilters()
        .then(res => setFilters(res.data))
        .catch(() => toast({ title: "Failed to load filters", variant: "destructive" }));
    }
  }, [isAdmin]);

  // Fetch graph data whenever place filter changes
  useEffect(() => {
    if (isAdmin) {
      setLoading(true);
      const params = selectedPlace !== "all" ? { place_name: selectedPlace } : {};
      eventsApi.getGraphData(params)
        .then(res => setGraphData(res.data))
        .catch(() => toast({ title: "Failed to load graph data", variant: "destructive" }))
        .finally(() => setLoading(false));
    }
  }, [isAdmin, selectedPlace]);

  // Intelligent Numeric Key Detection
  const numericKeys = useMemo(() => {
    if (!graphData.length) return [];
    const keys = new Set<string>();
    // Check first 100 entries for efficiency
    graphData.slice(0, 100).forEach(entry => {
      Object.entries(entry).forEach(([key, value]) => {
        if (key.startsWith('_')) return; // Ignore internal metadata
        if (key === 'age') return; // Specific exclusion if desired, or include it
        if (typeof value === 'number' || (!isNaN(Number(value)) && typeof value === 'string' && value.trim() !== "")) {
          keys.add(key);
        }
      });
    });
    return Array.from(keys).sort();
  }, [graphData]);

  // Auto-select first available priority metric if not set
  useEffect(() => {
    if (numericKeys.length > 0 && !selectedMetric) {
      // Priority keys to select first if found
      const priority = ['systolic_bp', 'BP', 'sugar_level', 'platelets_count'];
      const foundPriority = priority.find(p => numericKeys.includes(p));
      setSelectedMetric(foundPriority || numericKeys[0]);
    }
  }, [numericKeys, selectedMetric]);

  // Utility to parse any available date field
  const parseDate = (entry: any) => {
    const dateStr = entry._appended_at || entry.timestamp || entry.created_at || entry._updated_at;
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  // Statistical calculations for ALL detected keys
  const metricsStats = useMemo(() => {
    const results: Record<string, { avg: number; label: string }> = {};
    if (!graphData.length) return results;

    numericKeys.forEach(key => {
      let sum = 0;
      let count = 0;
      graphData.forEach(entry => {
        const val = Number(entry[key]);
        if (!isNaN(val)) {
          sum += val;
          count++;
        }
      });
      if (count > 0) {
        results[key] = {
          avg: Math.round(sum / count),
          label: key.replace(/_/g, ' ').toUpperCase()
        };
      }
    });
    return results;
  }, [graphData, numericKeys]);

  // Format data for Recharts (Dynamic Trend)
  const chartData = useMemo(() => {
    return graphData
      .map(d => ({ ...d, _parsedDate: parseDate(d) }))
      .filter(d => d._parsedDate)
      .sort((a, b) => a._parsedDate!.getTime() - b._parsedDate!.getTime())
      .map(d => {
        const dataPoint: any = {
          time: d._parsedDate!.toLocaleDateString(),
          fullTime: d._parsedDate!.toLocaleString(),
          place: d.place_name || "Unknown"
        };
        numericKeys.forEach(k => {
          dataPoint[k] = Number(d[k]);
        });
        return dataPoint;
      });
  }, [graphData, numericKeys]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            Event Analytics
          </h1>
          <p className="text-muted-foreground mt-1">Intelligent visualization of unstructured clinical data</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Place Filter */}
          <div className="flex items-center gap-2 bg-secondary/30 p-1.5 rounded-lg border border-border/50">
            <Filter className="w-4 h-4 ml-2 text-muted-foreground" />
            <select
              value={selectedPlace}
              onChange={(e) => setSelectedPlace(e.target.value)}
              className="bg-transparent border-none text-sm focus:ring-0 cursor-pointer pr-8"
            >
              <option value="all">All Locations</option>
              {filters.places.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Metric Selector */}
          <div className="flex items-center gap-2 bg-primary/10 p-1.5 rounded-lg border border-primary/20">
            <BarChart3 className="w-4 h-4 ml-2 text-primary" />
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="bg-transparent border-none text-sm font-medium text-primary focus:ring-0 cursor-pointer pr-8"
            >
              <option value="" disabled>Select Metric</option>
              {numericKeys.map(k => (
                <option key={k} value={k} className="text-foreground">
                  View {k.replace(/_/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Shimmer key={i} className="h-32" />)}
        </div>
      ) : (
        <>
          {/* Statistical summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassCard className="p-6 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <Users className="w-24 h-24" />
              </div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Entries</p>
              <h3 className="text-4xl font-bold mt-2 text-foreground">
                <AnimatedCounter target={graphData.length} />
              </h3>
              <p className="text-xs text-primary mt-2">Parsed from {filters.places.length || 0} locations</p>
            </GlassCard>

            {/* Dynamic Metric Cards (Show top 3 or selected) */}
            {numericKeys.slice(0, 3).map(key => (
              <GlassCard key={key} className="p-6 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500 text-primary">
                  <Activity className="w-24 h-24" />
                </div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Avg {key.replace(/_/g, ' ')}</p>
                <h3 className="text-4xl font-bold mt-2 text-foreground">
                  {metricsStats[key]?.avg || 0}
                </h3>
                <p className="text-xs text-muted-foreground mt-2">Cohort arithmetic mean</p>
              </GlassCard>
            ))}

            {numericKeys.length < 3 && (
              <GlassCard className="p-6 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <BarChart3 className="w-24 h-24 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">System Status</p>
                <h3 className="text-4xl font-bold mt-2 text-emerald-500">
                  {graphData.length > 0 ? "Active" : "Idle"}
                </h3>
                <p className="text-xs text-muted-foreground mt-2">Data ingestion operational</p>
              </GlassCard>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Primary Trend Graph */}
            <GlassCard className="xl:col-span-2 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold">{selectedMetric ? selectedMetric.replace(/_/g, ' ').toUpperCase() : "Metric"} Trends</h3>
                  <p className="text-sm text-muted-foreground">Historical progression across all recorded events</p>
                </div>
                <TrendingUp className="w-5 h-5 text-primary opacity-50" />
              </div>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background/95 backdrop-blur-md border border-border p-3 rounded-lg shadow-xl shadow-black/50">
                              <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-tighter">{payload[0].payload.fullTime}</p>
                              <p className="text-sm font-bold text-foreground">
                                {selectedMetric.replace(/_/g, ' ')}: <span className="text-primary">{payload[0].value}</span>
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-1">Location: {payload[0].payload.place}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey={selectedMetric}
                      stroke="var(--primary)"
                      fillOpacity={1}
                      fill="url(#colorMetric)"
                      strokeWidth={3}
                      name={selectedMetric}
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            {/* Distribution/Meta Panel */}
            <div className="space-y-8">
              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-emerald-500" />
                  Data Composition
                </h3>
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">Detected {numericKeys.length} numeric field(s) available for visualization in this dataset.</p>
                  <div className="flex flex-wrap gap-2">
                    {numericKeys.map(k => (
                      <button
                        key={k}
                        onClick={() => setSelectedMetric(k)}
                        className={`text-[10px] px-2 py-1 rounded-md border transition-all ${selectedMetric === k ? 'bg-primary text-white border-primary' : 'bg-secondary/50 border-border hover:border-primary/50'}`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6">
                <h3 className="text-lg font-semibold mb-4">Location Overview</h3>
                <div className="space-y-4">
                  {filters.places.slice(0, 5).map(place => {
                    const count = graphData.filter(d => d.place_name === place).length;
                    const percent = graphData.length ? Math.round((count / graphData.length) * 100) : 0;
                    return (
                      <div key={place} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{place}</span>
                          <span className="text-muted-foreground">{count} entries ({percent}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary/60" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </GlassCard>
            </div>
          </div>

          <div className="mt-8 border-t border-border/40 pt-8">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-primary" />
              Personnel Management
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AdminUserSearch />
            </div>
          </div>
        </>
      )}
    </div>
  );
};


/* ════════════════════════════════════════════════════════
   PATIENT DASHBOARD
   ════════════════════════════════════════════════════════ */
const PatientDashboard = ({ user }: { user: any }) => {
  const [myAppointments, setMyAppointments] = useState<AppointmentWithDoctor[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [bookModal, setBookModal] = useState(false);

  // Chat Modal State
  const [documateChatModal, setDocumateChatModal] = useState(false);
  const [documateAppointment, setDocumateAppointment] = useState<{ id: string, patientName: string } | null>(null);

  // User chat modal state
  const [messagesModal, setMessagesModal] = useState(false);

  // Appointment Detail Modal
  const [detailAppt, setDetailAppt] = useState<AppointmentWithDoctor | null>(null);

  const fetchAppointments = async () => {
    try {
      setLoadingAppts(true);
      const apptRes = await appointmentsApi.getMyAppointments();
      setMyAppointments(apptRes.data);
    } catch {
      toast({ title: "Could not load your appointments", variant: "destructive" });
      setLoadingAppts(false);
    } finally {
      setLoadingAppts(false);
    }
  };

  // Reschedule modal state
  const [editModal, setEditModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<AppointmentWithDoctor | null>(null);
  const [form, setForm] = useState({ description: "", date: "", slot: "", severity: "low" as any });
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [doctorName, setDoctorName] = useState("");

  // Fetch patient appointments
  useEffect(() => {
    fetchAppointments();
  }, [user]);

  // Fetch Slots when editing
  useEffect(() => {
    if (selectedAppt && form.date) {
      setSlotLoading(true);
      doctorsApi.getSlots(selectedAppt.doctor_id, form.date)
        .then(res => setAvailableSlots(res.data))
        .catch(() => setAvailableSlots([]))
        .finally(() => setSlotLoading(false));
    }
  }, [selectedAppt, form.date]);

  const handleUpdate = async () => {
    if (!selectedAppt) return;
    try {
      await appointmentsApi.update(selectedAppt.id, {
        description: form.description,
        date: form.date,
        slot: form.slot,
        severity: form.severity,
      });
      toast({ title: "Appointment Updated ✓" });
      setEditModal(false);
      // Refresh
      fetchAppointments();
    } catch {
      toast({ title: "Update Failed", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await appointmentsApi.delete(id);
      setMyAppointments(prev => prev.filter(a => a.id !== id));
      toast({ title: "Appointment Cancelled" });
    } catch {
      toast({ title: "Cancellation Failed", variant: "destructive" });
    }
  };

  const openEdit = (appt: AppointmentWithDoctor) => {
    setSelectedAppt(appt);
    setForm({ description: appt.description || "", date: appt.date, slot: appt.slot, severity: appt.severity });
    setDoctorName(appt.doctor_name || "Doctor");
    setEditModal(true);
  };

  const upcoming = myAppointments.filter(a => new Date(a.date) >= new Date(new Date().toDateString()));
  const past = myAppointments.filter(a => new Date(a.date) < new Date(new Date().toDateString()));

  return (
    <div className="space-y-6">
      <DateHeader name={user?.full_name} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard>
          <div className="p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Calendar className="w-24 h-24" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-medium text-muted-foreground">Upcoming</h3>
              <div className="text-4xl font-bold mt-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                <AnimatedCounter target={upcoming.length} />
              </div>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity className="w-24 h-24 text-green-500" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-medium text-muted-foreground">Total Visits</h3>
              <div className="text-4xl font-bold mt-2 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
                <AnimatedCounter target={myAppointments.length} />
              </div>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Stethoscope className="w-24 h-24 text-purple-500" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-medium text-muted-foreground">Doctors Seen</h3>
              <div className="text-4xl font-bold mt-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                <AnimatedCounter target={new Set(myAppointments.map(a => a.doctor_id)).size} />
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between mt-8">
        <h2 className="text-xl font-semibold">My Appointments</h2>
        <div className="flex gap-2">
          <GlassButton variant="ghost" className="border-border hover:bg-secondary/50" onClick={() => setMessagesModal(true)}>
            Messages
          </GlassButton>
          <GlassButton variant="primary" onClick={() => setBookModal(true)}>
            <Plus className="w-4 h-4 mr-2" /> Book New
          </GlassButton>
        </div>
      </div>

      {/* Appointment List */}
      <div className="bg-background/40 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden shadow-sm">
        {loadingAppts ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map(i => <Shimmer key={i} />)}
          </div>
        ) : myAppointments.length > 0 ? (
          <div className="divide-y divide-border/50">
            {/* Upcoming first, then past */}
            {[...upcoming, ...past].map((apt) => {
              const isPast = new Date(apt.date) < new Date(new Date().toDateString());
              return (
                <div
                  key={apt.id}
                  onClick={() => setDetailAppt(apt)}
                  className={`p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-white/5 transition-colors group cursor-pointer ${isPast ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-2xl ${apt.severity === 'critical' ? 'bg-red-500/10 text-red-500' :
                      apt.severity === 'high' ? 'bg-orange-500/10 text-orange-500' :
                        'bg-primary/10 text-primary'
                      }`}>
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-lg">{apt.doctor_name || "Doctor"}</h4>
                        {apt.doctor_specialization && (
                          <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                            {apt.doctor_specialization}
                          </span>
                        )}
                        <SeverityBadge severity={apt.severity} />
                        {isPast && <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">Past</span>}
                      </div>
                      <p className="text-muted-foreground text-sm flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {new Date(apt.date).toLocaleDateString()} at {apt.slot}
                      </p>
                      {apt.description && (
                        <p className="text-sm text-foreground/80 mt-1 max-w-xl">{apt.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 mt-4 md:mt-0 opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDocumateAppointment({ id: apt.id, patientName: "My" });
                        setDocumateChatModal(true);
                      }}
                      className="flex items-center gap-2 p-2 px-3 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 text-sm font-medium transition-colors border border-indigo-500/20"
                    >
                      <Sparkles className="w-4 h-4" />
                      DocuMate AI
                    </button>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity ml-2">
                      <Stethoscope className="w-4 h-4" />
                      <span>View Details</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <div className="p-4 rounded-full bg-secondary/50 mb-4">
              <Calendar className="w-8 h-8 opacity-50" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No Appointments</h3>
            <p className="max-w-xs mx-auto mt-1 mb-6">You don't have any appointments scheduled.</p>
            <Link to="/onboarding">
              <GlassButton variant="primary">Book Now</GlassButton>
            </Link>
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      <GlassModal open={editModal} onClose={() => setEditModal(false)} title="Reschedule Appointment" className="max-w-md">
        <div className="space-y-4 pt-4">
          <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Doctor</p>
            <p className="font-medium">{doctorName}</p>
          </div>
          <GlassInput label="Date" type="date" value={form.date} onChange={(v) => setForm(p => ({ ...p, date: v }))} />
          <div className="space-y-2">
            <label className="text-sm font-medium">Available Slots</label>
            {slotLoading ? <div className="text-xs text-muted-foreground">Loading slots...</div> : (
              <div className="grid grid-cols-4 gap-2">
                {availableSlots.length > 0 ? availableSlots.map(s => (
                  <button
                    key={s.time}
                    disabled={s.status === 'booked' && s.time !== selectedAppt?.slot}
                    onClick={() => setForm(p => ({ ...p, slot: s.time }))}
                    className={`px-3 py-2 text-xs rounded-md border transition-all ${form.slot === s.time
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : s.status === 'booked' && s.time !== selectedAppt?.slot
                        ? 'bg-muted opacity-50 cursor-not-allowed'
                        : 'bg-background hover:bg-accent hover:border-accent-foreground/20 border-border'
                      }`}
                  >
                    {s.time}
                  </button>
                )) : <div className="text-xs text-muted-foreground col-span-4 p-2 border border-dashed rounded text-center">Select a date to see slots</div>}
              </div>
            )}
          </div>
          <GlassInput label="Reason / Description" value={form.description} onChange={(v) => setForm(p => ({ ...p, description: v }))} />
          <div className="pt-4 flex gap-2">
            <GlassButton onClick={() => setEditModal(false)} variant="ghost" className="flex-1">Cancel</GlassButton>
            <GlassButton onClick={handleUpdate} className="flex-1">Save Changes</GlassButton>
          </div>
        </div>
      </GlassModal>

      {/* Book New Modal */}
      <GlassModal open={bookModal} onClose={() => setBookModal(false)} title="Book New Appointment" className="max-w-5xl text-left">
        <div className="pt-2 text-left">
          <PatientBookingForm onSuccess={() => {
            setBookModal(false);
            fetchAppointments();
          }} />
        </div>
      </GlassModal>

      {/* DocuMate Modal */}
      {documateAppointment && (
        <AppointmentChatModal
          open={documateChatModal}
          onClose={() => setDocumateChatModal(false)}
          appointmentId={documateAppointment.id}
          patientName={documateAppointment.patientName}
        />
      )}

      {/* Real-time Messages Modal */}
      <UserChatModal open={messagesModal} onClose={() => setMessagesModal(false)} />

      {/* Appointment Detail Modal */}
      {detailAppt && (
        <PatientAppointmentDetail
          open={!!detailAppt}
          onClose={() => setDetailAppt(null)}
          appointmentId={detailAppt.id}
          doctorName={detailAppt.doctor_name}
          doctorSpecialization={detailAppt.doctor_specialization}
        />
      )}
    </div>
  );
};


/* ════════════════════════════════════════════════════════
   DOCTOR DAY PANEL  – Side panel with consultation
   ════════════════════════════════════════════════════════ */
const DoctorDayPanel = ({ selectedDate, todayStr, selectedAppts, nameCache, onConsultationSaved }: {
  selectedDate: string; todayStr: string; selectedAppts: any[];
  nameCache: Record<string, string>; onConsultationSaved: () => void;
}) => {
  const [consultAppt, setConsultAppt] = useState<any>(null);

  // Chat Modal State
  const [chatModal, setChatModal] = useState(false);
  const [chatAppointment, setChatAppointment] = useState<{ id: string, patientName: string } | null>(null);

  return (
    <>
      <div className="bg-background/40 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden shadow-sm sticky top-6">
        <div className="p-4 border-b border-border/30">
          <h3 className="font-semibold text-lg">
            {selectedDate === todayStr ? "Today's Schedule" : new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </h3>
          <p className="text-sm text-muted-foreground">{selectedAppts.length} appointment{selectedAppts.length !== 1 ? 's' : ''}</p>
        </div>

        {selectedAppts.length > 0 ? (
          <div className="divide-y divide-border/30 max-h-[60vh] overflow-y-auto">
            {selectedAppts
              .sort((a: any, b: any) => a.slot.localeCompare(b.slot))
              .map((apt: any) => (
                <div key={apt.id} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm">{apt.slot}</span>
                    </div>
                    <SeverityBadge severity={apt.severity} />
                  </div>
                  <div className="ml-6">
                    <p className="font-medium text-foreground">
                      {nameCache[apt.patient_id] || "Loading..."}
                    </p>
                    {apt.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{apt.description}</p>
                    )}

                    {/* Past remarks */}
                    {apt.remarks?.text && (
                      <div className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-xs text-muted-foreground italic">"{apt.remarks.text}"</p>
                        {apt.remarks.medicine?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {apt.remarks.medicine.map((m: any, i: number) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                                💊 {m.name}
                              </span>
                            ))}
                          </div>
                        )}
                        {apt.remarks.lab?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {apt.remarks.lab.map((l: any, i: number) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                                🧪 {l.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => setConsultAppt(apt)}
                        className="bg-primary/10 hover:bg-primary/20 text-primary text-xs px-2 py-1 rounded border border-primary/20 flex items-center gap-1 transition-colors"
                      >
                        <Stethoscope className="w-3 h-3" />
                        {apt.remarks ? "Update" : "Consult"}
                      </button>
                      <button
                        onClick={() => {
                          setChatAppointment({ id: apt.id, patientName: nameCache[apt.patient_id] || "Patient" });
                          setChatModal(true);
                        }}
                        className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 text-xs px-2 py-1 rounded border border-purple-500/20 flex items-center gap-1 transition-colors"
                      >
                        <Bot className="w-3 h-3" />
                        DocuMate
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <Calendar className="w-10 h-10 opacity-30 mb-3" />
            <p className="text-sm">No appointments on this day</p>
          </div>
        )}
      </div>

      {/* Consultation Modal */}
      {consultAppt && (
        <ConsultationModal
          open={!!consultAppt}
          onClose={() => setConsultAppt(null)}
          onSuccess={() => { setConsultAppt(null); onConsultationSaved(); }}
          appointment={consultAppt}
          patientName={nameCache[consultAppt.patient_id] || "Patient"}
        />
      )}

      {/* Chat Modal */}
      {chatAppointment && (
        <AppointmentChatModal
          open={chatModal}
          onClose={() => setChatModal(false)}
          appointmentId={chatAppointment.id}
          patientName={chatAppointment.patientName}
        />
      )}
    </>
  );
};


/* ════════════════════════════════════════════════════════
   DOCTOR DASHBOARD  – Calendar with patient names
   ════════════════════════════════════════════════════════ */
const DoctorDashboard = ({ user }: { user: any }) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [myPatients, setMyPatients] = useState<any[]>([]);
  const [todayFollowups, setTodayFollowups] = useState<any[]>([]);
  const [followupModal, setFollowupModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [nameCache, setNameCache] = useState<Record<string, string>>({});

  // Calendar navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Tab state
  const [activeTab, setActiveTab] = useState<"calendar" | "patients">("calendar");
  const [messagesModal, setMessagesModal] = useState(false);

  // Find doctor_id for the current user
  const [doctorId, setDoctorId] = useState<string>("");

  const loadData = async () => {
    try {
      const docRes = await doctorsApi.list();
      const myDoc = docRes.data.find((d: any) => d.user_id === user.id);
      if (myDoc) setDoctorId(myDoc.id);

      const apptRes = await appointmentsApi.list();
      const myAppts = myDoc
        ? apptRes.data.filter((a: any) => a.doctor_id === myDoc.id)
        : apptRes.data;
      setAppointments(myAppts);

      try {
        const patRes = await doctorsApi.getMyPatients();
        setMyPatients(patRes.data || []);
      } catch { }

      try {
        const fuRes = await doctorsApi.getFollowupsToday();
        setTodayFollowups(fuRes.data || []);
      } catch { }



      const uniquePatientIds = [...new Set(myAppts.map((a: any) => a.patient_id))] as string[];
      uniquePatientIds.forEach(async (pid) => {
        try {
          const res = await namesApi.getPatientName(pid);
          setNameCache(prev => ({ ...prev, [pid]: res.data.full_name }));
        } catch { }
      });
    } catch {
      toast({ title: "Could not load appointments", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  // Calendar helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthStr = currentDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const apptsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    appointments.forEach(a => {
      const d = a.date;
      if (!map[d]) map[d] = [];
      map[d].push(a);
    });
    return map;
  }, [appointments]);

  const selectedAppts = apptsByDate[selectedDate] || [];
  const todayStr = new Date().toISOString().split("T")[0];
  const todayAppts = apptsByDate[todayStr] || [];
  const upcomingCount = appointments.filter(a => a.date >= todayStr).length;

  return (
    <div className="space-y-6">
      <DateHeader name={user?.full_name} />

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <GlassCard>
          <div className="p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Calendar className="w-24 h-24" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-medium text-muted-foreground">Today's Appointments</h3>
              <div className="text-4xl font-bold mt-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                <AnimatedCounter target={todayAppts.length} />
              </div>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Stethoscope className="w-24 h-24 text-green-500" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-medium text-muted-foreground">Upcoming</h3>
              <div className="text-4xl font-bold mt-2 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">
                <AnimatedCounter target={upcomingCount} />
              </div>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <UserCheck className="w-24 h-24 text-purple-500" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-medium text-muted-foreground">Today's Patients</h3>
              <div className="text-4xl font-bold mt-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                <AnimatedCounter target={new Set(todayAppts.map(a => a.patient_id)).size} />
              </div>
            </div>
          </div>
        </GlassCard>
        <GlassCard onClick={() => setFollowupModal(true)} className="cursor-pointer hover:border-primary/50 transition-colors">
          <div className="p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Clock className="w-24 h-24 text-orange-500" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-medium text-muted-foreground">Follow-ups Due</h3>
              <div className="text-4xl font-bold mt-2 bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-500">
                <AnimatedCounter target={todayFollowups.length} />
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 p-1 bg-background/40 backdrop-blur-xl border border-border/50 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "calendar" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Calendar className="w-4 h-4 inline mr-1.5" />Calendar
          </button>
          <button
            onClick={() => setActiveTab("patients")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "patients" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Users className="w-4 h-4 inline mr-1.5" />My Patients
          </button>
        </div>
        <GlassButton variant="ghost" className="border-border hover:bg-secondary/50 transition-colors" onClick={() => setMessagesModal(true)}>
          Messages
        </GlassButton>
      </div>

      {loading ? (
        <div className="p-8 space-y-4">
          {[1, 2, 3].map(i => <Shimmer key={i} />)}
        </div>
      ) : activeTab === "calendar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Calendar ─── */}
          <div className="lg:col-span-2">
            <div className="bg-background/40 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <button onClick={prevMonth} className="p-2 hover:bg-accent rounded-lg transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-semibold">{monthStr}</h3>
                <button onClick={nextMonth} className="p-2 hover:bg-accent rounded-lg transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 border-b border-border/30">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2 min-h-[80px] border-b border-r border-border/20" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayAppts = apptsByDate[dateStr] || [];
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  return (
                    <div key={day} onClick={() => setSelectedDate(dateStr)}
                      className={`p-2 min-h-[80px] border-b border-r border-border/20 cursor-pointer transition-colors hover:bg-accent/50
                      ${isSelected ? "bg-primary/10 border-primary/30" : ""}
                      ${isToday ? "ring-1 ring-inset ring-primary/40" : ""}`}>
                      <div className={`text-sm font-medium mb-1 ${isToday ? "text-primary font-bold" : ""}`}>{day}</div>
                      {dayAppts.length > 0 && (
                        <div className="space-y-0.5">
                          {dayAppts.slice(0, 2).map((a: any) => (
                            <div key={a.id} className={`text-xs px-1.5 py-0.5 rounded truncate ${a.severity === "critical" ? "bg-red-500/20 text-red-400" :
                              a.severity === "high" ? "bg-orange-500/20 text-orange-400" :
                                a.severity === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                                  "bg-primary/20 text-primary"
                              }`}>
                              {a.slot} · {nameCache[a.patient_id] || "Patient"}
                            </div>
                          ))}
                          {dayAppts.length > 2 && <div className="text-xs text-muted-foreground px-1">+{dayAppts.length - 2} more</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── Selected Day Detail with Consultation ─── */}
          <div className="lg:col-span-1">
            <DoctorDayPanel
              selectedDate={selectedDate}
              todayStr={todayStr}
              selectedAppts={selectedAppts}
              nameCache={nameCache}
              onConsultationSaved={loadData}
            />
          </div>
        </div>
      ) : (
        /* ─── My Patients Tab ─── */
        <div className="bg-background/40 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border/30">
            <h3 className="font-semibold text-lg">My Patients</h3>
            <p className="text-sm text-muted-foreground">{myPatients.length} patient{myPatients.length !== 1 ? "s" : ""} assigned to you</p>
          </div>
          {myPatients.length > 0 ? (
            <div className="divide-y divide-border/30">
              {myPatients.map((patient: any) => (
                <div key={patient.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{patient.full_name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {patient.age && <span>Age: {patient.age}</span>}
                      {patient.gender && <span>· {patient.gender}</span>}
                      {patient.phone && <span>· {patient.phone}</span>}
                    </div>
                  </div>
                  <Link to="/appointments" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                    View Appointments →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <Users className="w-10 h-10 opacity-30 mb-3" />
              <p className="text-sm">No patients assigned yet</p>
              <p className="text-xs mt-1">Patients will appear here once they have appointments with you</p>
            </div>
          )}
        </div>
      )}
      <GlassModal open={followupModal} onClose={() => setFollowupModal(false)} title="Today's Follow-ups" className="max-w-2xl">
        <div className="max-h-[60vh] overflow-y-auto space-y-2 p-2">
          {todayFollowups.length > 0 ? todayFollowups.map((apt: any) => (
            <div key={apt.id} className="p-3 border border-border/50 rounded-lg bg-background/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <p className="font-medium">{apt.patient?.full_name || "Unknown Patient"}</p>
                <p className="text-xs text-muted-foreground">Original Date: {apt.date}</p>
                <p className="text-sm mt-1">{apt.description}</p>
              </div>
              <GlassButton size="sm"
                onClick={async () => {
                  if (apt.patient?.phone) {
                    // Fallback to tel link if API fails or for immediate action
                    window.location.href = `tel:${apt.patient.phone}`;

                    // Trigger backend API for call logging/automations
                    try {
                      await agentApi.triggerCall({ phone_number: apt.patient.phone, appointment_id: apt.id });
                      toast({ title: "Call Initiated", description: `Calling ${apt.patient.full_name}...` });
                    } catch (e) {
                      console.error("Failed to trigger backend call:", e);
                      // Don't show error toast since tel link usually works as fallback
                    }
                  }
                }}
                disabled={!apt.patient?.phone}
                className={`border-green-500/20 ${apt.patient?.phone ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "opacity-50 cursor-not-allowed text-muted-foreground"}`}
              >
                <Phone className="w-4 h-4 mr-2" /> {apt.patient?.phone ? "Call" : "No Phone"}
              </GlassButton>
            </div>
          )) : <p className="text-center text-muted-foreground py-8">No follow-ups scheduled for today.</p>}
        </div>
      </GlassModal>

      {/* Real-time Messages Modal */}
      <UserChatModal open={messagesModal} onClose={() => setMessagesModal(false)} />
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   MAIN DASHBOARD ROUTER
   ════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const { user, isAdmin } = useAuth();

  // Patient → Patient Dashboard
  if (user?.role === "patient") return <PatientDashboard user={user} />;

  // Doctor → Doctor Dashboard
  if (user?.role === "doctor") return <DoctorDashboard user={user} />;

  // Lab Assistant → Lab Dashboard
  if (user?.role === "lab_assistant") return <LabDashboard />;

  // Nurse → Nurse Dashboard
  if (user?.role === "nurse") return <NurseDashboard />;

  // Base / unassigned → Onboarding
  if (user?.role === "user" || (user?.role as string) === "base" || (user && !user.role)) return <Onboarding />;

  // Admin → Admin Dashboard
  return <AdminDashboard user={user} isAdmin={isAdmin} />;
};

export default Dashboard;
