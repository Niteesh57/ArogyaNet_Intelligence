import { useState, useEffect } from "react";
import { UserSearch } from "@/components/UserSearch";
import { adminApi, usersApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, GlassTable, GlassButton, GlassModal, SearchBar, Shimmer } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, FlaskConical } from "lucide-react";

interface LabAssistant {
    id: string;
    full_name?: string;
    email: string;
    role: string;
    hospital_id?: string;
}

const LabAssistants = () => {
    const { isAdmin } = useAuth();
    const [labAssistants, setLabAssistants] = useState<LabAssistant[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modal, setModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState("");

    const fetchLabAssistants = () => {
        setLoading(true);
        adminApi.listLabAssistants()
            .then((r) => setLabAssistants(r.data))
            .catch(() => toast({ title: "Failed to load lab assistants", variant: "destructive" }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchLabAssistants(); }, []);

    const filtered = labAssistants.filter((la) =>
        ((la.full_name || "") + la.email).toLowerCase().includes(search.toLowerCase())
    );

    const handleCreate = async () => {
        if (!selectedUserId) {
            toast({ title: "Please select a user", variant: "destructive" });
            return;
        }
        try {
            await adminApi.createLabAssistant({ user_id: selectedUserId });
            toast({ title: "Lab Assistant created", description: "User has been promoted to Lab Assistant role." });
            setModal(false);
            setSelectedUserId("");
            fetchLabAssistants();
        } catch (e: any) {
            const detail = e?.response?.data?.detail || "Failed to create lab assistant";
            toast({ title: "Error", description: detail, variant: "destructive" });
        }
    };

    const handleRemove = async (userId: string) => {
        if (!confirm("Remove this lab assistant? They will be demoted to BASE role.")) return;
        try {
            await adminApi.removeLabAssistant(userId);
            toast({ title: "Lab Assistant removed" });
            fetchLabAssistants();
        } catch (e: any) {
            const detail = e?.response?.data?.detail || "Failed to remove lab assistant";
            toast({ title: "Error", description: detail, variant: "destructive" });
        }
    };

    return (
        <div>
            <PageHeader title="Lab Assistants" action={
                <div className="flex items-center gap-3">
                    <SearchBar value={search} onChange={setSearch} placeholder="Search lab assistants..." />
                    {isAdmin && (
                        <GlassButton onClick={() => { setSelectedUserId(""); setModal(true); }}>
                            <Plus className="w-4 h-4 mr-1 inline" />Add Lab Assistant
                        </GlassButton>
                    )}
                </div>
            } />

            {loading ? <Shimmer /> : (
                <GlassTable headers={["Name", "Email", "Role", "Actions"]}>
                    {filtered.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                                <div className="flex flex-col items-center gap-3">
                                    <FlaskConical className="w-10 h-10 opacity-30" />
                                    <p className="text-sm">No lab assistants found</p>
                                    {isAdmin && <p className="text-xs">Click "Add Lab Assistant" to promote a user.</p>}
                                </div>
                            </td>
                        </tr>
                    ) : filtered.map((la) => (
                        <tr key={la.id} className="hover:bg-background/20 transition-colors">
                            <td className="px-4 py-3 text-sm text-foreground">{la.full_name || "—"}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{la.email}</td>
                            <td className="px-4 py-3">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20 font-medium">
                                    Lab Assistant
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                {isAdmin && (
                                    <button
                                        onClick={() => handleRemove(la.id)}
                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                        title="Remove Lab Assistant"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </GlassTable>
            )}

            {/* Add Lab Assistant Modal */}
            <GlassModal open={modal} onClose={() => setModal(false)} title="Add Lab Assistant">
                <div className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">
                        Search for a user with <span className="font-mono text-xs bg-secondary px-1 rounded">BASE</span> role to promote them to Lab Assistant.
                    </p>
                    <UserSearch
                        onSelect={(u) => setSelectedUserId(u.id)}
                        label="Search User"
                        placeholder="Search by name or email"
                        searchAction={usersApi.searchUsersForStaff}
                    />
                    {selectedUserId && (
                        <p className="text-xs text-green-600 mt-1">✓ User selected</p>
                    )}
                    <GlassButton onClick={handleCreate} disabled={!selectedUserId} className="w-full">
                        Promote to Lab Assistant
                    </GlassButton>
                </div>
            </GlassModal>
        </div>
    );
};

export default LabAssistants;
