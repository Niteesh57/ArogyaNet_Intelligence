import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react"; // Import X icon
import { doctorsApi, nursesApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface StaffSearchProps {
    type: "doctor" | "nurse";
    onSelect: (staff: any[]) => void;
    label?: string;
    placeholder?: string;
}

export const StaffSearch = ({ type, onSelect, label = "Search Staff", placeholder = "Search..." }: StaffSearchProps) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [selectedStaff, setSelectedStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const searchStaff = async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }
            setLoading(true);
            try {
                const api = type === "doctor" ? doctorsApi : nursesApi;
                const res = await api.search(query);
                setResults(res.data);
            } catch (error) {
                console.error("Failed to search staff", error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(searchStaff, 300);
        return () => clearTimeout(debounce);
    }, [query, type]);

    const handleSelect = (staff: any) => {
        if (selectedStaff.some((s) => s.id === staff.id)) return;
        const newSelected = [...selectedStaff, staff];
        setSelectedStaff(newSelected);
        onSelect(newSelected);
        setQuery("");
    };

    const handleRemove = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSelected = selectedStaff.filter((s) => s.id !== id);
        setSelectedStaff(newSelected);
        onSelect(newSelected);
    };

    return (
        <div className="space-y-2" ref={dropdownRef}>
            <label className="block text-sm font-medium text-foreground">{label}</label>
            <div className="relative">
                <div
                    className="flex flex-wrap gap-2 items-center w-full px-3 py-2 min-h-[42px] bg-background border border-input rounded-md cursor-pointer hover:bg-accent/50"
                    onClick={() => setOpen(true)}
                >
                    {selectedStaff.length === 0 && <span className="text-muted-foreground text-sm">{placeholder}</span>}
                    {selectedStaff.map((s) => (
                        <div key={s.id} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-medium">
                            <span>{s.user?.full_name || "Unknown"}</span>
                            <X className="w-3 h-3 cursor-pointer hover:text-primary/70" onClick={(e) => handleRemove(s.id, e)} />
                        </div>
                    ))}
                </div>

                {open && (
                    <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md animate-in fade-in-0 zoom-in-95">
                        <div className="flex items-center px-3 py-2 border-b">
                            <Search className="w-4 h-4 mr-2 opacity-50" />
                            <input
                                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-sm"
                                placeholder={`Search ${type}s...`}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto p-1">
                            {loading && <div className="px-2 py-4 text-center text-xs text-muted-foreground">Searching...</div>}
                            {!loading && results.length === 0 && query.length >= 2 && (
                                <div className="px-2 py-4 text-center text-xs text-muted-foreground">No results found.</div>
                            )}
                            {results.map((staff) => (
                                <div
                                    key={staff.id}
                                    className={cn(
                                        "flex items-center px-2 py-2 text-sm rounded-sm cursor-pointer select-none hover:bg-accent hover:text-accent-foreground",
                                        selectedStaff.some(s => s.id === staff.id) && "opacity-50 cursor-not-allowed"
                                    )}
                                    onClick={() => !selectedStaff.some(s => s.id === staff.id) && handleSelect(staff)}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium">{staff.user?.full_name || "Unknown"}</span>
                                        <span className="text-xs text-muted-foreground">{staff.specialization || staff.shift_type}</span>
                                    </div>
                                    {selectedStaff.some(s => s.id === staff.id) && <Check className="w-4 h-4 ml-auto" />}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
