import { useEffect, useState } from "react";
import { floorsApi, adminApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, GlassTable, GlassButton, GlassModal, GlassInput, SearchBar, Shimmer } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

interface Floor {
  id: string; floor_number: string; direction_notes?: string; unique_identifier: string; hospital_id: string;
}

const Floors = () => {
  const { isAdmin, user } = useAuth();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ floor_number: "", unique_identifier: "", direction_notes: "", hospital_id: "" });

  const fetch = () => { setLoading(true); floorsApi.list().then((r) => setFloors(r.data)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    try { await adminApi.createFloor({ ...form, hospital_id: form.hospital_id || user?.hospital_id }); toast({ title: "Floor created" }); setModal(false); fetch(); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  return (
    <div>
      <PageHeader title="Floors & Locations" action={
        isAdmin ? <GlassButton onClick={() => { setForm({ floor_number: "", unique_identifier: "", direction_notes: "", hospital_id: user?.hospital_id || "" }); setModal(true); }}><Plus className="w-4 h-4 mr-1 inline" />Add Floor</GlassButton> : undefined
      } />
      {loading ? <Shimmer /> : (
        <GlassTable headers={["Floor Number", "Identifier", "Direction Notes"]}>
          {floors.map((f) => (
            <tr key={f.id} className="hover:bg-background/20 transition-colors">
              <td className="px-4 py-3 text-sm text-foreground">{f.floor_number}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{f.unique_identifier}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{f.direction_notes || "—"}</td>
            </tr>
          ))}
        </GlassTable>
      )}
      <GlassModal open={modal} onClose={() => setModal(false)} title="Add Floor">
        <div className="space-y-4 pt-2">
          <GlassInput label="Floor Number" value={form.floor_number} onChange={(v) => setForm((p) => ({ ...p, floor_number: v }))} />
          <GlassInput label="Unique Identifier" value={form.unique_identifier} onChange={(v) => setForm((p) => ({ ...p, unique_identifier: v }))} />
          <GlassInput label="Direction Notes" value={form.direction_notes} onChange={(v) => setForm((p) => ({ ...p, direction_notes: v }))} placeholder="e.g. East wing, turn left after elevator" />
          <GlassButton onClick={handleCreate} className="w-full">Create Floor</GlassButton>
        </div>
      </GlassModal>
    </div>
  );
};

export default Floors;
