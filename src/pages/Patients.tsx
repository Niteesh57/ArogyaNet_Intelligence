import { useEffect, useState } from "react";
import { patientsApi, adminApi, searchApi, agentApi, namesApi, doctorsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, GlassTable, GlassButton, GlassModal, GlassInput, GlassSelect, SearchBar, Shimmer } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Calendar, UserPlus, Sparkles, X, Clock } from "lucide-react";
import { GeminiLoadingModal } from "@/components/GeminiAnimation";

interface Patient {
  id: string; full_name: string; age: number; gender: string;
  phone?: string; hospital_id: string; assigned_doctor_id?: string; created_at: string;
}

interface Slot {
  time: string;
  status: "available" | "booked";
}

const Patients = () => {
  const { isAdmin, user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);

  // Search state
  const [userQuery, setUserQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Doctor Search state
  const [doctorQuery, setDoctorQuery] = useState("");
  const [doctorResults, setDoctorResults] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<{ id: string, name: string } | null>(null);

  // Slot states
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    full_name: "", age: "", gender: "male", phone: "",
    email: "", password: "Patient@123",
    hospital_id: "", assigned_doctor_id: ""
  });

  // Appointment integration state
  const [withAppointment, setWithAppointment] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [apptForm, setApptForm] = useState({
    doctor_id: "",
    date: "",
    slot: "",
    severity: "low" as "low" | "medium" | "high" | "critical",
    description: ""
  });

  const fetch = () => {
    setLoading(true);
    if (isAdmin) {
      patientsApi.list().then((r) => setPatients(r.data)).catch(() => { }).finally(() => setLoading(false));
    } else {
      // Doctor role: fetch patients assigned to this doctor
      doctorsApi.getMyPatients().then((r) => setPatients(r.data)).catch(() => {
        // Fallback to all patients list
        patientsApi.list().then((r) => setPatients(r.data)).catch(() => { });
      }).finally(() => setLoading(false));
    }
  };

  useEffect(() => { fetch(); }, []);

  // Fetch slots when doctor and date change
  useEffect(() => {
    if (apptForm.doctor_id && apptForm.date) {
      setSlotLoading(true);
      doctorsApi.getSlots(apptForm.doctor_id, apptForm.date)
        .then(res => setAvailableSlots(res.data))
        .catch(() => setAvailableSlots([]))
        .finally(() => setSlotLoading(false));
    } else {
      setAvailableSlots([]);
    }
  }, [apptForm.doctor_id, apptForm.date]);


  const filtered = patients.filter((p) => (p.full_name + p.gender).toLowerCase().includes(search.toLowerCase()));

  const searchUsers = async () => {
    if (!userQuery) return;
    setSearching(true);
    try {
      const res = await searchApi.patientSearch(userQuery);
      setSearchResults(res.data);
    } catch {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  // Search doctors
  const searchDoctors = async () => {
    if (!doctorQuery || doctorQuery.length < 2) return;
    try {
      const res = await searchApi.doctorSearch(doctorQuery);
      setDoctorResults(res.data);
    } catch { }
  };

  useEffect(() => {
    const timer = setTimeout(searchDoctors, 300);
    return () => clearTimeout(timer);
  }, [doctorQuery]);

  const selectUser = (u: any) => {
    setForm(prev => ({
      ...prev,
      full_name: u.full_name || "",
      email: u.email || "",
      phone: u.phone_number || "",
    }));
    setSearchResults([]);
    toast({ title: "User details populated" });
  };

  const selectDoctor = (doctor: any) => {
    setSelectedDoctor({ id: doctor.id, name: doctor.user?.full_name || doctor.specialization });
    setApptForm(p => ({ ...p, doctor_id: doctor.id }));
    setDoctorQuery("");
    setDoctorResults([]);
  };

  const handleAISuggest = async () => {
    if (!apptForm.date) {
      toast({ title: "Please select a date first", description: "AI needs a date to check availability", variant: "destructive" });
      return;
    }
    if (!apptForm.description) {
      toast({ title: "Please enter a description first", variant: "destructive" });
      return;
    }

    setAiLoading(true);
    try {
      const response = await agentApi.suggestAppointment({
        description: apptForm.description,
        appointment_date: apptForm.date, // Mandatory
      });

      const suggestion = response.data;

      // Set doctor if suggested
      if (suggestion.doctor_id) {
        setApptForm((p) => ({ ...p, doctor_id: suggestion.doctor_id }));
        // Fetch doctor name
        try {
          const res = await namesApi.getDoctorName(suggestion.doctor_id);
          setSelectedDoctor({ id: suggestion.doctor_id, name: res.data.full_name });
        } catch { }
      }

      setApptForm((p) => ({
        ...p,
        slot: suggestion.slot_time || p.slot,
        severity: suggestion.severity || p.severity,
        description: suggestion.enhanced_description || p.description,
        date: suggestion.appointment_date || p.date,
      }));

      toast({ title: "AI suggestion applied! ✨", description: "Review appointment details" });
    } catch (error) {
      toast({ title: "AI suggestion failed", description: "Please fill manually", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const patientData = {
        ...form,
        age: Number(form.age),
        hospital_id: form.hospital_id || user?.hospital_id,
        assigned_doctor_id: form.assigned_doctor_id || undefined,
      };

      if (withAppointment) {
        // Create patient with appointment
        const payload = {
          ...patientData,
          appointment: {
            doctor_id: apptForm.doctor_id,
            date: apptForm.date,
            slot: apptForm.slot,
            severity: apptForm.severity,
            description: apptForm.description
          }
        };
        await patientsApi.createWithAppointment(payload);
        toast({ title: "Patient & Appointment created!" });
      } else {
        // Standard creation
        await adminApi.createPatient(patientData);
        toast({ title: "Patient created" });
      }

      setModal(false);
      fetch();
      resetForms();
    } catch {
      toast({ title: "Error creating patient", variant: "destructive" });
    }
  };

  const resetForms = () => {
    setForm({ full_name: "", age: "", gender: "male", phone: "", email: "", password: "Patient@123", hospital_id: user?.hospital_id || "", assigned_doctor_id: "" });
    setApptForm({ doctor_id: "", date: "", slot: "", severity: "low", description: "" });
    setWithAppointment(false);
    setUserQuery("");
    setSearchResults([]);
    setDoctorQuery("");
    setDoctorResults([]);
    setSelectedDoctor(null);
    setAvailableSlots([]);
  }

  return (
    <div>
      <PageHeader title="Patients" action={
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} />
          {isAdmin && <GlassButton onClick={() => { resetForms(); setModal(true); }}>
            <Plus className="w-4 h-4 mr-1 inline" />Add Patient
          </GlassButton>}
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

      {/* Wide Modal for Patient + Appointment */}
      <GlassModal open={modal} onClose={() => setModal(false)} title="Add Patient" className="max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">

          {/* Left Column: Patient Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Patient Details
            </h3>

            {/* User Search */}
            <div className="bg-background/30 p-3 rounded-lg border border-border/50">
              <div className="flex gap-2 mb-2">
                <GlassInput
                  label=""
                  value={userQuery}
                  onChange={setUserQuery}
                  placeholder="Search existing users by name..."
                  className="mb-0"
                />
                <GlassButton onClick={searchUsers} disabled={searching} variant="ghost" className="bg-secondary/50 hover:bg-secondary">
                  <Search className="w-4 h-4" />
                </GlassButton>
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1 mb-2">
                  {searchResults.map(u => (
                    <div key={u.id}
                      onClick={() => selectUser(u)}
                      className="text-sm p-2 hover:bg-primary/20 cursor-pointer rounded flex justify-between items-center"
                    >
                      <span>{u.full_name} ({u.email})</span>
                      <span className="text-xs bg-primary/20 px-1 rounded">Select</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Search to populate details from existing registered users.</p>
            </div>

            <GlassInput label="Full Name" value={form.full_name} onChange={(v) => setForm((p) => ({ ...p, full_name: v }))} />
            <GlassInput label="Email" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} type="email" placeholder="Required for auto-user creation" />

            <div className="grid grid-cols-2 gap-4">
              <GlassInput label="Age" value={form.age} onChange={(v) => setForm((p) => ({ ...p, age: v }))} type="number" />
              <GlassSelect label="Gender" value={form.gender} onChange={(v) => setForm((p) => ({ ...p, gender: v }))} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }]} />
            </div>

            <GlassInput label="Phone" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} />

            {!form.email && (
              <GlassInput label="Password" value={form.password} onChange={(v) => setForm((p) => ({ ...p, password: v }))} type="password" placeholder="Default: Patient@123" />
            )}

            <p className="text-xs text-muted-foreground">User account auto-created if email doesn't exist.</p>
          </div>

          {/* Right Column: Appointment (Optional) */}
          <div className="space-y-4 border-l pl-6 border-border/30">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Appointment (Optional)
            </h3>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="withAppt"
                checked={withAppointment}
                onChange={(e) => setWithAppointment(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="withAppt" className="text-sm cursor-pointer select-none">Schedule appointment now</label>
            </div>

            {withAppointment && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <GlassInput
                  label="Description / Reason"
                  value={apptForm.description}
                  onChange={(v) => setApptForm(p => ({ ...p, description: v }))}
                  placeholder="e.g. Severe Headache"
                />

                <GlassButton
                  onClick={handleAISuggest}
                  className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 mb-2"
                  disabled={aiLoading}
                >
                  <Sparkles className="w-4 h-4 mr-2 inline" />
                  {aiLoading ? "AI Analyzing..." : "Get AI Suggestion ✨"}
                </GlassButton>

                {/* Date moved up for AI dependency */}
                <div className="grid grid-cols-2 gap-4">
                  <GlassInput
                    label="Date (Required)"
                    type="date"
                    value={apptForm.date}
                    onChange={(v) => setApptForm(p => ({ ...p, date: v }))}
                  />
                  <GlassSelect
                    label="Severity"
                    value={apptForm.severity}
                    onChange={(v) => setApptForm(p => ({ ...p, severity: v as any }))}
                    options={[
                      { value: "low", label: "Low" },
                      { value: "medium", label: "Medium" },
                      { value: "high", label: "High" },
                      { value: "critical", label: "Critical" },
                    ]}
                  />
                </div>

                {/* Doctor Search UI */}
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Doctor</label>
                  {selectedDoctor ? (
                    <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
                      <span className="text-sm text-foreground">{selectedDoctor.name}</span>
                      <button onClick={() => { setSelectedDoctor(null); setApptForm(p => ({ ...p, doctor_id: "" })); }} className="text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <GlassInput
                        label=""
                        value={doctorQuery}
                        onChange={setDoctorQuery}
                        placeholder="Search doctor by name..."
                      />
                      {doctorResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {doctorResults.map(d => (
                            <div
                              key={d.id}
                              onClick={() => selectDoctor(d)}
                              className="px-3 py-2 hover:bg-primary/20 cursor-pointer text-sm border-b border-border last:border-0"
                            >
                              <div className="font-medium">{d.user?.full_name || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">{d.specialization}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Slots UI */}
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Available Slots <span className="text-xs text-muted-foreground font-normal">(Select Doctor & Date to view)</span></label>
                  {slotLoading ? (
                    <div className="p-4 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Loading slots...
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => setApptForm(p => ({ ...p, slot: slot.time }))}
                          disabled={slot.status === 'booked'}
                          className={`
                                       text-sm py-2 px-1 rounded transition-colors border
                                       ${apptForm.slot === slot.time
                              ? 'bg-primary text-primary-foreground border-primary'
                              : slot.status === 'booked'
                                ? 'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50'
                                : 'bg-background hover:bg-accent border-border'
                            }
                                   `}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  ) : apptForm.doctor_id && apptForm.date ? (
                    <div className="text-center text-sm text-muted-foreground p-3 border border-dashed border-border rounded">No slots available</div>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground p-3 bg-muted/20 rounded">
                      Please select a Doctor and Date to view slots
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/30 mt-6 pt-4 flex justify-end">
          <GlassButton onClick={handleCreate} className="w-full md:w-auto">
            {withAppointment ? "Create Patient & Appointment" : "Create Patient"}
          </GlassButton>
        </div>
      </GlassModal>

      {/* AI Loading Modal */}
      {aiLoading && <GeminiLoadingModal message="AI is analyzing symptoms..." />}
    </div>
  );
};

export default Patients;
