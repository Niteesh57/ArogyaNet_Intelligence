import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Search, User } from "lucide-react";
import { usersApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface UserSearchProps {
    onSelect: (user: any) => void;
    label?: string;
    placeholder?: string;
    searchAction?: (query: string) => Promise<any>;
}

export const UserSearch = ({ onSelect, label = "Search User", placeholder = "Search by name or email...", searchAction }: UserSearchProps) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
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
        const searchUsers = async () => {
            if (query.length < 2) {
                setUsers([]);
                return;
            }
            setLoading(true);
            try {
                const apiCall = searchAction || usersApi.searchUsersForStaff;
                const res = await apiCall(query);
                setUsers(res.data);
            } catch (error) {
                console.error("Failed to search users", error);
                setUsers([]);
            } finally {
                setLoading(false);
            }
        };

        const debounce = setTimeout(searchUsers, 300);
        return () => clearTimeout(debounce);
    }, [query]);

    const handleSelect = (user: any) => {
        setSelectedUser(user);
        onSelect(user);
        setOpen(false);
        setQuery("");
    };

    return (
        <div className="space-y-2" ref={dropdownRef}>
            <label className="block text-sm font-medium text-foreground">{label}</label>
            <div className="relative">
                <div
                    className="flex items-center justify-between w-full px-3 py-2 text-sm bg-background border border-input rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground"
                    onClick={() => setOpen(!open)}
                >
                    {selectedUser ? (
                        <div className="flex items-center gap-2">
                            {selectedUser.image ? (
                                <img src={selectedUser.image} alt={selectedUser.full_name} className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px]">
                                    {selectedUser.full_name?.[0] || selectedUser.email[0]}
                                </div>
                            )}
                            <span>{selectedUser.full_name || selectedUser.email}</span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    <ChevronsUpDown className="w-4 h-4 opacity-50" />
                </div>

                {open && (
                    <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md animate-in fade-in-0 zoom-in-95">
                        <div className="flex items-center px-3 py-2 border-b">
                            <Search className="w-4 h-4 mr-2 opacity-50" />
                            <input
                                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-sm"
                                placeholder="Type to search..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto p-1">
                            {loading && <div className="px-2 py-4 text-center text-xs text-muted-foreground">Searching...</div>}
                            {!loading && users.length === 0 && query.length >= 2 && (
                                <div className="px-2 py-4 text-center text-xs text-muted-foreground">No users found.</div>
                            )}
                            {!loading && users.length === 0 && query.length < 2 && (
                                <div className="px-2 py-4 text-center text-xs text-muted-foreground">Type at least 2 characters.</div>
                            )}
                            {users.map((user) => (
                                <div
                                    key={user.id}
                                    className={cn(
                                        "relative flex items-center px-2 py-2 text-sm rounded-sm cursor-pointer select-none hover:bg-accent hover:text-accent-foreground",
                                        selectedUser?.id === user.id && "bg-accent/50"
                                    )}
                                    onClick={() => handleSelect(user)}
                                >
                                    <div className="flex items-center gap-3">
                                        {user.image ? (
                                            <img src={user.image} alt={user.full_name} className="w-8 h-8 rounded-full object-cover border border-border" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <User className="w-4 h-4" />
                                            </div>
                                        )}
                                        <div className="flex flex-col">
                                            <span className="font-medium text-foreground">{user.full_name || "Unknown Name"}</span>
                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                            {user.compact_id && <span className="text-[10px] text-muted-foreground/80 font-mono">{user.compact_id}</span>}
                                        </div>
                                    </div>
                                    {selectedUser?.id === user.id && <Check className="w-4 h-4 ml-auto" />}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
