import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const OAuthSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    // We can access 'fetchUser' if exposed, or reload. 
    // Ideally AuthContext exposes a way to reload user state without full reload, 
    // but reloading is safer to ensure all state is clean.

    useEffect(() => {
        const token = searchParams.get("token");
        const error = searchParams.get("error");

        if (token) {
            localStorage.setItem("lh_token", token);
            toast({ title: "Login Successful", description: "Welcome back!" });
            // Force a reload to ensure AuthContext picks up the new token immediately 
            // and initializes all matching state.
            // Alternatively, we could use window.location.href = "/dashboard"
            window.location.href = "/dashboard";
        } else if (error) {
            toast({ title: "Login Failed", description: error, variant: "destructive" });
            navigate("/");
        } else {
            navigate("/");
        }
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground font-medium animate-pulse">Finalizing login...</p>
            </div>
        </div>
    );
};

export default OAuthSuccess;
