import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Package, Wrench, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PartPickerModal from "@/components/dashboard/job/PartPickerModal";

export default function JobPartsPanel({ job, actor, canEdit }) {
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [labourHours, setLabourHours] = useState("1");
  const [addingLabour, setAddingLabour] = useState(false);

  const { data: usages = [], refetch } = useQuery({
    queryKey: ["inventoryUsage", job.id],
    queryFn: () => base44.entities.InventoryUsage.filter({ job_id: job.id, source: "inventory" }, "-created_date", 50),
  });

  const removeUsage = useMutation({
    mutationFn: async (usage) => {
      const item = await base44.entities.InventoryItem.get(usage.item_id);
      await base44.entities.InventoryItem.update(usage.item_id, { qty_on_hand: (item.qty_on_hand || 0) + usage.qty_used });
      await base44.entities.InventoryUsage.delete(usage.id);
    },
    onSuccess: () => {
      qc.invalidateQueries(["inventoryUsage", job.id]);
      qc.invalidateQueries(["inventoryItems"]);
    },
  });

  const addLabour = async () => {
    const hrs = Number(labourHours) || 1;
    if (hrs <= 0) return;
    setAddingLabour(true);
    await base44.functions.invoke("quoteActions", { action: "add_labour", jobId: job.id, hours: hrs });
    setAddingLabour(false);
  };

  const totalSell = usages.reduce((s, u) => s + (u.unit_sell || 0) * u.qty_used, 0);

  return (
    <div className="space-y-4">
      <h3 className="font-heading font-bold flex items-center gap-2 text-sm">
        Parts &amp; Consumables
      </h3>

      {/* Line items section — mirrors QuotePanel */}
      <div className="rounded-xl border-2 border-dashed border-border bg-secondary/20 overflow-hidden">
        {/* Header bar with labour adder */}
        <div className="flex items-center justify-between px-3 py-2 bg-secondary/50 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" /> Parts Used
          </span>
          {canEdit && (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Wrench className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground hidden sm:inline">Labour</span>
              <Input
                type="number" min={0.25} step={0.25}
                value={labourHours}
                onChange={(e) => setLabourHours(e.target.value)}
                className="h-6 w-14 px-1.5 py-0 text-xs"
              />
              <span className="text-xs text-muted-foreground">hr</span>
              <Button size="sm" variant="outline" className="h-6 text-xs px-2 gap-1" onClick={addLabour} disabled={addingLabour}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Clickable body — opens parts picker */}
        <div
          className={`group min-h-[120px] ${canEdit ? "cursor-pointer" : ""}`}
          onClick={() => canEdit && setPickerOpen(true)}
        >
          {usages.length > 0 ? (
            <div className="divide-y divide-border">
              {usages.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-3 py-2.5 text-sm group-hover:bg-secondary/30 transition-colors">
                  <span className="text-foreground">
                    {u.qty_used > 1 ? `${u.qty_used}× ` : ""}{u.item_name}
                    {u.note && <span className="text-muted-foreground text-xs ml-1.5">— {u.note}</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium tabular-nums">${((u.unit_sell || 0) * u.qty_used).toFixed(2)}</span>
                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Remove this part and restore stock?")) removeUsage.mutate(u);
                        }}
                        className="p-1 rounded hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {canEdit && (
                <div className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-muted-foreground group-hover:text-accent transition-colors border-t border-dashed border-border">
                  <Plus className="h-3 w-3" /> Add parts / search catalogue
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground group-hover:text-accent transition-colors">
              <Package className="h-8 w-8 opacity-30 group-hover:opacity-60 transition-opacity" />
              <p className="text-sm font-medium">{canEdit ? "Click to add parts" : "No parts logged yet."}</p>
              {canEdit && <p className="text-xs opacity-60">Search the parts catalogue</p>}
            </div>
          )}
        </div>
      </div>

      {usages.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
          <span className="text-sm font-medium">Parts total</span>
          <span className="font-heading text-xl font-extrabold">${totalSell.toFixed(2)}</span>
        </div>
      )}

      {canEdit && (
        <PartPickerModal
          job={job}
          actor={actor}
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onAdded={() => { refetch(); qc.invalidateQueries(["inventoryItems"]); }}
        />
      )}
    </div>
  );
}