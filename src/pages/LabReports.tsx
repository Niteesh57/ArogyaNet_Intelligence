import { useEffect, useState } from "react";
import { labReportsApi, searchApi, doctorsApi, namesApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, GlassTable, GlassButton, GlassModal, GlassInput, GlassSelect, SearchBar, Shimmer } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FileText, ExternalLink, User, Stethoscope } from "lucide-react";
import { UserSearch } from "@/components/UserSearch";

interface LabReport {
    id: string;
    patient_id: string;
    doctor_id: string;
    pdf_url: string;
    created_by: string;
    summary?: string;
    severity: "normal" | "abnormal" | "critical";
    created_at: string;
    updated_at: string;
    // Enhanced fields for display
    patient_name?: string;
    doctor_name?: string;
}

const LabReports = () => {
    const { isAdmin, user } = useAuth();
    const [reports, setReports] = useState<LabReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modal, setModal] = useState<"create" | "edit" | null>(null);
    const [selected, setSelected] = useState<LabReport | null>(null);

    // Form State
    const [form, setForm] = useState({
        pdf_url: "",
        summary: "",
        severity: "normal" as "normal" | "abnormal" | "critical",
        patient_id: "",
        doctor_id: "",
    });

    // Display names for the form
    const [selectedPatientName, setSelectedPatientName] = useState("");
    const [selectedDoctorName, setSelectedDoctorName] = useState("");

    const fetchNames = async (reps: LabReport[]) => {
        const pIds = [...new Set(reps.map(r => r.patient_id))].filter(Boolean);
        const dIds = [...new Set(reps.map(r => r.doctor_id))].filter(Boolean);

        const map: Record<string, string> = {};

        await Promise.all([
            ...pIds.map(id => namesApi.getPatientName(id).then(r => map[id] = r.data.full_name).catch(() => { })),
            ...dIds.map(id => namesApi.getDoctorName(id).then(r => map[id] = r.data.full_name).catch(() => { }))
        ]);

        return reps.map(r => ({
            ...r,
            patient_name: map[r.patient_id] || "Unknown",
            doctor_name: map[r.doctor_id] || "Unknown",
        }));
    };

    const fetch = async () => {
        setLoading(true);
        try {
            let data: LabReport[] = [];

            if (user?.role === 'patient') {
                // Use dedicated my-reports endpoint for patient role
                try {
                    const res = await labReportsApi.getMyReports();
                    data = res.data;
                } catch {
                    // Fallback: find patient by email, then get their reports
                    const searchRes = await searchApi.patientSearch(user.email);
                    const me = searchRes.data.find((p: any) => p.email === user.email);
                    if (me) {
                        const res = await labReportsApi.getForPatient(me.id);
                        data = res.data;
                    }
                }
            } else if (user?.role === 'doctor') {
                // Doctors see all for now (or could filter by their ID if API supported it)
                const res = await labReportsApi.list();
                // Client side filter for doctors to see reports they authored OR are assigned to? 
                // For now, let's show all but maybe highlight theirs. 
                // Or better, filter if they are the doctor.
                const docRes = await doctorsApi.list();
                const myDoc = docRes.data.find((d: any) => d.user_id === user.id);
                if (myDoc) {
                    data = res.data.filter((r: any) => r.doctor_id === myDoc.id);
                } else {
                    data = [];
                }
            } else {
                // Admin sees all
                const res = await labReportsApi.list();
                data = res.data;
            }

            const enriched = await fetchNames(data);
            setReports(enriched);
        } catch (e) {
            console.error(e);
            toast({ title: "Failed to load reports", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetch(); }, [user]);

    const filtered = reports.filter((r) =>
        (r.summary || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.patient_name || "").toLowerCase().includes(search.toLowerCase())
    );

    const handleCreate = async () => {
        if (!form.patient_id || !form.doctor_id) {
            toast({ title: "Please select both Patient and Doctor", variant: "destructive" });
            return;
        }
        try {
            await labReportsApi.create({
                ...form,
                created_by: user?.id || "",
                summary: form.summary || undefined,
            });
            toast({ title: "Lab report created" });
            setModal(null);
            fetch();
        } catch {
            toast({ title: "Error creating report", variant: "destructive" });
        }
    };

    const handleUpdate = async () => {
        if (!selected) return;
        try {
            await labReportsApi.update(selected.id, {
                pdf_url: form.pdf_url,
                summary: form.summary || undefined,
                severity: form.severity,
                // We typically don't change patient/doctor on edit, but consistent with create
            });
            toast({ title: "Updated" });
            setModal(null);
            fetch();
        } catch {
            toast({ title: "Error updating report", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this lab report?")) return;
        try {
            await labReportsApi.delete(id);
            toast({ title: "Deleted" });
            fetch();
        } catch {
            toast({ title: "Error deleting report", variant: "destructive" });
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "normal": return "text-green-500 bg-green-500/10";
            case "abnormal": return "text-yellow-500 bg-yellow-500/10";
            case "critical": return "text-red-500 bg-red-500/10";
            default: return "text-muted-foreground";
        }
    };

    const openCreate = () => {
        setForm({ pdf_url: "", summary: "", severity: "normal", patient_id: "", doctor_id: "" });
        setSelectedPatientName("");
        setSelectedDoctorName("");
        setModal("create");
    };

    const openEdit = (r: LabReport) => {
        setSelected(r);
        setForm({
            pdf_url: r.pdf_url,
            summary: r.summary || "",
            severity: r.severity,
            patient_id: r.patient_id,
            doctor_id: r.doctor_id
        });
        // We prefer not to change patient/doctor in edit mode unless necessary
        setSelectedPatientName(r.patient_name || "");
        setSelectedDoctorName(r.doctor_name || "");
        setModal("edit");
    };

    return (
        <div>
            <PageHeader
                title="Lab Reports"
                action={
                    <div className="flex items-center gap-3">
                        <SearchBar value={search} onChange={setSearch} placeholder="Search reports or patients..." />
                        {(isAdmin || user?.role === 'doctor') && (
                            <GlassButton onClick={openCreate}>
                                <Plus className="w-4 h-4 mr-1 inline" />
                                Add Report
                            </GlassButton>
                        )}
                    </div>
                }
            />
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <Shimmer key={i} className="h-16" />)}
                </div>
            ) : (
                <GlassTable headers={["Date", "Patient", "Doctor", "Summary", "Severity", "Report", "Actions"]}>
                    {filtered.length > 0 ? filtered.map((r) => (
                        <tr key={r.id} className="hover:bg-background/20 transition-colors">
                            <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                                {new Date(r.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                                {r.patient_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                                {r.doctor_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground max-w-xs truncate">
                                {r.summary || "—"}
                            </td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${getSeverityColor(r.severity)}`}>
                                    {r.severity}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                                <a
                                    href={r.pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80 hover:underline flex items-center gap-1 font-medium transition-colors"
                                >
                                    <FileText className="w-4 h-4" />
                                    View PDF
                                    <ExternalLink className="w-3 h-3 opacity-50" />
                                </a>
                            </td>
                            <td className="px-4 py-3 flex gap-2">
                                {(isAdmin || (user?.role === 'doctor' && r.doctor_id === form.doctor_id)) && (
                                    <>
                                        <button onClick={() => openEdit(r)} className="p-1 text-muted-foreground hover:text-primary transition-colors">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(r.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                No lab reports found.
                            </td>
                        </tr>
                    )}
                </GlassTable>
            )}

            {/* Create/Edit Modal */}
            <GlassModal
                open={modal === "create" || modal === "edit"}
                onClose={() => setModal(null)}
                title={modal === "create" ? "Add Lab Report" : "Edit Lab Report"}
                className="max-w-xl"
            >
                <div className="space-y-5 pt-2">
                    {/* Patient & Doctor Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            {modal === 'create' ? (
                                <UserSearch
                                    label="Patient"
                                    placeholder="Search patient..."
                                    onSelect={(u) => {
                                        setForm(p => ({ ...p, patient_id: u.id }));
                                        setSelectedPatientName(u.full_name);
                                    }}
                                    searchAction={searchApi.patientSearch}
                                />
                            ) : (
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Patient</label>
                                    <div className="p-2 border rounded-md bg-muted/20 text-sm text-muted-foreground">
                                        {selectedPatientName || "Unknown"}
                                    </div>
                                </div>
                            )}
                            {modal === 'create' && form.patient_id && (
                                <div className="text-xs text-green-500 flex items-center gap-1">
                                    <User className="w-3 h-3" /> Selected: {selectedPatientName}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            {modal === 'create' ? (
                                <UserSearch
                                    label="Doctor"
                                    placeholder="Search doctor..."
                                    onSelect={(u) => {
                                        setForm(p => ({ ...p, doctor_id: u.id })); // Note: UserSearch returns user object, we need doctor ID. 
                                        // Wait, UserSearch searches USERS. Doctors table links user_id -> doctor_id.
                                        // searchApi.doctorSearch returns Doctors, not Users? 
                                        // Let's check api.ts searchApi.doctorSearch.
                                        // If it returns Doctors, then u.id is doctor_id.
                                        // Let's assume it returns Doctor objects.
                                        setSelectedDoctorName(u.full_name);
                                    }}
                                    searchAction={searchApi.doctorSearch}
                                />
                            ) : (
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Doctor</label>
                                    <div className="p-2 border rounded-md bg-muted/20 text-sm text-muted-foreground">
                                        {selectedDoctorName || "Unknown"}
                                    </div>
                                </div>
                            )}
                            {modal === 'create' && form.doctor_id && (
                                <div className="text-xs text-blue-500 flex items-center gap-1">
                                    <Stethoscope className="w-3 h-3" /> Selected: {selectedDoctorName}
                                </div>
                            )}
                        </div>
                    </div>

                    <GlassInput
                        label="PDF URL"
                        value={form.pdf_url}
                        onChange={(v) => setForm((p) => ({ ...p, pdf_url: v }))}
                        placeholder="https://example.com/report.pdf"
                    />

                    <GlassInput
                        label="Summary / Test Name"
                        value={form.summary}
                        onChange={(v) => setForm((p) => ({ ...p, summary: v }))}
                        placeholder="e.g. Complete Blood Count (CBC)"
                    />

                    <GlassSelect
                        label="Severity"
                        value={form.severity}
                        onChange={(v) => setForm((p) => ({ ...p, severity: v as any }))}
                        options={[
                            { value: "normal", label: "Normal (Green)" },
                            { value: "abnormal", label: "Abnormal (Yellow)" },
                            { value: "critical", label: "Critical (Red)" },
                        ]}
                    />

                    <div className="pt-2">
                        <GlassButton
                            onClick={modal === "create" ? handleCreate : handleUpdate}
                            className="w-full"
                            disabled={!form.patient_id || !form.doctor_id || !form.pdf_url}
                        >
                            {modal === "create" ? "Create Report" : "Save Changes"}
                        </GlassButton>
                    </div>
                </div>
            </GlassModal>
        </div>
    );
};

export default LabReports;
