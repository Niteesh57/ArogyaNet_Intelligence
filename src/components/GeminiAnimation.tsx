import { useEffect, useState } from "react";

export const GeminiAnimation = ({ size = 40 }: { size?: number }) => {
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setRotation((prev) => (prev + 5) % 360);
        }, 30);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center justify-center">
            <svg
                width={size}
                height={size}
                viewBox="0 0 200 200"
                style={{ transform: `rotate(${rotation}deg)` }}
                className="transition-transform duration-75"
            >
                {/* Gemini sparkle icon */}
                <defs>
                    <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4285F4" />
                        <stop offset="50%" stopColor="#EA4335" />
                        <stop offset="100%" stopColor="#FBBC04" />
                    </linearGradient>
                </defs>

                {/* Main star shape */}
                <path
                    d="M100,20 L110,80 L170,90 L110,100 L100,160 L90,100 L30,90 L90,80 Z"
                    fill="url(#gemini-gradient)"
                    opacity="0.9"
                />

                {/* Secondary sparkles */}
                <circle cx="50" cy="50" r="8" fill="#4285F4" opacity="0.6">
                    <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite" />
                </circle>
                <circle cx="150" cy="50" r="6" fill="#EA4335" opacity="0.6">
                    <animate attributeName="opacity" values="0.6;1;0.6" dur="1.2s" repeatCount="indefinite" />
                </circle>
                <circle cx="50" cy="150" r="6" fill="#FBBC04" opacity="0.6">
                    <animate attributeName="opacity" values="0.6;1;0.6" dur="1.4s" repeatCount="indefinite" />
                </circle>
                <circle cx="150" cy="150" r="8" fill="#34A853" opacity="0.6">
                    <animate attributeName="opacity" values="0.6;1;0.6" dur="1.6s" repeatCount="indefinite" />
                </circle>
            </svg>
        </div>
    );
};

export const GeminiLoadingModal = ({ message = "AI is analyzing..." }: { message?: string }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="bg-card/90 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-border/50 flex flex-col items-center gap-4 min-w-[300px]">
                <GeminiAnimation size={60} />
                <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">{message}</p>
                    <p className="text-sm text-muted-foreground mt-2">Powered by Google Gemini</p>
                </div>
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
            </div>
        </div>
    );
};
