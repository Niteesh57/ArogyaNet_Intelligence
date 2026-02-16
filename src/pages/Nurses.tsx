import { useEffect, useState } from "react";
import { nursesApi, adminApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, GlassTable, GlassButton, GlassModal, GlassInput, GlassSelect, SearchBar, Shimmer } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Nurse {
  id: string; shift_type: string; is_available?: boolean;
  user_id: string; hospital_id: string; user?: { full_name?: string; email: string };
}

const Nurses = () => {
  const { isAdmin, user } = useAuth();
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<Nurse | null>(null);
  const [form, setForm] = useState({ user_id: "", hospital_id: "", shift_type: "day" });

  const fetch = () => { setLoading(true); nursesApi.list().then((r) => setNurses(r.data)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { fetch(); }, []);

  const filtered = nurses.filter((n) => ((n.user?.full_name || "") + (n.user?.email || "")).toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    try { await adminApi.createNurse({ ...form, hospital_id: form.hospital_id || user?.hospital_id }); toast({ title: "Nurse created" }); setModal(null); fetch(); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    try { await nursesApi.update(selected.id, { shift_type: form.shift_type, is_available: selected.is_available }); toast({ title: "Updated" }); setModal(null); fetch(); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this nurse?")) return;
    try { await nursesApi.delete(id); toast({ title: "Deleted" }); fetch(); } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const toggleAvail = async (n: Nurse) => {
    try { await nursesApi.update(n.id, { is_available: !n.is_available }); fetch(); } catch {}
  };

  return (
    <div>
      <PageHeader title="Nurses" action={
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search nurses..." />
          {isAdmin && <GlassButton onClick={() => { setForm({ user_id: "", hospital_id: user?.hospital_id || "", shift_type: "day" }); setModal("create"); }}><Plus className="w-4 h-4 mr-1 inline" />Add Nurse</GlassButton>}
        </div>
      } />
      {loading ? <Shimmer /> : (
        <GlassTable headers={["Name", "Email", "Shift", "Available", "Actions"]}>
          {filtered.map((n) => (
            <tr key={n.id} className="hover:bg-background/20 transition-colors">
              <td className="px-4 py-3 text-sm text-foreground">{n.user?.full_name || "—"}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{n.user?.email || "—"}</td>
              <td className="px-4 py-3 text-sm text-foreground capitalize">{n.shift_type}</td>
              <td className="px-4 py-3"><button onClick={() => toggleAvail(n)} className={`w-9 h-5 rounded-full transition-colors ${n.is_available ? "bg-primary" : "bg-border/50"}`}><div className={`w-4 h-4 rounded-full bg-foreground transition-transform ${n.is_available ? "translate-x-4" : "translate-x-0.5"}`} /></button></td>
              <td className="px-4 py-3 flex gap-2">
                {isAdmin && <>
                  <button onClick={() => { setSelected(n); setForm({ user_id: n.user_id, hospital_id: n.hospital_id, shift_type: n.shift_type }); setModal("edit"); }} className="text-muted-foreground hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(n.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                </>}
              </td>
            </tr>
          ))}
        </GlassTable>
      )}
      <GlassModal open={modal !== null} onClose={() => setModal(null)} title={modal === "create" ? "Add Nurse" : "Edit Nurse"}>
        <div className="space-y-4 pt-2">
          {modal === "create" && <GlassInput label="User ID" value={form.user_id} onChange={(v) => setForm((p) => ({ ...p, user_id: v }))} />}
          <GlassSelect label="Shift Type" value={form.shift_type} onChange={(v) => setForm((p) => ({ ...p, shift_type: v }))} options={[{ value: "day", label: "Day" }, { value: "night", label: "Night" }]} />
          <GlassButton onClick={modal === "create" ? handleCreate : handleUpdate} className="w-full">{modal === "create" ? "Create Nurse" : "Save"}</GlassButton>
        </div>
      </GlassModal>
    </div>
  );
};

export default Nurses;
