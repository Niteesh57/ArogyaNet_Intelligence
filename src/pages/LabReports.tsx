import { useEffect, useState } from "react";
import { labReportsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, GlassTable, GlassButton, GlassModal, GlassInput, GlassSelect, SearchBar, Shimmer } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, FileText, ExternalLink } from "lucide-react";

interface LabReport {
    id: string;
    pdf_url: string;
    created_by: string;
    summary?: string;
    severity: "normal" | "abnormal" | "critical";
    created_at: string;
    updated_at: string;
}

const LabReports = () => {
    const { isAdmin, user } = useAuth();
    const [reports, setReports] = useState<LabReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modal, setModal] = useState<"create" | "edit" | null>(null);
    const [selected, setSelected] = useState<LabReport | null>(null);
    const [form, setForm] = useState({
        pdf_url: "",
        summary: "",
        severity: "normal" as "normal" | "abnormal" | "critical",
    });

    const fetch = () => {
        setLoading(true);
        labReportsApi.list().then((r) => setReports(r.data)).catch(() => { }).finally(() => setLoading(false));
    };
    useEffect(() => { fetch(); }, []);

    const filtered = reports.filter((r) =>
        (r.summary || "").toLowerCase().includes(search.toLowerCase())
    );

    const handleCreate = async () => {
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
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleUpdate = async () => {
        if (!selected) return;
        try {
            await labReportsApi.update(selected.id, {
                pdf_url: form.pdf_url,
                summary: form.summary || undefined,
                severity: form.severity,
            });
            toast({ title: "Updated" });
            setModal(null);
            fetch();
        } catch {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this lab report?")) return;
        try {
            await labReportsApi.delete(id);
            toast({ title: "Deleted" });
            fetch();
        } catch {
            toast({ title: "Error", variant: "destructive" });
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case "normal": return "text-green-500";
            case "abnormal": return "text-yellow-500";
            case "critical": return "text-red-500";
            default: return "text-muted-foreground";
        }
    };

    return (
        <div>
            <PageHeader
                title="Lab Reports"
                action={
                    <div className="flex items-center gap-3">
                        <SearchBar value={search} onChange={setSearch} />
                        {isAdmin && (
                            <GlassButton
                                onClick={() => {
                                    setForm({ pdf_url: "", summary: "", severity: "normal" });
                                    setModal("create");
                                }}
                            >
                                <Plus className="w-4 h-4 mr-1 inline" />
                                Add Report
                            </GlassButton>
                        )}
                    </div>
                }
            />
            {loading ? (
                <Shimmer />
            ) : (
                <GlassTable headers={["PDF", "Summary", "Severity", "Created", "Actions"]}>
                    {filtered.map((r) => (
                        <tr key={r.id} className="hover:bg-background/20 transition-colors">
                            <td className="px-4 py-3 text-sm">
                                <a
                                    href={r.pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline flex items-center gap-1"
                                >
                                    <FileText className="w-3 h-3" />
                                    View PDF
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground">
                                {r.summary || "—"}
                            </td>
                            <td className={`px-4 py-3 text-sm font-medium capitalize ${getSeverityColor(r.severity)}`}>
                                {r.severity}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                                {new Date(r.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 flex gap-2">
                                {isAdmin && (
                                    <>
                                        <button
                                            onClick={() => {
                                                setSelected(r);
                                                setForm({
                                                    pdf_url: r.pdf_url,
                                                    summary: r.summary || "",
                                                    severity: r.severity,
                                                });
                                                setModal("edit");
                                            }}
                                            className="text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(r.id)}
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
                title={modal === "create" ? "Add Lab Report" : "Edit Lab Report"}
            >
                <div className="space-y-4 pt-2">
                    <GlassInput
                        label="PDF URL"
                        value={form.pdf_url}
                        onChange={(v) => setForm((p) => ({ ...p, pdf_url: v }))}
                        placeholder="https://example.com/report.pdf"
                    />
                    <GlassInput
                        label="Summary"
                        value={form.summary}
                        onChange={(v) => setForm((p) => ({ ...p, summary: v }))}
                        placeholder="Optional description"
                    />
                    <GlassSelect
                        label="Severity"
                        value={form.severity}
                        onChange={(v) => setForm((p) => ({ ...p, severity: v as any }))}
                        options={[
                            { value: "normal", label: "Normal" },
                            { value: "abnormal", label: "Abnormal" },
                            { value: "critical", label: "Critical" },
                        ]}
                    />
                    <GlassButton
                        onClick={modal === "create" ? handleCreate : handleUpdate}
                        className="w-full"
                    >
                        {modal === "create" ? "Create Report" : "Save"}
                    </GlassButton>
                </div>
            </GlassModal>
        </div>
    );
};

export default LabReports;
