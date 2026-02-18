import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { appointmentsApi } from "@/lib/api";
import { GlassCard, GlassButton, GlassInput, GlassModal, Shimmer } from "@/components/GlassUI";
import { Activity, Heart, Thermometer, User, Clock, Calendar, Plus, Search, Wind, FileText, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface VitalsLog {
    created_at: string;
    bp: string;
    pulse: number;
    temp: number;
    resp: number;
    spo2: number;
    nurse_name?: string;
    remarks?: string;
}

export default function NurseDashboard() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Selected Appointment for modification
    const [selectedAppt, setSelectedAppt] = useState<any>(null);

    // Vitals Form State
    const [vitalsModal, setVitalsModal] = useState(false);
    const [vitalsForm, setVitalsForm] = useState({
        bp: "", pulse: "", temp: "", resp: "", spo2: "", remarks: ""
    });

    useEffect(() => {
        loadAssignedAppointments();
    }, [user]);

    const loadAssignedAppointments = async () => {
        try {
            setLoading(true);
            const res = await appointmentsApi.getForNurse();
            setAppointments(res.data);

            if (res.data.length > 0 && !selectedAppt) {
                handleSelectAppt(res.data[0]);
            }
        } catch (e) {
            toast({ title: "Failed to load assigned appointments", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAppt = async (appt: any) => {
        setSelectedAppt(appt);
        // Fetch full vitals history for this appointment
        try {
            const vitalsRes = await appointmentsApi.getVitals(appt.id);
            // Update selected appt with fetched vitals
            setSelectedAppt({ ...appt, vitals: vitalsRes.data });
        } catch {
            console.error("Failed to load vitals history");
        }
    };

    const handleAddVitals = async () => {
        if (!selectedAppt) return;
        try {
            await appointmentsApi.addVitals(selectedAppt.id, {
                bp: vitalsForm.bp,
                pulse: parseInt(vitalsForm.pulse) || 0,
                temp: parseFloat(vitalsForm.temp) || 0,
                resp: parseInt(vitalsForm.resp) || 0,
                spo2: parseInt(vitalsForm.spo2) || 0,
                remarks: vitalsForm.remarks
            });
            toast({ title: "Vitals Logged ✓" });
            setVitalsModal(false);
            setVitalsForm({ bp: "", pulse: "", temp: "", resp: "", spo2: "", remarks: "" });
            handleSelectAppt(selectedAppt); // Refresh vitals list
        } catch (e) {
            toast({ title: "Failed to log vitals", variant: "destructive" });
        }
    };

    const filteredAppointments = appointments.filter(a =>
        a.patient?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.doctor?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Nurse Station</h1>
                    <p className="text-muted-foreground mt-1">Manage assigned appointments and patient vitals</p>
                </div>
                <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Shift: Day
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Appointment List */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="relative">
                        <GlassInput
                            label=""
                            placeholder="Search patients or doctors..."
                            value={searchQuery}
                            onChange={(val) => setSearchQuery(val)}
                            className="w-full pl-8"
                        />
                        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                    <div className="bg-background/40 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden shadow-sm h-[calc(100vh-250px)] overflow-y-auto">
                        <div className="p-4 border-b border-border/30 bg-secondary/20 flex justify-between items-center">
                            <h3 className="font-semibold">My Schedule</h3>
                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{filteredAppointments.length}</span>
                        </div>
                        {loading ? <div className="p-4"><Shimmer /></div> : (
                            <div className="divide-y divide-border/30">
                                {filteredAppointments.map(appt => (
                                    <div
                                        key={appt.id}
                                        onClick={() => handleSelectAppt(appt)}
                                        className={`p-4 cursor-pointer transition-colors hover:bg-primary/5 ${selectedAppt?.id === appt.id ? 'bg-primary/10 border-l-4 border-primary' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-purple-500 font-bold">
                                                {appt.slot.split(':')[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{appt.patient?.full_name || "Unknown Patient"}</p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {appt.slot}</span>
                                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(appt.date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            {appt.status === 'finished' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                        </div>
                                    </div>
                                ))}
                                {filteredAppointments.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground text-sm">
                                        No appointments found.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Selected Appointment Details */}
                <div className="lg:col-span-2">
                    {selectedAppt ? (
                        <GlassCard className="p-6 space-y-8">
                            {/* Patient Header */}
                            <div className="space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h2 className="text-2xl font-bold">{selectedAppt.patient?.full_name}</h2>
                                            <span className={`px-2 py-0.5 rounded text-xs uppercase font-bold tracking-wide ${selectedAppt.severity === 'critical' ? 'bg-red-500/20 text-red-600' :
                                                selectedAppt.severity === 'high' ? 'bg-orange-500/20 text-orange-600' :
                                                    selectedAppt.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-600' :
                                                        'bg-green-500/20 text-green-600'
                                                }`}>
                                                {selectedAppt.severity}
                                            </span>
                                        </div>
                                        <p className="text-muted-foreground text-sm">
                                            Appointment ID: {selectedAppt.id.slice(0, 8).toUpperCase()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-foreground">{selectedAppt.doctor?.full_name || "Doctor"}</p>
                                        <p className="text-xs text-muted-foreground">Treating Physician</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-3 rounded-lg bg-secondary/50">
                                        <p className="text-xs text-muted-foreground uppercase">DOB / Gender</p>
                                        <p className="font-medium">{selectedAppt.patient?.dob || "N/A"} / {selectedAppt.patient?.gender}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-secondary/50">
                                        <p className="text-xs text-muted-foreground uppercase">Phone</p>
                                        <p className="font-medium">{selectedAppt.patient?.phone || "N/A"}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-secondary/50">
                                        <p className="text-xs text-muted-foreground uppercase">Date</p>
                                        <p className="font-medium">{selectedAppt.date} @ {selectedAppt.slot}</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-secondary/50">
                                        <p className="text-xs text-muted-foreground uppercase">Status</p>
                                        <p className="font-medium capitalize">{selectedAppt.status || "Scheduled"}</p>
                                    </div>
                                </div>

                                {selectedAppt.description && (
                                    <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                                        <span className="font-semibold mr-1">Complaint:</span> "{selectedAppt.description}"
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-border/50 my-6"></div>

                            {/* Vitals Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-primary" /> Vitals History
                                    </h3>
                                    <GlassButton size="sm" onClick={() => setVitalsModal(true)}>
                                        <Plus className="w-4 h-4 mr-2" /> Record Vitals
                                    </GlassButton>
                                </div>

                                {selectedAppt.vitals && selectedAppt.vitals.length > 0 ? (
                                    <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-2">
                                        {selectedAppt.vitals.sort((a: VitalsLog, b: VitalsLog) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((v: VitalsLog, i: number) => (
                                            <div key={i} className="p-4 rounded-xl bg-secondary/20 border border-border/30 hover:bg-secondary/30 transition-colors">
                                                <div className="flex items-center justify-between mb-3 border-b border-border/30 pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-sm font-medium">
                                                            {new Date(v.created_at).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground">
                                                            Recorded by: {v.nurse_name || "Nurse"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <Heart className="w-4 h-4 text-red-500" />
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">BP</p>
                                                            <p className="font-semibold">{v.bp || "--"}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Activity className="w-4 h-4 text-blue-500" />
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Pulse</p>
                                                            <p className="font-semibold">{v.pulse || "--"} bpm</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Thermometer className="w-4 h-4 text-orange-500" />
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Temp</p>
                                                            <p className="font-semibold">{v.temp || "--"}°F</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Wind className="w-4 h-4 text-cyan-500" />
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">SpO2</p>
                                                            <p className="font-semibold">{v.spo2 || "--"}%</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                {v.remarks && (
                                                    <div className="mt-3 text-sm text-muted-foreground italic">
                                                        "{v.remarks}"
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 border-2 border-dashed border-border/50 rounded-xl text-center">
                                        <p className="text-muted-foreground text-sm">No vitals recorded yet.</p>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-12 border-2 border-dashed border-border/30 rounded-xl bg-secondary/5">
                            <User className="w-16 h-16 opacity-20 mb-4" />
                            <h3 className="text-xl font-medium opacity-50">No Selection</h3>
                            <p className="text-sm opacity-40">Select an appointment from the list to view details</p>
                        </div>
                    )}
                </div>
            </div>

            <GlassModal open={vitalsModal} onClose={() => setVitalsModal(false)} title="Log Vitals" className="max-w-lg">
                <div className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <GlassInput label="Blood Pressure (mmHg)" placeholder="120/80" value={vitalsForm.bp} onChange={(v) => setVitalsForm(p => ({ ...p, bp: v }))} />
                        <GlassInput label="Heart Rate (bpm)" placeholder="72" type="number" value={vitalsForm.pulse} onChange={(v) => setVitalsForm(p => ({ ...p, pulse: v }))} />
                        <GlassInput label="Temperature (F)" placeholder="98.6" type="number" value={vitalsForm.temp} onChange={(v) => setVitalsForm(p => ({ ...p, temp: v }))} />
                        <GlassInput label="SpO2 (%)" placeholder="98" type="number" value={vitalsForm.spo2} onChange={(v) => setVitalsForm(p => ({ ...p, spo2: v }))} />
                        <GlassInput label="Respiration (bpm)" placeholder="16" type="number" value={vitalsForm.resp} onChange={(v) => setVitalsForm(p => ({ ...p, resp: v }))} />
                    </div>
                    <GlassInput label="Nurse Remarks" placeholder="Patient resting comfortably..." value={vitalsForm.remarks} onChange={(v) => setVitalsForm(p => ({ ...p, remarks: v }))} />

                    <div className="pt-4 flex gap-2">
                        <GlassButton variant="ghost" onClick={() => setVitalsModal(false)} className="flex-1">Cancel</GlassButton>
                        <GlassButton onClick={handleAddVitals} className="flex-1">Log Vitals</GlassButton>
                    </div>
                </div>
            </GlassModal>
        </div>
    );
}
