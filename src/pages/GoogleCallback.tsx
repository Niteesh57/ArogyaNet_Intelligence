import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

const GoogleCallback = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            // The token can be in the hash (implicit flow) or we might need to handle a code
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get("access_token");

            if (accessToken) {
                try {
                    const res = await authApi.googleLogin(accessToken);
                    localStorage.setItem("lh_token", res.data.access_token);
                    toast({ title: "Login Successful", description: "Welcome back!" });
                    navigate("/dashboard");
                } catch (err: any) {
                    toast({
                        title: "Google Login Failed",
                        description: err?.response?.data?.detail || "Try again",
                        variant: "destructive",
                    });
                    navigate("/");
                }
            } else {
                // Check for error in query params
                const queryParams = new URLSearchParams(window.location.search);
                const error = queryParams.get("error");
                if (error) {
                    toast({ title: "Login Failed", description: error, variant: "destructive" });
                }
                navigate("/");
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground font-medium animate-pulse">Authenticating with Google...</p>
            </div>
        </div>
    );
};

export default GoogleCallback;
