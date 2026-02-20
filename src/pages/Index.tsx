import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authApi, hospitalsApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
  </svg>
);

const BuildingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" /><path d="M16 6h.01" />
    <path d="M12 6h.01" /><path d="M12 10h.01" />
    <path d="M12 14h.01" /><path d="M16 10h.01" />
    <path d="M16 14h.01" /><path d="M8 10h.01" />
    <path d="M8 14h.01" />
  </svg>
);

const AuthInput = ({
  label, type = "text", placeholder, delay = 0, hint, value, onChange, error,
}: {
  label: string; type?: string; placeholder: string; delay?: number;
  hint?: string; value?: string; onChange?: (v: string) => void; error?: string;
}) => (
  <div className="space-y-2 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
    <label className="block text-sm font-medium text-foreground">{label}</label>
    <input
      type={type} placeholder={placeholder} value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      className={`w-full bg-background border rounded-md px-3 py-2 text-sm text-foreground text-left placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${error ? 'border-destructive focus:ring-destructive' : 'border-input'}`}
    />
    {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && <p className="text-xs text-destructive animate-fade-up">{error}</p>}
  </div>
);

const AuthTextArea = ({
  label, placeholder, delay = 0, hint, value, onChange, error, rows = 3,
}: {
  label: string; placeholder: string; delay?: number;
  hint?: string; value?: string; onChange?: (v: string) => void; error?: string; rows?: number;
}) => (
  <div className="space-y-2 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
    <label className="block text-sm font-medium text-foreground">{label}</label>
    <textarea
      placeholder={placeholder} value={value} rows={rows}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      className={`w-full bg-background border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none text-left ${error ? 'border-destructive focus:ring-destructive' : 'border-input'}`}
    />
    {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    {error && <p className="text-xs text-destructive animate-fade-up">{error}</p>}
  </div>
);



const SignInForm = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: { email?: string; password?: string } = {};
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Invalid email format";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      toast({ title: "Login Failed", description: err?.response?.data?.detail || "Invalid credentials", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/login/google`;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Enter your credentials to access your account</p>
      </div>
      <div className="space-y-4">
        <AuthInput label="Email Address" type="email" placeholder="name@example.com" value={email} onChange={(v) => { setEmail(v); setErrors(prev => ({ ...prev, email: undefined })); }} error={errors.email} />
        <AuthInput label="Password" type="password" placeholder="••••••••" value={password} onChange={(v) => { setPassword(v); setErrors(prev => ({ ...prev, password: undefined })); }} error={errors.password} />
        <div className="flex justify-end">
          <button className="text-sm font-medium text-primary hover:underline">Forgot password?</button>
        </div>
        <button onClick={handleSubmit} disabled={loading} className="w-full py-2 rounded-md font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border"></span></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or continue with</span></div>
      </div>
      <button onClick={() => handleGoogleLogin()} className="w-full py-2 rounded-md font-medium text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground flex items-center justify-center gap-2 transition-colors">
        <GoogleIcon /> Google
      </button>
    </div>
  );
};

const SignUpForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<{ full_name?: string; email?: string; password?: string; confirmPassword?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: { full_name?: string; email?: string; password?: string; confirmPassword?: string } = {};
    if (!form.full_name) e.full_name = "Full name is required";
    if (!form.email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email format";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.register({ user_in: { email: form.email, password: form.password, full_name: form.full_name } });
      toast({ title: "Account created! Please sign in." });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Registration failed", description: err?.response?.data?.detail || "Try again", variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create an account</h1>
        <p className="text-sm text-muted-foreground">Enter your details to get started</p>
      </div>
      <AuthInput label="Full Name" placeholder="John Doe" value={form.full_name} onChange={(v) => { setForm((p) => ({ ...p, full_name: v })); setErrors(prev => ({ ...prev, full_name: undefined })); }} error={errors.full_name} />
      <AuthInput label="Email Address" type="email" placeholder="name@example.com" value={form.email} onChange={(v) => { setForm((p) => ({ ...p, email: v })); setErrors(prev => ({ ...prev, email: undefined })); }} error={errors.email} />
      <AuthInput label="Password" type="password" placeholder="••••••••" value={form.password} onChange={(v) => { setForm((p) => ({ ...p, password: v })); setErrors(prev => ({ ...prev, password: undefined })); }} error={errors.password} />
      <AuthInput label="Confirm Password" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={(v) => { setForm((p) => ({ ...p, confirmPassword: v })); setErrors(prev => ({ ...prev, confirmPassword: undefined })); }} error={errors.confirmPassword} />
      <button onClick={handleSubmit} disabled={loading} className="w-full py-2 rounded-md font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
        {loading ? "Creating..." : "Create Account"}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        By creating an account, you agree to our <span className="underline hover:text-primary cursor-pointer">Terms of Service</span> and <span className="underline hover:text-primary cursor-pointer">Privacy Policy</span>.
      </p>
    </div>
  );
};

interface HospitalFormErrors {
  name?: string; hospitalId?: string; specialization?: string;
  location?: string; description?: string; email?: string; password?: string;
}

const HospitalRegisterForm = () => {
  const [form, setForm] = useState({ name: "", hospitalId: "", specialization: "", location: "", description: "", email: "", password: "" });
  const [errors, setErrors] = useState<HospitalFormErrors>({});
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateField = useCallback((field: string) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }, []);

  const validate = (): boolean => {
    const e: HospitalFormErrors = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.hospitalId.trim()) e.hospitalId = "Required";
    if (!form.specialization) e.specialization = "Required";
    if (!form.location.trim()) e.location = "Required";
    if (!form.description.trim()) e.description = "Required";
    if (!form.email.trim()) e.email = "Required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email format";
    if (!form.password) e.password = "Required";
    else if (form.password.length < 8) e.password = "Min 8 chars";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authApi.register({
        user_in: { email: form.email, password: form.password, full_name: form.name, role: "hospital_admin" },
        hospital_in: { name: form.name, license_number: form.hospitalId, specialization: form.specialization, address: form.location, description: form.description, admin_email: form.email },
      });
      setRegistered(true);
    } catch (err: any) {
      toast({ title: "Registration failed", description: err?.response?.data?.detail || "Try again", variant: "destructive" });
    } finally { setLoading(false); }
  };

  if (registered) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center text-primary">
          <BuildingIcon />
        </div>
        <div>
          <h3 className="text-2xl font-semibold text-foreground mb-2">Registration Successful</h3>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{form.name}</strong> has been registered.
          </p>
        </div>
        <button onClick={() => window.location.reload()} className="w-full py-2 rounded-md font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Register Organization</h1>
        <p className="text-sm text-muted-foreground">Join as a healthcare provider</p>
      </div>
      <AuthInput label="Hospital Name" placeholder="City General" value={form.name} onChange={updateField("name")} error={errors.name} />
      <AuthInput label="License ID" placeholder="HOS-XXXX" value={form.hospitalId} onChange={updateField("hospitalId")} error={errors.hospitalId} />

      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">Specialization</label>
        <select value={form.specialization} onChange={(e) => { setForm((p) => ({ ...p, specialization: e.target.value })); setErrors((p) => ({ ...p, specialization: undefined })); }}
          className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
          <option value="">Select...</option>
          <option value="general">General Medicine</option>
          <option value="cardiology">Cardiology</option>
          <option value="orthopedics">Orthopedics</option>
          <option value="pediatrics">Pediatrics</option>
          <option value="multispecialty">Multi-Specialty</option>
        </select>
        {errors.specialization && <p className="text-xs text-destructive">{errors.specialization}</p>}
      </div>

      <AuthInput label="Address" placeholder="Full Address" value={form.location} onChange={updateField("location")} error={errors.location} />
      <AuthTextArea label="Description" placeholder="Brief description of the hospital..." value={form.description} onChange={updateField("description")} error={errors.description} />
      <AuthInput label="Admin Email" type="email" placeholder="admin@hospital.org" value={form.email} onChange={updateField("email")} error={errors.email} />
      <AuthInput label="Password" type="password" placeholder="••••••••" value={form.password} onChange={updateField("password")} error={errors.password} />

      <button onClick={handleSubmit} disabled={loading} className="w-full py-2 rounded-md font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
        {loading ? "Registering..." : "Register"}
      </button>
    </div>
  );
};

const Slideshow = () => {
  const images = ["/nav/1.jpeg", "/nav/2.png", "/nav/3.png"];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black/90">
      {images.map((src, index) => (
        <div
          key={src}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === current ? "opacity-60" : "opacity-0"
            }`}
        >
          <img src={src} alt="Slide" className="w-full h-full object-cover" />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-12 text-white">
        <h2 className="text-4xl font-bold mb-4 font-serif">Federated Clinical Intelligence</h2>
        <p className="text-lg opacity-90 max-w-xl">
          Empowering healthcare professionals with decentralized, privacy-preserving AI for smarter diagnostics and patient care.
        </p>
        <div className="flex gap-2 mt-6">
          {images.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all duration-300 ${idx === current ? "w-8 bg-white" : "w-2 bg-white/40"
                }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const Index = () => {
  const [activeTab, setActiveTab] = useState<"signin" | "signup" | "hospital">("signin");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Auth Section (Left) */}
      <div className="flex flex-col justify-center p-6 lg:p-12 bg-background relative">
        <div className="absolute top-8 left-8 flex items-center gap-2">
          <img src="/icon.png" alt="Logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-lg tracking-tight">ArogyaNet AI</span>
        </div>

        <div className="w-full max-w-sm mx-auto space-y-8 animate-fade-in">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {activeTab === "signin" ? "Welcome back" : activeTab === "signup" ? "Create an account" : "Partner with us"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {activeTab === "signin" ? "Enter your credentials to access the secure portal." : "Join the network of next-gen healthcare providers."}
            </p>
          </div>

          <div className="flex p-1 bg-muted/50 rounded-lg">
            {(["signin", "signup", "hospital"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {tab === "signin" ? "Sign In" : tab === "signup" ? "Sign Up" : "Hospital"}
              </button>
            ))}
          </div>

          <div className="pt-2">
            {activeTab === "signin" ? <SignInForm /> : activeTab === "signup" ? <SignUpForm onSuccess={() => setActiveTab("signin")} /> : <HospitalRegisterForm />}
          </div>
        </div>

        <div className="absolute bottom-6 left-0 right-0 text-center text-[10px] text-muted-foreground">
          &copy; {new Date().getFullYear()} ArogyaNet AI Systems. Secured by Life Health.
        </div>
      </div>

      {/* Slideshow Section (Right) */}
      <div className="hidden lg:block h-screen sticky top-0">
        <Slideshow />
      </div>
    </div>
  );
};

export default Index;
