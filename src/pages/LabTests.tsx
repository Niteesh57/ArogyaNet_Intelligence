import { useEffect, useState } from "react";
import { labTestsApi, adminApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, GlassTable, GlassButton, GlassModal, GlassInput, SearchBar, Shimmer } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface LabTest {
  id: string; name: string; description?: string; price: number; available?: boolean; hospital_id: string;
}

const LabTests = () => {
  const { isAdmin, user } = useAuth();
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<LabTest | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", hospital_id: "" });

  const fetch = () => { setLoading(true); labTestsApi.list().then((r) => setTests(r.data)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { fetch(); }, []);

  const filtered = tests.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    try { await adminApi.createLabTest({ ...form, price: Number(form.price), hospital_id: form.hospital_id || user?.hospital_id }); toast({ title: "Lab test created" }); setModal(null); fetch(); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    try { await labTestsApi.update(selected.id, { name: form.name, description: form.description || null, price: Number(form.price) }); toast({ title: "Updated" }); setModal(null); fetch(); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const toggleAvail = async (t: LabTest) => {
    try { await labTestsApi.update(t.id, { available: !t.available }); fetch(); } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lab test?")) return;
    try { await labTestsApi.delete(id); toast({ title: "Deleted" }); fetch(); } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  return (
    <div>
      <PageHeader title="Lab Tests" action={
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} />
          {isAdmin && <GlassButton onClick={() => { setForm({ name: "", description: "", price: "", hospital_id: user?.hospital_id || "" }); setModal("create"); }}><Plus className="w-4 h-4 mr-1 inline" />Add Test</GlassButton>}
        </div>
      } />
      {loading ? <Shimmer /> : (
        <GlassTable headers={["Name", "Description", "Price", "Available", "Actions"]}>
          {filtered.map((t) => (
            <tr key={t.id} className="hover:bg-background/20 transition-colors">
              <td className="px-4 py-3 text-sm text-foreground">{t.name}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{t.description || "—"}</td>
              <td className="px-4 py-3 text-sm text-foreground">${t.price.toFixed(2)}</td>
              <td className="px-4 py-3"><button onClick={() => toggleAvail(t)} className={`w-9 h-5 rounded-full transition-colors ${t.available ? "bg-primary" : "bg-border/50"}`}><div className={`w-4 h-4 rounded-full bg-foreground transition-transform ${t.available ? "translate-x-4" : "translate-x-0.5"}`} /></button></td>
              <td className="px-4 py-3 flex gap-2">
                {isAdmin && <>
                  <button onClick={() => { setSelected(t); setForm({ name: t.name, description: t.description || "", price: String(t.price), hospital_id: t.hospital_id }); setModal("edit"); }} className="text-muted-foreground hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(t.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                </>}
              </td>
            </tr>
          ))}
        </GlassTable>
      )}
      <GlassModal open={modal !== null} onClose={() => setModal(null)} title={modal === "create" ? "Add Lab Test" : "Edit Lab Test"}>
        <div className="space-y-4 pt-2">
          <GlassInput label="Name" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
          <GlassInput label="Description" value={form.description} onChange={(v) => setForm((p) => ({ ...p, description: v }))} />
          <GlassInput label="Price" value={form.price} onChange={(v) => setForm((p) => ({ ...p, price: v }))} type="number" />
          <GlassButton onClick={modal === "create" ? handleCreate : handleUpdate} className="w-full">{modal === "create" ? "Create" : "Save"}</GlassButton>
        </div>
      </GlassModal>
    </div>
  );
};

export default LabTests;
