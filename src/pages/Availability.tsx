import { useEffect, useState } from "react";
import { availabilityApi, adminApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, GlassButton, GlassModal, GlassInput, GlassSelect, Shimmer } from "@/components/GlassUI";
import { StaffSearch } from "@/components/StaffSearch";
import { toast } from "@/hooks/use-toast";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

interface Avail {
  id: string; staff_type: string; staff_id: string; day_of_week: string; start_time: string; end_time: string;
}

const Availability = () => {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ staff_type: "doctor" as "doctor" | "nurse", start_time: "09:00", end_time: "17:00" });
  const [selectedStaff, setSelectedStaff] = useState<any[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const fetch = () => {
    setLoading(true);
    availabilityApi.list()
      .then((r) => setStats(r.data || {}))
      .catch(() => { })
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, []);

  const handleCreate = async () => {
    if (selectedStaff.length === 0 || selectedDays.length === 0) {
      toast({ title: "Validation Error", description: "Please select at least one staff member and one day.", variant: "destructive" });
      return;
    }

    setCreating(true);
    let successCount = 0;
    try {
      const promises = [];
      for (const staff of selectedStaff) {
        for (const day of selectedDays) {
          promises.push(
            adminApi.createAvailability({
              staff_type: form.staff_type,
              staff_id: staff.id,
              day_of_week: day,
              start_time: form.start_time,
              end_time: form.end_time,
            }).then(() => successCount++).catch((e) => console.error(e))
          );
        }
      }
      await Promise.all(promises);
      toast({ title: "Operation Complete", description: `Created ${successCount} availability slots.` });
      setModal(false);
      fetch();
      // Reset selection
      setSelectedStaff([]);
      setSelectedDays([]);
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  return (
    <div>
      <PageHeader title="Availability Scheduling" action={
        isAdmin ? <GlassButton onClick={() => { setForm({ staff_type: "doctor", start_time: "09:00", end_time: "17:00" }); setSelectedStaff([]); setSelectedDays([]); setModal(true); }}><Plus className="w-4 h-4 mr-1 inline" />Add Slot</GlassButton> : undefined
      } />
      {loading ? <Shimmer /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-up">
          {DAYS.map((day) => (
            <div key={day} className="dashboard-card p-6 space-y-3">
              <h3 className="text-lg font-semibold text-foreground capitalize flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary/60" />
                {day}
              </h3>
              <div className="flex items-baseline gap-2">
                <div className="text-4xl font-bold text-primary">
                  {stats[day] || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stats[day] === 1 ? 'doctor' : 'doctors'} available
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <GlassModal open={modal} onClose={() => setModal(false)} title="Add Availability">
        <div className="space-y-4 pt-2">
          <GlassSelect label="Staff Type" value={form.staff_type} onChange={(v) => { setForm((p) => ({ ...p, staff_type: v as "doctor" | "nurse" })); setSelectedStaff([]); }} options={[{ value: "doctor", label: "Doctor" }, { value: "nurse", label: "Nurse" }]} />

          <StaffSearch
            type={form.staff_type}
            onSelect={(staff) => setSelectedStaff(staff)}
            label={`Select ${form.staff_type === "doctor" ? "Doctors" : "Nurses"}`}
            placeholder={`Search for ${form.staff_type}s...`}
          />
          {selectedStaff.length > 0 && <p className="text-xs text-muted-foreground">{selectedStaff.length} selected</p>}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Select Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                    selectedDays.includes(day)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-input hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                  {selectedDays.includes(day) && <Check className="w-3 h-3 inline ml-1" />}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <GlassInput label="Start Time" value={form.start_time} onChange={(v) => setForm((p) => ({ ...p, start_time: v }))} type="time" />
            <GlassInput label="End Time" value={form.end_time} onChange={(v) => setForm((p) => ({ ...p, end_time: v }))} type="time" />
          </div>
          <GlassButton onClick={handleCreate} disabled={creating} className="w-full">
            {creating ? "Creating..." : "Create Slots"}
          </GlassButton>
        </div>
      </GlassModal>
    </div>
  );
};

export default Availability;
