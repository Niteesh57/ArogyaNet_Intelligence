import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { appointmentsApi, inventoryApi, labTestsApi, namesApi, voiceApi } from "@/lib/api";
import { GlassButton, GlassCard } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";
import {
    Pill, FlaskConical, X, Search, Loader2, FileText,
    AlertTriangle, CalendarPlus, Send, ArrowLeft,
    Mic, MicOff, Square, Stethoscope, Plus, Waves, Check
} from "lucide-react";

/* ─── Types ─── */
interface MedicineItem { id: string; name: string; dosage?: string; }
interface LabItem { id: string; name: string; }

/* ─── Debounced Search Hook ─── */
function useDebouncedSearch(searchFn: (q: string) => Promise<any>, delay = 350) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        if (query.length < 2) { setResults([]); return; }
        setLoading(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(async () => {
            try {
                const res = await searchFn(query);
                setResults(res.data || []);
            } catch { setResults([]); } finally { setLoading(false); }
        }, delay);
        return () => clearTimeout(timer.current);
    }, [query]);

    return { query, setQuery, results, loading, setResults };
}

/* ─── Audio Recorder Hook (Raw PCM 16kHz) ─── */
function useAudioRecorder(onRecordingComplete: (blob: Blob) => void) {
    const [recording, setRecording] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Int16Array[]>([]);

    const processAudio = (inputData: Float32Array) => {
        // Downsample to 16kHz and convert to Int16
        if (!audioContextRef.current) return new Int16Array(0);

        const targetRate = 16000;
        const sourceRate = audioContextRef.current.sampleRate;

        let output: Int16Array;

        if (sourceRate === targetRate) {
            output = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                const s = Math.max(-1, Math.min(1, inputData[i]));
                output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
        } else {
            // Simple decimation downsampling
            const ratio = sourceRate / targetRate;
            const newLength = Math.ceil(inputData.length / ratio);
            output = new Int16Array(newLength);
            for (let i = 0; i < newLength; i++) {
                const offset = Math.floor(i * ratio);
                const s = Math.max(-1, Math.min(1, inputData[offset]));
                output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
        }
        return output;
    };

    const start = useCallback(async () => {
        try {
            audioChunksRef.current = []; // Clear previous recording
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Audio Context Setup
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContext();
            audioContextRef.current = ctx;

            const source = ctx.createMediaStreamSource(stream);
            const processor = ctx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmData = processAudio(inputData);
                audioChunksRef.current.push(pcmData);
            };

            source.connect(processor);
            processor.connect(ctx.destination); // Needed for Chrome
            setRecording(true);
            toast({ title: "🎙️ Recording started", description: "Speak now..." });

        } catch (err) {
            console.error("Mic error:", err);
            toast({ title: "Microphone error", variant: "destructive" });
        }
    }, []);

    const stop = useCallback(() => {
        if (processorRef.current && audioContextRef.current) {
            processorRef.current.disconnect();
            audioContextRef.current.close();
            processorRef.current = null;
            audioContextRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setRecording(false);

        // Combine chunks into single blob
        const chunks = audioChunksRef.current;
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const combined = new Int16Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
        }

        const blob = new Blob([combined], { type: 'application/octet-stream' });
        onRecordingComplete(blob);
    }, [onRecordingComplete]);

    useEffect(() => {
        return () => {
            if (recording) stop();
        };
    }, [recording, stop]);

    return { recording, start, stop };
}

/* ═══════════════════════════════════════════════════════════
   CONSULTATION PAGE
   ═══════════════════════════════════════════════════════════ */
const Consultation = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Appointment data
    const [appointment, setAppointment] = useState<any>(null);
    const [patientName, setPatientName] = useState("Patient");
    const [loading, setLoading] = useState(true);

    // Form state
    const [remarksText, setRemarksText] = useState("");
    const [medicines, setMedicines] = useState<MedicineItem[]>([]);
    const [labs, setLabs] = useState<LabItem[]>([]);
    const [severity, setSeverity] = useState("medium");
    const [nextFollowup, setNextFollowup] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Medicine search
    const medSearch = useDebouncedSearch((q) => inventoryApi.search(q));
    const [showMedDropdown, setShowMedDropdown] = useState(false);
    const [pendingDosage, setPendingDosage] = useState("");

    // Lab test search
    const labSearch = useDebouncedSearch((q) => labTestsApi.search(q));
    const [showLabDropdown, setShowLabDropdown] = useState(false);

    // Remarks textarea ref for auto-scroll
    const remarksRef = useRef<HTMLTextAreaElement>(null);
    const [transcribing, setTranscribing] = useState(false);

    // Audio recording handler
    const handleRecordingComplete = useCallback(async (blob: Blob) => {
        setTranscribing(true);
        try {
            const res = await voiceApi.transcribe(blob);
            if (res.data.text) {
                setRemarksText(prev => {
                    const newText = prev ? prev + " " + res.data.text : res.data.text;
                    // Auto-scroll
                    setTimeout(() => {
                        if (remarksRef.current) {
                            remarksRef.current.scrollTop = remarksRef.current.scrollHeight;
                        }
                    }, 50);
                    return newText;
                });
                toast({ title: "✅ Transcription complete" });
            } else if (res.data.error) {
                toast({ title: "Transcription failed", description: res.data.error, variant: "destructive" });
            }
        } catch (e) {
            console.error(e);
            toast({ title: "Upload failed", variant: "destructive" });
        } finally {
            setTranscribing(false);
        }
    }, []);

    const recorder = useAudioRecorder(handleRecordingComplete);

    // Load appointment data
    useEffect(() => {
        if (!id) return;
        const loadAppointment = async () => {
            try {
                const res = await appointmentsApi.get(id);
                const appt = res.data;
                setAppointment(appt);

                // Pre-fill existing data
                if (appt.remarks) {
                    setRemarksText(appt.remarks.text || "");
                    setMedicines(
                        (appt.remarks.medicine || []).map((m: any, i: number) => ({
                            id: m.id || `existing-${i}`, name: m.name, dosage: m.dosage || "",
                        }))
                    );
                    setLabs(
                        (appt.remarks.lab || []).map((l: any, i: number) => ({
                            id: l.id || `existing-lab-${i}`, name: l.name,
                        }))
                    );
                }
                if (appt.severity) setSeverity(appt.severity);
                if (appt.next_followup) setNextFollowup(appt.next_followup);

                // Fetch patient name
                try {
                    const nameRes = await namesApi.getPatientName(appt.patient_id);
                    setPatientName(nameRes.data.full_name);
                } catch { }
            } catch {
                toast({ title: "Could not load appointment", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        loadAppointment();
    }, [id]);

    // Medicine helpers
    const addMedicine = (med: any) => {
        if (medicines.some(m => m.name === med.name)) return;
        setMedicines(prev => [...prev, { id: med.id, name: med.name, dosage: pendingDosage || "" }]);
        medSearch.setQuery(""); medSearch.setResults([]);
        setPendingDosage(""); setShowMedDropdown(false);
    };
    const removeMedicine = (medId: string) => setMedicines(prev => prev.filter(m => m.id !== medId));

    // Lab helpers
    const addLab = (lab: any) => {
        if (labs.some(l => l.name === lab.name)) return;
        setLabs(prev => [...prev, { id: lab.id, name: lab.name }]);
        labSearch.setQuery(""); labSearch.setResults([]);
        setShowLabDropdown(false);
    };
    const removeLab = (labId: string) => setLabs(prev => prev.filter(l => l.id !== labId));

    // Submit
    const handleSubmit = async (targetStatus: string = "finished") => {
        if (!remarksText.trim() && medicines.length === 0 && labs.length === 0) {
            toast({ title: "Add at least a remark, medicine, or lab test", variant: "destructive" });
            return;
        }
        setSubmitting(true);
        try {
            const remarksPayload = {
                text: remarksText,
                medicine: medicines.map(m => ({ id: m.id, name: m.name, dosage: m.dosage })),
                lab: labs.map(l => ({ id: l.id, name: l.name })),
            };
            // Pass status to API
            await appointmentsApi.consultation(id!, remarksPayload, severity, nextFollowup || undefined, targetStatus);
            toast({ title: targetStatus === 'in_progress' ? "Draft saved" : "✅ Consultation saved!" });

            if (targetStatus !== 'in_progress') {
                navigate("/appointments");
            }
        } catch (e: any) {
            toast({ title: "Failed to save", description: e.response?.data?.detail || "Try again.", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    const severityColors: Record<string, string> = {
        low: "text-green-400 bg-green-500/10 border-green-500/30",
        medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
        high: "text-orange-400 bg-orange-500/10 border-orange-500/30",
        critical: "text-red-400 bg-red-500/10 border-red-500/30",
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!appointment) {
        return (
            <div className="text-center py-20">
                <p className="text-muted-foreground">Appointment not found.</p>
                <GlassButton onClick={() => navigate("/appointments")} className="mt-4">
                    ← Back to Appointments
                </GlassButton>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate("/appointments")} className="p-2 rounded-lg hover:bg-accent transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Stethoscope className="w-6 h-6 text-primary" />
                        Consultation
                    </h1>
                    <p className="text-sm text-muted-foreground">Record notes, prescribe medicines, and order lab tests</p>
                </div>
            </div>

            {/* Patient Info Banner */}
            <div className="flex items-center justify-between p-5 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
                <div>
                    <h2 className="text-xl font-semibold text-foreground">{patientName}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        📅 {new Date(appointment.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        &nbsp;·&nbsp;🕐 {appointment.slot}
                    </p>
                    {appointment.description && (
                        <p className="text-sm text-muted-foreground mt-1 italic">"{appointment.description}"</p>
                    )}
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${severityColors[severity]}`}>
                    {severity.toUpperCase()}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ═══ Left: Remarks + Voice ═══ */}
                <div className="lg:col-span-2 space-y-4">
                    <GlassCard>
                        <div className="p-5 space-y-4">
                            {/* Remarks Header with Voice Controls */}
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Consultation Notes
                                </label>
                                <div className="flex items-center gap-2">
                                    {recorder.recording && (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 animate-pulse">
                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                            <span className="text-xs text-red-400 font-medium">Recording</span>
                                            <Waves className="w-3 h-3 text-red-400" />
                                        </div>
                                    )}
                                    {transcribing && (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30">
                                            <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                                            <span className="text-xs text-blue-400 font-medium">Transcribing...</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Textarea with live transcription */}
                            <textarea
                                ref={remarksRef}
                                value={remarksText}
                                onChange={e => setRemarksText(e.target.value)}
                                placeholder="Type or use voice to record consultation notes...&#10;&#10;Click the 🎙️ microphone button to start voice recording. Transcription will appear after you stop recording."
                                rows={10}
                                className="w-full bg-background/60 border border-input rounded-xl px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground leading-relaxed disabled:opacity-50"
                                disabled={transcribing}
                            />

                            {/* Voice Control Buttons */}
                            <div className="flex items-center gap-3">
                                {!recorder.recording ? (
                                    <GlassButton
                                        onClick={recorder.start}
                                        disabled={transcribing}
                                        className="bg-gradient-to-r from-red-500/80 to-pink-500/80 hover:from-red-600 hover:to-pink-600 text-white"
                                    >
                                        <Mic className="w-4 h-4 mr-2" />
                                        Start Voice Recording
                                    </GlassButton>
                                ) : (
                                    <GlassButton
                                        onClick={recorder.stop}
                                        className="bg-red-600 hover:bg-red-700 text-white animate-pulse"
                                    >
                                        <Square className="w-4 h-4 mr-2 fill-current" />
                                        Stop Recording
                                    </GlassButton>
                                )}
                                <span className="text-xs text-muted-foreground">
                                    {recorder.recording
                                        ? "Recording... Click Stop to transcribe."
                                        : transcribing
                                            ? "Processing audio..."
                                            : "Voice-to-text powered by MedASR"}
                                </span>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* ═══ Right: Severity + Follow-up ═══ */}
                <div className="space-y-4">
                    <GlassCard>
                        <div className="p-5 space-y-4">
                            {/* Severity */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    <AlertTriangle className="w-4 h-4 inline mr-1.5" />
                                    Severity
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(["low", "medium", "high", "critical"] as const).map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setSeverity(s)}
                                            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${severity === s
                                                ? severityColors[s] + " ring-1 ring-offset-1 ring-offset-background"
                                                : "border-border text-muted-foreground hover:border-foreground/30"
                                                } ${s === "low" ? "ring-green-500/50" : s === "medium" ? "ring-yellow-500/50" : s === "high" ? "ring-orange-500/50" : "ring-red-500/50"}`}
                                        >
                                            {s.charAt(0).toUpperCase() + s.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Next Follow-up */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    <CalendarPlus className="w-4 h-4 inline mr-1.5" />
                                    Next Follow-up
                                </label>
                                <input
                                    type="date"
                                    value={nextFollowup}
                                    onChange={e => setNextFollowup(e.target.value)}
                                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </div>

            {/* ═══ Medicines & Lab Tests ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Medicines */}
                <GlassCard>
                    <div className="p-5 space-y-3">
                        <label className="block text-sm font-medium text-foreground">
                            <Pill className="w-4 h-4 inline mr-1.5" />
                            Prescribed Medicines
                        </label>

                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                                <input
                                    value={medSearch.query}
                                    onChange={e => { medSearch.setQuery(e.target.value); setShowMedDropdown(true); }}
                                    onFocus={() => setShowMedDropdown(true)}
                                    placeholder="Search medicine..."
                                    className="w-full bg-background border border-input rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                {medSearch.loading && <Loader2 className="absolute right-2.5 top-2.5 w-3.5 h-3.5 animate-spin text-muted-foreground" />}

                                {showMedDropdown && medSearch.results.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-xl max-h-40 overflow-auto">
                                        {medSearch.results.map((med: any) => (
                                            <button key={med.id} onClick={() => addMedicine(med)}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between">
                                                <span>{med.name}</span>
                                                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <input
                                value={pendingDosage}
                                onChange={e => setPendingDosage(e.target.value)}
                                placeholder="Dosage"
                                className="w-24 bg-background border border-input rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        {/* Medicine Pills */}
                        <div className="flex flex-wrap gap-1.5">
                            {medicines.map(m => (
                                <span key={m.id} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    <Pill className="w-3 h-3" />
                                    {m.name}{m.dosage ? ` (${m.dosage})` : ""}
                                    <button onClick={() => removeMedicine(m.id)} className="ml-0.5 hover:text-red-400 transition-colors">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                            {medicines.length === 0 && (
                                <p className="text-xs text-muted-foreground py-2">No medicines prescribed yet. Search above to add.</p>
                            )}
                        </div>
                    </div>
                </GlassCard>

                {/* Lab Tests */}
                <GlassCard>
                    <div className="p-5 space-y-3">
                        <label className="block text-sm font-medium text-foreground">
                            <FlaskConical className="w-4 h-4 inline mr-1.5" />
                            Ordered Lab Tests
                        </label>

                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                value={labSearch.query}
                                onChange={e => { labSearch.setQuery(e.target.value); setShowLabDropdown(true); }}
                                onFocus={() => setShowLabDropdown(true)}
                                placeholder="Search lab test..."
                                className="w-full bg-background border border-input rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            {labSearch.loading && <Loader2 className="absolute right-2.5 top-2.5 w-3.5 h-3.5 animate-spin text-muted-foreground" />}

                            {showLabDropdown && labSearch.results.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-xl max-h-40 overflow-auto">
                                    {labSearch.results.map((lab: any) => (
                                        <button key={lab.id} onClick={() => addLab(lab)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between">
                                            <span>{lab.name}</span>
                                            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Lab Pills */}
                        <div className="flex flex-wrap gap-1.5">
                            {labs.map(l => (
                                <span key={l.id} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <FlaskConical className="w-3 h-3" />
                                    {l.name}
                                    <button onClick={() => removeLab(l.id)} className="ml-0.5 hover:text-red-400 transition-colors">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                            {labs.length === 0 && (
                                <p className="text-xs text-muted-foreground py-2">No lab tests ordered yet. Search above to add.</p>
                            )}
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* ═══ Action Bar ═══ */}
            <div className="flex gap-4 pb-8 flex-wrap justify-end">
                <GlassButton variant="ghost" onClick={() => navigate("/appointments")} className="mr-auto">
                    Cancel
                </GlassButton>

                <GlassButton
                    variant="ghost"
                    onClick={() => handleSubmit("in_progress")}
                    disabled={submitting}
                    className="border border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                >
                    Save Draft
                </GlassButton>

                <GlassButton
                    variant="ghost"
                    onClick={() => handleSubmit("admitted")}
                    disabled={submitting}
                    className="border border-red-500/30 text-red-500 hover:bg-red-500/10"
                >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Admit Patient
                </GlassButton>

                <GlassButton onClick={() => handleSubmit("finished")} disabled={submitting}>
                    {submitting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                        <><Check className="w-4 h-4 mr-2" /> Complete Consultation</>
                    )}
                </GlassButton>
            </div>
        </div>
    );
};

export default Consultation;
