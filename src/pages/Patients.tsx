import { useEffect, useState } from "react";
import { patientsApi, adminApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, GlassTable, GlassButton, GlassModal, GlassInput, GlassSelect, SearchBar, Shimmer } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface Patient {
  id: string; full_name: string; age: number; gender: string;
  phone?: string; hospital_id: string; assigned_doctor_id?: string; created_at: string;
}

const Patients = () => {
  const { isAdmin, user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ full_name: "", age: "", gender: "male", phone: "", email: "", password: "Patient@123", hospital_id: "", assigned_doctor_id: "" });

  const fetch = () => { setLoading(true); patientsApi.list().then((r) => setPatients(r.data)).catch(() => { }).finally(() => setLoading(false)); };
  useEffect(() => { fetch(); }, []);

  const filtered = patients.filter((p) => (p.full_name + p.gender).toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    try {
      await adminApi.createPatient({ ...form, age: Number(form.age), hospital_id: form.hospital_id || user?.hospital_id, assigned_doctor_id: form.assigned_doctor_id || undefined });
      toast({ title: "Patient created" }); setModal(false); fetch();
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  return (
    <div>
      <PageHeader title="Patients" action={
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} />
          {isAdmin && <GlassButton onClick={() => { setForm({ full_name: "", age: "", gender: "male", phone: "", email: "", password: "Patient@123", hospital_id: user?.hospital_id || "", assigned_doctor_id: "" }); setModal(true); }}><Plus className="w-4 h-4 mr-1 inline" />Add Patient</GlassButton>}
        </div>
      } />
      {loading ? <Shimmer /> : (
        <GlassTable headers={["Name", "Age", "Gender", "Phone", "Doctor ID", "Created"]}>
          {filtered.map((p) => (
            <tr key={p.id} className="hover:bg-background/20 transition-colors">
              <td className="px-4 py-3 text-sm text-foreground">{p.full_name}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{p.age}</td>
              <td className="px-4 py-3 text-sm text-foreground capitalize">{p.gender}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{p.phone || "—"}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground text-xs">{p.assigned_doctor_id || "—"}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </GlassTable>
      )}
      <GlassModal open={modal} onClose={() => setModal(false)} title="Add Patient">
        <div className="space-y-4 pt-2">
          <GlassInput label="Full Name" value={form.full_name} onChange={(v) => setForm((p) => ({ ...p, full_name: v }))} />
          <GlassInput label="Email" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} type="email" placeholder="Required for auto-user creation" />
          <GlassInput label="Age" value={form.age} onChange={(v) => setForm((p) => ({ ...p, age: v }))} type="number" />
          <GlassSelect label="Gender" value={form.gender} onChange={(v) => setForm((p) => ({ ...p, gender: v }))} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }]} />
          <GlassInput label="Phone" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} />
          <GlassInput label="Password" value={form.password} onChange={(v) => setForm((p) => ({ ...p, password: v }))} type="password" placeholder="Default: Patient@123" />
          <p className="text-xs text-muted-foreground">A user account will be created automatically with the email and password above.</p>
          <GlassInput label="Assigned Doctor ID" value={form.assigned_doctor_id} onChange={(v) => setForm((p) => ({ ...p, assigned_doctor_id: v }))} placeholder="Optional" />
          <GlassButton onClick={handleCreate} className="w-full">Create Patient</GlassButton>
        </div>
      </GlassModal>
    </div>
  );
};

export default Patients;
