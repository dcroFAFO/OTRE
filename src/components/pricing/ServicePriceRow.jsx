import React, { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { getSafeErrorMessage } from "@/lib/errors";

export default function ServicePriceRow({ item, onSavePrice }) {
  const [price, setPrice] = useState(item.price ?? 0);
  const [saving, setSaving] = useState(false);
  const inputId = useId();
  const dirty = Number(price) !== Number(item.price ?? 0);

  const save = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    try {
      await onSavePrice(item, Number(price) || 0);
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "The service price could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/40">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.name}</p>
        {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
      </div>
      <span className="text-xs text-muted-foreground hidden sm:block">{item.category}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground text-sm">$</span>
        <label htmlFor={inputId} className="sr-only">Price for {item.name}</label>
        <Input id={inputId} type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="h-11 w-24 text-right sm:h-8" />
        <Button size="iconTouch" variant={dirty ? "default" : "ghost"} className="sm:h-8 sm:w-8" onClick={save} disabled={!dirty || saving} aria-label={`Save price for ${item.name}`} aria-busy={saving || undefined}>
          <Check className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
