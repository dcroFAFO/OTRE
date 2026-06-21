import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Loader2, Plus, Search, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

const CATALOGUE = [
  { name: "Labour", price: 80, kind: "labour" },
  { name: "Diagnostic labour", price: 80, kind: "labour" },
  { name: "Repair labour", price: 80, kind: "labour" },
  { name: "Workshop fee", price: 15, kind: "fee" },
  { name: "Call-out fee", price: 60, kind: "fee" },
  { name: "Surcharge", price: 30, kind: "surcharge" },
  { name: "Tape", price: 3, kind: "consumable" },
  { name: "Solder", price: 5, kind: "consumable" },
  { name: "Heat shrink", price: 4, kind: "consumable" },
  { name: "Cable ties", price: 2, kind: "consumable" },
  { name: "Sealant", price: 8, kind: "consumable" },
  { name: "Cleaning supplies", price: 6, kind: "consumable" },
  { name: "Other consumable", price: 0, kind: "consumable" },
];

export default function LabourConsumablePickerModal({ open, onOpenChange, onAdd }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({});
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? CATALOGUE.filter((item) => item.name.toLowerCase().includes(q) || item.kind.toLowerCase().includes(q)) : CATALOGUE;
  }, [search]);

  const toggleItem = (item) => {
    setSelected((current) => {
      const next = { ...current };
      if (next[item.name]) delete next[item.name];
      else next[item.name] = { ...item, description: item.name, qty: 1, unit_price: item.price, tax_rate: 0 };
      return next;
    });
  };

  const updateSelected = (name, patch) => setSelected((current) => ({
    ...current,
    [name]: { ...current[name], ...patch },
  }));

  const chosen = Object.values(selected);

  const add = async () => {
    if (chosen.length === 0) return;
    setAdding(true);
    try {
      await onAdd(chosen.map((item) => ({
        description: item.description || item.name,
        qty: Number(item.qty) || 1,
        unit_price: Number(item.unit_price) || 0,
        tax_rate: Number(item.tax_rate) || 0,
        discount_amount: 0,
        kind: item.kind || "consumable",
      })));
      setSelected({});
      onOpenChange(false);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Labour and Consumables catalogue</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search labour, fees, surcharges, consumables…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl" />
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map((item) => {
              const isSelected = !!selected[item.name];
              const draft = selected[item.name] || item;
              return (
                <div key={item.name} className={cn("rounded-xl border border-border p-3 text-sm", isSelected && "border-primary bg-primary/5")}>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleItem(item)}
                      className={cn("grid h-5 w-5 shrink-0 place-items-center rounded border", isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input")}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.kind}</p>
                    </div>
                    <span className="font-semibold tabular-nums">${Number(item.price || 0).toFixed(2)}</span>
                  </div>

                  {isSelected && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-4">
                      <div className="space-y-1 sm:col-span-4">
                        <Label className="text-xs">Description</Label>
                        <Input value={draft.description} onChange={(e) => updateSelected(item.name, { description: e.target.value })} className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Qty</Label>
                        <Input type="number" min="0.01" step="0.01" value={draft.qty} onChange={(e) => updateSelected(item.name, { qty: e.target.value })} className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Unit price</Label>
                        <Input type="number" min="0" step="0.01" value={draft.unit_price} onChange={(e) => updateSelected(item.name, { unit_price: e.target.value })} className="h-8" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tax %</Label>
                        <Input type="number" min="0" step="0.01" value={draft.tax_rate} onChange={(e) => updateSelected(item.name, { tax_rate: e.target.value })} className="h-8" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Button onClick={add} disabled={chosen.length === 0 || adding} className="gap-1.5">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add {chosen.length > 0 ? `${chosen.length} item${chosen.length !== 1 ? "s" : ""}` : "Labour / Consumable"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}