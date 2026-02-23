
import { useState, useEffect, useRef } from "react";
import { appointmentsApi, inventoryApi, labTestsApi, usersApi, patientsApi } from "@/lib/api";
import { GlassModal, GlassButton, GlassInput } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    Pill, FlaskConical, X, Search, Loader2, FileText,
    AlertTriangle, CalendarPlus, Sparkles, Plus, Send, Phone,
    Activity, UserPlus, Check, Stethoscope, Utensils, HeartPulse
} from "lucide-react";

interface MedicineItem {
    id: string;
    name: string;
    dosage?: string;
}

interface LabItem {
    id: string;
    name: string;
}

interface ConsultationModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    appointment: any;
    patientName: string;
}

/* ─────────────────────── Debounced Search Hook ─────────────────────── */
function useDebouncedSearch(
    searchFn: (q: string) => Promise<any>,
    delay = 350
) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }
        setLoading(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(async () => {
            try {
                const res = await searchFn(query);
                setResults(res.data || []);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, delay);
        return () => clearTimeout(timer.current);
    }, [query]);

    return { query, setQuery, results, loading, setResults };
}

/* ─────────────────────── Component ─────────────────────── */
export const ConsultationModal = ({
    open, onClose, onSuccess, appointment, patientName
}: ConsultationModalProps) => {
    const [activeTab, setActiveTab] = useState<'clinical' | 'vitals' | 'diet'>('clinical');

    // Clinical State
    const [remarksText, setRemarksText] = useState("");
    const [medicines, setMedicines] = useState<MedicineItem[]>([]);
    const [labs, setLabs] = useState<LabItem[]>([]);
    const [severity, setSeverity] = useState(appointment?.severity || "medium");
    const [nextFollowup, setNextFollowup] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Diet Plan State
    const [dietPlanText, setDietPlanText] = useState("");
    const [generatingDiet, setGeneratingDiet] = useState(false);
    const [savingDiet, setSavingDiet] = useState(false);
    const [isEditingDiet, setIsEditingDiet] = useState(false);

    // Doctor Prompt Modal State
    const [showDocPromptModal, setShowDocPromptModal] = useState(false);
    const [doctorPrompt, setDoctorPrompt] = useState("");
    const [isTriggeringCall, setIsTriggeringCall] = useState(false);

    // Nurse Assignment State
    const [nurseQuery, setNurseQuery] = useState("");
    const [nurses, setNurses] = useState<any[]>([]);
    const [assignedNurse, setAssignedNurse] = useState<any>(null);
    const [loadingNurses, setLoadingNurses] = useState(false);

    // Medicine search
    const medSearch = useDebouncedSearch((q) => inventoryApi.search(q));
    const [showMedDropdown, setShowMedDropdown] = useState(false);

    // Lab test search
    const labSearch = useDebouncedSearch((q) => labTestsApi.search(q));
    const [showLabDropdown, setShowLabDropdown] = useState(false);

    // Dosage input for adding medicine
    const [pendingDosage, setPendingDosage] = useState("");

    // State for full appointment details & Vitals
    const [fullAppointment, setFullAppointment] = useState<any>(null);
    const [vitals, setVitals] = useState<any[]>([]);

    useEffect(() => {
        if (appointment?.id) {
            loadAppointmentDetails(appointment.id);
        }
    }, [appointment]);

    const loadAppointmentDetails = async (id: string) => {
        try {
            // Fetch full appointment to get nurse_name and other details
            const res = await appointmentsApi.get(id);
            const data = res.data;
            setFullAppointment(data);

            // Set Vitals
            if (data.vitals) {
                setVitals(data.vitals);
            } else {
                loadVitals(id);
            }

            // Set Assigned Nurse
            if (data.nurse_name || data.nurse) {
                setAssignedNurse({
                    id: data.nurse_id,
                    name: data.nurse_name || data.nurse?.full_name
                });
            } else if (data.patient_id) {
                loadAssignedNurse(data.patient_id);
            }

            // Pre-fill fields
            if (data.remarks) {
                setRemarksText(data.remarks.text || "");
                setMedicines(
                    (data.remarks.medicine || []).map((m: any, i: number) => ({
                        id: m.id || `existing-${i}`,
                        name: m.name,
                        dosage: m.dosage || "",
                    }))
                );
                setLabs(
                    (data.remarks.lab || []).map((l: any, i: number) => ({
                        id: l.id || `existing-lab-${i}`,
                        name: l.name,
                    }))
                );
            }
            if (data.severity) setSeverity(data.severity);
            if (data.next_followup) setNextFollowup(data.next_followup);
            if (data.diet_plan) setDietPlanText(data.diet_plan);

        } catch (error) {
            console.error("Failed to load appointment details", error);
        }
    };

    const loadVitals = async (apptId: string) => {
        try {
            const res = await appointmentsApi.getVitals(apptId);
            setVitals(res.data);
        } catch (e) {
            console.error("Failed to load vitals", e);
        }
    };

    const loadAssignedNurse = async (pid: string) => {
        try {
            const res = await patientsApi.get(pid);
            if (res.data?.assigned_nurse_id) {
                const nurseName = res.data.assigned_nurse?.user?.full_name || res.data.assigned_nurse?.full_name || "Assigned Nurse";
                setAssignedNurse({ id: res.data.assigned_nurse_id, name: nurseName });
            }
        } catch (e) {
            console.error("Failed to load assigned nurse", e);
        }
    };

    const handleNurseSearch = async () => {
        if (!nurseQuery) return;
        setLoadingNurses(true);
        try {
            const res = await usersApi.searchNurses(nurseQuery);
            setNurses(res.data);
        } catch { toast({ title: "Search failed" }); }
        finally { setLoadingNurses(false); }
    };

    const assignNurse = async (nurse: any) => {
        try {
            await patientsApi.assignNurse(appointment.patient_id, nurse.id);
            setAssignedNurse(nurse);
            toast({ title: `Assigned ${nurse.full_name}` });
            setNurses([]);
            setNurseQuery("");
        } catch {
            toast({ title: "Assignment failed", variant: "destructive" });
        }
    };

    const addMedicine = (med: any) => {
        if (medicines.some(m => m.name === med.name)) return;
        setMedicines(prev => [...prev, { id: med.id, name: med.name, dosage: pendingDosage || "" }]);
        medSearch.setQuery("");
        medSearch.setResults([]);
        setPendingDosage("");
        setShowMedDropdown(false);
    };

    const removeMedicine = (id: string) => {
        setMedicines(prev => prev.filter(m => m.id !== id));
    };

    const addLab = (lab: any) => {
        if (labs.some(l => l.name === lab.name)) return;
        setLabs(prev => [...prev, { id: lab.id, name: lab.name }]);
        labSearch.setQuery("");
        labSearch.setResults([]);
        setShowLabDropdown(false);
    };

    const removeLab = (id: string) => {
        setLabs(prev => prev.filter(l => l.id !== id));
    };

    const handleSubmit = async () => {
        if (!remarksText.trim() && medicines.length === 0 && labs.length === 0) {
            toast({ title: "Add at least a remark, medicine, or lab test", variant: "destructive" });
            return;
        }

        setSubmitting(true);
        try {
            const remarksPayload = {
                text: remarksText,
                medicine: medicines.map(m => ({ id: m.id, name: m.name, dosage: m.dosage })),
                lab: labs.map(l => ({ id: l.id, name: l.name })),
            };

            await appointmentsApi.consultation(
                appointment.id,
                remarksPayload,
                severity,
                nextFollowup || undefined
            );

            toast({ title: "Consultation saved!" });
            onSuccess();
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Consultation failed",
                description: e.response?.data?.detail || "Could not save. Try again.",
                variant: "destructive"
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleGenerateDietPlan = async () => {
        setGeneratingDiet(true);
        setDietPlanText("");
        const token = localStorage.getItem("lh_token") || "";

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/agent/diet-planner`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    appointment_id: appointment.id,
                    patient_problem: fullAppointment?.description || "General checkup",
                    doctor_remarks: remarksText || "Please evaluate for general diet."
                })
            });

            if (!res.body) throw new Error("No response body");
            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");
                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            if (data.type === 'token') {
                                setDietPlanText(prev => prev + data.content);
                            } else if (data.type === 'error') {
                                toast({ title: "Generation failed", description: data.message, variant: "destructive" });
                            }
                        } catch (e) { }
                    }
                }
            }
        } catch (e) {
            console.error(e);
            toast({ title: "Failed to generate plan", variant: "destructive" });
        } finally {
            setGeneratingDiet(false);
        }
    };

    const handleSaveDietPlan = async () => {
        setSavingDiet(true);
        try {
            await appointmentsApi.update(appointment.id, { diet_plan: dietPlanText });
            toast({ title: "Diet Plan saved successfully!" });
        } catch (e) {
            console.error(e);
            toast({ title: "Failed to save Diet Plan", variant: "destructive" });
        } finally {
            setSavingDiet(false);
        }
    };

    const severityColors: Record<string, string> = {
        low: "text-green-400 bg-green-500/10 border-green-500/30",
        medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
        high: "text-orange-400 bg-orange-500/10 border-orange-500/30",
        critical: "text-red-400 bg-red-500/10 border-red-500/30",
    };

    return (
        <>
            <GlassModal
                open={open}
                onClose={onClose}
                title="Consultation"
                className="max-w-4xl text-left h-[85vh] flex flex-col"
            >
                <div className="flex-none pb-4 border-b border-border/40">
                    {/* Tabs */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('clinical')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'clinical'
                                ? "bg-primary/20 text-primary border border-primary/20"
                                : "text-muted-foreground hover:bg-secondary/50"
                                }`}
                        >
                            <Stethoscope className="w-4 h-4 inline mr-2" />
                            Clinical Note
                        </button>
                        <button
                            onClick={() => setActiveTab('vitals')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'vitals'
                                ? "bg-primary/20 text-primary border border-primary/20"
                                : "text-muted-foreground hover:bg-secondary/50"
                                }`}
                        >
                            <Activity className="w-4 h-4 inline mr-2" />
                            Vitals & Care Team
                        </button>
                        <button
                            onClick={() => setActiveTab('diet')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'diet'
                                ? "bg-amber-500/20 text-amber-500 border border-amber-500/20"
                                : "text-muted-foreground hover:bg-secondary/50"
                                }`}
                        >
                            <Utensils className="w-4 h-4 inline mr-2" />
                            AI Diet Planner
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pt-4 custom-scrollbar">
                    {/* Patient Info Header */}
                    <div className="flex items-center justify-between p-4 mb-5 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">{patientName}</h3>
                            <p className="text-sm text-muted-foreground">
                                {appointment?.date} · {appointment?.slot}
                                {appointment?.description && ` — ${appointment.description}`}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {appointment?.patient?.phone && (
                                <GlassButton
                                    size="sm"
                                    disabled={!appointment.patient?.phone}
                                    onClick={() => {
                                        if (!appointment.patient?.phone) return;
                                        setDoctorPrompt(""); // Reset prompt
                                        setShowDocPromptModal(true);
                                    }}
                                    className="border-green-500/20 bg-green-500/10 text-green-500 hover:bg-green-500/20"
                                >
                                    <Phone className="w-4 h-4 mr-2" />
                                    Call Patient
                                </GlassButton>
                            )}
                            <div className={`px-3 py-1 rounded-full text-xs font-medium border ${severityColors[severity]}`}>
                                {severity}
                            </div>
                        </div>
                    </div>

                    {activeTab === 'clinical' ? (
                        <div className="space-y-5">
                            {/* Remarks */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    <FileText className="w-4 h-4 inline mr-1.5" />
                                    Remarks
                                </label>
                                <textarea
                                    value={remarksText}
                                    onChange={e => setRemarksText(e.target.value)}
                                    placeholder="Patient has flu symptoms, prescribed rest and fluids..."
                                    rows={3}
                                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
                                />
                            </div>

                            {/* Medicine & Lab side by side */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* ── Medicines ── */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        <Pill className="w-4 h-4 inline mr-1.5" />
                                        Medicines
                                    </label>
                                    <div className="relative">
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                                                <input
                                                    value={medSearch.query}
                                                    onChange={e => { medSearch.setQuery(e.target.value); setShowMedDropdown(true); }}
                                                    onFocus={() => setShowMedDropdown(true)}
                                                    placeholder="Search medicine..."
                                                    className="w-full bg-background border border-input rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                />
                                                {/* Dropdown */}
                                                {showMedDropdown && medSearch.results.length > 0 && (
                                                    <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-xl max-h-40 overflow-auto">
                                                        {medSearch.results.map((med: any) => (
                                                            <button
                                                                key={med.id}
                                                                onClick={() => addMedicine(med)}
                                                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                                                            >
                                                                <span>{med.name}</span>
                                                                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                value={pendingDosage}
                                                onChange={e => setPendingDosage(e.target.value)}
                                                placeholder="Dosage"
                                                className="w-24 bg-background border border-input rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>

                                        {/* Pills */}
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {medicines.map(m => (
                                                <span key={m.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                    <Pill className="w-3 h-3" />
                                                    {m.name}{m.dosage ? ` (${m.dosage})` : ""}
                                                    <button onClick={() => removeMedicine(m.id)} className="ml-0.5 hover:text-red-400 transition-colors">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Labs ── */}
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        <FlaskConical className="w-4 h-4 inline mr-1.5" />
                                        Lab Tests
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                                        <input
                                            value={labSearch.query}
                                            onChange={e => { labSearch.setQuery(e.target.value); setShowLabDropdown(true); }}
                                            onFocus={() => setShowLabDropdown(true)}
                                            placeholder="Search lab test..."
                                            className="w-full bg-background border border-input rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        {/* Dropdown */}
                                        {showLabDropdown && labSearch.results.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-xl max-h-40 overflow-auto">
                                                {labSearch.results.map((lab: any) => (
                                                    <button
                                                        key={lab.id}
                                                        onClick={() => addLab(lab)}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                                                    >
                                                        <span>{lab.name}</span>
                                                        <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Pills */}
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {labs.map(l => (
                                            <span key={l.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                <FlaskConical className="w-3 h-3" />
                                                {l.name}
                                                <button onClick={() => removeLab(l.id)} className="ml-0.5 hover:text-red-400 transition-colors">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Severity & Follow-up row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                                        Severity
                                    </label>
                                    <select
                                        value={severity}
                                        onChange={e => setSeverity(e.target.value)}
                                        className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        <CalendarPlus className="w-4 h-4 inline mr-1.5" />
                                        Next Follow-up
                                    </label>
                                    <input
                                        type="date"
                                        value={nextFollowup}
                                        onChange={e => setNextFollowup(e.target.value)}
                                        className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <GlassButton variant="ghost" onClick={onClose} className="flex-1">
                                    Cancel
                                </GlassButton>
                                <GlassButton onClick={handleSubmit} className="flex-1" disabled={submitting}>
                                    {submitting ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                    ) : (
                                        <><Send className="w-4 h-4 mr-2" /> Save Consultation</>
                                    )}
                                </GlassButton>
                            </div>
                        </div>
                    ) : activeTab === 'vitals' ? (
                        /* ── Vitals & Care Team Tab ── */
                        <div className="space-y-6">

                            {/* 1. Nurse Assignment */}
                            <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
                                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center">
                                    <UserPlus className="w-4 h-4 mr-2 text-primary" />
                                    Care Team Assignment
                                </h4>

                                <div className="flex flex-col gap-3">
                                    {assignedNurse ? (
                                        <div className="flex items-center justify-between bg-primary/10 p-3 rounded-lg border border-primary/20">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                                    {assignedNurse.name?.[0] || "N"}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {assignedNurse.name || "Assigned Nurse"}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">Nurse</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full flex items-center">
                                                    <Check className="w-3 h-3 mr-1" /> Assigned
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <p className="text-xs text-muted-foreground">
                                                Assign a nurse to monitor this patient's vitals.
                                            </p>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                                <input
                                                    className="w-full bg-background border border-input rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                    placeholder="Search nurse by name..."
                                                    value={nurseQuery}
                                                    onChange={(e) => setNurseQuery(e.target.value)}
                                                />
                                                {nurses.length > 0 && (
                                                    <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-40 overflow-auto">
                                                        {nurses.map(nurse => (
                                                            <button
                                                                key={nurse.id}
                                                                onClick={() => assignNurse(nurse)}
                                                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex justify-between items-center"
                                                            >
                                                                <span>{nurse.full_name}</span>
                                                                <span className="text-xs text-muted-foreground">Select</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <GlassButton
                                                size="sm"
                                                variant="ghost"
                                                onClick={handleNurseSearch}
                                                disabled={loadingNurses || !nurseQuery}
                                                className="w-full"
                                            >
                                                {loadingNurses ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Search className="w-3 h-3 mr-2" />}
                                                Find Nurse
                                            </GlassButton>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Vitals Timeline */}
                            <div>
                                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center">
                                    <Activity className="w-4 h-4 mr-2 text-rose-500" />
                                    Vitals History
                                </h4>

                                {!vitals || vitals.length === 0 ? (
                                    <div className="text-center py-8 border border-dashed border-border/60 rounded-xl bg-muted/5">
                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                                            <Activity className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <p className="text-sm font-medium text-foreground">No vitals recorded</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Vitals recorded by the nurse will appear here.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="relative border-l border-border/50 ml-3 space-y-6">
                                        {vitals.map((vital, idx) => (
                                            <div key={idx} className="relative pl-6">
                                                {/* Timeline Dot */}
                                                <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-background border-2 border-primary ring-2 ring-primary/20"></div>

                                                <div className="bg-card/40 backdrop-blur-sm rounded-xl border border-border/40 overflow-hidden hover:bg-card/60 transition-colors">
                                                    {/* Header */}
                                                    <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/20">
                                                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                                            <CalendarPlus className="w-3.5 h-3.5" />
                                                            {new Date(vital.timestamp || vital.created_at || Date.now()).toLocaleString()}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                                {(vital.nurse?.full_name || vital.nurse_name || vital.recorded_by || "N")[0]}
                                                            </div>
                                                            <span className="text-xs text-foreground/80">
                                                                {vital.nurse?.full_name || vital.nurse_name || vital.recorded_by || "Nurse"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Grid */}
                                                    <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-background/50 border border-border/30">
                                                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">BP</span>
                                                            <span className="text-sm font-bold text-foreground">{vital.bp}</span>
                                                            <span className="text-xs text-muted-foreground">mmHg</span>
                                                        </div>
                                                        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
                                                            <span className="text-[10px] uppercase tracking-wider text-rose-500/70 mb-1">Pulse</span>
                                                            <span className="text-sm font-bold text-rose-500">{vital.pulse}</span>
                                                            <span className="text-xs text-rose-500/70">bpm</span>
                                                        </div>
                                                        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-sky-500/5 border border-sky-500/10">
                                                            <span className="text-[10px] uppercase tracking-wider text-sky-500/70 mb-1">SpO2</span>
                                                            <span className="text-sm font-bold text-sky-500">{vital.spo2}</span>
                                                            <span className="text-xs text-sky-500/70">%</span>
                                                        </div>
                                                        <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                                            <span className="text-[10px] uppercase tracking-wider text-amber-500/70 mb-1">Temp</span>
                                                            <span className="text-sm font-bold text-amber-500">{vital.temp}</span>
                                                            <span className="text-xs text-amber-500/70">°F</span>
                                                        </div>
                                                    </div>

                                                    {/* Remarks Footer */}
                                                    {vital.remarks && (
                                                        <div className="px-4 py-2 bg-muted/10 border-t border-border/30">
                                                            <p className="text-xs text-muted-foreground italic flex items-start gap-1.5">
                                                                <FileText className="w-3 h-3 mt-0.5 opacity-70" />
                                                                {vital.remarks}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    ) : activeTab === 'diet' ? (
                        <div className="space-y-4">
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-2">
                                <h4 className="text-amber-500 font-medium flex items-center mb-1">
                                    <Sparkles className="w-4 h-4 mr-2" /> AI Diet Planner
                                </h4>
                                <p className="text-xs text-amber-500/80">
                                    Click "Generate Diet Plan" to automatically stream a personalized nutrition guide based on the patient's problem ({fullAppointment?.description || "None"}) and your consultation remarks. If needed, you can manually rewrite or edit the text before saving.
                                </p>
                            </div>

                            {isEditingDiet || generatingDiet || !dietPlanText ? (
                                <textarea
                                    autoFocus={isEditingDiet}
                                    value={dietPlanText}
                                    onChange={e => setDietPlanText(e.target.value)}
                                    onBlur={() => {
                                        setIsEditingDiet(false);
                                        if (dietPlanText !== fullAppointment?.diet_plan && !generatingDiet) {
                                            handleSaveDietPlan();
                                        }
                                    }}
                                    placeholder="An AI-generated, customized diet plan will appear here..."
                                    rows={12}
                                    className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 custom-scrollbar resize-none font-mono"
                                />
                            ) : (
                                <div
                                    onClick={() => setIsEditingDiet(true)}
                                    className="w-full bg-background/50 border border-input/50 rounded-xl px-4 py-3 text-sm text-foreground cursor-text min-h-[250px] prose prose-sm dark:prose-invert prose-amber max-w-none hover:border-amber-500/50 transition-colors"
                                    title="Click to edit"
                                >
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {dietPlanText}
                                    </ReactMarkdown>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <GlassButton
                                    onClick={handleGenerateDietPlan}
                                    disabled={generatingDiet}
                                    className="flex-1 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                                    variant="ghost"
                                >
                                    {generatingDiet ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Streaming...</>
                                    ) : (
                                        <><Sparkles className="w-4 h-4 mr-2" /> Generate Diet Plan</>
                                    )}
                                </GlassButton>
                                {/* Save is handled automatically on blur or stream completion */}
                            </div>
                        </div>
                    ) : null}
                </div>
            </GlassModal>

            {/* Doctor Call Custom Prompt Modal */}
            <GlassModal open={showDocPromptModal} onClose={() => setShowDocPromptModal(false)} title="Configure Agent Call">
                <div className="p-6 space-y-4 max-w-md w-full">
                    <p className="text-sm text-muted-foreground mb-4">
                        What specific questions should the AI agent ask {patientName} during this call?
                    </p>

                    <textarea
                        value={doctorPrompt}
                        onChange={(e) => setDoctorPrompt(e.target.value)}
                        className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        rows={4}
                        placeholder="e.g. Ask them if they are still experiencing pain in their lower back after taking the new medicine..."
                    />

                    <div className="flex gap-3 justify-end mt-6">
                        <GlassButton onClick={() => setShowDocPromptModal(false)} variant="ghost" disabled={isTriggeringCall}>
                            Cancel
                        </GlassButton>
                        <GlassButton
                            onClick={() => {
                                if (!appointment?.patient?.phone) return;
                                setIsTriggeringCall(true);
                                import("@/lib/api").then(({ agentApi }) => {
                                    agentApi.triggerCall({
                                        phone_number: appointment.patient.phone,
                                        appointment_id: appointment.id,
                                        doctor_prompt: doctorPrompt || undefined
                                    })
                                        .then(() => {
                                            toast({ title: "Call Initiated", description: "AI agent is calling the patient." });
                                            setShowDocPromptModal(false);
                                        })
                                        .catch(e => {
                                            console.error("Backend call trigger failed:", e);
                                            toast({ variant: "destructive", title: "Call Failed", description: "Could not trigger AI call." });
                                        })
                                        .finally(() => {
                                            setIsTriggeringCall(false);
                                        });
                                });
                            }}
                            disabled={isTriggeringCall}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isTriggeringCall ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4 mr-2" />}
                            Start Call
                        </GlassButton>
                    </div>
                </div>
            </GlassModal>
        </>
    );
};
