import { useState } from "react";
import bgImage from "@/assets/bg-gradient.png";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
  </svg>
);

const AuthInput = ({
  label,
  type = "text",
  placeholder,
  delay = 0,
}: {
  label: string;
  type?: string;
  placeholder: string;
  delay?: number;
}) => (
  <div
    className="opacity-0 animate-fade-up space-y-2"
    style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
  >
    <label className="block text-sm font-medium tracking-wide text-foreground/70">
      {label}
    </label>
    <div className="relative group">
      <input
        type={type}
        placeholder={placeholder}
        className="w-full bg-background/40 border border-border/50 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-300 focus:border-primary/60 focus:bg-background/60 focus:shadow-[0_0_20px_hsla(170,66%,51%,0.1)]"
      />
      <div className="absolute bottom-0 left-0 h-[2px] w-full scale-x-0 bg-gradient-to-r from-primary to-secondary transition-transform duration-300 origin-left group-focus-within:scale-x-100 rounded-full" />
    </div>
  </div>
);

const SignInForm = () => (
  <div className="space-y-5">
    <AuthInput label="Email Address" type="email" placeholder="you@healthcare.org" delay={100} />
    <AuthInput label="Password" type="password" placeholder="••••••••••" delay={200} />
    <div className="flex justify-end opacity-0 animate-fade-up" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
      <button className="text-xs text-muted-foreground hover:text-primary transition-colors duration-200">
        Forgot Password?
      </button>
    </div>
    <div className="opacity-0 animate-fade-up" style={{ animationDelay: "400ms", animationFillMode: "forwards" }}>
      <button className="w-full py-3.5 rounded-lg font-semibold text-sm tracking-wide bg-gradient-to-r from-secondary to-primary text-primary-foreground transition-all duration-300 hover:shadow-[0_0_30px_hsla(170,66%,51%,0.3)] hover:-translate-y-0.5 active:translate-y-0">
        Access Secure Portal
      </button>
    </div>
    <div className="flex items-center gap-4 opacity-0 animate-fade-up" style={{ animationDelay: "500ms", animationFillMode: "forwards" }}>
      <div className="flex-1 h-px bg-border/40" />
      <span className="text-xs text-muted-foreground tracking-widest uppercase">or</span>
      <div className="flex-1 h-px bg-border/40" />
    </div>
    <div className="opacity-0 animate-fade-up" style={{ animationDelay: "600ms", animationFillMode: "forwards" }}>
      <button className="w-full py-3 rounded-lg font-medium text-sm bg-white/95 text-primary-foreground flex items-center justify-center gap-3 transition-all duration-300 hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:-translate-y-0.5">
        <GoogleIcon />
        Continue with Google
      </button>
    </div>
  </div>
);

const SignUpForm = () => (
  <div className="space-y-5">
    <AuthInput label="Full Name" placeholder="Dr. Jane Smith" delay={100} />
    <AuthInput label="Email Address" type="email" placeholder="you@healthcare.org" delay={200} />
    <AuthInput label="Password" type="password" placeholder="••••••••••" delay={300} />
    <AuthInput label="Confirm Password" type="password" placeholder="••••••••••" delay={400} />
    <div className="opacity-0 animate-fade-up" style={{ animationDelay: "500ms", animationFillMode: "forwards" }}>
      <button className="w-full py-3.5 rounded-lg font-semibold text-sm tracking-wide bg-gradient-to-r from-secondary to-primary text-primary-foreground transition-all duration-300 hover:shadow-[0_0_30px_hsla(170,66%,51%,0.3)] hover:-translate-y-0.5 active:translate-y-0">
        Create Secure Account
      </button>
    </div>
    <p className="text-center text-xs text-muted-foreground opacity-0 animate-fade-up" style={{ animationDelay: "600ms", animationFillMode: "forwards" }}>
      By creating an account, you agree to our{" "}
      <span className="text-primary/80 hover:text-primary cursor-pointer transition-colors">Privacy Policy</span>.
    </p>
  </div>
);

const HospitalRegisterForm = () => (
  <div className="space-y-4">
    <AuthInput label="Hospital / Organization Name" placeholder="City General Hospital" delay={100} />
    <AuthInput label="Hospital ID / License No." placeholder="HOS-2026-XXXX" delay={150} />
    <div
      className="opacity-0 animate-fade-up space-y-2"
      style={{ animationDelay: "200ms", animationFillMode: "forwards" }}
    >
      <label className="block text-sm font-medium tracking-wide text-foreground/70">
        Specialization
      </label>
      <div className="relative group">
        <select className="w-full bg-background/40 border border-border/50 rounded-lg px-4 py-3 text-sm text-foreground outline-none transition-all duration-300 focus:border-primary/60 focus:bg-background/60 focus:shadow-[0_0_20px_hsla(170,66%,51%,0.1)] appearance-none cursor-pointer">
          <option value="" className="bg-background text-foreground">Select specialization</option>
          <option value="general" className="bg-background text-foreground">General Medicine</option>
          <option value="cardiology" className="bg-background text-foreground">Cardiology</option>
          <option value="orthopedics" className="bg-background text-foreground">Orthopedics</option>
          <option value="pediatrics" className="bg-background text-foreground">Pediatrics</option>
          <option value="neurology" className="bg-background text-foreground">Neurology</option>
          <option value="oncology" className="bg-background text-foreground">Oncology</option>
          <option value="multispecialty" className="bg-background text-foreground">Multi-Specialty</option>
        </select>
        <div className="absolute bottom-0 left-0 h-[2px] w-full scale-x-0 bg-gradient-to-r from-primary to-secondary transition-transform duration-300 origin-left group-focus-within:scale-x-100 rounded-full" />
      </div>
    </div>
    <AuthInput label="Location / Address" placeholder="123 Medical Ave, City, State" delay={250} />
    <div
      className="opacity-0 animate-fade-up space-y-2"
      style={{ animationDelay: "300ms", animationFillMode: "forwards" }}
    >
      <label className="block text-sm font-medium tracking-wide text-foreground/70">
        Description
      </label>
      <div className="relative group">
        <textarea
          rows={3}
          placeholder="Brief description of your hospital or organization..."
          className="w-full bg-background/40 border border-border/50 rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-300 focus:border-primary/60 focus:bg-background/60 focus:shadow-[0_0_20px_hsla(170,66%,51%,0.1)] resize-none"
        />
        <div className="absolute bottom-0 left-0 h-[2px] w-full scale-x-0 bg-gradient-to-r from-primary to-secondary transition-transform duration-300 origin-left group-focus-within:scale-x-100 rounded-full" />
      </div>
    </div>
    <AuthInput label="Admin Email" type="email" placeholder="admin@hospital.org" delay={350} />
    <AuthInput label="Password" type="password" placeholder="••••••••••" delay={400} />
    <div className="opacity-0 animate-fade-up" style={{ animationDelay: "450ms", animationFillMode: "forwards" }}>
      <button className="w-full py-3.5 rounded-lg font-semibold text-sm tracking-wide bg-gradient-to-r from-secondary to-primary text-primary-foreground transition-all duration-300 hover:shadow-[0_0_30px_hsla(170,66%,51%,0.3)] hover:-translate-y-0.5 active:translate-y-0">
        Register Organization
      </button>
    </div>
    <p className="text-center text-xs text-muted-foreground opacity-0 animate-fade-up" style={{ animationDelay: "500ms", animationFillMode: "forwards" }}>
      Once registered, you can add doctors, nurses &amp; patients under your organization.
    </p>
  </div>
);

const Index = () => {
  const [activeTab, setActiveTab] = useState<"signin" | "signup" | "hospital">("signin");

  return (
    <div className="relative min-h-screen w-full overflow-hidden grain-overlay">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImage})` }}
      />

      {/* Radial glow overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,hsla(170,66%,51%,0.08)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,hsla(189,74%,41%,0.06)_0%,transparent_50%)]" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row items-center justify-center px-6 py-12 lg:px-16 gap-8 lg:gap-0">

        {/* Left — Branding (40%) */}
        <div className="w-full lg:w-[40%] flex flex-col justify-center lg:pr-12">
          <div className="space-y-6 max-w-md mx-auto lg:mx-0">
            <div>
              <h1
                className="font-serif text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground leading-[0.9] opacity-0 animate-fade-up"
                style={{ animationDelay: "200ms", animationFillMode: "forwards" }}
              >
                LIFE
                <br />
                HEALTH
              </h1>
              <p
                className="mt-3 font-serif text-2xl md:text-3xl font-light tracking-[0.3em] text-primary/70 opacity-0 animate-fade-up"
                style={{ animationDelay: "400ms", animationFillMode: "forwards" }}
              >
                CRM
              </p>
            </div>
            <div
              className="h-px w-16 bg-gradient-to-r from-primary/60 to-transparent opacity-0 animate-fade-up"
              style={{ animationDelay: "600ms", animationFillMode: "forwards" }}
            />
            <p
              className="text-lg md:text-xl font-light tracking-wide text-foreground/80 leading-relaxed opacity-0 animate-fade-up"
              style={{ animationDelay: "700ms", animationFillMode: "forwards" }}
            >
              Secure Systems for Modern Care
            </p>
            <p
              className="text-sm text-muted-foreground leading-relaxed max-w-xs opacity-0 animate-fade-up"
              style={{ animationDelay: "900ms", animationFillMode: "forwards" }}
            >
              Trusted by healthcare professionals for intelligent patient management.
            </p>
          </div>
        </div>

        {/* Right — Auth Panel (60%) */}
        <div className="w-full lg:w-[60%] flex justify-center lg:justify-end">
          <div
            className="w-full max-w-md glass-panel rounded-2xl p-8 md:p-10 opacity-0 animate-slide-in-right"
            style={{ animationDelay: "500ms", animationFillMode: "forwards" }}
          >
            {/* Tab Toggle */}
            <div className="flex mb-8 border-b border-border/30">
              {(["signin", "signup", "hospital"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="relative flex-1 pb-3 text-sm font-medium tracking-wide transition-colors duration-200"
                  style={{
                    color: activeTab === tab
                      ? "hsl(var(--foreground))"
                      : "hsl(var(--muted-foreground))",
                  }}
                >
                  {tab === "signin" ? "Sign In" : tab === "signup" ? "Create Account" : "Hospital"}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-primary to-secondary animate-underline-sweep rounded-full shadow-[0_0_8px_hsla(170,66%,51%,0.4)]" />
                  )}
                </button>
              ))}
            </div>

            {/* Form Content */}
            <div
              key={activeTab}
              className="animate-fade-up"
              style={{ animationDuration: "300ms" }}
            >
              {activeTab === "signin" ? <SignInForm /> : activeTab === "signup" ? <SignUpForm /> : <HospitalRegisterForm />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
