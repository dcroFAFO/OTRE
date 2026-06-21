import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Package, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import PartPickerModal from "@/components/dashboard/job/PartPickerModal";
import { addInventoryParts, removeInventoryPart, removeInventoryParts } from "@/services/jobService";
import { addPartsToInvoice } from "@/services/paymentService";
import { toast } from "sonner";

export default function JobPartsPanel({ job, actor, canEdit, onChange }) {
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const { data: usages = [], refetch } = useQuery({
    queryKey: ["inventoryUsage", job.id, job.job_id],
    queryFn: async () => {
      const primary = await base44.entities.InventoryUsage.filter({ job_id: job.id, source: "inventory" }, "-created_date", 50);
      if (!job.job_id || job.job_id === job.id) return primary;
      const legacy = await base44.entities.InventoryUsage.filter({ job_id: job.job_id, source: "inventory" }, "-created_date", 50);
      const seen = new Set();
      return [...primary, ...legacy].filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    },
  });

  const removeUsage = useMutation({
    mutationFn: (payload) => Array.isArray(payload)
      ? removeInventoryParts(job, payload)
      : removeInventoryPart(job, payload),
    onSuccess: () => {
      setSelectedIds([]);
      refetch();
      qc.invalidateQueries({ queryKey: ["inventoryUsage"] });
      qc.invalidateQueries({ queryKey: ["inventoryItems"] });
      onChange?.();
    },
  });

  const addToInvoice = useMutation({
    mutationFn: (selectedUsages) => addPartsToInvoice(job, selectedUsages.map((usage) => usage.id)),
    onSuccess: () => {
      setSelectedIds([]);
      refetch();
      qc.invalidateQueries({ queryKey: ["inventoryUsage"] });
      toast.success("Parts added to invoice.");
      onChange?.();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || "Couldn't add parts to invoice.");
    },
  });

  const selectedUsages = usages.filter((usage) => selectedIds.includes(usage.id));
  const allSelected = usages.length > 0 && selectedIds.length === usages.length;
  const totalSell = usages.reduce((s, u) => s + (u.unit_sell || 0) * u.qty_used, 0);

  const toggleAll = (checked) => setSelectedIds(checked ? usages.map((usage) => usage.id) : []);
  const toggleOne = (usageId, checked) => setSelectedIds((current) =>
    checked ? [...current, usageId] : current.filter((id) => id !== usageId)
  );
  const removeSelected = () => {
    if (selectedUsages.length === 0) return;
    if (confirm(`Remove ${selectedUsages.length} selected line item(s) and restore stock?`)) {
      removeUsage.mutate(selectedUsages);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading font-bold flex items-center gap-2 text-sm">
          Parts &amp; Consumables
        </h3>
        {canEdit && selectedUsages.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => addToInvoice.mutate(selectedUsages)}
              disabled={addToInvoice.isPending}
            >
              {addToInvoice.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Add to invoice ({selectedUsages.length})
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 gap-1.5"
              onClick={removeSelected}
              disabled={removeUsage.isPending}
            >
              {removeUsage.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete selected ({selectedUsages.length})
            </Button>
          </div>
        )}
      </div>

      {/* Line items section — mirrors QuotePanel */}
      <div className="rounded-xl border-2 border-dashed border-border bg-secondary/20 overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center px-3 py-2 bg-secondary/50 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            {canEdit && usages.length > 0 && (
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                onClick={(e) => e.stopPropagation()}
                className="mr-1"
              />
            )}
            <Package className="h-3.5 w-3.5" /> Parts Used
          </span>
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
                  <div className="flex items-center gap-2 min-w-0">
                    {canEdit && (
                      <Checkbox
                        checked={selectedIds.includes(u.id)}
                        onCheckedChange={(checked) => toggleOne(u.id, checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                      />
                    )}
                    <span className="text-foreground truncate">
                      {u.qty_used > 1 ? `${u.qty_used}× ` : ""}{u.item_name}
                      {u.note && <span className="text-muted-foreground text-xs ml-1.5">— {u.note}</span>}
                    </span>
                  </div>
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
          onAdd={(chosen) => addInventoryParts(job, chosen)}
          onAdded={() => { refetch(); qc.invalidateQueries({ queryKey: ["inventoryItems"] }); onChange?.(); }}
        />
      )}
    </div>
  );
}