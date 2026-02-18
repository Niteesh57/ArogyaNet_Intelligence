import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { appointmentsApi, searchApi, agentApi, namesApi, doctorsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, GlassTable, GlassButton, GlassModal, GlassInput, GlassSelect, SearchBar, Shimmer } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Sparkles, X, Clock, Stethoscope, Bot } from "lucide-react";
import { GeminiLoadingModal } from "@/components/GeminiAnimation";
import { AppointmentChatModal } from "@/components/AppointmentChatModal";

interface Appointment {
    id: string;
    patient_id: string;
    doctor_id: string;
    description: string;
    date: string;
    slot: string;
    severity: "low" | "medium" | "high" | "critical";
    status?: "started" | "in_progress" | "finished" | "admitted";
    remarks?: { text?: string; lab?: string[]; medicine?: string[] };
    next_followup?: string;
    lab_report_id?: string;
    created_at: string;
    updated_at: string;
}

interface Slot {
    time: string;
    status: "available" | "booked";
}

const Appointments = () => {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modal, setModal] = useState<"create" | "edit" | null>(null);
    const [selected, setSelected] = useState<Appointment | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    // Chat Modal State
    const [chatModal, setChatModal] = useState(false);
    const [chatAppointment, setChatAppointment] = useState<{ id: string, patientName: string } | null>(null);

    // Status Workflow State
    const [activeTab, setActiveTab] = useState<"started" | "in_progress" | "finished" | "admitted">("started");
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

    // Search states
    const [patientQuery, setPatientQuery] = useState("");
    const [patientResults, setPatientResults] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<{ id: string, name: string } | null>(null);

    const [doctorQuery, setDoctorQuery] = useState("");
    const [doctorResults, setDoctorResults] = useState<any[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState<{ id: string, name: string } | null>(null);

    // Slot states
    const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
    const [slotLoading, setSlotLoading] = useState(false);

    // Name cache for display
    const [nameCache, setNameCache] = useState<{ [key: string]: string }>({});

    const [form, setForm] = useState({
        patient_id: "",
        doctor_id: "",
        description: "",
        date: "",
        slot: "",
        severity: "low" as "low" | "medium" | "high" | "critical",
        status: "started" as "started" | "in_progress" | "finished" | "admitted",
        remarks_text: "",
        next_followup: "",
    });

    const fetch = () => {
        setLoading(true);
        appointmentsApi.list().then((r) => {
            setAppointments(r.data);
            // Fetch names for all appointments
            r.data.forEach((a: Appointment) => {
                fetchName('patient', a.patient_id);
                fetchName('doctor', a.doctor_id);
            });
        }).catch(() => { }).finally(() => setLoading(false));
    };

    useEffect(() => { fetch(); }, []);

    // Fetch slots when doctor and date change
    useEffect(() => {
        if (form.doctor_id && form.date) {
            setSlotLoading(true);
            doctorsApi.getSlots(form.doctor_id, form.date)
                .then(res => setAvailableSlots(res.data))
                .catch(() => setAvailableSlots([]))
                .finally(() => setSlotLoading(false));
        } else {
            setAvailableSlots([]);
        }
    }, [form.doctor_id, form.date]);

    // Status update handler
    const updateStatus = async (id: string, newStatus: string) => {
        try {
            // Optimistic update
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus as any } : a));
            await appointmentsApi.update(id, { status: newStatus });
            toast({ title: "Status updated" });
        } catch {
            toast({ title: "Update failed", variant: "destructive" });
            fetch(); // Revert
        }
    };

    const filtered = appointments.filter((a) => {
        const matchesSearch = (a.description + a.slot).toLowerCase().includes(search.toLowerCase());
        const matchesStatus = (a.status || "started") === activeTab;
        const matchesDate = !filterDate || a.date === filterDate;
        return matchesSearch && matchesStatus && matchesDate;
    }).sort((a, b) => a.slot.localeCompare(b.slot));

    const groupedAppointments = filtered.reduce((acc, appt) => {
        const date = appt.date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(appt);
        return acc;
    }, {} as Record<string, Appointment[]>);

    // Fetch and cache names
    const fetchName = async (type: 'patient' | 'doctor', id: string) => {
        const key = `${type}_${id}`;
        if (nameCache[key]) return;

        try {
            const res = type === 'patient'
                ? await namesApi.getPatientName(id)
                : await namesApi.getDoctorName(id);
            setNameCache(prev => ({ ...prev, [key]: res.data.full_name }));
        } catch { }
    };

    // ... search functions ...
    const searchPatients = async () => {
        if (!patientQuery || patientQuery.length < 2) return;
        try {
            const res = await searchApi.patientSearch(patientQuery);
            setPatientResults(res.data);
        } catch { }
    };
    const searchDoctors = async () => {
        if (!doctorQuery || doctorQuery.length < 2) return;
        try {
            const res = await searchApi.doctorSearch(doctorQuery);
            setDoctorResults(res.data);
        } catch { }
    };

    useEffect(() => {
        const timer = setTimeout(searchPatients, 300);
        return () => clearTimeout(timer);
    }, [patientQuery]);

    useEffect(() => {
        const timer = setTimeout(searchDoctors, 300);
        return () => clearTimeout(timer);
    }, [doctorQuery]);

    const selectPatient = (patient: any) => {
        setSelectedPatient({ id: patient.id, name: patient.full_name || patient.email });
        setForm(p => ({ ...p, patient_id: patient.id }));
        setPatientQuery("");
        setPatientResults([]);
    };

    const selectDoctor = (doctor: any) => {
        setSelectedDoctor({ id: doctor.id, name: doctor.user?.full_name || doctor.specialization });
        setForm(p => ({ ...p, doctor_id: doctor.id }));
        setDoctorQuery("");
        setDoctorResults([]);
    };

    const handleAISuggest = async () => {
        if (!form.date) {
            toast({ title: "Please select a date first", description: "AI needs a date to check availability", variant: "destructive" });
            return;
        }
        if (!form.description) {
            toast({ title: "Please enter a description first", variant: "destructive" });
            return;
        }

        setAiLoading(true);
        try {
            const response = await agentApi.suggestAppointment({
                description: form.description,
                appointment_date: form.date, // Mandatory
                patient_id: form.patient_id || undefined,
            });

            const suggestion = response.data;

            // Set doctor if suggested
            if (suggestion.doctor_id) {
                setForm((p) => ({ ...p, doctor_id: suggestion.doctor_id }));
                try {
                    const res = await namesApi.getDoctorName(suggestion.doctor_id);
                    setSelectedDoctor({ id: suggestion.doctor_id, name: res.data.full_name });
                    setNameCache(prev => ({ ...prev, [`doctor_${suggestion.doctor_id}`]: res.data.full_name }));
                } catch { }
            }

            setForm((p) => ({
                ...p,
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
            resetForm();
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
                status: form.status,
                remarks: form.remarks_text ? { text: form.remarks_text } : undefined,
                next_followup: form.next_followup || undefined,
            });
            toast({ title: "Updated" });
            setModal(null);
            resetForm();
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

    const resetForm = () => {
        setForm({
            patient_id: "",
            doctor_id: "",
            description: "",
            date: "",
            slot: "",
            severity: "low",
            status: "started",
            remarks_text: "",
            next_followup: "",
        });
        setSelectedPatient(null);
        setSelectedDoctor(null);
        setPatientQuery("");
        setDoctorQuery("");
        setPatientResults([]);
        setDoctorResults([]);
        setAvailableSlots([]);
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case "started": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            case "in_progress": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
            case "finished": return "bg-green-500/10 text-green-500 border-green-500/20";
            case "admitted": return "bg-red-500/10 text-red-500 border-red-500/20";
            default: return "bg-muted text-muted-foreground";
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
                                    resetForm();
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


            {/* Status Tabs */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    {/* Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {(["started", "in_progress", "finished", "admitted"] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setActiveTab(status)}
                                className={`
                                    px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                                    ${activeTab === status
                                        ? getStatusColor(status) + " border shadow-sm ring-1 ring-offset-1 ring-offset-background " + (status === 'started' ? 'ring-blue-500/30' : status === 'in_progress' ? 'ring-amber-500/30' : status === 'finished' ? 'ring-green-500/30' : 'ring-red-500/30')
                                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-transparent"}
                                `}
                            >
                                {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                                <span className="ml-2 text-xs opacity-60 bg-black/10 px-1.5 py-0.5 rounded-full">
                                    {appointments.filter(a => (a.status || 'started') === status).length}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Date Filter */}
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Filter Date:</span>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="bg-background border border-input rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        {filterDate && (
                            <button onClick={() => setFilterDate("")} className="text-xs text-muted-foreground hover:text-foreground">
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <Shimmer />
            ) : (
                <div className="space-y-8">
                    {Object.keys(groupedAppointments).length === 0 ? (
                        <div className="text-center py-10 bg-muted/10 rounded-xl border border-dashed border-muted">
                            <p className="text-muted-foreground">No appointments found for this selection.</p>
                            {filterDate && <button onClick={() => setFilterDate("")} className="text-primary hover:underline text-sm mt-2">See all dates</button>}
                        </div>
                    ) : (
                        Object.entries(groupedAppointments).sort((a, b) => a[0].localeCompare(b[0])).map(([date, appts]) => (
                            <div key={date} className="space-y-3">
                                <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground/80">
                                    <Clock className="w-4 h-4" />
                                    {new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                        {appts.length}
                                    </span>
                                </h3>
                                <GlassTable headers={["Slot", "Patient", "Doctor", "Description", "Status", "Severity", "Actions"]}>
                                    {appts.map((a) => (
                                        <tr key={a.id} className="hover:bg-background/20 transition-colors">
                                            {/* Removed Date Column as it is grouped */}
                                            <td className="px-4 py-3 text-sm text-foreground font-medium">{a.slot}</td>
                                            <td className="px-4 py-3 text-sm text-foreground">{nameCache[`patient_${a.patient_id}`] || 'Loading...'}</td>
                                            <td className="px-4 py-3 text-sm text-foreground">{nameCache[`doctor_${a.doctor_id}`] || 'Loading...'}</td>
                                            <td className="px-4 py-3 text-sm text-foreground max-w-[250px] truncate" title={a.description}>{a.description}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <select
                                                    value={a.status || "started"}
                                                    onChange={(e) => updateStatus(a.id, e.target.value)}
                                                    className={`text-xs font-medium rounded-md border-0 bg-transparent py-1 pl-0 pr-6 focus:ring-0 ${getStatusColor(a.status || 'started').replace('bg-', 'text-')}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <option value="started">Started</option>
                                                    <option value="in_progress">In Progress</option>
                                                    <option value="finished">Finished</option>
                                                    <option value="admitted">Admitted</option>
                                                </select>
                                            </td>
                                            <td className={`px-4 py-3 text-sm font-medium capitalize ${getSeverityColor(a.severity)}`}>
                                                {a.severity}
                                            </td>
                                            <td className="px-4 py-3 flex gap-2">
                                                <button
                                                    onClick={() => navigate(`/consultation/${a.id}`)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                                                    title={a.remarks ? "Update Consultation" : "Record Consultation"}
                                                >
                                                    <Stethoscope className="w-3.5 h-3.5" />
                                                    {a.remarks ? "Update" : "Record"}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setChatAppointment({
                                                            id: a.id,
                                                            patientName: nameCache[`patient_${a.patient_id}`] || 'Patient'
                                                        });
                                                        setChatModal(true);
                                                    }}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-500 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                                                    title="DocuMate Chat"
                                                >
                                                    <Bot className="w-3.5 h-3.5" />
                                                    DocuMate
                                                </button>
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
                                                                    status: a.status || "started",
                                                                    remarks_text: a.remarks?.text || "",
                                                                    next_followup: a.next_followup || "",
                                                                });
                                                                if (a.patient_id) fetchName('patient', a.patient_id).then(() => {
                                                                    setSelectedPatient({ id: a.patient_id, name: nameCache[`patient_${a.patient_id}`] || 'Unknown' });
                                                                });
                                                                if (a.doctor_id) fetchName('doctor', a.doctor_id).then(() => {
                                                                    setSelectedDoctor({ id: a.doctor_id, name: nameCache[`doctor_${a.doctor_id}`] || 'Unknown' });
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
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Create/Edit Modal */}
            <GlassModal
                open={modal === "create" || modal === "edit"}
                onClose={() => { setModal(null); resetForm(); }}
                title={modal === "create" ? "Add Appointment" : "Edit Appointment"}
                className="max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
                <div className="space-y-4 pt-2">
                    {modal === "create" && (
                        <>
                            {/* Patient Search */}
                            <div>
                                <label className="text-sm font-medium text-foreground block mb-2">Patient</label>
                                {selectedPatient ? (
                                    <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
                                        <span className="text-sm text-foreground">{selectedPatient.name}</span>
                                        <button onClick={() => { setSelectedPatient(null); setForm(p => ({ ...p, patient_id: "" })); }} className="text-muted-foreground hover:text-destructive">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <GlassInput
                                            label=""
                                            value={patientQuery}
                                            onChange={setPatientQuery}
                                            placeholder="Search patient by name or email..."
                                        />
                                        {patientResults.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {patientResults.map(p => (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => selectPatient(p)}
                                                        className="px-3 py-2 hover:bg-primary/20 cursor-pointer text-sm border-b border-border last:border-0"
                                                    >
                                                        <div className="font-medium">{p.full_name}</div>
                                                        <div className="text-xs text-muted-foreground">{p.email}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Doctor Search */}
                            <div>
                                <label className="text-sm font-medium text-foreground block mb-2">Doctor</label>
                                {selectedDoctor ? (
                                    <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
                                        <span className="text-sm text-foreground">{selectedDoctor.name}</span>
                                        <button onClick={() => { setSelectedDoctor(null); setForm(p => ({ ...p, doctor_id: "" })); }} className="text-muted-foreground hover:text-destructive">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <GlassInput
                                            label=""
                                            value={doctorQuery}
                                            onChange={setDoctorQuery}
                                            placeholder="Search doctor by name or specialization..."
                                        />
                                        {doctorResults.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                {doctorResults.map(d => (
                                                    <div
                                                        key={d.id}
                                                        onClick={() => selectDoctor(d)}
                                                        className="px-3 py-2 hover:bg-primary/20 cursor-pointer text-sm border-b border-border last:border-0"
                                                    >
                                                        <div className="font-medium">{d.user?.full_name || 'Unknown'}</div>
                                                        <div className="text-xs text-muted-foreground">{d.specialization}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {/* Date moved up per requirements so AI can use it */}
                        <GlassInput
                            label="Date (Required)"
                            value={form.date}
                            onChange={(v) => setForm((p) => ({ ...p, date: v }))}
                            type="date"
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
                    </div>

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

                    <div className="border-t border-border/30 pt-4"></div>

                    {/* Slots UI */}
                    <div>
                        <label className="text-sm font-medium text-foreground block mb-2">Available Slots <span className="text-xs text-muted-foreground font-normal">(Select Doctor & Date to view)</span></label>
                        {slotLoading ? (
                            <div className="p-4 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                Loading slots...
                            </div>
                        ) : availableSlots.length > 0 ? (
                            <div className="grid grid-cols-4 gap-2">
                                {availableSlots.map((slot) => (
                                    <button
                                        key={slot.time}
                                        onClick={() => setForm(p => ({ ...p, slot: slot.time }))}
                                        disabled={slot.status === 'booked'}
                                        className={`
                                text-sm py-2 px-1 rounded transition-colors border
                                ${form.slot === slot.time
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : slot.status === 'booked'
                                                    ? 'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50'
                                                    : 'bg-background hover:bg-accent border-border'
                                            }
                            `}
                                    >
                                        {slot.time}
                                    </button>
                                ))}
                            </div>
                        ) : form.doctor_id && form.date ? (
                            <div className="text-center text-sm text-muted-foreground p-3 border border-dashed border-border rounded">No slots available</div>
                        ) : (
                            <div className="text-center text-sm text-muted-foreground p-3 bg-muted/20 rounded">
                                Please select a Doctor and Date to view slots
                            </div>
                        )}
                        {/* Fallback manual input if needed (hidden for now, or maybe as backup) */}
                    </div>

                    <div className="border-t border-border/30 pt-4"></div>

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
                        {modal === "create" ? "Create Appointment" : "Save Changes"}
                    </GlassButton>
                </div>
            </GlassModal>

            {/* AI Loading Modal */}
            {aiLoading && <GeminiLoadingModal message="AI is analyzing symptoms..." />}

            {/* Chat Modal */}
            {chatAppointment && (
                <AppointmentChatModal
                    open={chatModal}
                    onClose={() => setChatModal(false)}
                    appointmentId={chatAppointment.id}
                    patientName={chatAppointment.patientName}
                />
            )}
        </div>
    );
};

export default Appointments;
