import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { appointmentsApi, documentsApi, patientsApi, doctorsApi, labTestsApi } from "@/lib/api";
import { GlassCard, GlassButton, GlassInput, GlassModal, Shimmer } from "@/components/GlassUI";
import { UserSearch } from "@/components/UserSearch";
import { Upload, FileText, Search, Calendar, Clock, User as UserIcon, Stethoscope, FlaskConical } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function LabDashboard() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Search State — now stores selected objects + their IDs
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
    const [patientId, setPatientId] = useState("");
    const [doctorId, setDoctorId] = useState("");
    const [hasSearched, setHasSearched] = useState(false);

    // Upload State
    const [uploadModal, setUploadModal] = useState(false);
    const [selectedAppt, setSelectedAppt] = useState<any>(null);
    const [file, setFile] = useState<File | null>(null);
    const [reportTitle, setReportTitle] = useState("");
    const [uploading, setUploading] = useState(false);

    const handleSearch = async () => {
        if (!patientId || !doctorId) {
            toast({ title: "Please select both a Patient and a Doctor", variant: "destructive" });
            return;
        }

        try {
            setLoading(true);
            setHasSearched(true);
            const res = await appointmentsApi.search(patientId, doctorId);
            setAppointments(res.data);
        } catch (error) {
            console.error(error);
            toast({ title: "Failed to search appointments", description: "Please check the selections and try again", variant: "destructive" });
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!file || !reportTitle || !selectedAppt) {
            toast({ title: "Please fill all fields", variant: "destructive" });
            return;
        }

        try {
            setUploading(true);
            await documentsApi.upload(file, reportTitle, selectedAppt.id);
            toast({ title: "Report uploaded successfully" });
            setUploadModal(false);
            setFile(null);
            setReportTitle("");
            setSelectedAppt(null);
        } catch (error) {
            toast({ title: "Upload failed", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Lab Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Search appointments to upload lab reports</p>
                </div>
            </div>

            {/* Search Section */}
            <GlassCard className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <UserSearch
                            onSelect={(u) => {
                                setSelectedPatient(u);
                                setPatientId(u.id);
                            }}
                            label="Search Patient"
                            placeholder="Search patient by name or email..."
                            searchAction={patientsApi.search}
                        />
                        {selectedPatient && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <UserIcon className="w-3 h-3" /> {selectedPatient.full_name || selectedPatient.user?.full_name || selectedPatient.email}
                            </p>
                        )}
                    </div>
                    <div>
                        <UserSearch
                            onSelect={(u) => {
                                setSelectedDoctor(u);
                                setDoctorId(u.id);
                            }}
                            label="Search Doctor"
                            placeholder="Search doctor by name or email..."
                            searchAction={doctorsApi.search}
                        />
                        {selectedDoctor && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <Stethoscope className="w-3 h-3" /> {selectedDoctor.full_name || selectedDoctor.user?.full_name || selectedDoctor.email}
                            </p>
                        )}
                    </div>
                </div>
                <GlassButton onClick={handleSearch} disabled={loading || !patientId || !doctorId} className="w-full md:w-auto">
                    {loading ? <Shimmer className="w-4 h-4" /> : <Search className="w-4 h-4 mr-2" />}
                    Search Appointments
                </GlassButton>
            </GlassCard>

            {/* Appointment List */}
            {hasSearched && (
                <GlassCard className="overflow-hidden min-h-[200px]">
                    <div className="p-4 border-b border-border/50 bg-secondary/20">
                        <h3 className="font-semibold">Search Results</h3>
                    </div>
                    <div className="divide-y divide-border/50">
                        {loading ? (
                            <div className="p-8 space-y-4">
                                <Shimmer className="h-12 w-full rounded-lg" />
                                <Shimmer className="h-12 w-full rounded-lg" />
                            </div>
                        ) : appointments.length > 0 ? (
                            appointments.map((appt) => (
                                <div key={appt.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className="hidden sm:flex p-3 rounded-lg bg-primary/10 text-primary">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-lg">
                                                    {appt.patient?.full_name || "Patient"}
                                                </span>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${appt.severity === 'critical' ? 'border-red-500/50 text-red-500 bg-red-500/10' :
                                                    appt.severity === 'high' ? 'border-orange-500/50 text-orange-500 bg-orange-500/10' :
                                                        'border-green-500/50 text-green-500 bg-green-500/10'
                                                    }`}>
                                                    {appt.severity || 'Normal'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {appt.date} at {appt.slot}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Stethoscope className="w-3.5 h-3.5" />
                                                    Dr. {appt.doctor_name || appt.doctor?.user?.full_name || "Unknown"}
                                                </span>
                                                <span className="flex items-center gap-1.5 col-span-1 sm:col-span-2 text-xs opacity-70">
                                                    ID: {appt.id}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <GlassButton size="sm" onClick={() => { setSelectedAppt(appt); setUploadModal(true); }}>
                                        <Upload className="w-4 h-4 mr-2" /> Upload Report
                                    </GlassButton>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                                <Search className="w-12 h-12 mb-3 opacity-20" />
                                <p>No appointments found matching these IDs.</p>
                            </div>
                        )}
                    </div>
                </GlassCard>
            )}

            {/* Upload Modal */}
            <GlassModal open={uploadModal} onClose={() => setUploadModal(false)} title="Upload Lab Report">
                <div className="space-y-4 pt-4">
                    <div className="bg-secondary/50 p-3 rounded-lg text-sm space-y-1">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Patient:</span>
                            <span className="font-medium">{selectedAppt?.patient?.full_name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span className="font-medium">{selectedAppt?.date}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Appointment ID:</span>
                            <span className="font-medium text-xs font-mono">{selectedAppt?.id}</span>
                        </div>
                    </div>

                    <UserSearch
                        label="Report Title (Search Lab Test)"
                        placeholder="Search for a lab test (e.g. CBC, Lipid Profile)..."
                        onSelect={(test) => setReportTitle(test.name)}
                        searchAction={labTestsApi.search}
                    />

                    {reportTitle && (
                        <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 px-3 py-2 rounded-md border border-primary/10">
                            <FlaskConical className="w-3.5 h-3.5" />
                            <span className="font-medium">Selected: {reportTitle}</span>
                        </div>
                    )}

                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-accent/50 transition-colors relative group">
                        <input
                            type="file"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            accept=".pdf,.jpg,.jpeg,.png"
                        />
                        <div className="transition-transform group-hover:scale-110 duration-200">
                            <Upload className="w-10 h-10 mx-auto text-primary/50 mb-3" />
                        </div>
                        <p className="text-sm font-medium">{file ? file.name : "Click to upload report"}</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG supported</p>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <GlassButton variant="ghost" onClick={() => setUploadModal(false)}>Cancel</GlassButton>
                        <GlassButton onClick={handleUpload} disabled={uploading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            {uploading ? (
                                <><Shimmer className="w-4 h-4 mr-2" /> Uploading...</>
                            ) : (
                                "Upload Report"
                            )}
                        </GlassButton>
                    </div>
                </div>
            </GlassModal>
        </div>
    );
}
