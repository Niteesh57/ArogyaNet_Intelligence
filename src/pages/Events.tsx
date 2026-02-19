import { useState, useEffect } from "react";
import { GlassCard, GlassButton, GlassInput, GlassModal, GlassTable, PageHeader, Shimmer } from "@/components/GlassUI";
import { eventsApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Eye, FileText, Calendar, User, Clock, CheckCircle, Database, Trash2, Edit2, Save, X, Settings } from "lucide-react";
import { format } from "date-fns";

// Types
interface Event {
    id: string;
    event_name: string;
    json_data: any[];
    keys: string[]; // Schema keys
    created_by_id: string;
    created_at: string;
    updated_at: string;
}

export default function Events() {
    const { user } = useAuth();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [editEventOpen, setEditEventOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    // Create Form
    const [newEventName, setNewEventName] = useState("");
    const [newKeys, setNewKeys] = useState<string[]>([]);
    const [currentKey, setCurrentKey] = useState("");
    const [creating, setCreating] = useState(false);

    // Edit Event Definition Form
    const [editEventName, setEditEventName] = useState("");
    const [editEventKeys, setEditEventKeys] = useState<string[]>([]);
    const [editCurrentKey, setEditCurrentKey] = useState("");
    const [updatingEvent, setUpdatingEvent] = useState(false);

    // Append/Edit Form
    const [appendData, setAppendData] = useState(""); // For raw JSON
    const [formData, setFormData] = useState<Record<string, string>>({}); // For schema-based form
    const [appending, setAppending] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const isNurse = user?.role === "nurse" || user?.role === "super_admin";

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const res = await eventsApi.list();
            setEvents(res.data);
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to load events.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleAddKey = () => {
        if (currentKey && !newKeys.includes(currentKey)) {
            setNewKeys([...newKeys, currentKey]);
            setCurrentKey("");
        }
    };

    const handleAddEditKey = () => {
        if (editCurrentKey && !editEventKeys.includes(editCurrentKey)) {
            setEditEventKeys([...editEventKeys, editCurrentKey]);
            setEditCurrentKey("");
        }
    };

    const handleCreate = async () => {
        if (!newEventName) return;
        setCreating(true);
        try {
            await eventsApi.create({ event_name: newEventName, keys: newKeys });
            toast({ title: "Success", description: "Event created." });
            setCreateOpen(false);
            setNewEventName("");
            setNewKeys([]);
            fetchEvents();
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to create event." });
        } finally {
            setCreating(false);
        }
    };

    const openEditEventModal = (e: React.MouseEvent, event: Event) => {
        e.stopPropagation();
        setSelectedEvent(event);
        setEditEventName(event.event_name || "");
        setEditEventKeys(event.keys || []);
        setEditEventOpen(true);
    };

    const handleUpdateEventDefinition = async () => {
        if (!selectedEvent || !editEventName) return;
        setUpdatingEvent(true);
        try {
            await eventsApi.update(selectedEvent.id, {
                event_name: editEventName,
                keys: editEventKeys
            });
            toast({ title: "Success", description: "Event updated." });
            setEditEventOpen(false);
            fetchEvents();
            // Also update selected event if details modal is open (though currently these are separate)
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to update event." });
        } finally {
            setUpdatingEvent(false);
        }
    }

    const handleAppendOrUpdate = async () => {
        if (!selectedEvent) return;
        setAppending(true);
        try {
            let dataToSave: any;

            if (selectedEvent.keys && selectedEvent.keys.length > 0) {
                // Use form data
                const hasData = Object.values(formData).some(v => v.trim() !== "");
                if (!hasData) {
                    toast({ title: "Validation Error", description: "Please fill at least one field.", variant: "destructive" });
                    setAppending(false);
                    return;
                }
                dataToSave = formData;
            } else {
                // Use raw text/JSON
                if (!appendData) return;
                try {
                    dataToSave = JSON.parse(appendData);
                } catch (e) {
                    dataToSave = { message: appendData };
                }
            }

            if (editingIndex !== null) {
                // Update existing entry
                const updatedList = [...selectedEvent.json_data];
                // Preserve metadata if editing
                const originalEntry = updatedList[editingIndex];
                updatedList[editingIndex] = { ...originalEntry, ...dataToSave, _updated_at: new Date().toISOString(), _updated_by: user?.id };

                await eventsApi.update(selectedEvent.id, { json_data: updatedList });
                toast({ title: "Success", description: "Entry updated." });
                setEditingIndex(null);
            } else {
                // Append new entry
                await eventsApi.append(selectedEvent.id, dataToSave);
                toast({ title: "Success", description: "Data appended." });
            }

            setAppendData("");
            // Reset form data
            if (selectedEvent.keys) {
                const initialData: Record<string, string> = {};
                selectedEvent.keys.forEach(k => initialData[k] = "");
                setFormData(initialData);
            }

            // Refresh detailed view
            const res = await eventsApi.get(selectedEvent.id);
            setSelectedEvent(res.data);
            fetchEvents();
        } catch (e: any) {
            console.error(e);
            toast({ title: "Error", description: e.response?.data?.detail || "Failed to save data.", variant: "destructive" });
        } finally {
            setAppending(false);
        }
    };

    const handleEdit = (index: number) => {
        if (!selectedEvent) return;
        const entry = selectedEvent.json_data[index];
        setEditingIndex(index);

        if (selectedEvent.keys && selectedEvent.keys.length > 0) {
            const newFormData: Record<string, string> = {};
            selectedEvent.keys.forEach(k => {
                newFormData[k] = entry[k] || "";
            });
            setFormData(newFormData);
        } else {
            setAppendData(JSON.stringify(entry, null, 2));
        }
    };

    const handleDelete = async (index: number) => {
        if (!selectedEvent || !confirm("Are you sure you want to delete this entry?")) return;

        try {
            const updatedList = [...selectedEvent.json_data];
            updatedList.splice(index, 1);

            await eventsApi.update(selectedEvent.id, { json_data: updatedList });
            toast({ title: "Success", description: "Entry deleted." });

            // Refresh detailed view
            const res = await eventsApi.get(selectedEvent.id);
            setSelectedEvent(res.data);
            fetchEvents();

            if (editingIndex === index) {
                setEditingIndex(null);
                // Reset form
                if (selectedEvent.keys) {
                    const initialData: Record<string, string> = {};
                    selectedEvent.keys.forEach(k => initialData[k] = "");
                    setFormData(initialData);
                } else {
                    setAppendData("");
                }
            }
        } catch (e: any) {
            console.error(e);
            toast({ title: "Error", description: "Failed to delete entry.", variant: "destructive" });
        }
    };

    const handleCancelEdit = () => {
        setEditingIndex(null);
        if (selectedEvent?.keys) {
            const initialData: Record<string, string> = {};
            selectedEvent.keys.forEach(k => initialData[k] = "");
            setFormData(initialData);
        } else {
            setAppendData("");
        }
    };

    const openDetails = (event: Event) => {
        setSelectedEvent(event);
        setEditingIndex(null);
        // Initialize form data with empty strings for each key
        if (event.keys) {
            const initialData: Record<string, string> = {};
            event.keys.forEach(k => initialData[k] = "");
            setFormData(initialData);
        }
        setDetailsOpen(true);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Events & Logs"
                action={isNurse && (
                    <GlassButton onClick={() => setCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Create Event
                    </GlassButton>
                )}
            />

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Shimmer key={i} className="h-40" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(event => (
                        <GlassCard key={event.id} className="p-6 hover:border-primary/50 transition-colors cursor-pointer group relative" onClick={() => openDetails(event)}>
                            {isNurse && (
                                <button
                                    onClick={(e) => openEditEventModal(e, event)}
                                    className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-secondary/50 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                    title="Edit Event Definition"
                                >
                                    <Settings className="w-4 h-4" />
                                </button>
                            )}
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                    <Database className="w-6 h-6" />
                                </div>
                                <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
                                    {event.json_data?.length || 0} entries
                                </span>
                            </div>

                            <h3 className="text-lg font-semibold mb-2 pr-6">{event.event_name || "Unnamed Event"}</h3>

                            <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {format(new Date(event.created_at), "PPP")}
                                </div>
                                {event.keys && event.keys.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {event.keys.slice(0, 3).map(k => (
                                            <span key={k} className="text-[10px] bg-muted px-1 rounded border border-border">{k}</span>
                                        ))}
                                        {event.keys.length > 3 && <span className="text-[10px] text-muted-foreground">+{event.keys.length - 3}</span>}
                                    </div>
                                )}
                            </div>
                        </GlassCard>
                    ))}

                    {events.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            No events found.
                        </div>
                    )}
                </div>
            )}

            {/* Create Modal */}
            <GlassModal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Event">
                <div className="space-y-4 pt-4">
                    <GlassInput
                        label="Event Name"
                        value={newEventName}
                        onChange={setNewEventName}
                        placeholder="e.g., Night Shift Vitals"
                    />

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Define Schema Keys (Optional)</label>
                        <div className="flex gap-2">
                            <GlassInput
                                label=""
                                value={currentKey}
                                onChange={setCurrentKey}
                                placeholder="Add key (e.g., HR, BP, Temp)"
                                className="flex-1"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddKey()}
                            />
                            <GlassButton onClick={handleAddKey} size="sm" type="button" className="mt-[2px]">
                                Add
                            </GlassButton>
                        </div>
                        <p className="text-xs text-muted-foreground">Add keys to generate a structured form for this event.</p>
                        {newKeys.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2 p-3 bg-secondary/30 rounded-md">
                                {newKeys.map(k => (
                                    <span key={k} className="bg-background border border-border px-2 py-1 rounded text-xs flex items-center gap-2">
                                        {k} <button onClick={() => setNewKeys(newKeys.filter(nk => nk !== k))} className="text-destructive hover:scale-110 font-bold">×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <GlassButton variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</GlassButton>
                        <GlassButton onClick={handleCreate} disabled={creating || !newEventName}>Create</GlassButton>
                    </div>
                </div>
            </GlassModal>

            {/* Edit Event Definition Modal */}
            <GlassModal open={editEventOpen} onClose={() => setEditEventOpen(false)} title="Edit Event Definition">
                <div className="space-y-4 pt-4">
                    <GlassInput
                        label="Event Name"
                        value={editEventName}
                        onChange={setEditEventName}
                        placeholder="e.g., Night Shift Vitals"
                    />

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Schema Keys</label>
                        <div className="flex gap-2">
                            <GlassInput
                                label=""
                                value={editCurrentKey}
                                onChange={setEditCurrentKey}
                                placeholder="Add new key"
                                className="flex-1"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddEditKey()}
                            />
                            <GlassButton onClick={handleAddEditKey} size="sm" type="button" className="mt-[2px]">
                                Add
                            </GlassButton>
                        </div>
                        <p className="text-xs text-muted-foreground">Modifying keys will affect how data entry forms are displayed.</p>
                        {editEventKeys.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2 p-3 bg-secondary/30 rounded-md">
                                {editEventKeys.map(k => (
                                    <span key={k} className="bg-background border border-border px-2 py-1 rounded text-xs flex items-center gap-2">
                                        {k} <button onClick={() => setEditEventKeys(editEventKeys.filter(nk => nk !== k))} className="text-destructive hover:scale-110 font-bold">×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <GlassButton variant="ghost" onClick={() => setEditEventOpen(false)}>Cancel</GlassButton>
                        <GlassButton onClick={handleUpdateEventDefinition} disabled={updatingEvent || !editEventName}>Update Event</GlassButton>
                    </div>
                </div>
            </GlassModal>

            {/* Details Modal */}
            <GlassModal open={detailsOpen} onClose={() => setDetailsOpen(false)} title="Event Details" className="sm:max-w-2xl max-h-[80vh] flex flex-col">
                {selectedEvent && (
                    <div className="flex flex-col h-full overflow-hidden space-y-4 pt-2">
                        <div className="flex justify-between items-center text-sm text-muted-foreground px-1">
                            <span>ID: {selectedEvent.id.slice(0, 8)}...</span>
                            <span>Created: {format(new Date(selectedEvent.created_at), "PPP p")}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 p-1">
                            {selectedEvent.json_data && selectedEvent.json_data.length > 0 ? (
                                selectedEvent.json_data.map((entry, idx) => (
                                    <div key={idx} className={`p-3 rounded-md text-sm border transition-colors relative group ${editingIndex === idx ? 'bg-primary/10 border-primary' : 'bg-secondary/30 border-border/50 hover:bg-secondary/50'}`}>
                                        <div className="flex justify-between items-center mb-2 text-xs text-muted-foreground">
                                            <span>Attached by: {entry._appended_by || 'Unknown'}</span>
                                            <div className="flex items-center gap-2">
                                                <span>{entry._appended_at ? format(new Date(entry._appended_at), "p") : ''}</span>
                                                {isNurse && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(idx); }} className="text-primary hover:text-primary/80 p-1">
                                                            <Edit2 className="w-3 h-3" />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(idx); }} className="text-destructive hover:text-destructive/80 p-1">
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Render structured data if keys exist, else JSON */}
                                        {selectedEvent.keys && selectedEvent.keys.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                {selectedEvent.keys.map(k => (
                                                    <div key={k} className="flex flex-col">
                                                        <span className="text-[10px] text-muted-foreground uppercase font-semibold">{k}</span>
                                                        <span className="font-medium text-foreground">{entry[k] || "-"}</span>
                                                    </div>
                                                ))}
                                                {/* Show extra keys not in schema */}
                                                {Object.keys(entry).filter(k => !selectedEvent.keys.includes(k) && !k.startsWith('_')).length > 0 && (
                                                    <div className="col-span-2 mt-2 pt-2 border-t border-border/30">
                                                        <span className="text-[10px] text-muted-foreground uppercase block mb-1">Additional Data</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {Object.keys(entry).filter(k => !selectedEvent.keys.includes(k) && !k.startsWith('_')).map(k => (
                                                                <span key={k} className="text-xs bg-background/50 px-1 rounded border border-border/50">{k}: {entry[k]}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <pre className="whitespace-pre-wrap font-mono text-xs overflow-x-auto">
                                                {JSON.stringify(entry, (key, value) => {
                                                    if (key.startsWith('_')) return undefined;
                                                    return value;
                                                }, 2)}
                                            </pre>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-muted-foreground py-8">No data entries yet.</p>
                            )}
                        </div>

                        {isNurse && (
                            <div className="border-t border-border pt-4 mt-auto">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-sm font-medium block">
                                        {editingIndex !== null ? "Edit Entry" : (selectedEvent.keys && selectedEvent.keys.length > 0 ? "Add New Record" : "Append Data")}
                                    </label>
                                    {editingIndex !== null && (
                                        <button onClick={handleCancelEdit} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                                            <X className="w-3 h-3" /> Cancel Edit
                                        </button>
                                    )}
                                </div>

                                {selectedEvent.keys && selectedEvent.keys.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-4 mb-2">
                                        {selectedEvent.keys.map(k => (
                                            <GlassInput
                                                key={k}
                                                label={k}
                                                value={formData[k] || ""}
                                                onChange={(v) => setFormData(prev => ({ ...prev, [k]: v }))}
                                                placeholder={`Enter ${k}`}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <textarea
                                        className="w-full h-24 p-2 rounded-md bg-background border border-input text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary mb-2 resize-none"
                                        placeholder='{"status": "stable", "notes": "Patient sleeping"}'
                                        value={appendData}
                                        onChange={(e) => setAppendData(e.target.value)}
                                    />
                                )}

                                <div className="flex justify-end mt-2">
                                    <GlassButton onClick={handleAppendOrUpdate} disabled={appending || (selectedEvent.keys && selectedEvent.keys.length > 0 ? false : !appendData)} size="sm">
                                        {appending ? (editingIndex !== null ? "Updating..." : "Appending...") : (editingIndex !== null ? "Update Entry" : "Append Data")}
                                    </GlassButton>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </GlassModal>
        </div>
    );
}
