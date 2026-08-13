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
import { EmptyState, ErrorState, LoadingSpinner, NoResultsState } from "@/components/shared";
import { getSafeErrorMessage } from "@/lib/errors";

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

/** @param {{ job: any, actor?: any, open: boolean, onOpenChange: (open: boolean) => void, onAdded?: () => void, onAdd?: (items: any[]) => Promise<any> | any }} props */
export default function PartPickerModal({ job, actor, open, onOpenChange, onAdded, onAdd }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({});
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [validationError, setValidationError] = useState("");

  const productsQuery = useQuery({
    queryKey: ["estore-products"],
    queryFn: () => base44.entities.Product.filter({ supplier: "eScootNow" }, "name", 500),
    enabled: open,
  });
  const products = productsQuery.data || [];

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
    if (adding || chosen.length === 0) return;
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
        const { addInventoryParts } = await import("@/services/jobService");
        await addInventoryParts(job, prepared);
      }
      setSelected({});
      onAdded?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(getSafeErrorMessage(err, "The selected parts could not be added."));
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !adding && onOpenChange(nextOpen)}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add repair parts</DialogTitle>
        </DialogHeader>

        <label className="relative block">
          <span className="sr-only">Search repair parts</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input placeholder="Search repair parts" value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 pl-9" />
        </label>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <div className={cn("rounded-lg border text-sm transition-colors", miscSelected ? "border-accent bg-accent/5" : "border-border bg-card")}>
            <button type="button" onClick={toggleMisc} aria-pressed={Boolean(miscSelected)} className="flex min-h-11 w-full items-center gap-2.5 p-3 text-left hover:bg-secondary/50">
              <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded border", miscSelected ? "border-accent bg-accent text-accent-foreground" : "border-input")}>{miscSelected && <Check className="h-3.5 w-3.5" />}</span>
              <div className="h-9 w-9 rounded-lg bg-secondary shrink-0 grid place-items-center"><Package className="h-4 w-4 text-muted-foreground" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{MISC_PART_NAME}</p>
                <p className="text-xs text-muted-foreground">Custom part or charge not listed in the catalogue</p>
              </div>
              {miscSelected && <span className="text-xs font-medium text-muted-foreground">Custom</span>}
            </button>
            {miscSelected && (
              <div className="grid gap-3 border-t border-border bg-background p-3">
                <div className="space-y-1">
                  <Label htmlFor="misc-part-name" className="text-xs">Part name or description</Label>
                  <Input id="misc-part-name" value={miscSelected.name} onChange={(e) => updateSelected(MISC_PART_ID, { name: e.target.value })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="misc-part-quantity" className="text-xs">Quantity</Label>
                    <Input id="misc-part-quantity" type="number" min="0.01" step="0.01" inputMode="decimal" value={miscSelected.qty} onChange={(e) => updateSelected(MISC_PART_ID, { qty: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="misc-part-cost" className="text-xs">Cost price</Label>
                    <Input id="misc-part-cost" type="number" min="0" step="0.01" inputMode="decimal" value={miscSelected.cost_price} onChange={(e) => updateSelected(MISC_PART_ID, { cost_price: e.target.value })} />
                  </div>
                </div>
                <div className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                  Customer price: <span className="font-semibold text-foreground">${miscSelected.customer_price.toFixed(2)}</span> per unit
                </div>
                <div className="space-y-1">
                  <Label htmlFor="misc-part-notes" className="text-xs">Optional notes</Label>
                  <Textarea id="misc-part-notes" value={miscSelected.note || ""} onChange={(e) => updateSelected(MISC_PART_ID, { note: e.target.value })} className="h-20 resize-none" />
                </div>
              </div>
            )}
          </div>

          {productsQuery.error && products.length > 0 ? <ErrorState title="Latest catalogue changes could not be loaded" description="Previously loaded parts remain available." error={productsQuery.error} onRetry={productsQuery.refetch} /> : null}

          {productsQuery.isLoading ? (
            <LoadingSpinner label="Loading parts catalogue" className="flex py-12" />
          ) : productsQuery.error && products.length === 0 ? (
            <ErrorState title="Parts catalogue could not be loaded" error={productsQuery.error} onRetry={productsQuery.refetch} />
          ) : products.length === 0 ? (
            <EmptyState icon={Package} title="No catalogue parts yet" description="Use the custom part option above or refresh the parts catalogue." />
          ) : grouped.length === 0 ? (
            <NoResultsState title="No parts match this search" onClear={() => setSearch("")} />
          ) : grouped.map((group) => {
            const isOpen = !!expanded[group.category] || !!search;
            return (
              <div key={group.category} className="overflow-hidden rounded-lg border border-border">
                <button type="button" onClick={() => setExpanded((current) => ({ ...current, [group.category]: !current[group.category] }))} aria-expanded={isOpen} className="flex min-h-11 w-full items-center justify-between bg-secondary/40 px-3 text-sm font-semibold">
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
                        <div key={p.id} className={cn("p-2.5 text-sm transition-colors", isSel && "bg-accent/5")}>
                          <button type="button" onClick={() => toggle(p)} aria-pressed={isSel} className="flex min-h-11 w-full items-center gap-2.5 rounded-md text-left hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <span className={cn("pointer-events-none grid h-5 w-5 shrink-0 place-items-center rounded border", isSel ? "border-accent bg-accent text-accent-foreground" : "border-input")}>{isSel && <Check className="h-3.5 w-3.5" />}</span>
                            {p.image_url ? <img src={p.image_url} alt="" className="h-8 w-8 shrink-0 rounded-md bg-secondary object-cover" /> : <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-secondary"><Package className="h-4 w-4 text-muted-foreground" /></span>}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground line-clamp-1">{p.name}</p>
                              {p.sku && <p className="text-[11px] text-muted-foreground font-mono">{p.sku}</p>}
                            </div>
                            <span className="text-right shrink-0">
                              <span className="block text-[11px] text-muted-foreground">Cost price ${costPrice.toFixed(2)}</span>
                              <span className="block font-heading font-bold tabular-nums">Customer price ${customerPrice.toFixed(2)}</span>
                            </span>
                          </button>
                          {isSel ? (
                            <div className="mt-2 flex items-center justify-end gap-2">
                              <Label htmlFor={`part-quantity-${p.id}`} className="text-xs">Quantity</Label>
                              <Input id={`part-quantity-${p.id}`} type="number" min={1} inputMode="numeric" value={selected[p.id].qty} onChange={(e) => setQty(p.id, e.target.value)} className="h-11 w-20 text-xs" />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {validationError && <p className="text-sm text-destructive" role="alert">{validationError}</p>}
        <Button type="button" size="touch" onClick={add} disabled={chosen.length === 0 || adding} className="gap-1.5">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add {chosen.length > 0 ? `${chosen.length} part${chosen.length !== 1 ? "s" : ""}` : "parts"} to job
        </Button>
      </DialogContent>
    </Dialog>
  );
}
