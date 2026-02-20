import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { GlassInput, GlassButton } from "@/components/GlassUI";
import { chatApi } from "@/lib/api";
import { Loader2, Send, User, Bot, Search, AlertCircle, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ChatMessage {
    id?: number;
    sender_id: string;
    receiver_id: string;
    message: string;
    is_read?: boolean;
    created_at?: string;
}

interface ChatContact {
    id: string;
    full_name: string;
    role: string;
    image?: string;
    hospital_name?: string;
    specialization?: string;
    last_message?: ChatMessage;
}

interface UserChatModalProps {
    open: boolean;
    onClose: () => void;
}

export const UserChatModal = ({ open, onClose }: UserChatModalProps) => {
    const { user } = useAuth();

    // Contacts
    const [contacts, setContacts] = useState<ChatContact[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Active Chat
    const [activeContact, setActiveContact] = useState<ChatContact | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [input, setInput] = useState("");

    // WebSocket
    const ws = useRef<WebSocket | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch contacts
    useEffect(() => {
        if (open) {
            fetchContacts();
        } else {
            // cleanup
            if (ws.current) {
                ws.current.close();
            }
            setActiveContact(null);
            setMessages([]);
        }
    }, [open]);

    // WebSocket init
    useEffect(() => {
        if (open) {
            connectWebSocket();
        }
        return () => {
            if (ws.current) ws.current.close();
        };
    }, [open]);

    const connectWebSocket = () => {
        const token = localStorage.getItem("lh_token");
        if (!token) return;

        // Strip http/https and replace with ws/wss
        const wsUrl = import.meta.env.VITE_API_URL.replace(/^http/, 'ws') + `/chat/ws?token=${token}`;

        ws.current = new WebSocket(wsUrl);

        ws.current.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                // If message belongs to active chat, append it
                setMessages(prev => {
                    // Check if it already exists (if we sent it, we might receive it back)
                    const exists = prev.find(m => m.id === message.id);
                    if (exists) return prev;

                    return [...prev, message];
                });

                // Also update contacts list last message
                setContacts(prev => prev.map(c => {
                    if (c.id === message.sender_id || c.id === message.receiver_id) {
                        return { ...c, last_message: message };
                    }
                    return c;
                }));

            } catch (e) {
                console.error("Invalid WS message", event.data);
            }
        };

        ws.current.onclose = () => {
            console.log("Chat WS disconnected. Reconnecting...");
            setTimeout(connectWebSocket, 3000); // Reconnect loop
        };
    };

    const fetchContacts = async () => {
        setLoadingContacts(true);
        try {
            const res = await chatApi.getContacts();
            setContacts(res.data);
        } catch (e) {
            console.error(e);
            toast({ title: "Failed to load messages", variant: "destructive" });
        } finally {
            setLoadingContacts(false);
        }
    };

    const loadChatHistory = async (contact: ChatContact) => {
        setActiveContact(contact);
        setLoadingMessages(true);
        try {
            const res = await chatApi.getHistory(contact.id);
            setMessages(res.data);
        } catch (e) {
            console.error(e);
            toast({ title: "Failed to load chat history", variant: "destructive" });
        } finally {
            setLoadingMessages(false);
            scrollToBottom();
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
        }, 100);
    };

    // Keep scrolled
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!input.trim() || !activeContact || !ws.current) return;

        const payload = {
            receiver_id: activeContact.id,
            message: input
        };

        if (ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(payload));
            setInput("");
        } else {
            toast({ title: "Connection lost. Reconnecting...", variant: "destructive" });
        }
    };

    const filteredContacts = contacts.filter(c => c.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-5xl h-[80vh] p-0 bg-background/95 backdrop-blur-xl border-border flex flex-col md:flex-row overflow-hidden gap-0">
                {/* Sidebar: Contacts */}
                <div className="w-full md:w-80 border-r border-border flex flex-col bg-muted/10 h-full">
                    <div className="p-4 border-b border-border bg-background/50 backdrop-blur-sm z-10 flex justify-between items-center">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                            Messages
                        </h3>
                        <button onClick={onClose} className="md:hidden p-1 bg-muted/50 rounded-lg"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="p-3 border-b border-border">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1 p-2">
                        {loadingContacts ? (
                            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                        ) : filteredContacts.length === 0 ? (
                            <div className="text-center p-6 text-muted-foreground text-sm flex flex-col items-center">
                                <AlertCircle className="w-8 h-8 opacity-20 mb-2" />
                                <p>No conversations found.</p>
                                <p className="text-xs mt-1">Book an appointment to chat with your doctor.</p>
                            </div>
                        ) : (
                            filteredContacts.map(contact => (
                                <button
                                    key={contact.id}
                                    onClick={() => loadChatHistory(contact)}
                                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${activeContact?.id === contact.id ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'hover:bg-muted/50'}`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden border border-border">
                                        {contact.image ? (
                                            <img src={contact.image} alt={contact.full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-5 h-5 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <p className="font-medium text-sm truncate text-foreground">{contact.full_name}</p>
                                            {contact.last_message && (
                                                <span className="text-[10px] text-muted-foreground shrink-0 pl-2">
                                                    {new Date(contact.last_message.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                        {contact.specialization && (
                                            <p className="text-[10px] text-primary/70 truncate">{contact.specialization}</p>
                                        )}
                                        {contact.last_message && (
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                {contact.last_message.sender_id === user?.id ? 'You: ' : ''}{contact.last_message.message}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className={`flex-1 flex flex-col h-full bg-background/50 ${!activeContact ? 'hidden md:flex' : 'flex'}`}>
                    {activeContact ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-border bg-background/80 backdrop-blur-md flex items-center gap-3">
                                <button onClick={() => setActiveContact(null)} className="md:hidden p-2 -ml-2 hover:bg-muted rounded-full">
                                    <X className="w-4 h-4" /> {/* Or chevron-left */}
                                </button>
                                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border">
                                    {activeContact.image ? (
                                        <img src={activeContact.image} alt={activeContact.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-5 h-5 text-muted-foreground" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">{activeContact.full_name}</h3>
                                    <p className="text-xs text-muted-foreground">
                                        {activeContact.specialization ? `${activeContact.specialization} • ` : ''}
                                        {activeContact.hospital_name || 'Hospital Staff'}
                                    </p>
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                                {loadingMessages ? (
                                    <div className="flex justify-center items-center h-full">
                                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground opacity-50 space-y-2">
                                        <div className="w-16 h-16 rounded-full bg-secondary flex justify-center items-center mb-2">
                                            <Bot className="w-8 h-8" />
                                        </div>
                                        <p>Start a conversation with {activeContact.full_name}</p>
                                    </div>
                                ) : (
                                    messages.map((msg, i) => {
                                        const isMe = msg.sender_id === user?.id;
                                        return (
                                            <div key={i} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                                                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe
                                                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                                            : 'bg-muted text-foreground rounded-tl-sm border border-border'
                                                        }`}>
                                                        {msg.message}
                                                    </div>
                                                    <span className="text-[9px] text-muted-foreground mt-1 mx-1">
                                                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Chat Input */}
                            <div className="p-4 border-t border-border bg-background/80 backdrop-blur-md">
                                <div className="flex gap-2">
                                    <GlassInput
                                        label=""
                                        value={input}
                                        onChange={setInput}
                                        placeholder={`Message ${activeContact.full_name}...`}
                                        className="flex-1"
                                        onKeyDown={(e: any) => e.key === 'Enter' && handleSend()}
                                    />
                                    <GlassButton
                                        onClick={handleSend}
                                        disabled={!input.trim()}
                                        className="px-4 shrink-0 shadow-md"
                                        variant="primary"
                                    >
                                        <Send className="w-4 h-4" />
                                    </GlassButton>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <div className="w-20 h-20 rounded-full bg-secondary/50 flex justify-center items-center mb-4">
                                <Send className="w-8 h-8 opacity-30" />
                            </div>
                            <h3 className="font-medium text-lg">Your Messages</h3>
                            <p className="text-sm mt-1">Select a conversation to start chatting</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
