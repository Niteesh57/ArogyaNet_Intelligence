import { useState, useRef } from "react";
import { GlassCard, GlassButton, GlassInput } from "@/components/GlassUI";
import { documentsApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Image as ImageIcon, Mic, Play, Send, Bot, StopCircle } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function DeepResearch() {
    const [prompt, setPrompt] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);

    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const [uploadingType, setUploadingType] = useState<'image' | 'audio' | 'pdf' | null>(null);
    const [researching, setResearching] = useState(false);
    const [statusLog, setStatusLog] = useState<string[]>([]);
    const [report, setReport] = useState("");

    // For handling the stream
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleFileUpload = async (file: File, type: 'image' | 'audio' | 'pdf') => {
        setUploadingType(type);
        try {
            // We use a dummy title or just the filename
            const res = await documentsApi.upload(file, file.name);
            const url = res.data.file_url;

            if (type === 'image') {
                setImageFile(file);
                setImageUrl(url);
            } else if (type === 'audio') {
                setAudioFile(file);
                setAudioUrl(url);
            } else {
                setPdfFile(file);
                setPdfUrl(url);
            }
            toast({ title: "Upload Successful", description: `${type} uploaded.` });
        } catch (e) {
            console.error(e);
            toast({ title: "Upload Failed", variant: "destructive", description: "Could not upload file." });
        } finally {
            setUploadingType(null);
        }
    };

    const startResearch = async () => {
        if (!prompt && !imageUrl && !audioUrl && !pdfUrl) {
            toast({ title: "Inputs Missing", description: "Please provide at least a prompt or a file.", variant: "destructive" });
            return;
        }

        setResearching(true);
        setStatusLog([]);
        setReport("");

        abortControllerRef.current = new AbortController();
        const token = localStorage.getItem('lh_token');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/agent/deep-research`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    vision_prompt: prompt,
                    image_url: imageUrl,
                    audio_url: audioUrl,
                    pdf_url: pdfUrl
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) throw new Error(response.statusText);
            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedBuffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                accumulatedBuffer += chunk;

                // SSE format: data: {...}\n\n
                const lines = accumulatedBuffer.split('\n');
                // Keep the last line in buffer if incomplete
                accumulatedBuffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.trim().startsWith("data: ")) {
                        const jsonStr = line.replace("data: ", "").trim();
                        if (jsonStr === "[DONE]") break;

                        try {
                            const event = JSON.parse(jsonStr);

                            if (event.type === 'status') {
                                setStatusLog(prev => [...prev, event.message]);
                            } else if (event.type === 'token') {
                                setReport(prev => prev + event.content);
                            } else if (event.type === 'done') {
                                setResearching(false);
                            }
                        } catch (e) {
                            // ignore parse errors for partial json
                        }
                    }
                }
            }

        } catch (e: any) {
            if (e.name === 'AbortError') {
                setStatusLog(prev => [...prev, "Research stopped by user."]);
            } else {
                console.error(e);
                toast({ title: "Research Failed", variant: "destructive", description: e.message });
                setStatusLog(prev => [...prev, `Error: ${e.message}`]);
            }
        } finally {
            setResearching(false);
            abortControllerRef.current = null;
        }
    };

    const stopResearch = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Deep Research Agent</h1>
                <p className="text-muted-foreground mt-1">Upload multimodal data and generate comprehensive medical reports powered by AI.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
                {/* ══ LEFT: INPUTS ══ */}
                <div className="lg:col-span-1 space-y-4 flex flex-col h-full">
                    <GlassCard className="flex-1 flex flex-col overflow-y-auto">
                        <div className="p-4 space-y-6">

                            {/* 1. Image Upload */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-blue-500" /> Medical Scans / Images
                                </label>
                                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:bg-muted/50 transition-colors relative min-h-[150px] flex flex-col items-center justify-center">
                                    {uploadingType === 'image' ? (
                                        <div className="flex flex-col items-center animate-pulse">
                                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                                            <p className="text-xs text-muted-foreground">Uploading Image...</p>
                                        </div>
                                    ) : imageUrl ? (
                                        <div className="relative group w-full">
                                            <img src={imageUrl} alt="Uploaded" className="max-h-32 mx-auto rounded-md object-contain" />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setImageUrl(null); setImageFile(null); }}
                                                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <StopCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                type="file" accept="image/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'image')}
                                                disabled={!!uploadingType}
                                            />
                                            <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                                            <p className="text-xs text-muted-foreground">Drag & drop or click to upload</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* 2. Audio Upload */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Mic className="w-4 h-4 text-purple-500" /> Visit Audio / Voice Notes
                                </label>
                                <div className="border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center hover:bg-muted/50 transition-colors relative min-h-[100px]">
                                    {uploadingType === 'audio' ? (
                                        <div className="flex flex-col items-center animate-pulse">
                                            <Loader2 className="w-6 h-6 text-purple-500 animate-spin mb-2" />
                                            <p className="text-xs text-muted-foreground">Uploading Audio...</p>
                                        </div>
                                    ) : audioUrl ? (
                                        <div className="w-full">
                                            <div className="flex items-center gap-2 bg-secondary/50 p-2 rounded-md mb-2">
                                                <Play className="w-4 h-4" />
                                                <span className="text-xs truncate flex-1">{audioFile?.name || "Audio File"}</span>
                                                <button onClick={() => { setAudioUrl(null); setAudioFile(null); }} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                                                    <StopCircle className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <audio src={audioUrl} controls className="w-full h-8" />
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                type="file" accept="audio/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'audio')}
                                                disabled={!!uploadingType}
                                            />
                                            <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                                            <p className="text-xs text-muted-foreground">Upload Audio (MP3, WAV)</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* 3. PDF Upload */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-pink-500" /> Medical History (PDF)
                                </label>
                                <div className="border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center hover:bg-muted/50 transition-colors relative min-h-[100px]">
                                    {uploadingType === 'pdf' ? (
                                        <div className="flex flex-col items-center animate-pulse">
                                            <Loader2 className="w-6 h-6 text-pink-500 animate-spin mb-2" />
                                            <p className="text-xs text-muted-foreground">Uploading PDF...</p>
                                        </div>
                                    ) : pdfUrl ? (
                                        <div className="flex items-center gap-2 bg-secondary/50 p-2 rounded-md w-full">
                                            <FileText className="w-4 h-4 text-pink-500" />
                                            <span className="text-xs truncate flex-1">{pdfFile?.name || "PDF Document"}</span>
                                            <button onClick={() => { setPdfUrl(null); setPdfFile(null); }} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                                                <StopCircle className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                type="file" accept="application/pdf"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'pdf')}
                                                disabled={!!uploadingType}
                                            />
                                            <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                                            <p className="text-xs text-muted-foreground">Upload PDF Reports</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Prompt Input */}
                        <div className="p-4 border-t border-border mt-auto bg-background/50">
                            <label className="text-sm font-medium mb-2 block">Instruction / Prompt</label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="E.g., Analyze this X-ray for fractures and check standard treatment protocols..."
                                className="w-full min-h-[100px] p-3 rounded-md bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none text-sm"
                            />

                            <div className="mt-4">
                                {researching ? (
                                    <GlassButton onClick={stopResearch} variant="danger" className="w-full">
                                        <StopCircle className="w-4 h-4 mr-2" /> Stop Research
                                    </GlassButton>
                                ) : (
                                    <GlassButton onClick={startResearch} disabled={!!uploadingType} className="w-full">
                                        <Bot className="w-4 h-4 mr-2" /> Start Deep Research
                                    </GlassButton>
                                )}
                            </div>
                        </div>

                    </GlassCard>
                </div>

                {/* ══ RIGHT: OUTPUT ══ */}
                <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
                    <GlassCard className="flex-1 flex flex-col h-full overflow-hidden">
                        {/* Status Bar */}
                        <div className="p-3 border-b border-border bg-muted/20 flex gap-2 overflow-x-auto whitespace-nowrap">
                            {statusLog.length === 0 ? (
                                <span className="text-xs text-muted-foreground italic">Ready to start...</span>
                            ) : (
                                statusLog.slice(-1).map((log, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-primary animate-pulse">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        {log}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Report Area */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white/5">
                            {!report && statusLog.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30">
                                    <Bot className="w-16 h-16 mb-4" />
                                    <p className="text-lg font-medium">Deep Research Agent</p>
                                    <p className="text-sm text-center max-w-sm mt-2">
                                        Upload medical scans, audio notes, or history to generate a comprehensive AI analysis report.
                                    </p>
                                </div>
                            )}

                            {/* Status Log History (Hidden but maybe useful? No, keep clean) */}

                            {/* Streaming Markdown Report */}
                            {report && (
                                <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" />,
                                            img: ({ node, ...props }) => <img {...props} className="rounded-lg shadow-sm border border-border/50 max-h-80 my-4" />
                                        }}
                                    >
                                        {report}
                                    </ReactMarkdown>
                                </div>
                            )}

                            {/* Cursor Blinker */}
                            {researching && <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse align-middle"></span>}
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
