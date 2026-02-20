import { useState, useRef, useEffect } from "react";
import { GlassCard, GlassButton } from "@/components/GlassUI";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, Loader2, Sparkles, Brain, GraduationCap, Pill, FlaskConical } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from 'react-markdown';

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    metrics?: {
        medications?: string[];
        lab_tests?: string[];
    };
    isStreaming?: boolean;
}

const ExpertLearn = () => {
    const { user } = useAuth();
    const [query, setQuery] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            role: "assistant",
            content: `Hello Dr. ${user?.full_name?.split(" ")[0] || "Doctor"}. I am your Expert Learning Assistant.\n\nI can retrieve clinical insights from past cases in our hospital (and globally) to help with your current diagnosis.\n\n**Ask me about:**\n* Identifying rare symptoms\n* Treatment protocols for specific conditions\n* Past experiences with similar cases`
        }
    ]);
    const [isStreaming, setIsStreaming] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [useStrictFilter, setUseStrictFilter] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>("");

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isStreaming]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim() || isStreaming) return;

        const currentQuery = query;
        setQuery("");
        setIsStreaming(true);

        // Add User Message
        const userMsgId = Date.now().toString();
        setMessages(prev => [...prev, { id: userMsgId, role: "user", content: currentQuery }]);

        // Add Placeholder Assistant Message
        const botMsgId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: botMsgId, role: "assistant", content: "", isStreaming: true }]);

        try {
            // Only send hospital_id if Strict Filter is ENABLED
            const payload: any = {
                query: currentQuery,
                category: selectedCategory || null
            };

            if (useStrictFilter) {
                payload.hospital_id = user?.hospital_id;
            }

            const response = await fetch("/api/v1/agent/expert-chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("lh_token")}`
                },
                body: JSON.stringify(payload)
            });

            if (response.status === 403) {
                throw new Error("Access Denied. Please ensure you have the correct permissions.");
            }
            if (!response.ok) throw new Error("Failed to fetch response");

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error("No reader available");

            let accumulatedContent = "";
            let accumulatedMetrics = { medications: [], lab_tests: [] };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const dataStr = line.replace("data: ", "").trim();
                        if (dataStr === "[DONE]") break;

                        try {
                            const parsed = JSON.parse(dataStr);

                            if (parsed.type === "token") {
                                accumulatedContent += parsed.content;
                                setMessages(prev => prev.map(msg =>
                                    msg.id === botMsgId
                                        ? { ...msg, content: accumulatedContent }
                                        : msg
                                ));
                            } else if (parsed.type === "metadata") {
                                accumulatedMetrics = {
                                    medications: parsed.medications || [],
                                    lab_tests: parsed.lab_tests || []
                                };
                                setMessages(prev => prev.map(msg =>
                                    msg.id === botMsgId
                                        ? { ...msg, metrics: accumulatedMetrics }
                                        : msg
                                ));
                            } else if (parsed.type === "done") {
                                // Explicit done signal if backend sends it
                            }
                        } catch (err) {
                            console.error("Error parsing chunk", err);
                        }
                    }
                }
            }

        } catch (error: any) {
            console.error(error);
            setMessages(prev => prev.map(msg =>
                msg.id === botMsgId
                    ? { ...msg, content: `**Error:** ${error.message || "Failed to retrieve expert insights."}` }
                    : msg
            ));
        } finally {
            setIsStreaming(false);
            setMessages(prev => prev.map(msg =>
                msg.id === botMsgId
                    ? { ...msg, isStreaming: false }
                    : msg
            ));
        }
    };

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <GraduationCap className="w-8 h-8 text-primary" />
                        Expert Learn
                    </h1>
                    <p className="text-muted-foreground">Tap into the collective intelligence of our medical network.</p>
                </div>
                <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                    <Sparkles className="w-3 h-3" />
                    Powered by MedVQA & Pinecone
                </div>
            </div>

            {/* Chat Area */}
            <GlassCard className="flex-1 flex flex-col overflow-hidden border-primary/20 shadow-lg shadow-primary/5">
                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6 max-w-4xl mx-auto">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                {msg.role === "assistant" && (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-md">
                                        <Brain className="w-5 h-5 text-white" />
                                    </div>
                                )}

                                <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                    <div
                                        className={`rounded-2xl px-5 py-3.5 shadow-sm ${msg.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                                            : "bg-secondary/50 backdrop-blur-sm border border-border/50 rounded-tl-sm"
                                            }`}
                                    >
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            {/* <div className="whitespace-pre-wrap">{msg.content}</div> */}
                                        </div>
                                    </div>

                                    {/* Metrics / Metadata Pills */}
                                    {msg.role === "assistant" && msg.metrics && (msg.metrics.medications?.length > 0 || msg.metrics.lab_tests?.length > 0) && (
                                        <div className="flex flex-wrap gap-2 mt-1 animate-in fade-in slide-in-from-top-2 duration-500">
                                            {msg.metrics.medications?.map((med, i) => (
                                                <span key={`med-${i}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                                    <Pill className="w-3 h-3" />
                                                    {med}
                                                </span>
                                            ))}
                                            {msg.metrics.lab_tests?.map((lab, i) => (
                                                <span key={`lab-${i}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                    <FlaskConical className="w-3 h-3" />
                                                    {lab}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Timestamp/Status */}
                                    <span className="text-[10px] text-muted-foreground opacity-70 px-1">
                                        {msg.role === "assistant" && msg.isStreaming ? (
                                            <span className="flex items-center gap-1 text-primary">
                                                <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                                            </span>
                                        ) : (
                                            msg.role === "user" ? "You" : "Expert AI"
                                        )}
                                    </span>
                                </div>

                                {msg.role === "user" && (
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                        <User className="w-5 h-5 text-primary" />
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 bg-secondary/30 border-t border-border/50">
                    <div className="max-w-4xl mx-auto space-y-3">
                        {/* Filters */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setUseStrictFilter(!useStrictFilter)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${useStrictFilter
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                                    }`}
                            >
                                {useStrictFilter ? <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" /> : null}
                                Strict Search (My Hospital)
                            </button>

                            {useStrictFilter && (
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="h-7 px-2 rounded-md border border-input bg-background/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="">All Categories</option>
                                    <option value="General">General Practice</option>
                                    <option value="Cardiology">Cardiology</option>
                                    <option value="Dermatology">Dermatology</option>
                                    <option value="Pediatrics">Pediatrics</option>
                                    <option value="Neurology">Neurology</option>
                                    <option value="Orthopedics">Orthopedics</option>
                                    <option value="Internal Medicine">Internal Medicine</option>
                                </select>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Ask about a case, symptom, or treatment protocol..."
                                className="flex-1 bg-background/50 border-input pl-4 pr-12 py-6 text-base shadow-sm focus-visible:ring-primary/50"
                                disabled={isStreaming}
                                autoFocus
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <GlassButton
                                    type="submit"
                                    size="sm"
                                    disabled={!query.trim() || isStreaming}
                                    className={`h-9 w-9 p-0 rounded-full transition-all ${query.trim() ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" : "bg-transparent text-muted-foreground hover:bg-muted"}`}
                                >
                                    {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </GlassButton>
                            </div>
                        </form>
                        <p className="text-center text-[10px] text-muted-foreground/60">
                            AI can make mistakes. Please verify important medical information.
                        </p>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};

export default ExpertLearn;
