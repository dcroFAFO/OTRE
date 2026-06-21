import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Package, Plus, Check, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORY_NAMES = [
  "Tyres", "Tubes", "Brakes", "Batteries", "Controllers", "Displays", "Throttles", "Chargers", "Cables", "Bearings", "Lights", "Other parts",
];

const CATEGORY_KEYWORDS = {
  Tyres: ["tyre", "tire"],
  Tubes: ["tube", "inner tube"],
  Brakes: ["brake", "pad", "disc", "rotor"],
  Batteries: ["battery", "bms"],
  Controllers: ["controller"],
  Displays: ["display", "screen", "dashboard"],
  Throttles: ["throttle", "accelerator"],
  Chargers: ["charger", "charging"],
  Cables: ["cable", "wire", "loom", "connector"],
  Bearings: ["bearing"],
  Lights: ["light", "lamp", "led"],
};

function categoryFor(product) {
  const text = `${product.category_label || ""} ${product.category_key || ""} ${product.name || ""}`.toLowerCase();
  return CATEGORY_NAMES.find((category) => (CATEGORY_KEYWORDS[category] || []).some((word) => text.includes(word))) || "Other parts";
}

export default function PartPickerModal({ job, actor, open, onOpenChange, onAdded, onAdd }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({});
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState({ Tyres: true });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["estore-products"],
    queryFn: () => base44.entities.Product.filter({ supplier: "eScootNow" }, "name", 500),
    enabled: open,
  });

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const groups = Object.fromEntries(CATEGORY_NAMES.map((category) => [category, []]));
    products
      .filter((p) => !q || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.category_label?.toLowerCase().includes(q))
      .forEach((product) => groups[categoryFor(product)].push(product));
    return CATEGORY_NAMES.map((category) => ({ category, products: groups[category] })).filter((group) => group.products.length > 0);
  }, [products, search]);

  const toggle = (p) => setSelected((s) => {
    const next = { ...s };
    if (next[p.id]) delete next[p.id];
    else next[p.id] = { id: p.id, name: p.name, price: p.price ?? 0, sku: p.sku, qty: 1 };
    return next;
  });

  const setQty = (id, qty) => setSelected((s) => (s[id] ? { ...s, [id]: { ...s[id], qty: Math.max(1, Number(qty) || 1) } } : s));
  const chosen = Object.values(selected);

  const add = async () => {
    if (chosen.length === 0) return;
    setAdding(true);
    try {
      if (onAdd) await onAdd(chosen);
      else {
        const { addPartsToQuote } = await import("@/services/quoteService");
        await addPartsToQuote(job, chosen.map((p) => ({ name: p.name, typical_price: p.price, qty: p.qty, sku: p.sku, product_code: p.sku, retailer: "Parts catalogue" })), actor);
      }
      setSelected({});
      onAdded?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Add parts failed:", err);
      toast.error(`Couldn't add parts: ${err?.response?.data?.error || err?.message || "Please try again."}`);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{onAdd ? "Add repair parts" : "Add part to quote"}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search parts within categories…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            <div className="py-12 flex justify-center"><div className="h-6 w-6 border-4 border-border border-t-primary rounded-full animate-spin" /></div>
          ) : grouped.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm"><Package className="h-8 w-8 mx-auto mb-2 opacity-30" />No parts found.</div>
          ) : grouped.map((group) => {
            const isOpen = !!expanded[group.category] || !!search;
            return (
              <div key={group.category} className="rounded-xl border border-border overflow-hidden">
                <button type="button" onClick={() => setExpanded((current) => ({ ...current, [group.category]: !current[group.category] }))} className="w-full flex items-center justify-between bg-secondary/40 px-3 py-2 text-sm font-semibold">
                  <span className="flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" />{group.category}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">{group.products.length}{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
                </button>
                {isOpen && (
                  <div className="divide-y divide-border">
                    {group.products.map((p) => {
                      const isSel = !!selected[p.id];
                      return (
                        <div key={p.id} className={cn("p-2.5 text-sm transition-colors", isSel && "bg-accent/5")}>
                          <div className="flex items-center gap-2.5">
                            <button onClick={() => toggle(p)} className={cn("grid h-5 w-5 shrink-0 place-items-center rounded border", isSel ? "border-accent bg-accent text-accent-foreground" : "border-input")}>{isSel && <Check className="h-3.5 w-3.5" />}</button>
                            {p.image_url ? <img src={p.image_url} alt={p.name} className="h-8 w-8 rounded-lg object-cover shrink-0 bg-secondary" /> : <div className="h-8 w-8 rounded-lg bg-secondary shrink-0 grid place-items-center"><Package className="h-4 w-4 text-muted-foreground" /></div>}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground line-clamp-1">{p.name}</p>
                              {p.sku && <p className="text-[11px] text-muted-foreground font-mono">{p.sku}</p>}
                            </div>
                            {isSel && <Input type="number" min={1} value={selected[p.id].qty} onChange={(e) => setQty(p.id, e.target.value)} className="h-7 w-14 px-1.5 py-0 text-xs" />}
                            <span className="font-heading font-bold tabular-nums shrink-0">${(p.price ?? 0).toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Button onClick={add} disabled={chosen.length === 0 || adding} className="gap-1.5">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add {chosen.length > 0 ? `${chosen.length} part${chosen.length !== 1 ? "s" : ""}` : "parts"} {onAdd ? "to job" : "to quote"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}