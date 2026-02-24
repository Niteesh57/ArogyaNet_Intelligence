import { useNavigate } from "react-router-dom";
import { useState } from "react";

const features = [
    {
        image: "/img/1.png",
        title: "Doctor Dashboard",
        description:
            "A powerful command center for doctors – view today's appointments, upcoming schedule, patient stats, and calendar at a glance.",
        badge: "Doctor",
        badgeColor: "bg-emerald-500/20 text-emerald-400",
    },
    {
        image: "/img/3.png",
        title: "Expert Learn",
        description:
            "AI-powered medical knowledge assistant backed by MedVQA & Pinecone. Ask about symptoms, treatment protocols, or rare conditions.",
        badge: "Doctor",
        badgeColor: "bg-emerald-500/20 text-emerald-400",
    },
    {
        image: "/img/4.png",
        title: "Consultation",
        description:
            "Record voice notes with MedASR, call patients directly, set severity levels, schedule follow-ups, and manage clinical notes — all in one screen.",
        badge: "Doctor",
        badgeColor: "bg-emerald-500/20 text-emerald-400",
    },
    {
        image: "/img/5.png",
        title: "Deep Research Agent",
        description:
            "Upload medical scans, audio notes, or PDF histories. The multi-agent system performs deep AI analysis and generates comprehensive reports.",
        badge: "Doctor",
        badgeColor: "bg-emerald-500/20 text-emerald-400",
    },
    {
        image: "/img/6.png",
        title: "Events & Logs",
        description:
            "Track community health events, medical camps, screenings, and outreach programs with entry-level data management.",
        badge: "Doctor / Admin",
        badgeColor: "bg-blue-500/20 text-blue-400",
    },
    {
        image: "/img/7.png",
        title: "Event Analytics",
        description:
            "Admin-grade intelligent visualization — BP trends, platelet counts, location breakdowns, and spike detection for rapid response.",
        badge: "Admin",
        badgeColor: "bg-violet-500/20 text-violet-400",
    },
    {
        image: "/img/8.png",
        title: "Admin Portal",
        description:
            "Full hospital management — create and manage doctors, nurses, patients, appointments, medicines, lab tests, floors, and more.",
        badge: "Admin",
        badgeColor: "bg-violet-500/20 text-violet-400",
    },
    {
        image: "/img/9.png",
        title: "DocuMate Agent",
        description:
            "AI document analysis agent — summarize X-rays, medical reports, and images. Chat with your documents for instant insights.",
        badge: "Patient / Doctor",
        badgeColor: "bg-amber-500/20 text-amber-400",
    },
    {
        image: "/img/10.png",
        title: "Patient Dashboard",
        description:
            "Patients can view upcoming visits, appointment history, book new consultations, and access DocuMate AI for their reports.",
        badge: "Patient",
        badgeColor: "bg-cyan-500/20 text-cyan-400",
    },
    {
        image: "/img/12.png",
        title: "Nurse Vitals & Care",
        description:
            "Nurse assignment tracking with complete vitals history — BP, pulse, temperature, SpO2 — recorded and timestamped per visit.",
        badge: "Nurse / Doctor",
        badgeColor: "bg-rose-500/20 text-rose-400",
    },
];

const FeatureCard = ({
    feature,
    index,
}: {
    feature: (typeof features)[0];
    index: number;
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="group relative rounded-2xl overflow-hidden transition-all duration-500 ease-out"
            style={{ animationDelay: `${index * 80}ms` }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Glassmorphism card */}
            <div
                className={`relative bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden transition-all duration-500 ${isHovered
                        ? "shadow-2xl shadow-primary/10 border-white/20 -translate-y-1"
                        : "shadow-lg shadow-black/20"
                    }`}
            >
                {/* Image container */}
                <div className="relative overflow-hidden aspect-[16/10]">
                    <img
                        src={feature.image}
                        alt={feature.title}
                        className={`w-full h-full object-cover object-top transition-transform duration-700 ease-out ${isHovered ? "scale-105" : "scale-100"
                            }`}
                        loading="lazy"
                    />
                    {/* Gradient overlay on image */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c1222] via-transparent to-transparent opacity-60" />

                    {/* Badge */}
                    <div className="absolute top-4 right-4">
                        <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${feature.badgeColor}`}
                        >
                            {feature.badge}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-3">
                    <h3 className="text-xl font-bold text-white tracking-tight">
                        {feature.title}
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        {feature.description}
                    </p>
                </div>

                {/* Bottom accent line */}
                <div
                    className={`h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent transition-opacity duration-500 ${isHovered ? "opacity-100" : "opacity-0"
                        }`}
                />
            </div>
        </div>
    );
};

const FeaturesPreview = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#060b18] text-white overflow-x-hidden">
            {/* Ambient background effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[100px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/3 rounded-full blur-[150px]" />
            </div>

            {/* Navbar */}
            <nav className="relative z-20 flex items-center justify-between px-6 lg:px-12 py-5 border-b border-white/[0.06] backdrop-blur-lg bg-white/[0.02]">
                <div
                    className="flex items-center gap-3 cursor-pointer group"
                    onClick={() => navigate("/")}
                >
                    <img
                        src="/icon.png"
                        alt="Logo"
                        className="w-9 h-9 object-contain transition-transform group-hover:scale-110"
                    />
                    <div>
                        <span className="font-bold text-lg tracking-tight text-white">
                            ArogyaNet AI
                        </span>
                        <span className="hidden sm:block text-[10px] text-slate-500 uppercase tracking-[0.2em]">
                            Federated Clinical Intelligence
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => navigate("/")}
                    className="px-5 py-2 rounded-lg text-sm font-medium border border-white/10 text-slate-300 hover:text-white hover:border-white/25 hover:bg-white/[0.04] transition-all duration-300"
                >
                    ← Back to Login
                </button>
            </nav>

            {/* Hero Section */}
            <header className="relative z-10 py-20 lg:py-28 px-6 lg:px-12 text-center">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide uppercase">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        Platform Overview
                    </div>
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                        Discover{" "}
                        <span className="bg-gradient-to-r from-primary via-cyan-400 to-violet-400 bg-clip-text text-transparent">
                            ArogyaNet AI
                        </span>
                    </h1>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        A comprehensive clinical intelligence platform powering doctors,
                        admins, nurses, and patients with AI-driven insights, multi-agent
                        analysis, and seamless care management.
                    </p>
                    <div className="flex items-center justify-center gap-6 pt-4 text-sm text-slate-500">
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            10+ AI Features
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-violet-400" />
                            Multi-Role Access
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400" />
                            Federated Architecture
                        </span>
                    </div>
                </div>
            </header>

            {/* Features Grid */}
            <section className="relative z-10 px-6 lg:px-12 pb-24">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                    {features.map((feature, index) => (
                        <FeatureCard key={feature.title} feature={feature} index={index} />
                    ))}
                </div>
            </section>

            {/* CTA Footer */}
            <section className="relative z-10 border-t border-white/[0.06] bg-white/[0.02] backdrop-blur-lg">
                <div className="max-w-4xl mx-auto py-16 px-6 text-center space-y-6">
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                        Ready to transform your clinical workflow?
                    </h2>
                    <p className="text-slate-400">
                        Sign in or register your organization to get started.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={() => navigate("/")}
                            className="px-8 py-3 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all duration-300 shadow-lg shadow-primary/25"
                        >
                            Get Started
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-600 pt-4">
                        © {new Date().getFullYear()} ArogyaNet AI Systems. Secured by Life
                        Health.
                    </p>
                </div>
            </section>
        </div>
    );
};

export default FeaturesPreview;
