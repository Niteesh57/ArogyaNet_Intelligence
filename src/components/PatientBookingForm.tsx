import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { hospitalsApi, agentApi, doctorsApi, patientsApi, namesApi, searchApi } from "@/lib/api";
import { GlassButton, GlassInput } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Building2, X } from "lucide-react";
import { GeminiLoadingModal } from "@/components/GeminiAnimation";

interface PatientBookingFormProps {
    onSuccess?: () => void;
    className?: string;
}

export const PatientBookingForm = ({ onSuccess, className }: PatientBookingFormProps) => {
    const { user, fetchUser } = useAuth();
    const [hospitals, setHospitals] = useState<any[]>([]);

    // Form State
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [age, setAge] = useState("");
    const [gender, setGender] = useState("male");

    // Hospital Search
    const [hospitalQuery, setHospitalQuery] = useState("");
    const [selectedHospitalData, setSelectedHospitalData] = useState<{ id: string, name: string, city?: string } | null>(null);

    // AI & Booking State
    const [aiLoading, setAiLoading] = useState(false);
    const [apptForm, setApptForm] = useState({
        doctor_id: "",
        slot: "",
        severity: "low" as "low" | "medium" | "high" | "critical",
    });

    // Search & Slots
    const [doctorQuery, setDoctorQuery] = useState("");
    const [doctorResults, setDoctorResults] = useState<any[]>([]);
    const [selectedDoctor, setSelectedDoctor] = useState<{ id: string, name: string } | null>(null);
    const [availableSlots, setAvailableSlots] = useState<any[]>([]);
    const [slotLoading, setSlotLoading] = useState(false);

    // Fetch Hospitals (Initial)
    useEffect(() => {
        hospitalsApi.list().then(res => setHospitals(res.data)).catch(() => { });
    }, []);

    // Hospital Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (hospitalQuery.length >= 2) {
                hospitalsApi.search(hospitalQuery).then(res => setHospitals(res.data)).catch(() => { });
            } else if (hospitalQuery === "") {
                hospitalsApi.list().then(res => setHospitals(res.data)).catch(() => { });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [hospitalQuery]);

    // Doctor Search
    const searchDoctors = async () => {
        if (!doctorQuery || doctorQuery.length < 2) return;
        try {
            let res;
            if (selectedHospitalData) {
                res = await hospitalsApi.searchDoctors(selectedHospitalData.id, doctorQuery);
            } else {
                res = await searchApi.doctorSearch(doctorQuery);
            }
            setDoctorResults(res.data);
        } catch { }
    };

    useEffect(() => {
        const timer = setTimeout(searchDoctors, 300);
        return () => clearTimeout(timer);
    }, [doctorQuery]);

    const selectDoctor = (d: any) => {
        setSelectedDoctor({ id: d.id, name: d.user?.full_name || d.specialization });
        setApptForm(p => ({ ...p, doctor_id: d.id }));
        setDoctorQuery("");
        setDoctorResults([]);
    };

    // Slots fetching
    useEffect(() => {
        if (apptForm.doctor_id && date) {
            setSlotLoading(true);
            doctorsApi.getSlots(apptForm.doctor_id, date)
                .then(res => setAvailableSlots(res.data))
                .catch(() => setAvailableSlots([]))
                .finally(() => setSlotLoading(false));
        } else {
            setAvailableSlots([]);
        }
    }, [apptForm.doctor_id, date]);


    const handleAISuggest = async () => {
        if (!selectedHospitalData) {
            toast({ title: "Please select a hospital first", variant: "destructive" });
            return;
        }
        if (!date) {
            toast({ title: "Please select a date first", variant: "destructive" });
            return;
        }
        if (!description) {
            toast({ title: "Describe your problem first", variant: "destructive" });
            return;
        }

        setAiLoading(true);
        try {
            const res = await agentApi.suggestAppointment({
                description,
                appointment_date: date,
                hospital_id: selectedHospitalData.id,
            });
            const data = res.data;

            if (data.enhanced_description) {
                setDescription(data.enhanced_description);
            }
            setApptForm(p => ({
                ...p,
                severity: data.severity || "low",
                slot: data.slot_time || "",
            }));

            if (data.doctor_id) {
                setApptForm(p => ({ ...p, doctor_id: data.doctor_id }));
                try {
                    const docRes = await namesApi.getDoctorName(data.doctor_id);
                    setSelectedDoctor({ id: data.doctor_id, name: docRes.data.full_name });
                } catch { }
            }

            toast({ title: "AI Recommendation Ready!", description: "Review details below." });
        } catch (e) {
            toast({ title: "AI Error", description: "Please manually select doctor and slot.", variant: "destructive" });
        } finally {
            setAiLoading(false);
        }
    };

    const handleBook = async () => {
        if (!selectedHospitalData) {
            toast({ title: "Select a hospital first", variant: "destructive" });
            return;
        }
        // Basic validation
        if (!date || !description || !apptForm.doctor_id || !apptForm.slot) {
            toast({ title: "Please fill all required fields", variant: "destructive" });
            return;
        }

        try {
            // Using createWithAppointment as it handles both new and existing patient linking
            const payload = {
                full_name: user?.full_name,
                email: user?.email,
                hospital_id: selectedHospitalData.id,
                age: parseInt(age) || 0,
                gender: gender,
                phone: user?.phone_number || "",
                appointment: {
                    doctor_id: apptForm.doctor_id,
                    date: date,
                    slot: apptForm.slot,
                    severity: apptForm.severity,
                    description: description,
                }
            };

            await patientsApi.createWithAppointment(payload);
            toast({ title: "Booking Successful!" });

            try {
                await fetchUser(); // Ensure role/data is up to date
            } catch (e) {
                console.error("Failed to refresh user", e);
            }
            if (onSuccess) onSuccess();
        } catch (e: any) {
            console.error(e);
            toast({
                title: "Booking Failed",
                description: e.response?.data?.detail || "Could not book. Try again.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className={`space-y-6 pt-4 ${className}`}>
            {/* Step 1: Hospital */}
            <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" /> Select Hospital
                </label>

                {selectedHospitalData ? (
                    <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg p-3">
                        <div>
                            <div className="font-medium">{selectedHospitalData.name}</div>
                            <div className="text-xs text-muted-foreground">{selectedHospitalData.city}</div>
                        </div>
                        <button onClick={() => { setSelectedHospitalData(null); setHospitalQuery(""); }} className="text-muted-foreground hover:text-destructive">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="relative">
                        <GlassInput
                            label=""
                            value={hospitalQuery}
                            onChange={setHospitalQuery}
                            placeholder="Search Hospital by Name..."
                        />
                        {hospitals.length > 0 && hospitalQuery.length > 0 && (
                            <div className="absolute z-10 w-full bg-background border border-border rounded-lg shadow-xl max-h-40 overflow-y-auto mt-1">
                                {hospitals.map((h: any) => (
                                    <div key={h.id} onClick={() => { setSelectedHospitalData(h); setHospitalQuery(""); }} className="p-2 hover:bg-primary/20 cursor-pointer text-sm border-b border-border/50 last:border-0">
                                        <div className="font-medium">{h.name}</div>
                                        <div className="text-xs text-muted-foreground text-opacity-80">{h.city}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Step 2: Patient Details & Selection */}
            <div className="space-y-4 border-t border-border/30 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <GlassInput
                        label="Age"
                        type="number"
                        value={age}
                        onChange={setAge}
                        placeholder="e.g. 30"
                    />
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Gender</label>
                        <select
                            className="w-full bg-background/50 border border-border/50 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none h-10"
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                        >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <GlassInput
                        label="Date"
                        type="date"
                        value={date}
                        onChange={setDate}
                    />
                    <GlassButton
                        onClick={handleAISuggest}
                        disabled={aiLoading}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 h-10 mb-0.5"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {aiLoading ? "AI..." : "AI Suggest"}
                    </GlassButton>
                </div>

                <GlassInput
                    label="Describe Symptoms"
                    placeholder="e.g. Severe headache and nausea since yesterday..."
                    value={description}
                    onChange={setDescription}
                />
            </div>

            {/* Step 3: Severity */}
            <div className="space-y-4 border-t border-border/30 pt-4">
                <label className="text-sm font-medium">Severity Level</label>
                <div className="grid grid-cols-4 gap-2">
                    {["low", "medium", "high", "critical"].map((s) => (
                        <button
                            key={s}
                            onClick={() => setApptForm(p => ({ ...p, severity: s as any }))}
                            className={`p-2 text-sm capitalize rounded-md border transition-all ${apptForm.severity === s
                                ? s === 'critical' ? 'bg-red-500 text-white border-red-600' :
                                    s === 'high' ? 'bg-orange-500 text-white border-orange-600' :
                                        s === 'medium' ? 'bg-yellow-500 text-black border-yellow-600' :
                                            'bg-green-500 text-white border-green-600'
                                : 'bg-background hover:bg-accent border-border text-muted-foreground'
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Step 3: Doctor Selection (Only if Hospital Selected) */}
            {selectedHospitalData && (
                <div className="space-y-4 border-t border-border/30 pt-4 animate-fade-in">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Doctor (Required)</label>
                        {selectedDoctor ? (
                            <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg p-3">
                                <div>
                                    <div className="font-medium">{selectedDoctor.name}</div>
                                    <div className="text-xs text-muted-foreground">ID: {selectedDoctor.id}</div>
                                </div>
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
                                    placeholder={`Search Doctor in ${selectedHospitalData.name}...`}
                                />
                                {doctorResults.length > 0 && (
                                    <div className="absolute z-10 w-full bg-background border border-border rounded-lg shadow-xl max-h-40 overflow-y-auto mt-1">
                                        {doctorResults.map(d => (
                                            <div key={d.id} onClick={() => selectDoctor(d)} className="p-2 hover:bg-primary/20 cursor-pointer text-sm">
                                                {d.user?.full_name || d.specialization}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Step 4: Slots */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Available Slots (Required)</label>
                        {slotLoading ? (
                            <div className="text-sm text-center text-muted-foreground">Loading slots...</div>
                        ) : availableSlots.length > 0 ? (
                            <div className="grid grid-cols-4 gap-2">
                                {availableSlots.map(s => (
                                    <button
                                        key={s.time}
                                        disabled={s.status === 'booked'}
                                        onClick={() => setApptForm(p => ({ ...p, slot: s.time }))}
                                        className={`px-3 py-2 text-sm rounded-md border transition-all ${apptForm.slot === s.time
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : s.status === 'booked'
                                                ? 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed border-transparent'
                                                : 'bg-background hover:bg-accent border-border'
                                            }`}
                                    >
                                        {s.time}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-center text-muted-foreground p-2 border border-dashed rounded">
                                {apptForm.doctor_id && date ? "No slots available" : "Select Doctor & Date First"}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!selectedHospitalData && (
                <div className="text-center p-4 text-muted-foreground text-sm border-t border-border/30 pt-4">
                    Please select a hospital to view doctors and slots.
                </div>
            )}

            <div className="pt-4 border-t border-border/30">
                <GlassButton onClick={handleBook} className="w-full" disabled={!apptForm.doctor_id || !apptForm.slot}>
                    Confirm & Book Appointment
                </GlassButton>
            </div>

            {/* AI Animation */}
            {aiLoading && <GeminiLoadingModal message="AI is finding the best specialist for you..." />}
        </div>
    );
};
