import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Package, Plus, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Lets a technician pick parts from the synced Parts catalogue and add them
// to the quote as line items. Reuses the existing add_parts quote action.
export default function PartPickerModal({ job, actor, open, onOpenChange, onAdded, onAdd }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({});
  const [adding, setAdding] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["estore-products"],
    queryFn: () => base44.entities.Product.filter({ supplier: "eScootNow" }, "name", 500),
    enabled: open,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.category_label?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const toggle = (p) =>
    setSelected((s) => {
      const next = { ...s };
      if (next[p.id]) delete next[p.id];
      else next[p.id] = { id: p.id, name: p.name, price: p.price ?? 0, sku: p.sku, qty: 1 };
      return next;
    });

  const setQty = (id, qty) =>
    setSelected((s) => (s[id] ? { ...s, [id]: { ...s[id], qty: Math.max(1, Number(qty) || 1) } } : s));

  const chosen = Object.values(selected);

  const add = async () => {
    if (chosen.length === 0) return;
    setAdding(true);
    if (onAdd) {
      // Caller provides custom add logic (e.g. JobPartsPanel writes to InventoryUsage)
      await onAdd(chosen);
    } else {
      // Default: add to quote line items
      const { addPartsToQuote } = await import("@/services/quoteService");
      await addPartsToQuote(
        job,
        chosen.map((p) => ({ name: p.name, typical_price: p.price, qty: p.qty, retailer: "Parts catalogue" })),
        actor
      );
    }
    setAdding(false);
    setSelected({});
    onAdded?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{onAdd ? "Add parts to invoice" : "Add part to quote"}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>

        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-1.5">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <div className="h-6 w-6 border-4 border-border border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No parts found.
            </div>
          ) : (
            filtered.map((p) => {
              const isSel = !!selected[p.id];
              return (
                <div
                  key={p.id}
                  className={cn(
                    "rounded-lg border p-2.5 text-sm transition-colors",
                    isSel ? "border-accent bg-accent/5" : "border-border"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => toggle(p)}
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded border",
                        isSel ? "border-accent bg-accent text-accent-foreground" : "border-input"
                      )}
                    >
                      {isSel && <Check className="h-3.5 w-3.5" />}
                    </button>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-8 w-8 rounded-lg object-cover shrink-0 bg-secondary" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-secondary shrink-0 grid place-items-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground line-clamp-1">{p.name}</p>
                      {p.sku && <p className="text-[11px] text-muted-foreground font-mono">{p.sku}</p>}
                    </div>
                    {isSel && (
                      <Input
                        type="number"
                        min={1}
                        value={selected[p.id].qty}
                        onChange={(e) => setQty(p.id, e.target.value)}
                        className="h-7 w-14 px-1.5 py-0 text-xs"
                      />
                    )}
                    <span className="font-heading font-bold tabular-nums shrink-0">${(p.price ?? 0).toFixed(2)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Button onClick={add} disabled={chosen.length === 0 || adding} className="gap-1.5">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add {chosen.length > 0 ? `${chosen.length} part${chosen.length !== 1 ? "s" : ""}` : "parts"} {onAdd ? "to invoice" : "to quote"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}