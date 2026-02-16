import { useState, useEffect } from "react";
import { UserSearch } from "@/components/UserSearch";
import { doctorsApi, adminApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, GlassTable, GlassButton, GlassModal, GlassInput, GlassSelect, SearchBar, Shimmer } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Doctor {
  id: string; specialization: string; license_number: string;
  experience_years?: number; tags?: string; is_available?: boolean;
  user_id: string; hospital_id: string; user?: { full_name?: string; email: string };
}

const Doctors = () => {
  const { isAdmin, user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<Doctor | null>(null);
  const [form, setForm] = useState({ specialization: "", license_number: "", experience_years: "", tags: "", user_id: "", hospital_id: "" });

  const fetch = () => {
    setLoading(true);
    doctorsApi.list().then((r) => setDoctors(r.data)).catch(() => toast({ title: "Error", description: "Failed to load doctors", variant: "destructive" })).finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const filtered = doctors.filter((d) =>
    (d.specialization + (d.user?.full_name || "") + (d.user?.email || "")).toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    try {
      await adminApi.createDoctor({ ...form, experience_years: Number(form.experience_years) || 0, hospital_id: form.hospital_id || user?.hospital_id });
      toast({ title: "Doctor created" }); setModal(null); fetch();
    } catch { toast({ title: "Error", description: "Failed to create doctor", variant: "destructive" }); }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    try {
      await doctorsApi.update(selected.id, { specialization: form.specialization, license_number: form.license_number, experience_years: Number(form.experience_years) || 0, tags: form.tags || null, is_available: selected.is_available });
      toast({ title: "Doctor updated" }); setModal(null); fetch();
    } catch { toast({ title: "Error", description: "Failed to update", variant: "destructive" }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this doctor?")) return;
    try { await doctorsApi.delete(id); toast({ title: "Deleted" }); fetch(); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const toggleAvail = async (d: Doctor) => {
    try { await doctorsApi.update(d.id, { is_available: !d.is_available }); fetch(); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const openEdit = (d: Doctor) => {
    setSelected(d);
    setForm({ specialization: d.specialization, license_number: d.license_number, experience_years: String(d.experience_years || 0), tags: d.tags || "", user_id: d.user_id, hospital_id: d.hospital_id });
    setModal("edit");
  };

  return (
    <div>
      <PageHeader title="Doctors" action={
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search doctors..." />
          {isAdmin && <GlassButton onClick={() => { setForm({ specialization: "", license_number: "", experience_years: "", tags: "", user_id: "", hospital_id: user?.hospital_id || "" }); setModal("create"); }}><Plus className="w-4 h-4 mr-1 inline" />Add Doctor</GlassButton>}
        </div>
      } />
      {loading ? <Shimmer /> : (
        <GlassTable headers={["Name", "Email", "Specialization", "License", "Experience", "Available", "Actions"]}>
          {filtered.map((d) => (
            <tr key={d.id} className="hover:bg-background/20 transition-colors">
              <td className="px-4 py-3 text-sm text-foreground">{d.user?.full_name || "—"}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{d.user?.email || "—"}</td>
              <td className="px-4 py-3 text-sm text-foreground">{d.specialization}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{d.license_number}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{d.experience_years || 0} yrs</td>
              <td className="px-4 py-3">
                <button onClick={() => toggleAvail(d)} className={`w-9 h-5 rounded-full transition-colors ${d.is_available ? "bg-primary" : "bg-border/50"}`}>
                  <div className={`w-4 h-4 rounded-full bg-foreground transition-transform ${d.is_available ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </td>
              <td className="px-4 py-3 flex gap-2">
                {isAdmin && <>
                  <button onClick={() => openEdit(d)} className="text-muted-foreground hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(d.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                </>}
              </td>
            </tr>
          ))}
        </GlassTable>
      )}

      <GlassModal open={modal !== null} onClose={() => setModal(null)} title={modal === "create" ? "Add Doctor" : "Edit Doctor"}>
        <div className="space-y-4 pt-2">
          {modal === "create" && (
            <div className="mb-4">
              <UserSearch onSelect={(u) => setForm((p) => ({ ...p, user_id: u.id }))} label="Search User" placeholder="Search by name or email" searchAction={doctorsApi.searchPotential} />
              {form.user_id && <p className="text-xs text-green-600 mt-1">User selected</p>}
            </div>
          )}
          <GlassInput label="Specialization" value={form.specialization} onChange={(v) => setForm((p) => ({ ...p, specialization: v }))} />
          <GlassInput label="License Number" value={form.license_number} onChange={(v) => setForm((p) => ({ ...p, license_number: v }))} />
          <GlassInput label="Experience (years)" value={form.experience_years} onChange={(v) => setForm((p) => ({ ...p, experience_years: v }))} type="number" />
          <GlassInput label="Tags" value={form.tags} onChange={(v) => setForm((p) => ({ ...p, tags: v }))} placeholder="e.g. senior, oncologist" />
          <GlassButton onClick={modal === "create" ? handleCreate : handleUpdate} className="w-full">{modal === "create" ? "Create Doctor" : "Save Changes"}</GlassButton>
        </div>
      </GlassModal>
    </div>
  );
};

export default Doctors;
