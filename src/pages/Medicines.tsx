import { useEffect, useState } from "react";
import { inventoryApi, adminApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, GlassTable, GlassButton, GlassModal, GlassInput, SearchBar, Shimmer } from "@/components/GlassUI";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, PackagePlus, PackageMinus } from "lucide-react";

interface Medicine {
  id: string; name: string; unique_code: string; description?: string;
  quantity: number; price: number; hospital_id: string; created_at: string; updated_at: string;
}

const Medicines = () => {
  const { isAdmin, user } = useAuth();
  const [items, setItems] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | "add-stock" | "remove-stock" | null>(null);
  const [selected, setSelected] = useState<Medicine | null>(null);
  const [form, setForm] = useState({ name: "", unique_code: "", description: "", quantity: "", price: "", hospital_id: "" });
  const [stockQty, setStockQty] = useState("");

  const fetch = () => { setLoading(true); inventoryApi.list().then((r) => setItems(r.data)).catch(() => { }).finally(() => setLoading(false)); };
  useEffect(() => { fetch(); }, []);

  const filtered = items.filter((i) => (i.name + i.unique_code).toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    try {
      await adminApi.createMedicine({ ...form, quantity: Number(form.quantity), price: Number(form.price), hospital_id: form.hospital_id || user?.hospital_id });
      toast({ title: "Medicine added" }); setModal(null); fetch();
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleUpdate = async () => {
    if (!selected) return;
    try { await inventoryApi.update(selected.id, { name: form.name, description: form.description || null, price: Number(form.price) }); toast({ title: "Updated" }); setModal(null); fetch(); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleStock = async () => {
    if (!selected) return;
    const qty = Number(stockQty);
    if (!qty || qty <= 0) return;
    try {
      if (modal === "add-stock") await inventoryApi.addStock(selected.id, qty);
      else await inventoryApi.removeStock(selected.id, qty);
      toast({ title: `Stock ${modal === "add-stock" ? "added" : "removed"}` }); setModal(null); fetch();
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this medicine?")) return;
    try { await inventoryApi.delete(id); toast({ title: "Deleted" }); fetch(); } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  return (
    <div>
      <PageHeader title="Medicines" action={
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={setSearch} />
          {isAdmin && <GlassButton onClick={() => { setForm({ name: "", unique_code: "", description: "", quantity: "0", price: "", hospital_id: user?.hospital_id || "" }); setModal("create"); }}><Plus className="w-4 h-4 mr-1 inline" />Add Medicine</GlassButton>}
        </div>
      } />
      {loading ? <Shimmer /> : (
        <GlassTable headers={["Name", "Code", "Quantity", "Price", "Actions"]}>
          {filtered.map((m) => (
            <tr key={m.id} className={`hover:bg-background/20 transition-colors ${m.quantity < 10 ? "shadow-[inset_0_0_20px_hsla(0,84%,60%,0.08)]" : ""}`}>
              <td className="px-4 py-3 text-sm text-foreground">{m.name}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{m.unique_code}</td>
              <td className={`px-4 py-3 text-sm font-medium ${m.quantity < 10 ? "text-destructive" : "text-foreground"}`}>{m.quantity} {m.quantity < 10 && <span className="text-[10px] ml-1 text-destructive/80">LOW</span>}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">${m.price.toFixed(2)}</td>
              <td className="px-4 py-3 flex gap-2">
                {isAdmin && <>
                  <button onClick={() => { setSelected(m); setStockQty(""); setModal("add-stock"); }} className="text-muted-foreground hover:text-primary transition-colors" title="Add Stock"><PackagePlus className="w-4 h-4" /></button>
                  <button onClick={() => { setSelected(m); setStockQty(""); setModal("remove-stock"); }} className="text-muted-foreground hover:text-secondary transition-colors" title="Remove Stock"><PackageMinus className="w-4 h-4" /></button>
                  <button onClick={() => { setSelected(m); setForm({ name: m.name, unique_code: m.unique_code, description: m.description || "", quantity: String(m.quantity), price: String(m.price), hospital_id: m.hospital_id }); setModal("edit"); }} className="text-muted-foreground hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(m.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                </>}
              </td>
            </tr>
          ))}
        </GlassTable>
      )}

      {/* Create/Edit Modal */}
      <GlassModal open={modal === "create" || modal === "edit"} onClose={() => setModal(null)} title={modal === "create" ? "Add Medicine" : "Edit Medicine"}>
        <div className="space-y-4 pt-2">
          <GlassInput label="Name" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
          {modal === "create" && <GlassInput label="Unique Code" value={form.unique_code} onChange={(v) => setForm((p) => ({ ...p, unique_code: v }))} />}
          <GlassInput label="Description" value={form.description} onChange={(v) => setForm((p) => ({ ...p, description: v }))} />
          {modal === "create" && <GlassInput label="Initial Quantity" value={form.quantity} onChange={(v) => setForm((p) => ({ ...p, quantity: v }))} type="number" />}
          <GlassInput label="Price" value={form.price} onChange={(v) => setForm((p) => ({ ...p, price: v }))} type="number" />
          <GlassButton onClick={modal === "create" ? handleCreate : handleUpdate} className="w-full">{modal === "create" ? "Add Medicine" : "Save"}</GlassButton>
        </div>
      </GlassModal>

      {/* Stock Modal */}
      <GlassModal open={modal === "add-stock" || modal === "remove-stock"} onClose={() => setModal(null)} title={modal === "add-stock" ? "Add Stock" : "Remove Stock"}>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">Medicine: <span className="text-foreground font-medium">{selected?.name}</span> (Current: {selected?.quantity})</p>
          <GlassInput label="Quantity" value={stockQty} onChange={setStockQty} type="number" placeholder="Enter quantity" />
          <GlassButton onClick={handleStock} className="w-full" variant={modal === "remove-stock" ? "danger" : "primary"}>{modal === "add-stock" ? "Add Stock" : "Remove Stock"}</GlassButton>
        </div>
      </GlassModal>
    </div>
  );
};

export default Medicines;
