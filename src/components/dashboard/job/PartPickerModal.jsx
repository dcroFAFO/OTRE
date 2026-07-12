import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Package, Plus, Check, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PARTS_MARKUP_PERCENT, customerUnitPriceFromCost, roundMoney } from "@/lib/partsPricing";

const MISC_PART_ID = "parts-misc";
const MISC_PART_NAME = "Parts - Misc";
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

function selectedFromProduct(p) {
  const costPrice = roundMoney(p.price ?? 0);
  return {
    id: p.id,
    name: p.name,
    cost_price: costPrice,
    price: costPrice,
    customer_price: customerUnitPriceFromCost(costPrice),
    markup_percentage: PARTS_MARKUP_PERCENT,
    sku: p.sku,
    category_key: p.category_key,
    category_label: p.category_label,
    qty: 1,
    is_custom_misc_part: false,
  };
}

function miscPart() {
  return {
    id: MISC_PART_ID,
    name: MISC_PART_NAME,
    cost_price: 0,
    price: 0,
    customer_price: 0,
    markup_percentage: PARTS_MARKUP_PERCENT,
    sku: "",
    qty: 1,
    note: "",
    is_custom_misc_part: true,
  };
}

export default function PartPickerModal({ job, open, onOpenChange, onAdded, onAdd }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({});
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [validationError, setValidationError] = useState("");

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
    setValidationError("");
    const next = { ...s };
    if (next[p.id]) delete next[p.id];
    else next[p.id] = selectedFromProduct(p);
    return next;
  });

  const toggleMisc = () => setSelected((s) => {
    setValidationError("");
    const next = { ...s };
    if (next[MISC_PART_ID]) delete next[MISC_PART_ID];
    else next[MISC_PART_ID] = miscPart();
    return next;
  });

  const updateSelected = (id, patch) => setSelected((s) => {
    if (!s[id]) return s;
    const nextItem = { ...s[id], ...patch };
    const cost = roundMoney(nextItem.cost_price ?? nextItem.price ?? 0);
    nextItem.cost_price = cost;
    nextItem.price = cost;
    nextItem.customer_price = customerUnitPriceFromCost(cost);
    return { ...s, [id]: nextItem };
  });

  const setQty = (id, qty) => updateSelected(id, { qty: Math.max(1, Number(qty) || 1) });
  const chosen = Object.values(selected);
  const miscSelected = selected[MISC_PART_ID];

  const validate = () => {
    if (!miscSelected) return true;
    if (!String(miscSelected.name || "").trim()) return "Enter a part name or description for Parts - Misc.";
    const qty = Number(miscSelected.qty);
    if (!Number.isFinite(qty) || qty <= 0) return "Quantity must be greater than 0.";
    const cost = Number(miscSelected.cost_price);
    if (!Number.isFinite(cost) || cost < 0) return "Cost price must be a valid non-negative amount.";
    return true;
  };

  const add = async () => {
    if (chosen.length === 0) return;
    const validation = validate();
    if (validation !== true) {
      setValidationError(validation);
      return;
    }
    setAdding(true);
    try {
      const prepared = chosen.map((p) => ({
        ...p,
        name: String(p.name || MISC_PART_NAME).trim(),
        qty: Number(p.qty) || 1,
        cost_price: roundMoney(p.cost_price ?? p.price ?? 0),
        price: roundMoney(p.cost_price ?? p.price ?? 0),
        customer_price: customerUnitPriceFromCost(p.cost_price ?? p.price ?? 0),
        customer_line_total: roundMoney(customerUnitPriceFromCost(p.cost_price ?? p.price ?? 0) * (Number(p.qty) || 1)),
      }));
      if (onAdd) await onAdd(prepared);
      else {
        const { addPartsToQuote } = await import("@/services/quoteService");
        await addPartsToQuote(job, prepared.map((p) => ({
          name: p.name,
          typical_price: p.customer_price,
          cost_price: p.cost_price,
          customer_price: p.customer_price,
          customer_line_total: p.customer_line_total,
          markup_percentage: PARTS_MARKUP_PERCENT,
          qty: p.qty,
          sku: p.sku,
          product_code: p.sku,
          is_custom_misc_part: !!p.is_custom_misc_part,
          note: p.note || "",
        })));
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
          <div onClick={toggleMisc} className={cn("rounded-xl border p-3 text-sm transition-colors cursor-pointer hover:bg-secondary/50", miscSelected ? "border-accent bg-accent/5" : "border-border bg-card")}>
            <div className="flex items-center gap-2.5">
              <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded border", miscSelected ? "border-accent bg-accent text-accent-foreground" : "border-input")}>{miscSelected && <Check className="h-3.5 w-3.5" />}</span>
              <div className="h-9 w-9 rounded-lg bg-secondary shrink-0 grid place-items-center"><Package className="h-4 w-4 text-muted-foreground" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{MISC_PART_NAME}</p>
                <p className="text-xs text-muted-foreground">Custom part or charge not listed in the catalogue</p>
              </div>
              {miscSelected && <span className="text-xs font-medium text-muted-foreground">Custom</span>}
            </div>
            {miscSelected && (
              <div onClick={(e) => e.stopPropagation()} className="mt-3 grid gap-3 rounded-lg border border-border bg-background p-3">
                <div className="space-y-1">
                  <Label className="text-xs">Part name/description</Label>
                  <Input value={miscSelected.name} onChange={(e) => updateSelected(MISC_PART_ID, { name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input type="number" min="0.01" step="0.01" value={miscSelected.qty} onChange={(e) => updateSelected(MISC_PART_ID, { qty: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Cost price</Label>
                    <Input type="number" min="0" step="0.01" value={miscSelected.cost_price} onChange={(e) => updateSelected(MISC_PART_ID, { cost_price: e.target.value })} />
                  </div>
                </div>
                <div className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                  Customer price: <span className="font-semibold text-foreground">${miscSelected.customer_price.toFixed(2)}</span> per unit
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Optional notes</Label>
                  <Textarea value={miscSelected.note || ""} onChange={(e) => updateSelected(MISC_PART_ID, { note: e.target.value })} className="h-16 resize-none" />
                </div>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center"><div className="h-6 w-6 border-4 border-border border-t-primary rounded-full animate-spin" /></div>
          ) : grouped.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm"><Package className="h-8 w-8 mx-auto mb-2 opacity-30" />No catalogue parts found.</div>
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
                      const costPrice = roundMoney(p.price ?? 0);
                      const customerPrice = customerUnitPriceFromCost(costPrice);
                      return (
                        <div key={p.id} onClick={() => toggle(p)} className={cn("p-2.5 text-sm transition-colors cursor-pointer hover:bg-secondary/50", isSel && "bg-accent/5 hover:bg-accent/10")}>
                          <div className="flex items-center gap-2.5">
                            <span onClick={(e) => e.stopPropagation()} className="contents">
                              <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded border pointer-events-none", isSel ? "border-accent bg-accent text-accent-foreground" : "border-input")}>{isSel && <Check className="h-3.5 w-3.5" />}</span>
                            </span>
                            {p.image_url ? <img src={p.image_url} alt={p.name} className="h-8 w-8 rounded-lg object-cover shrink-0 bg-secondary" /> : <div className="h-8 w-8 rounded-lg bg-secondary shrink-0 grid place-items-center"><Package className="h-4 w-4 text-muted-foreground" /></div>}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground line-clamp-1">{p.name}</p>
                              {p.sku && <p className="text-[11px] text-muted-foreground font-mono">{p.sku}</p>}
                            </div>
                            {isSel && <Input type="number" min={1} value={selected[p.id].qty} onClick={(e) => e.stopPropagation()} onChange={(e) => { e.stopPropagation(); setQty(p.id, e.target.value); }} className="h-7 w-14 px-1.5 py-0 text-xs" />}
                            <span className="text-right shrink-0">
                              <span className="block text-[11px] text-muted-foreground">Cost price ${costPrice.toFixed(2)}</span>
                              <span className="block font-heading font-bold tabular-nums">Customer price ${customerPrice.toFixed(2)}</span>
                            </span>
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

        {validationError && <p className="text-sm text-destructive">{validationError}</p>}
        <Button onClick={add} disabled={chosen.length === 0 || adding} className="gap-1.5">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add {chosen.length > 0 ? `${chosen.length} part${chosen.length !== 1 ? "s" : ""}` : "parts"} {onAdd ? "to job" : "to quote"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
