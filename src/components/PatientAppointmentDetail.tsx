import { useEffect, useState } from "react";
import { appointmentsApi } from "@/lib/api";
import { GlassModal } from "@/components/GlassUI";
import {
    Loader2, Stethoscope, Activity, Calendar, Clock,
    FileText, Utensils, FlaskConical, Pill, UserCheck
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface PatientAppointmentDetailProps {
    open: boolean;
    onClose: () => void;
    appointmentId: string;
    doctorName?: string;
    doctorSpecialization?: string;
}

export const PatientAppointmentDetail = ({
    open,
    onClose,
    appointmentId,
    doctorName,
    doctorSpecialization,
}: PatientAppointmentDetailProps) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        if (open && appointmentId) {
            setLoading(true);
            appointmentsApi
                .get(appointmentId)
                .then((res) => setData(res.data))
                .catch(() => { })
                .finally(() => setLoading(false));
        }
    }, [open, appointmentId]);

    if (!open) return null;

    return (
        <GlassModal
            open={open}
            onClose={onClose}
            title="Appointment Details"
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : !data ? (
                <div className="text-center py-10 text-muted-foreground">
                    Could not load appointment details.
                </div>
            ) : (
                <div className="space-y-5 pt-2">
                    {/* Header: Doctor + Date */}
                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                {(doctorName || "D")[0]}
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">{doctorName || "Doctor"}</h3>
                                {doctorSpecialization && (
                                    <p className="text-xs text-muted-foreground">{doctorSpecialization}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(data.date).toLocaleDateString(undefined, {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {data.slot}
                            </span>
                        </div>
                    </div>

                    {/* Description */}
                    {data.description && (
                        <div>
                            <h4 className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                Reason for Visit
                            </h4>
                            <p className="text-sm text-foreground/80 bg-secondary/20 rounded-lg p-3 border border-border/30">
                                {data.description}
                            </p>
                        </div>
                    )}

                    {/* Severity & Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-secondary/20 rounded-lg p-3 border border-border/30">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Severity</p>
                            <span className={`text-sm font-semibold capitalize ${data.severity === "critical" ? "text-red-500" :
                                    data.severity === "high" ? "text-orange-500" :
                                        data.severity === "medium" ? "text-yellow-500" : "text-green-500"
                                }`}>
                                {data.severity}
                            </span>
                        </div>
                        <div className="bg-secondary/20 rounded-lg p-3 border border-border/30">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                            <span className="text-sm font-semibold capitalize text-foreground">
                                {data.status?.replace("_", " ") || "Started"}
                            </span>
                        </div>
                    </div>

                    {/* Doctor's Remarks */}
                    {data.remarks?.text && (
                        <div>
                            <h4 className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                                <Stethoscope className="w-4 h-4 text-primary" />
                                Doctor's Remarks
                            </h4>
                            <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                                <p className="text-sm text-foreground/90">{data.remarks.text}</p>
                            </div>
                        </div>
                    )}

                    {/* Prescribed Medications */}
                    {data.remarks?.medicine && data.remarks.medicine.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                                <Pill className="w-4 h-4 text-blue-500" />
                                Prescribed Medications
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {data.remarks.medicine.map((m: any, i: number) => (
                                    <span
                                        key={i}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    >
                                        <Pill className="w-3 h-3" />
                                        {typeof m === "string" ? m : m.name}
                                        {m.dosage && <span className="text-blue-400/60">• {m.dosage}</span>}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Lab Tests */}
                    {data.remarks?.lab && data.remarks.lab.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                                <FlaskConical className="w-4 h-4 text-emerald-500" />
                                Lab Tests
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {data.remarks.lab.map((l: any, i: number) => (
                                    <span
                                        key={i}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    >
                                        <FlaskConical className="w-3 h-3" />
                                        {typeof l === "string" ? l : l.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Vitals */}
                    {data.vitals && data.vitals.length > 0 && (
                        <div>
                            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                                <Activity className="w-4 h-4 text-rose-500" />
                                Recorded Vitals
                            </h4>
                            <div className="space-y-3">
                                {data.vitals.map((v: any, idx: number) => (
                                    <div key={idx} className="bg-card/40 rounded-xl border border-border/40 overflow-hidden">
                                        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 bg-muted/20">
                                            <span className="text-[10px] text-muted-foreground">
                                                {new Date(v.timestamp || v.created_at || Date.now()).toLocaleString()}
                                            </span>
                                            {(v.nurse?.full_name || v.nurse_name || v.recorded_by) && (
                                                <span className="text-[10px] text-foreground/60 flex items-center gap-1">
                                                    <UserCheck className="w-3 h-3" />
                                                    {v.nurse?.full_name || v.nurse_name || v.recorded_by}
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <div className="flex flex-col items-center p-2 rounded-lg bg-background/50 border border-border/30">
                                                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">BP</span>
                                                <span className="text-sm font-bold text-foreground">{v.bp}</span>
                                                <span className="text-[9px] text-muted-foreground">mmHg</span>
                                            </div>
                                            <div className="flex flex-col items-center p-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
                                                <span className="text-[9px] uppercase tracking-wider text-rose-500/70">Pulse</span>
                                                <span className="text-sm font-bold text-rose-500">{v.pulse}</span>
                                                <span className="text-[9px] text-rose-500/70">bpm</span>
                                            </div>
                                            <div className="flex flex-col items-center p-2 rounded-lg bg-sky-500/5 border border-sky-500/10">
                                                <span className="text-[9px] uppercase tracking-wider text-sky-500/70">SpO2</span>
                                                <span className="text-sm font-bold text-sky-500">{v.spo2}</span>
                                                <span className="text-[9px] text-sky-500/70">%</span>
                                            </div>
                                            <div className="flex flex-col items-center p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                                <span className="text-[9px] uppercase tracking-wider text-amber-500/70">Temp</span>
                                                <span className="text-sm font-bold text-amber-500">{v.temp}</span>
                                                <span className="text-[9px] text-amber-500/70">°F</span>
                                            </div>
                                        </div>
                                        {v.remarks && (
                                            <div className="px-3 py-1.5 bg-muted/10 border-t border-border/30">
                                                <p className="text-[10px] text-muted-foreground italic">{v.remarks}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Follow-up */}
                    {data.next_followup && (
                        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3">
                            <p className="text-[10px] uppercase tracking-wider text-indigo-500/70 mb-0.5">Next Follow-up</p>
                            <p className="text-sm font-medium text-indigo-400">
                                {new Date(data.next_followup).toLocaleDateString(undefined, {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </p>
                        </div>
                    )}

                    {/* Nurse */}
                    {data.nurse_name && (
                        <div className="bg-pink-500/5 border border-pink-500/10 rounded-lg p-3 flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-pink-500" />
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-pink-500/70">Assigned Nurse</p>
                                <p className="text-sm font-medium text-foreground">{data.nurse_name}</p>
                            </div>
                        </div>
                    )}

                    {/* Diet Plan */}
                    {data.diet_plan && (
                        <div>
                            <h4 className="text-sm font-medium text-amber-500 mb-1.5 flex items-center gap-1.5">
                                <Utensils className="w-4 h-4" />
                                AI Diet Plan
                            </h4>
                            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 prose prose-sm dark:prose-invert prose-amber max-w-none overflow-auto max-h-[300px] custom-scrollbar">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {data.diet_plan}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </GlassModal>
    );
};
