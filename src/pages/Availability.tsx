import { useEffect, useState } from "react";
import { availabilityApi, adminApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, GlassTable, GlassButton, GlassModal, GlassInput, GlassSelect, Shimmer } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

interface Avail {
  id: string; staff_type: string; staff_id: string; day_of_week: string; start_time: string; end_time: string;
}

const Availability = () => {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<Avail[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ staff_type: "doctor", staff_id: "", day_of_week: "monday", start_time: "09:00", end_time: "17:00" });

  const fetch = () => { setLoading(true); availabilityApi.list().then((r) => setItems(r.data)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    try { await adminApi.createAvailability(form); toast({ title: "Availability created" }); setModal(false); fetch(); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  // Group by day
  const grouped = DAYS.map((day) => ({
    day,
    slots: items.filter((i) => i.day_of_week === day),
  }));

  return (
    <div>
      <PageHeader title="Availability Scheduling" action={
        isAdmin ? <GlassButton onClick={() => { setForm({ staff_type: "doctor", staff_id: "", day_of_week: "monday", start_time: "09:00", end_time: "17:00" }); setModal(true); }}><Plus className="w-4 h-4 mr-1 inline" />Add Slot</GlassButton> : undefined
      } />
      {loading ? <Shimmer /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-0 animate-fade-up" style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
          {grouped.map((g) => (
            <div key={g.day} className="glass-panel rounded-xl p-4 space-y-3">
              <h3 className="font-serif text-lg font-semibold text-foreground capitalize">{g.day}</h3>
              {g.slots.length === 0 ? (
                <p className="text-xs text-muted-foreground">No slots</p>
              ) : (
                <div className="space-y-2">
                  {g.slots.map((s) => (
                    <div key={s.id} className="bg-background/30 rounded-lg px-3 py-2 text-xs">
                      <span className="text-primary capitalize font-medium">{s.staff_type}</span>
                      <span className="text-muted-foreground mx-1">•</span>
                      <span className="text-foreground">{s.start_time} – {s.end_time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <GlassModal open={modal} onClose={() => setModal(false)} title="Add Availability">
        <div className="space-y-4 pt-2">
          <GlassSelect label="Staff Type" value={form.staff_type} onChange={(v) => setForm((p) => ({ ...p, staff_type: v }))} options={[{ value: "doctor", label: "Doctor" }, { value: "nurse", label: "Nurse" }]} />
          <GlassInput label="Staff ID" value={form.staff_id} onChange={(v) => setForm((p) => ({ ...p, staff_id: v }))} placeholder="Doctor or Nurse ID" />
          <GlassSelect label="Day" value={form.day_of_week} onChange={(v) => setForm((p) => ({ ...p, day_of_week: v }))} options={DAYS.map((d) => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) }))} />
          <div className="grid grid-cols-2 gap-3">
            <GlassInput label="Start Time" value={form.start_time} onChange={(v) => setForm((p) => ({ ...p, start_time: v }))} type="time" />
            <GlassInput label="End Time" value={form.end_time} onChange={(v) => setForm((p) => ({ ...p, end_time: v }))} type="time" />
          </div>
          <GlassButton onClick={handleCreate} className="w-full">Create Slot</GlassButton>
        </div>
      </GlassModal>
    </div>
  );
};

export default Availability;
