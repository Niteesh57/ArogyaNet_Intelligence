import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GlassInput, GlassButton } from "@/components/GlassUI";
import { agentApi, documentsApi } from "@/lib/api";
import { Loader2, Send, Paperclip, Bot, User, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
    id?: number;
    user_id?: string;
    message: string;
    response?: string;
    document_url?: string;
    created_at?: string;
}

interface AppointmentChatModalProps {
    open: boolean;
    onClose: () => void;
    appointmentId: string;
    patientName: string;
}

interface Document {
    id: number;
    title: string;
    file_url: string;
    file_type: string;
    created_at: string;
}

export const AppointmentChatModal = ({ open, onClose, appointmentId, patientName }: AppointmentChatModalProps) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [currentDocUrl, setCurrentDocUrl] = useState<string | null>(null);
    const [currentDocName, setCurrentDocName] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open && appointmentId) {
            fetchHistory();
            fetchDocuments();
        }
    }, [open, appointmentId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, analyzing]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await agentApi.getChatHistory(appointmentId);
            setMessages(res.data);

            // Context logic can remain or be smarter based on selection
        } catch (e) {
            console.error(e);
            toast({ title: "Failed to load chat history", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const fetchDocuments = async () => {
        try {
            const res = await documentsApi.getForAppointment(appointmentId);
            setDocuments(res.data);
            if (res.data.length > 0 && !currentDocUrl) {
                // Auto-select latest? Or generally leave empty until user picks?
                // Let's pick the latest for convenience
                setCurrentDocUrl(res.data[0].file_url);
                setCurrentDocName(res.data[0].title);
            }
        } catch (e) {
            console.error(e);
        }
    }

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];

        setUploading(true);
        try {
            const res = await documentsApi.upload(file, file.name, appointmentId);
            // Refresh list
            fetchDocuments();
            // Select new
            setCurrentDocUrl(res.data.file_url);
            setCurrentDocName(file.name);
            toast({ title: "Document uploaded", description: "You can now ask questions about it." });
        } catch (e) {
            console.error(e);
            toast({ title: "Upload failed", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;
        if (!currentDocUrl) {
            toast({ title: "No document selected", description: "Please select a document to analyze.", variant: "destructive" });
            return;
        }

        const question = input;
        setInput("");
        setAnalyzing(true);

        // Optimistic update
        const tempMsg: ChatMessage = { message: question, user_id: user?.id, created_at: new Date().toISOString(), response: "" };
        setMessages(prev => [...prev, tempMsg]);

        // Get the token for auth
        const token = localStorage.getItem('lh_token');

        try {
            // Use fetch for streaming support
            const response = await fetch(`${import.meta.env.VITE_API_URL}/agent/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    question: question,
                    document_url: currentDocUrl,
                    appointment_id: appointmentId
                })
            });

            if (!response.ok) {
                throw new Error(response.statusText);
            }

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedResponse = "";
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                // Split by newline to get individual SSE messages
                const lines = buffer.split('\n');
                buffer = lines.pop() || "";

                for (let line of lines) {
                    line = line.trim();
                    if (!line || !line.startsWith("data:")) continue;

                    const jsonStr = line.substring(5).trim();
                    if (jsonStr === "[DONE]") break;

                    try {
                        const event = JSON.parse(jsonStr);

                        if (event.type === 'token' && event.content) {
                            accumulatedResponse += event.content;
                        } else if (event.type === 'error') {
                            accumulatedResponse += `\n\nError: ${event.message}`;
                        }
                        // 'done' type is handled by the stream ending
                    } catch (e) {
                        // Ignore incomplete JSON
                    }
                }

                // Clean up any leaked model thought tags
                let visibleText = accumulatedResponse;
                visibleText = visibleText.replace(/<unused94>thought[\s\S]*?<\/unused94>/g, "");
                if (visibleText.includes("<unused94>thought")) {
                    visibleText = visibleText.split("<unused94>thought")[0];
                }
                visibleText = visibleText.replace(/<unused94>/g, "").trim();

                // Update the last message
                if (visibleText) {
                    setMessages(prev => prev.map((m, i) =>
                        i === prev.length - 1 ? { ...m, response: visibleText, document_url: currentDocUrl, user_id: user?.id } : m
                    ));
                }
            }

        } catch (e) {
            console.error(e);
            toast({ title: "Analysis failed", variant: "destructive" });
            setMessages(prev => prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, response: "Failed to get response. Please try again." } : m
            ));
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-7xl h-[85vh] p-0 bg-background/95 backdrop-blur-xl border-border flex flex-col md:flex-row overflow-hidden gap-0">

                {/* Sidebar: Document List */}
                <div className="w-full md:w-64 border-r border-border flex flex-col bg-muted/30">
                    <div className="p-4 border-b border-border">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            Documents
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {documents.length === 0 ? (
                            <div className="text-xs text-muted-foreground text-center p-4">
                                No documents yet. Upload one to start.
                            </div>
                        ) : (
                            documents.map(doc => (
                                <button
                                    key={doc.id}
                                    onClick={() => {
                                        setCurrentDocUrl(doc.file_url);
                                        setCurrentDocName(doc.title);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${currentDocUrl === doc.file_url ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-muted-foreground'}`}
                                >
                                    <FileText className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{doc.title}</span>
                                </button>
                            ))
                        )}
                    </div>
                    <div className="p-3 border-t border-border">
                        <input
                            type="file"
                            id="chat-upload"
                            className="hidden"
                            onChange={handleUpload}
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                        />
                        <GlassButton
                            className="w-full text-xs h-8 bg-muted hover:bg-muted/80 text-foreground border border-border"
                            onClick={() => document.getElementById('chat-upload')?.click()}
                            disabled={uploading}
                        >
                            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Paperclip className="w-3.5 h-3.5 mr-2" />}
                            Upload New
                        </GlassButton>
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background/50 backdrop-blur-sm z-10">
                        <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-primary" />
                            <div>
                                <h2 className="text-sm font-semibold">DocuMate Analysis</h2>
                                <p className="text-[10px] text-muted-foreground">Chatting with {currentDocName || "AI"}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground opacity-50 space-y-4">
                                <Bot className="w-12 h-12" />
                                <p>Select a document and ask questions.</p>
                            </div>
                        ) : (
                            messages.map((msg, i) => {
                                const isMe = msg.user_id === user?.id;
                                return (
                                    <div key={i} className="space-y-4">
                                        <div className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            {!isMe && (
                                                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                                                    <User className="w-4 h-4 text-blue-500" />
                                                </div>
                                            )}
                                            <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                {!isMe && <span className="text-[10px] text-muted-foreground ml-1 mb-0.5">User</span>}
                                                <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'}`}>
                                                    {msg.message}
                                                </div>
                                            </div>
                                            {isMe && (
                                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                                    <User className="w-4 h-4 text-primary" />
                                                </div>
                                            )}
                                        </div>
                                        {msg.response && (
                                            <div className="flex justify-start gap-3">
                                                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                                                    <Bot className="w-4 h-4 text-purple-500" />
                                                </div>
                                                <div className="flex flex-col items-start max-w-[90%]">
                                                    <div className="bg-purple-500/5 border border-purple-500/10 px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm leading-relaxed overflow-hidden">
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            components={{
                                                                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                                ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                                                ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                                                                li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                                strong: ({ node, ...props }) => <span className="font-bold text-foreground/90" {...props} />,
                                                                a: ({ node, ...props }) => <a className="text-primary underline underline-offset-2" target="_blank" rel="noopener noreferrer" {...props} />,
                                                                code: ({ node, ...props }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props} />,
                                                            }}
                                                        >
                                                            {msg.response || ""}
                                                        </ReactMarkdown>
                                                    </div>
                                                    {msg.document_url && (
                                                        <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                                                            <FileText className="w-3 h-3" />
                                                            Context from document
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                        {analyzing && (
                            <div className="flex justify-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                                    <Bot className="w-4 h-4 text-purple-500" />
                                </div>
                                <div className="bg-muted px-4 py-3 rounded-2xl rounded-tl-sm w-16 flex items-center justify-center">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-border bg-background/50 backdrop-blur-sm">
                        <div className="flex gap-2">
                            <GlassInput
                                label=""
                                value={input}
                                onChange={setInput}
                                placeholder={currentDocUrl ? `Ask about ${currentDocName}...` : "Select a document first..."}
                                className="flex-1"
                                onKeyDown={(e: any) => e.key === 'Enter' && handleSend()}
                            />
                            <GlassButton
                                onClick={handleSend}
                                disabled={!input.trim() || analyzing || !currentDocUrl}
                                className="px-3"
                            >
                                <Send className="w-4 h-4" />
                            </GlassButton>
                        </div>
                    </div>
                </div>

                {/* Document Preview Panel (Image & PDF) */}
                {currentDocUrl && /\.(jpg|jpeg|png|webp|gif|pdf)$/i.test(currentDocUrl) && (
                    <div className="hidden lg:flex w-1/3 border-l border-border bg-background/50 backdrop-blur-xl flex-col h-full">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-semibold text-sm">Preview</h3>
                        </div>
                        <div className="flex-1 p-4 flex items-center justify-center bg-black/5 overflow-hidden h-full">
                            {/\.pdf$/i.test(currentDocUrl) ? (
                                <iframe
                                    src={currentDocUrl}
                                    className="w-full h-full rounded-lg shadow-sm border border-border/50 bg-white"
                                    title="PDF Preview"
                                />
                            ) : (
                                <img
                                    src={currentDocUrl}
                                    alt="Document Preview"
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-sm border border-border/50"
                                />
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
