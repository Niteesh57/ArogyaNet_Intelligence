import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { appointmentsApi, documentsApi } from "@/lib/api";
import { GlassCard, GlassButton, GlassInput, GlassModal, Shimmer } from "@/components/GlassUI";
import { Upload, FileText, Search, User, Calendar, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function LabDashboard() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Upload State
    const [uploadModal, setUploadModal] = useState(false);
    const [selectedAppt, setSelectedAppt] = useState<any>(null);
    const [file, setFile] = useState<File | null>(null);
    const [reportTitle, setReportTitle] = useState("");
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadAppointments();
    }, []);

    const loadAppointments = async () => {
        try {
            setLoading(true);
            // Ideally we'd have an endpoint for "appointments needing lab work" or just all recent appointments
            // For now, listing all and filtering client side or just showing all
            const res = await appointmentsApi.list();
            // Filter for appointments that might need lab reports (e.g. status started/in_progress)
            // or just show all for the lab assistant to search
            setAppointments(res.data);
        } catch (error) {
            toast({ title: "Failed to load appointments", variant: "destructive" });
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

    const filteredAppointments = appointments.filter(a =>
        a.patient_id?.toLowerCase().includes(searchQuery.toLowerCase()) || // Ideally search by patient name if joined
        a.id.includes(searchQuery)
    );

    return (
        <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Lab Dashboard</h1>
                    <p className="text-muted-foreground mt-1">Upload and manage patient lab reports</p>
                </div>
                <div className="flex items-center gap-2">
                    <GlassInput
                        icon={Search}
                        placeholder="Search Appointment ID..."
                        value={searchQuery}
                        onChange={(v) => setSearchQuery(v)}
                        className="w-full md:w-64"
                    />
                </div>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="p-6 flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                        <FileText className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Pending Reports</p>
                        <h3 className="text-2xl font-bold">12</h3>
                    </div>
                </GlassCard>
                {/* Add more stats as needed */}
            </div>

            {/* Appointment List */}
            <GlassCard className="overflow-hidden">
                <div className="p-4 border-b border-border/50 bg-secondary/20">
                    <h3 className="font-semibold">Recent Appointments</h3>
                </div>
                <div className="divide-y divide-border/50">
                    {loading ? (
                        <div className="p-8 space-y-4">
                            <Shimmer /><Shimmer /><Shimmer />
                        </div>
                    ) : filteredAppointments.length > 0 ? (
                        filteredAppointments.map((appt) => (
                            <div key={appt.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium flex items-center gap-2">
                                            Appointment #{appt.id.slice(0, 8)}
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${appt.severity === 'critical' ? 'border-red-500/50 text-red-500 bg-red-500/10' :
                                                    'border-green-500/50 text-green-500 bg-green-500/10'
                                                }`}>
                                                {appt.severity}
                                            </span>
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {appt.slot}</span>
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {appt.date}</span>
                                        </div>
                                    </div>
                                </div>
                                <GlassButton size="sm" onClick={() => { setSelectedAppt(appt); setUploadModal(true); }}>
                                    <Upload className="w-4 h-4 mr-2" /> Upload Report
                                </GlassButton>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-muted-foreground">No appointments found</div>
                    )}
                </div>
            </GlassCard>

            {/* Upload Modal */}
            <GlassModal open={uploadModal} onClose={() => setUploadModal(false)} title="Upload Lab Report">
                <div className="space-y-4 pt-4">
                    <div className="bg-secondary/50 p-3 rounded-lg text-sm">
                        <p><span className="font-semibold">Appointment:</span> {selectedAppt?.id}</p>
                        <p><span className="font-semibold">Date:</span> {selectedAppt?.date}</p>
                    </div>

                    <GlassInput
                        label="Report Title"
                        placeholder="e.g. Blood Work Analysis"
                        value={reportTitle}
                        onChange={setReportTitle}
                    />

                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-accent/50 transition-colors relative">
                        <input
                            type="file"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            accept=".pdf,.jpg,.jpeg,.png"
                        />
                        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">{file ? file.name : "Click to select file"}</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG supported</p>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <GlassButton variant="ghost" onClick={() => setUploadModal(false)}>Cancel</GlassButton>
                        <GlassButton onClick={handleUpload} disabled={uploading}>
                            {uploading ? "Uploading..." : "Upload Report"}
                        </GlassButton>
                    </div>
                </div>
            </GlassModal>
        </div>
    );
}
