import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Store, Search } from "lucide-react";

export default function JobStoreProductsPanel({ job, canEdit }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  const { data: links = [] } = useQuery({
    queryKey: ["storeUsage", job.id],
    queryFn: () => base44.entities.InventoryUsage.filter({ job_id: job.id, source: "estore" }, "-created_date", 50),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["storeProducts"],
    queryFn: () => base44.entities.Product.filter({ active: true }, "name", 500),
    enabled: adding,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      `${p.name || ""} ${p.sku || ""} ${p.category_label || ""}`.toLowerCase().includes(q)
    );
  }, [products, search]);

  const addLink = useMutation({
    mutationFn: async () => {
      const p = products.find((x) => x.id === selectedId);
      if (!p) return;
      await base44.entities.InventoryUsage.create({
        job_id: job.id,
        item_id: p.id,
        item_name: p.name,
        qty_used: qty,
        unit_cost: 0,
        unit_sell: Number(p.price) || 0,
        note,
        source: "estore",
        product_id: p.id,
        product_sku: p.sku || "",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(["storeUsage", job.id]);
      setAdding(false);
      setSelectedId("");
      setSearch("");
      setQty(1);
      setNote("");
    },
  });

  const removeLink = useMutation({
    mutationFn: (link) => base44.entities.InventoryUsage.delete(link.id),
    onSuccess: () => qc.invalidateQueries(["storeUsage", job.id]),
  });

  const totalSell = links.reduce((s, l) => s + (l.unit_sell || 0) * l.qty_used, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-1.5">
          <Store className="h-4 w-4 text-accent" /> E-store Parts Linked
        </h3>
        {canEdit && !adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="gap-1.5 rounded-xl text-xs">
            <Plus className="h-3.5 w-3.5" /> Link Product
          </Button>
        )}
      </div>

      {adding && (
        <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search e-store products…"
              className="rounded-xl pl-8"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Select product</label>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">— choose a product —</option>
              {filtered.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.sku ? ` · ${p.sku}` : ""} — ${(Number(p.price) || 0).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Qty</label>
              <Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, +e.target.value || 1))} className="rounded-xl" />
            </div>
            <div className="flex-[2]">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Note (optional)</label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. fitted to rear wheel" className="rounded-xl" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => addLink.mutate()} disabled={!selectedId || addLink.isPending} className="rounded-xl text-xs">
              {addLink.isPending ? "Linking…" : "Confirm"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)} className="rounded-xl text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {links.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground">
          <Store className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No e-store products linked to this job yet.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  {canEdit && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {links.map((l) => (
                  <tr key={l.id} className="hover:bg-secondary/20">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-foreground">{l.item_name}</p>
                      {l.product_sku && <p className="text-[11px] text-muted-foreground">SKU: {l.product_sku}</p>}
                      {l.note && <p className="text-[11px] text-muted-foreground">{l.note}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{l.qty_used}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">${((l.unit_sell || 0) * l.qty_used).toFixed(2)}</td>
                    {canEdit && (
                      <td className="px-3 py-2.5 text-right">
                        <button onClick={() => { if (confirm("Unlink this product from the job?")) removeLink.mutate(l); }}
                          className="p-1 rounded hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end text-sm px-1">
            <span className="text-muted-foreground">E-store total: <strong className="text-foreground">${totalSell.toFixed(2)}</strong></span>
          </div>
        </>
      )}
    </div>
  );
}