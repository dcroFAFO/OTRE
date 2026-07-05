import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function ServicePriceRow({ item, onSavePrice }) {
  const [price, setPrice] = useState(item.price ?? 0);
  const [saving, setSaving] = useState(false);
  const dirty = Number(price) !== Number(item.price ?? 0);

  const save = async () => {
    setSaving(true);
    await onSavePrice(item, Number(price) || 0);
    setSaving(false);
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
        <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-24 h-8 text-right" />
        <Button size="sm" variant={dirty ? "default" : "ghost"} className="h-8 px-2" onClick={save} disabled={!dirty || saving}>
          <Check className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}