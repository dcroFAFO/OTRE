import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Store, Search, Package, X } from "lucide-react";
import { cn } from "@/lib/utils";

function ProductSearchPicker({ products, onSelect }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => `${p.name || ""} ${p.sku || ""} ${p.category_label || ""}`.toLowerCase().includes(q))
      .slice(0, 20);
  }, [products, search]);

  useEffect(() => {
    setOpen(filtered.length > 0);
  }, [filtered]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!inputRef.current?.closest(".search-picker-root")?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (product) => {
    onSelect(product);
    setSearch("");
    setOpen(false);
  };

  return (
    <div className="search-picker-root relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, SKU or category…"
          className="rounded-xl pl-8 pr-8 text-sm"
          autoFocus
        />
        {search && (
          <button
            onClick={() => { setSearch(""); setOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg"
        >
          {filtered.map((p) => (
            <button
              key={p.id}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(p); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/60 transition-colors text-left"
            >
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="h-8 w-8 rounded-lg object-cover shrink-0 bg-secondary" />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-secondary shrink-0 flex items-center justify-center">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {p.sku && <span className="font-mono">{p.sku} · </span>}
                  {p.category_label || ""}
                </p>
              </div>
              <span className="text-sm font-semibold text-foreground shrink-0">
                ${(Number(p.price) || 0).toFixed(2)}
              </span>
              {!p.in_stock && (
                <span className="text-[10px] bg-rose-100 text-rose-700 rounded-full px-1.5 py-0.5 shrink-0">Out of stock</span>
              )}
            </button>
          ))}
        </div>
      )}

      {search.trim() && filtered.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground px-1">No products match "{search}"</p>
      )}
    </div>
  );
}

export default function JobStoreProductsPanel({ job, canEdit }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState(null); // full product object
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

  const addLink = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await base44.entities.InventoryUsage.create({
        job_id: job.id,
        item_id: selected.id,
        item_name: selected.name,
        qty_used: qty,
        unit_cost: 0,
        unit_sell: Number(selected.price) || 0,
        note,
        source: "estore",
        product_id: selected.id,
        product_sku: selected.sku || "",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(["storeUsage", job.id]);
      setAdding(false);
      setSelected(null);
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
          {/* Step 1: search & pick */}
          {!selected ? (
            <ProductSearchPicker products={products} onSelect={setSelected} />
          ) : (
            <>
              {/* Selected product preview */}
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                {selected.image_url ? (
                  <img src={selected.image_url} alt={selected.name} className="h-9 w-9 rounded-lg object-cover shrink-0 bg-secondary" />
                ) : (
                  <div className="h-9 w-9 rounded-lg bg-secondary shrink-0 flex items-center justify-center">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{selected.name}</p>
                  <p className="text-[11px] text-muted-foreground">${(Number(selected.price) || 0).toFixed(2)} each</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Qty + note */}
              <div className="flex gap-3">
                <div className="w-24">
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Qty</label>
                  <Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, +e.target.value || 1))} className="rounded-xl" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Note (optional)</label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. fitted to rear wheel" className="rounded-xl" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={() => addLink.mutate()} disabled={addLink.isPending} className="rounded-xl text-xs">
                  {addLink.isPending ? "Linking…" : "Add to Job"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setAdding(false); setSelected(null); }} className="rounded-xl text-xs">Cancel</Button>
              </div>
            </>
          )}

          {!selected && (
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)} className="rounded-xl text-xs text-muted-foreground">
              Cancel
            </Button>
          )}
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