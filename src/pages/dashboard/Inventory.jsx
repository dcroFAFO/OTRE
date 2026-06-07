import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, AlertTriangle, Package, Pencil, Trash2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = ["tyre","brake","battery","electrical","bearing","lubricant","fastener","cable","other"];
const CATEGORY_COLORS = {
  tyre: "bg-slate-100 text-slate-700",
  brake: "bg-rose-100 text-rose-700",
  battery: "bg-amber-100 text-amber-700",
  electrical: "bg-violet-100 text-violet-700",
  bearing: "bg-indigo-100 text-indigo-700",
  lubricant: "bg-teal-100 text-teal-700",
  fastener: "bg-orange-100 text-orange-700",
  cable: "bg-blue-100 text-blue-700",
  other: "bg-secondary text-muted-foreground",
};

const EMPTY_FORM = { name: "", sku: "", category: "other", description: "", unit: "ea", cost_price: 0, sell_price: 0, qty_on_hand: 0, qty_low_threshold: 2, supplier: "" };

export default function Inventory() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);   // null = closed, "new" = create form
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventoryItems"],
    queryFn: () => base44.entities.InventoryItem.filter({ active: true }, "name", 200),
  });

  const save = useMutation({
    mutationFn: async (data) => {
      if (editingId === "new") return base44.entities.InventoryItem.create({ ...data, business_slug: "otr-scooters" });
      return base44.entities.InventoryItem.update(editingId, data);
    },
    onSuccess: () => { qc.invalidateQueries(["inventoryItems"]); setEditingId(null); },
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.InventoryItem.update(id, { active: false }),
    onSuccess: () => qc.invalidateQueries(["inventoryItems"]),
  });

  const openNew = () => { setForm(EMPTY_FORM); setEditingId("new"); };
  const openEdit = (item) => { setForm({ ...item }); setEditingId(item.id); };

  const filtered = items.filter((i) => {
    const matchCat = catFilter === "all" || i.category === catFilter;
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.sku || "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const lowStock = items.filter((i) => i.qty_on_hand <= i.qty_low_threshold);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Parts &amp; consumables — track stock and link to repair jobs.</p>
        </div>
        <Button onClick={openNew} className="gap-2 rounded-xl"><Plus className="h-4 w-4" /> Add Item</Button>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span><strong>{lowStock.length} item{lowStock.length > 1 ? "s" : ""}</strong> at or below low-stock threshold: {lowStock.map(i => i.name).join(", ")}.</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search parts…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["all", ...CATEGORIES].map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={cn("px-3 py-1 rounded-full text-xs font-semibold border transition-colors capitalize",
                catFilter === c ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40")}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Add / Edit form */}
      {editingId && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="font-heading font-bold text-sm mb-4">{editingId === "new" ? "Add new item" : "Edit item"}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <LabeledField label="Name *">
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Segway brake pad set" className="rounded-xl" />
            </LabeledField>
            <LabeledField label="SKU / Part no.">
              <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="BP-001" className="rounded-xl" />
            </LabeledField>
            <LabeledField label="Category">
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring capitalize">
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </LabeledField>
            <LabeledField label="Qty on hand">
              <Input type="number" value={form.qty_on_hand} onChange={e => setForm(f => ({ ...f, qty_on_hand: +e.target.value }))} className="rounded-xl" />
            </LabeledField>
            <LabeledField label="Low-stock alert below">
              <Input type="number" value={form.qty_low_threshold} onChange={e => setForm(f => ({ ...f, qty_low_threshold: +e.target.value }))} className="rounded-xl" />
            </LabeledField>
            <LabeledField label="Unit">
              <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="ea / ml / m" className="rounded-xl" />
            </LabeledField>
            <LabeledField label="Cost price (AUD)">
              <Input type="number" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: +e.target.value }))} className="rounded-xl" />
            </LabeledField>
            <LabeledField label="Sell price (AUD)">
              <Input type="number" value={form.sell_price} onChange={e => setForm(f => ({ ...f, sell_price: +e.target.value }))} className="rounded-xl" />
            </LabeledField>
            <LabeledField label="Supplier">
              <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Parts Co." className="rounded-xl" />
            </LabeledField>
          </div>
          <LabeledField label="Description" className="mt-3">
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional notes…" className="rounded-xl" />
          </LabeledField>
          <div className="flex gap-2 mt-4">
            <Button onClick={() => save.mutate(form)} disabled={!form.name || save.isPending} className="gap-2 rounded-xl">
              <Check className="h-4 w-4" /> {save.isPending ? "Saving…" : "Save"}
            </Button>
            <Button variant="outline" onClick={() => setEditingId(null)} className="gap-2 rounded-xl"><X className="h-4 w-4" /> Cancel</Button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="py-16 flex justify-center"><div className="h-7 w-7 border-4 border-border border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No items found</p>
          <p className="text-sm mt-1">Add your first part to get started.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Cost</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Sell</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Supplier</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(item => {
                const low = item.qty_on_hand <= item.qty_low_threshold;
                return (
                  <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{item.name}</p>
                      {item.sku && <p className="text-[11px] text-muted-foreground font-mono">{item.sku}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize", CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other)}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("font-bold", low ? "text-rose-600" : "text-foreground")}>
                        {item.qty_on_hand}
                      </span>
                      {low && <AlertTriangle className="inline ml-1 h-3 w-3 text-amber-500" />}
                      <span className="text-[11px] text-muted-foreground ml-1">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell text-muted-foreground">${item.cost_price?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell font-semibold">${item.sell_price?.toFixed(2)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{item.supplier || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { if (confirm(`Remove "${item.name}" from inventory?`)) remove.mutate(item.id); }}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LabeledField({ label, children, className }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}