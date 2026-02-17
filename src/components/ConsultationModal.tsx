import { useState, useEffect, useRef } from "react";
import { appointmentsApi, inventoryApi, labTestsApi } from "@/lib/api";
import { GlassModal, GlassButton, GlassInput } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";
import {
    Pill, FlaskConical, X, Search, Loader2, FileText,
    AlertTriangle, CalendarPlus, Sparkles, Plus, Send
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
    const [remarksText, setRemarksText] = useState("");
    const [medicines, setMedicines] = useState<MedicineItem[]>([]);
    const [labs, setLabs] = useState<LabItem[]>([]);
    const [severity, setSeverity] = useState(appointment?.severity || "medium");
    const [nextFollowup, setNextFollowup] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Medicine search
    const medSearch = useDebouncedSearch((q) => inventoryApi.search(q));
    const [showMedDropdown, setShowMedDropdown] = useState(false);

    // Lab test search
    const labSearch = useDebouncedSearch((q) => labTestsApi.search(q));
    const [showLabDropdown, setShowLabDropdown] = useState(false);

    // Dosage input for adding medicine
    const [pendingDosage, setPendingDosage] = useState("");

    // Pre-fill existing remarks
    useEffect(() => {
        if (appointment?.remarks) {
            setRemarksText(appointment.remarks.text || "");
            setMedicines(
                (appointment.remarks.medicine || []).map((m: any, i: number) => ({
                    id: m.id || `existing-${i}`,
                    name: m.name,
                    dosage: m.dosage || "",
                }))
            );
            setLabs(
                (appointment.remarks.lab || []).map((l: any, i: number) => ({
                    id: l.id || `existing-lab-${i}`,
                    name: l.name,
                }))
            );
        }
        if (appointment?.severity) setSeverity(appointment.severity);
        if (appointment?.next_followup) setNextFollowup(appointment.next_followup);
    }, [appointment]);

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

    const severityColors: Record<string, string> = {
        low: "text-green-400 bg-green-500/10 border-green-500/30",
        medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
        high: "text-orange-400 bg-orange-500/10 border-orange-500/30",
        critical: "text-red-400 bg-red-500/10 border-red-500/30",
    };

    return (
        <GlassModal
            open={open}
            onClose={onClose}
            title="Consultation"
            className="max-w-4xl text-left"
        >
            <div className="space-y-5 pt-2 text-left">
                {/* Patient Info Header */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">{patientName}</h3>
                        <p className="text-sm text-muted-foreground">
                            {appointment?.date} · {appointment?.slot}
                            {appointment?.description && ` — ${appointment.description}`}
                        </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${severityColors[severity]}`}>
                        {severity}
                    </div>
                </div>

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
                                    {medSearch.loading && <Loader2 className="absolute right-2.5 top-2.5 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                                </div>
                                <input
                                    value={pendingDosage}
                                    onChange={e => setPendingDosage(e.target.value)}
                                    placeholder="Dosage"
                                    className="w-24 bg-background border border-input rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

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

                    {/* ── Lab Tests ── */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            <FlaskConical className="w-4 h-4 inline mr-1.5" />
                            Lab Tests
                        </label>
                        <div className="relative">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                                <input
                                    value={labSearch.query}
                                    onChange={e => { labSearch.setQuery(e.target.value); setShowLabDropdown(true); }}
                                    onFocus={() => setShowLabDropdown(true)}
                                    placeholder="Search lab test..."
                                    className="w-full bg-background border border-input rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                {labSearch.loading && <Loader2 className="absolute right-2.5 top-2.5 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                            </div>

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
        </GlassModal>
    );
};
