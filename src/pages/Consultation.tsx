import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { appointmentsApi, inventoryApi, labTestsApi, namesApi, voiceApi, usersApi, patientsApi } from "@/lib/api";
import { GlassButton, GlassCard, GlassModal } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";
import {
    Pill, FlaskConical, X, Search, Loader2, FileText,
    AlertTriangle, CalendarPlus, Send, ArrowLeft,
    Mic, MicOff, Square, Stethoscope, Plus, Waves, Check,
    Activity, Heart, Calendar, Thermometer, Wind, Phone, RefreshCw, MessageSquare, Bot, User, Share2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { agentApi } from "@/lib/api";

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
        if (!streamRef.current && !processorRef.current) return; // Prevent double trigger

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
        if (chunks.length === 0) return; // Nothing to send

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
    const { user } = useAuth();

    // Appointment data
    const [appointment, setAppointment] = useState<any>(null);
    const [patientName, setPatientName] = useState("Patient");
    const [loading, setLoading] = useState(true);

    // Nurse Assignment State
    const [activeTab, setActiveTab] = useState<'clinical' | 'vitals' | 'call-history'>('clinical');
    const [nurseQuery, setNurseQuery] = useState("");
    const [nurses, setNurses] = useState<any[]>([]);
    const [assignedNurse, setAssignedNurse] = useState<any>(null);
    const [loadingNurses, setLoadingNurses] = useState(false);
    const [vitals, setVitals] = useState<any[]>([]);

    // Form state (Restored)
    const [remarksText, setRemarksText] = useState("");
    const [medicines, setMedicines] = useState<MedicineItem[]>([]);
    const [labs, setLabs] = useState<LabItem[]>([]);
    const [severity, setSeverity] = useState("medium");
    const [nextFollowup, setNextFollowup] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Doctor Prompt Modal State
    const [showDocPromptModal, setShowDocPromptModal] = useState(false);
    const [doctorPrompt, setDoctorPrompt] = useState("");
    const [isTriggeringCall, setIsTriggeringCall] = useState(false);

    // Call History State
    const [callScripts, setCallScripts] = useState<any[]>([]);
    const [loadingScripts, setLoadingScripts] = useState(false);

    // ... existing search hooks ...

    // Load appointment data
    useEffect(() => {
        if (!id) return;
        const loadAppointment = async () => {
            try {
                const res = await appointmentsApi.get(id);
                const appt = res.data;
                console.log("DEBUG: Consultation Data", {
                    userRole: user?.role,
                    patient: appt.patient,
                    patientPhone: appt.patient?.phone,
                    fullAppt: appt
                });
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

                // Load assigned nurse from Appointment (preferred) or Patient
                if (appt.nurse_id) {
                    setAssignedNurse({ id: appt.nurse_id, name: appt.nurse_name || "Assigned Nurse" });
                } else if (appt.patient_id) {
                    loadAssignedNurseFromPatient(appt.patient_id);
                }

                // Fetch patient name
                // Initial load of vitals if tab is already vitals (unlikely on first load but good practice)
                if (activeTab === 'vitals') {
                    loadVitals(id);
                }
            } catch {
                toast({ title: "Could not load appointment", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        loadAppointment();
    }, [id]);

    // Fetch vitals when tab changes
    useEffect(() => {
        if (id && activeTab === 'vitals') {
            loadVitals(id);
        }
    }, [id, activeTab]);

    // Fetch call scripts when tab changes
    useEffect(() => {
        if (id && activeTab === 'call-history') {
            const loadScripts = async () => {
                setLoadingScripts(true);
                try {
                    const res = await agentApi.getCallScripts(id);
                    setCallScripts(res.data?.call_scripts || []);
                } catch {
                    console.error("Failed to load call scripts");
                } finally {
                    setLoadingScripts(false);
                }
            };
            loadScripts();
        }
    }, [id, activeTab]);

    const loadVitals = async (apptId: string) => {
        try {
            const res = await appointmentsApi.getVitals(apptId);
            setVitals(res.data);

            // If no assigned nurse but we have vitals, use the nurse from the latest vital
            // This fixes the UI for old appointments where nurse wasn't auto-assigned
            if (!assignedNurse && res.data && res.data.length > 0) {
                // Sort by date desc to get latest
                const latest = res.data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                if (latest.nurse || latest.nurse_name) {
                    const name = latest.nurse?.full_name || latest.nurse_name || "Nurse";
                    const pid = latest.nurse?.id || latest.nurse_id; // vital has nurse_id
                    if (pid) {
                        setAssignedNurse({ id: pid, name: name });
                    }
                }
            }
        } catch {
            console.error("Failed to load vitals");
        }
    };

    const loadAssignedNurseFromPatient = async (pid: string) => {
        try {
            const res = await patientsApi.get(pid);
            if (res.data?.assigned_nurse_id) {
                const nurseName = res.data.assigned_nurse?.user?.full_name || res.data.assigned_nurse?.full_name || "Assigned Nurse";
                setAssignedNurse({ id: res.data.assigned_nurse_id, name: nurseName });
            }
        } catch { }
    };

    // Nurse Handlers
    // Nurse Handlers
    const handleNurseSearch = async () => {
        if (!nurseQuery) return;
        setLoadingNurses(true);
        try {
            const res = await usersApi.searchNurses(nurseQuery);
            setNurses(res.data);
        } catch { toast({ title: "Search failed" }); }
        finally { setLoadingNurses(false); }
    };

    const assignNurse = async (nurse: any) => {
        try {
            // New endpoint: appointmentsApi.assignNurse(id, nurseId)
            await appointmentsApi.assignNurse(id!, nurse.id);
            setAssignedNurse(nurse);
            toast({ title: `Assigned ${nurse.full_name}` });
            setNurses([]);
            setNurseQuery("");
        } catch {
            toast({ title: "Assignment failed", variant: "destructive" });
        }
    };



    // ... rest of helpers ...

    // RENDER
    // I need to replace the entire Body with Tab logic.
    // This is too big for one replace block without imports.
    // I will split this task.
    // 1. Add Imports.
    // 2. Add State & Handlers.
    // 3. Update Render.


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

                // Fetch patient name and details if missing
                try {
                    // Always fetch fresh patient data to get the phone number if it wasn't included in the appointment
                    if (!appt.patient?.phone && appt.patient_id) {
                        const patRes = await patientsApi.get(appt.patient_id);
                        console.log("DEBUG: Fetched fresh patient data", patRes.data);
                        if (patRes.data?.phone) {
                            // Update appointment state with the phone number
                            setAppointment((prev: any) => ({
                                ...prev,
                                patient: {
                                    ...prev.patient,
                                    phone: patRes.data.phone
                                }
                            }));
                        }
                    }

                    if (!patientName || patientName === "Patient") {
                        const nameRes = await namesApi.getPatientName(appt.patient_id);
                        setPatientName(nameRes.data.full_name);
                    }
                } catch (err) {
                    console.error("Error fetching patient details:", err);
                }

                // If backend provides vitals (new feature), use them
                if (appt.vitals && appt.vitals.length > 0) {
                    setVitals(appt.vitals);

                    // Fallback nurse assignment from vitals
                    if (!appt.nurse_id) { // Only if main appt doesn't specify nurse
                        const latest = appt.vitals.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                        if (latest.nurse || latest.nurse_name) {
                            const name = latest.nurse?.full_name || latest.nurse_name || "Nurse";
                            const pid = latest.nurse?.id || latest.nurse_id;
                            if (pid) {
                                setAssignedNurse({ id: pid, name: name });
                            }
                        }
                    }
                } else {
                    // Fallback to separate fetch if not in response (backward compat)
                    if (activeTab === 'vitals') {
                        loadVitals(id);
                    }
                }
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


    /* ─── Experience Sharing Logic ─── */
    const [showExperienceModal, setShowExperienceModal] = useState(false);
    const [experienceText, setExperienceText] = useState("");
    const [experienceCategory, setExperienceCategory] = useState("General");
    const [isSharing, setIsSharing] = useState(false);

    const handleConstraintSubmit = () => {
        // Just proceed to finish without sharing
        setShowExperienceModal(false);
        finishConsultation();
    };

    const handleExperienceSubmit = async () => {
        if (!experienceText.trim()) {
            toast({ title: "Please enter your experience", variant: "destructive" });
            return;
        }

        setIsSharing(true);
        try {
            await agentApi.expertCheck({
                check_text: experienceText,
                category: experienceCategory,
                hospital_id: user?.hospital_id, // Fallback handled in backend if missing
                medication: medicines.map(m => m.name),
                lab_test: labs.map(l => l.name)
            });
            toast({ title: "Experience Shared!", description: "Your insights help train our AI." });
        } catch (e) {
            console.error("Failed to share experience", e);
            toast({ title: "Could not share experience", description: "Proceeding to finish consultation...", variant: "destructive" });
        } finally {
            setIsSharing(false);
            setShowExperienceModal(false);
            finishConsultation();
        }
    };


    const handleSubmit = async (targetStatus: string = "finished") => {
        if (!remarksText.trim() && medicines.length === 0 && labs.length === 0) {
            toast({ title: "Add at least a remark, medicine, or lab test", variant: "destructive" });
            return;
        }

        // Intercept "finished" status to ask for experience
        if (targetStatus === "finished" && user?.role === "doctor") {
            setShowExperienceModal(true);
            return;
        }

        // Otherwise proceed directly (e.g. draft)
        await saveConsultation(targetStatus);
    };

    const finishConsultation = () => saveConsultation("finished");

    const saveConsultation = async (targetStatus: string) => {
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
        <div className="space-y-6 w-full">
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
                <div className="flex items-center gap-3">
                    {(user?.role === "doctor" || user?.role?.toLowerCase() === "doctor") && (
                        <GlassButton
                            size="sm"
                            onClick={() => {
                                setDoctorPrompt(""); // Reset prompt
                                setShowDocPromptModal(true);
                            }}
                            className="border-green-500/20 bg-green-500/10 text-green-500 hover:bg-green-500/20"
                        >
                            <Phone className="w-4 h-4 mr-2" />
                            Call Patient
                        </GlassButton>
                    )}
                    <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${severityColors[severity]}`}>
                        {severity.toUpperCase()}
                    </div>
                </div>
            </div>




            {/* Tabs for Clinical / Care Team */}
            <div className="flex gap-4 border-b border-border/50 mb-6">
                <button
                    onClick={() => setActiveTab('clinical')}
                    className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'clinical' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <FileText className="w-4 h-4 inline mr-2" />
                    Clinical Notes
                    {activeTab === 'clinical' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('vitals')}
                    className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'vitals' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    <Stethoscope className="w-4 h-4 inline mr-2" />
                    Vitals & Care Team
                    {activeTab === 'vitals' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />}
                </button>
                {/* Call History tab hidden — use Call Patient button at top instead */}
            </div>

            {/* Main Content Grid */}
            {
                activeTab === 'clinical' ? (
                    <>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
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
                    </>
                ) : activeTab === 'vitals' ? (
                    /* ═══ Care Team & Vitals ═══ */
                    <div className="space-y-6">
                        <GlassCard>
                            <div className="p-6">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Stethoscope className="w-5 h-5 text-primary" />
                                    Nurse Assignment
                                </h3>
                                <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Assigned Nurse</label>
                                    {assignedNurse ? (
                                        <div className="flex items-center justify-between bg-background/50 p-3 rounded-lg border border-border">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                                    {assignedNurse.name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-foreground">{assignedNurse.name}</p>
                                                    <p className="text-xs text-muted-foreground">ID: {assignedNurse.id}</p>
                                                </div>
                                            </div>
                                            <GlassButton size="sm" variant="ghost" className="text-destructive h-8 px-2" onClick={() => setAssignedNurse(null)}>
                                                <X className="w-4 h-4" />
                                            </GlassButton>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <input
                                                    value={nurseQuery}
                                                    onChange={(e) => setNurseQuery(e.target.value)}
                                                    placeholder="Search by name..."
                                                    className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                    onKeyDown={(e) => e.key === "Enter" && handleNurseSearch()}
                                                />
                                                <GlassButton onClick={handleNurseSearch} disabled={loadingNurses}>
                                                    {loadingNurses ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                                                </GlassButton>
                                            </div>
                                            {nurses.length > 0 && (
                                                <div className="border border-border rounded-lg overflow-hidden">
                                                    {nurses.map((nurse) => (
                                                        <div key={nurse.id} className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors border-b border-border/50 last:border-0">
                                                            <div>
                                                                <p className="text-sm font-medium">{nurse.full_name}</p>
                                                                <p className="text-xs text-muted-foreground">{nurse.email}</p>
                                                            </div>
                                                            <GlassButton size="sm" variant="ghost" onClick={() => assignNurse(nurse)}>
                                                                Assign
                                                            </GlassButton>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {nurses.length === 0 && nurseQuery && !loadingNurses && (
                                                <p className="text-sm text-muted-foreground text-center py-2">No nurses found.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </GlassCard>

                        {/* Vitals History Section */}
                        <GlassCard>
                            <div className="p-6">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-primary" />
                                    Vitals History
                                </h3>

                                {vitals.length > 0 ? (
                                    <div className="space-y-4">
                                        {vitals.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((v: any, i: number) => (
                                            <div key={i} className="p-4 rounded-xl bg-secondary/20 border border-border/30">
                                                <div className="flex items-center justify-between mb-3 border-b border-border/30 pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-sm font-medium">
                                                            {new Date(v.created_at).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground">
                                                        Recorded by: {v.nurse?.full_name || v.nurse_name || "Nurse"}
                                                    </span>
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
                                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border/30 rounded-xl">
                                        <Activity className="w-8 h-8 opacity-20 mx-auto mb-2" />
                                        <p>No vitals recorded yet.</p>
                                        <p className="text-xs opacity-60">Assign a nurse to record vitals.</p>
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    </div>
                ) : null
            }

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

            {/* Experience Sharing Modal */}
            <GlassModal
                open={showExperienceModal}
                onClose={() => setShowExperienceModal(false)}
                title="Share Your Experience"
                className="max-w-xl"
            >
                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3">
                        <Bot className="w-8 h-8 text-blue-400 flex-shrink-0" />
                        <div>
                            <h3 className="font-semibold text-foreground">Help Train MedVQA</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Your insights are valuable! Sharing your clinical reasoning helps improve doctor treatment evaluation based on user experiences and our AI's diagnostic accuracy.
                            </p>
                        </div>
                    </div>

                    {/* Auto-populated Data Display */}
                    <div className="bg-secondary/30 p-3 rounded-lg border border-border/50">
                        <p className="text-xs font-medium text-foreground mb-2 uppercase tracking-wider">Auto-populated Context</p>
                        <div className="space-y-2">
                            <div className="flex items-start gap-2 text-sm">
                                <Pill className="w-4 h-4 text-blue-400 mt-0.5" />
                                <div>
                                    <span className="text-muted-foreground">Medicines: </span>
                                    <span className="text-foreground">{medicines.length > 0 ? medicines.map(m => m.name).join(", ") : "None"}</span>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 text-sm">
                                <FlaskConical className="w-4 h-4 text-emerald-400 mt-0.5" />
                                <div>
                                    <span className="text-muted-foreground">Lab Tests: </span>
                                    <span className="text-foreground">{labs.length > 0 ? labs.map(l => l.name).join(", ") : "None"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
                            <select
                                value={experienceCategory}
                                onChange={(e) => setExperienceCategory(e.target.value)}
                                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="General">General Practice</option>
                                <option value="Cardiology">Cardiology</option>
                                <option value="Dermatology">Dermatology</option>
                                <option value="Pediatrics">Pediatrics</option>
                                <option value="Neurology">Neurology</option>
                                <option value="Orthopedics">Orthopedics</option>
                                <option value="Internal Medicine">Internal Medicine</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Clinical Experience & Treatment Plan</label>
                        <textarea
                            value={experienceText}
                            onChange={(e) => setExperienceText(e.target.value)}
                            placeholder="Describe your diagnosis, reasoning, and the treatment plan..."
                            rows={4}
                            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <GlassButton
                            variant="ghost"
                            onClick={handleConstraintSubmit}
                            className="flex-1"
                        >
                            Skip & Finish
                        </GlassButton>
                        <GlassButton
                            onClick={handleExperienceSubmit}
                            disabled={isSharing}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg shadow-blue-500/20"
                        >
                            {isSharing ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sharing...</>
                            ) : (
                                <><Share2 className="w-4 h-4 mr-2" /> Share & Finish</>
                            )}
                        </GlassButton>
                    </div>
                </div>
            </GlassModal>

            {/* Doctor Call Custom Prompt Modal */}
            <GlassModal open={showDocPromptModal} onClose={() => setShowDocPromptModal(false)} title="Configure Agent Call">
                <div className="p-6 space-y-4 max-w-md w-full">
                    <p className="text-sm text-muted-foreground mb-4">
                        What specific questions should the AI agent ask {patientName} during this call?
                    </p>

                    <textarea
                        value={doctorPrompt}
                        onChange={(e) => setDoctorPrompt(e.target.value)}
                        className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        rows={4}
                        placeholder="e.g. Ask them if they are still experiencing pain in their lower back after taking the new medicine..."
                    />

                    <div className="flex gap-3 justify-end mt-6">
                        <GlassButton onClick={() => setShowDocPromptModal(false)} variant="ghost" disabled={isTriggeringCall}>
                            Cancel
                        </GlassButton>
                        <GlassButton
                            onClick={() => {
                                if (!appointment?.patient?.phone) return;
                                setIsTriggeringCall(true);
                                agentApi.triggerCall({
                                    phone_number: appointment.patient.phone,
                                    appointment_id: appointment.id,
                                    doctor_prompt: doctorPrompt || undefined
                                })
                                    .then(() => {
                                        toast({ title: "Call Initiated", description: "AI agent is calling the patient." });
                                        setShowDocPromptModal(false);
                                    })
                                    .catch(e => {
                                        console.error("Backend call trigger failed:", e);
                                        toast({ variant: "destructive", title: "Call Failed", description: "Could not trigger AI call." });
                                    })
                                    .finally(() => {
                                        setIsTriggeringCall(false);
                                    });
                            }}
                            disabled={isTriggeringCall}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isTriggeringCall ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4 mr-2" />}
                            Start Call
                        </GlassButton>
                    </div>
                </div>
            </GlassModal>

        </div>

    );
};

export default Consultation;
