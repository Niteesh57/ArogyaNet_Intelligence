import { useState, useEffect, useRef } from "react";
import { documentsApi, agentApi } from "@/lib/api";
import { GlassCard, GlassButton, GlassModal, PageHeader, GlassInput, Shimmer } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";
import { UploadCloud, FileText, Loader2, Sparkles, X, ExternalLink, Bot, File as FileIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Document {
    id: string;
    title: string;
    file_url: string;
    file_type: string;
    created_at: string;
}

const Documents = () => {
    const { user } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Analysis State
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [question, setQuestion] = useState("Summarize this document and highlight any critical findings.");

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const res = await documentsApi.getMyDocuments();
            setDocuments(res.data);
        } catch (e) {
            console.error(e);
            toast({ title: "Failed to load documents", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    // File Upload Handlers
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUpload(e.dataTransfer.files[0]);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleUpload(e.target.files[0]);
        }
    };

    const handleUpload = async (file: File) => {
        setUploading(true);
        try {
            // Use filename as default title
            await documentsApi.upload(file, file.name);
            toast({ title: "✅ Document uploaded successfully" });
            fetchDocuments();
        } catch (e) {
            console.error(e);
            toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    // Analysis Handler
    const handleAnalyze = async () => {
        if (!selectedDoc) return;
        setAnalyzing(true);
        setAnalysisResult(null);
        try {
            const res = await agentApi.analyze({
                document_url: selectedDoc.file_url,
                question: question
            });
            setAnalysisResult(res.data.answer);
        } catch (e) {
            console.error(e);
            toast({ title: "Analysis failed", variant: "destructive" });
            setAnalysisResult("Failed to analyze document. Please try again.");
        } finally {
            setAnalyzing(false);
        }
    };

    const openAnalysis = (doc: Document) => {
        setSelectedDoc(doc);
        setAnalysisResult(null);
        setQuestion("Summarize this document and highlight any critical findings.");
        setAnalysisModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <PageHeader title="Medical Documents" />
                <p className="text-muted-foreground mt-[-1rem]">Upload and analyze your medical reports, prescriptions, and scans.</p>
            </div>

            {/* Upload Zone */}
            <GlassCard className={`border-2 border-dashed transition-all duration-200 ${dragActive ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50"}`}>
                <div
                    className="p-10 flex flex-col items-center justify-center text-center cursor-pointer"
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload')?.click()}
                >
                    <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        onChange={handleFileSelect}
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                    />

                    {uploading ? (
                        <>
                            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                            <p className="text-lg font-medium">Uploading...</p>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                                <UploadCloud className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-semibold">Click to upload or drag and drop</h3>
                            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                                Support for PDF, JPG, PNG. (Max 10MB)
                            </p>
                        </>
                    )}
                </div>
            </GlassCard>

            {/* Documents List */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Your Documents
                </h2>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => <Shimmer key={i} className="h-32 rounded-xl" />)}
                    </div>
                ) : documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {documents.map(doc => (
                            <GlassCard key={doc.id} className="p-4 group hover:border-primary/30 transition-all flex flex-col h-full">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <FileIcon className="w-6 h-6" />
                                    </div>
                                    <a
                                        href={doc.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        View <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>

                                <h3 className="font-medium truncate mb-1" title={doc.title}>{doc.title}</h3>
                                <p className="text-xs text-muted-foreground mb-4">
                                    {new Date(doc.created_at).toLocaleDateString()}
                                </p>

                                <div className="mt-auto">
                                    <GlassButton
                                        onClick={() => openAnalysis(doc)}
                                        variant="ghost"
                                        className="w-full text-xs h-8 border border-purple-500/20 text-purple-400 hover:bg-purple-500/10"
                                    >
                                        <Sparkles className="w-3 h-3 mr-1.5" />
                                        Analyze with AI
                                    </GlassButton>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-muted/5 rounded-xl border border-dashed border-border">
                        <p className="text-muted-foreground">No documents uploaded yet.</p>
                    </div>
                )}
            </div>

            {/* Analysis Modal */}
            <GlassModal
                open={analysisModalOpen}
                onClose={() => setAnalysisModalOpen(false)}
                title="AI Document Analysis"
                className="max-w-2xl"
            >
                <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/20 border border-border/50">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium truncate flex-1">{selectedDoc?.title}</span>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Ask a question about this document</label>
                        <div className="flex gap-2">
                            <GlassInput
                                label=""
                                value={question}
                                onChange={setQuestion}
                                placeholder="e.g. What is the diagnosis?"
                                className="flex-1"
                            />
                            <GlassButton
                                onClick={handleAnalyze}
                                disabled={analyzing || !question.trim()}
                                className="bg-gradient-to-r from-purple-600 to-blue-600"
                            >
                                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                            </GlassButton>
                        </div>
                    </div>

                    <div className="min-h-[200px] p-4 rounded-xl bg-background/50 border border-border/50 relative">
                        {analyzing ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <Sparkles className="w-8 h-8 text-purple-400 animate-pulse mb-3" />
                                <p className="text-sm text-muted-foreground animate-pulse">Analyzing document content...</p>
                            </div>
                        ) : analysisResult ? (
                            <div className="prose prose-sm prose-invert max-w-none">
                                <p className="whitespace-pre-wrap leading-relaxed">{analysisResult}</p>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                                AI analysis results will appear here.
                            </div>
                        )}
                    </div>
                </div>
            </GlassModal>
        </div>
    );
};

export default Documents;
