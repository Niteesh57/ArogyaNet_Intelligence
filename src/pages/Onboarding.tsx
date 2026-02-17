import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { GlassModal } from "@/components/GlassUI";
import { User, Stethoscope, HeartPulse } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PatientBookingForm } from "@/components/PatientBookingForm";

const Onboarding = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [role, setRole] = useState<"patient" | "doctor" | "nurse" | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const handleRoleSelect = (r: "patient" | "doctor" | "nurse") => {
        if (r === "doctor" || r === "nurse") {
            alert("Please contact your hospital admin to register as a Doctor or Nurse.");
            return;
        }
        setRole("patient");
        setModalOpen(true);
    };

    // If already a patient, show the booking form directly
    if (user?.role === 'patient') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 animate-fade-in bg-background">
                <div className="w-full max-w-3xl bg-background/60 backdrop-blur-xl border border-border/50 rounded-xl p-6 shadow-2xl">
                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                            Book Your Appointment
                        </h1>
                        <p className="text-muted-foreground">Complete the form below to schedule your visit.</p>
                    </div>
                    <PatientBookingForm onSuccess={() => navigate("/dashboard")} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 space-y-8 animate-fade-in">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                    Welcome to Life Health
                </h1>
                <p className="text-muted-foreground">Select your role to get started</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                {/* Patient Card */}
                <div onClick={() => handleRoleSelect("patient")} className="group relative p-6 bg-background/50 backdrop-blur-xl border border-border/50 rounded-xl hover:border-primary/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-primary/5">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                    <User className="w-10 h-10 text-primary mb-4" />
                    <h3 className="text-xl font-semibold">I am a Patient</h3>
                    <p className="text-sm text-muted-foreground mt-2">Book appointments, view medical history, and manage your health.</p>
                </div>

                {/* Doctor Card */}
                <div onClick={() => handleRoleSelect("doctor")} className="group p-6 bg-background/50 backdrop-blur-xl border border-border/50 rounded-xl hover:border-blue-500/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-blue-500/5">
                    <Stethoscope className="w-10 h-10 text-blue-500 mb-4" />
                    <h3 className="text-xl font-semibold">I am a Doctor</h3>
                    <p className="text-sm text-muted-foreground mt-2">Access patient records, manage appointments, and provide care.</p>
                </div>

                {/* Nurse Card */}
                <div onClick={() => handleRoleSelect("nurse")} className="group p-6 bg-background/50 backdrop-blur-xl border border-border/50 rounded-xl hover:border-pink-500/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-pink-500/5">
                    <HeartPulse className="w-10 h-10 text-pink-500 mb-4" />
                    <h3 className="text-xl font-semibold">I am a Nurse</h3>
                    <p className="text-sm text-muted-foreground mt-2">Assist doctors, manage wards, and track patient vitals.</p>
                </div>
            </div>

            {/* Patient Registration Modal */}
            <GlassModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Complete Registration & Book Appointment"
                className="max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            >
                <div className="pt-2">
                    <PatientBookingForm onSuccess={() => navigate("/dashboard")} />
                </div>
            </GlassModal>
        </div>
    );
};

export default Onboarding;
