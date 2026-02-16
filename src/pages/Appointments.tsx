import { useEffect, useState } from "react";
import { appointmentsApi, agentApi, patientsApi, doctorsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, GlassTable, GlassButton, GlassModal, GlassInput, GlassSelect, SearchBar, Shimmer } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Calendar, Sparkles } from "lucide-react";
import { GeminiLoadingModal } from "@/components/GeminiAnimation";

interface Appointment {
    id: string;
    patient_id: string;
    doctor_id: string;
    description: string;
    date: string;
    slot: string;
    severity: "low" | "medium" | "high" | "critical";
    remarks?: { text?: string; lab?: string[]; medicine?: string[] };
    next_followup?: string;
    lab_report_id?: string;
    created_at: string;
    updated_at: string;
}

const Appointments = () => {
    const { isAdmin } = useAuth();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modal, setModal] = useState<"create" | "edit" | null>(null);
    const [selected, setSelected] = useState<Appointment | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [form, setForm] = useState({
        patient_id: "",
        doctor_id: "",
        description: "",
        date: "",
        slot: "",
        severity: "low" as "low" | "medium" | "high" | "critical",
        remarks_text: "",
        next_followup: "",
    });

    const fetch = () => {
        setLoading(true);
        appointmentsApi.list().then((r) => setAppointments(r.data)).catch(() => { }).finally(() => setLoading(false));
    };
    useEffect(() => { fetch(); }, []);

    const filtered = appointments.filter((a) =>
        (a.description + a.slot).toLowerCase().includes(search.toLowerCase())
    );

    const handleAISuggest = async () => {
        if (!form.description) {
            toast({ title: "Please enter a description first", variant: "destructive" });
            return;
        }

        setAiLoading(true);
        try {
            const response = await agentApi.suggestAppointment({
                description: form.description,
                appointment_date: form.date || undefined,
                patient_id: form.patient_id || undefined,
            });

            const suggestion = response.data;

            setForm((p) => ({
                ...p,
                doctor_id: suggestion.doctor_id || p.doctor_id,
                slot: suggestion.slot_time || p.slot,
                severity: suggestion.severity || p.severity,
                description: suggestion.enhanced_description || p.description,
                date: suggestion.appointment_date || p.date,
            }));

            toast({ title: "AI suggestion applied! ✨", description: "Review and create appointment" });
        } catch (error) {
            toast({ title: "AI suggestion failed", description: "Please fill manually", variant: "destructive" });
        } finally {
            setAiLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            await appointmentsApi.create({
                ...form,
                remarks: form.remarks_text ? { text: form.remarks_text } : undefined,
                next_followup: form.next_followup || undefined,
            });
            toast({ title: "Appointment created" });
            setModal(null);
            fetch();
        } catch {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleUpdate = async () => {
        if (!selected) return;
        try {
            await appointmentsApi.update(selected.id, {
                description: form.description,
                date: form.date,
                slot: form.slot,
                severity: form.severity,
                remarks: form.remarks_text ? { text: form.remarks_text } : undefined,
                next_followup: form.next_followup || undefined,
            });
            toast({ title: "Updated" });
            setModal(null);
            fetch();
        } catch {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this appointment?")) return;
        try {
            await appointmentsApi.delete(id);
            toast({ title: "Deleted" });
            fetch();
        } catch {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "low": return "text-green-500";
            case "medium": return "text-yellow-500";
            case "high": return "text-orange-500";
            case "critical": return "text-red-500";
            default: return "text-muted-foreground";
        }
    };

    return (
        <div>
            <PageHeader
                title="Appointments"
                action={
                    <div className="flex items-center gap-3">
                        <SearchBar value={search} onChange={setSearch} />
                        {isAdmin && (
                            <GlassButton
                                onClick={() => {
                                    setForm({
                                        patient_id: "",
                                        doctor_id: "",
                                        description: "",
                                        date: "",
                                        slot: "",
                                        severity: "low",
                                        remarks_text: "",
                                        next_followup: "",
                                    });
                                    setModal("create");
                                }}
                            >
                                <Plus className="w-4 h-4 mr-1 inline" />
                                Add Appointment
                            </GlassButton>
                        )}
                    </div>
                }
            />
            {loading ? (
                <Shimmer />
            ) : (
                <GlassTable headers={["Date", "Slot", "Patient ID", "Doctor ID", "Description", "Severity", "Actions"]}>
                    {filtered.map((a) => (
                        <tr key={a.id} className="hover:bg-background/20 transition-colors">
                            <td className="px-4 py-3 text-sm text-foreground">
                                {new Date(a.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{a.slot}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground text-xs">{a.patient_id.substring(0, 8)}...</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground text-xs">{a.doctor_id.substring(0, 8)}...</td>
                            <td className="px-4 py-3 text-sm text-foreground">{a.description}</td>
                            <td className={`px-4 py-3 text-sm font-medium capitalize ${getSeverityColor(a.severity)}`}>
                                {a.severity}
                            </td>
                            <td className="px-4 py-3 flex gap-2">
                                {isAdmin && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setSelected(a);
                                                setForm({
                                                    patient_id: a.patient_id,
                                                    doctor_id: a.doctor_id,
                                                    description: a.description,
                                                    date: a.date,
                                                    slot: a.slot,
                                                    severity: a.severity,
                                                    remarks_text: a.remarks?.text || "",
                                                    next_followup: a.next_followup || "",
                                                });
                                                setModal("edit");
                                            }}
                                            className="text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(a.id)}
                                            className="text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </GlassTable>
            )}

            {/* Create/Edit Modal */}
            <GlassModal
                open={modal === "create" || modal === "edit"}
                onClose={() => setModal(null)}
                title={modal === "create" ? "Add Appointment" : "Edit Appointment"}
            >
                <div className="space-y-4 pt-2">
                    {modal === "create" && (
                        <>
                            <GlassInput
                                label="Patient ID"
                                value={form.patient_id}
                                onChange={(v) => setForm((p) => ({ ...p, patient_id: v }))}
                                placeholder="Optional"
                            />
                            <GlassInput
                                label="Doctor ID"
                                value={form.doctor_id}
                                onChange={(v) => setForm((p) => ({ ...p, doctor_id: v }))}
                                placeholder="AI will suggest"
                            />
                        </>
                    )}
                    <GlassInput
                        label="Description"
                        value={form.description}
                        onChange={(v) => setForm((p) => ({ ...p, description: v }))}
                        placeholder="Describe patient symptoms..."
                    />

                    {modal === "create" && (
                        <GlassButton
                            onClick={handleAISuggest}
                            className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600"
                            disabled={aiLoading}
                        >
                            <Sparkles className="w-4 h-4 mr-2 inline" />
                            {aiLoading ? "AI Analyzing..." : "Get AI Suggestion ✨"}
                        </GlassButton>
                    )}

                    <GlassInput
                        label="Date"
                        value={form.date}
                        onChange={(v) => setForm((p) => ({ ...p, date: v }))}
                        type="date"
                    />
                    <GlassInput
                        label="Time Slot"
                        value={form.slot}
                        onChange={(v) => setForm((p) => ({ ...p, slot: v }))}
                        placeholder="e.g., 10:30"
                    />
                    <GlassSelect
                        label="Severity"
                        value={form.severity}
                        onChange={(v) => setForm((p) => ({ ...p, severity: v as any }))}
                        options={[
                            { value: "low", label: "Low" },
                            { value: "medium", label: "Medium" },
                            { value: "high", label: "High" },
                            { value: "critical", label: "Critical" },
                        ]}
                    />
                    <GlassInput
                        label="Remarks"
                        value={form.remarks_text}
                        onChange={(v) => setForm((p) => ({ ...p, remarks_text: v }))}
                        placeholder="Optional notes"
                    />
                    <GlassInput
                        label="Next Follow-up"
                        value={form.next_followup}
                        onChange={(v) => setForm((p) => ({ ...p, next_followup: v }))}
                        type="date"
                        placeholder="Optional"
                    />
                    <GlassButton
                        onClick={modal === "create" ? handleCreate : handleUpdate}
                        className="w-full"
                    >
                        {modal === "create" ? "Create Appointment" : "Save"}
                    </GlassButton>
                </div>
            </GlassModal>

            {/* AI Loading Modal */}
            {aiLoading && <GeminiLoadingModal message="AI is analyzing symptoms..." />}
        </div>
    );
};

export default Appointments;
