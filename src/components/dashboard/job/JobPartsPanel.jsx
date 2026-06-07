import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Package } from "lucide-react";

export default function JobPartsPanel({ job, canEdit }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  const { data: usages = [] } = useQuery({
    queryKey: ["inventoryUsage", job.id],
    queryFn: () => base44.entities.InventoryUsage.filter({ job_id: job.id }, "-created_date", 50),
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ["inventoryItems"],
    queryFn: () => base44.entities.InventoryItem.filter({ active: true }, "name", 200),
    enabled: adding,
  });

  const addUsage = useMutation({
    mutationFn: async () => {
      const item = allItems.find(i => i.id === selectedItemId);
      if (!item) return;
      // Create usage record
      await base44.entities.InventoryUsage.create({
        job_id: job.id,
        item_id: item.id,
        item_name: item.name,
        qty_used: qty,
        unit_cost: item.cost_price,
        unit_sell: item.sell_price,
        note,
      });
      // Decrement stock
      await base44.entities.InventoryItem.update(item.id, {
        qty_on_hand: Math.max(0, (item.qty_on_hand || 0) - qty),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries(["inventoryUsage", job.id]);
      qc.invalidateQueries(["inventoryItems"]);
      setAdding(false);
      setSelectedItemId("");
      setQty(1);
      setNote("");
    },
  });

  const removeUsage = useMutation({
    mutationFn: async (usage) => {
      // Restore stock
      const item = await base44.entities.InventoryItem.get(usage.item_id);
      await base44.entities.InventoryItem.update(usage.item_id, { qty_on_hand: (item.qty_on_hand || 0) + usage.qty_used });
      await base44.entities.InventoryUsage.delete(usage.id);
    },
    onSuccess: () => {
      qc.invalidateQueries(["inventoryUsage", job.id]);
      qc.invalidateQueries(["inventoryItems"]);
    },
  });

  const totalCost = usages.reduce((s, u) => s + (u.unit_cost || 0) * u.qty_used, 0);
  const totalSell = usages.reduce((s, u) => s + (u.unit_sell || 0) * u.qty_used, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-sm text-foreground">Parts &amp; Consumables Used</h3>
        {canEdit && !adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)} className="gap-1.5 rounded-xl text-xs">
            <Plus className="h-3.5 w-3.5" /> Add Part
          </Button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Select part</label>
            <select value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="">— choose an item —</option>
              {allItems.map(i => (
                <option key={i.id} value={i.id}>{i.name} (stock: {i.qty_on_hand} {i.unit})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Qty used</label>
              <Input type="number" min={1} value={qty} onChange={e => setQty(+e.target.value)} className="rounded-xl" />
            </div>
            <div className="flex-[2]">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Note (optional)</label>
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. replaced rear tyre" className="rounded-xl" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => addUsage.mutate()} disabled={!selectedItemId || addUsage.isPending} className="rounded-xl text-xs">
              {addUsage.isPending ? "Adding…" : "Confirm"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)} className="rounded-xl text-xs">Cancel</Button>
          </div>
        </div>
      )}

      {/* Usage list */}
      {usages.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No parts logged yet.</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/40 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
                  <th className="px-3 py-2 text-left">Part</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Cost</th>
                  <th className="px-3 py-2 text-right">Sell</th>
                  {canEdit && <th className="px-3 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usages.map(u => (
                  <tr key={u.id} className="hover:bg-secondary/20">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-foreground">{u.item_name}</p>
                      {u.note && <p className="text-[11px] text-muted-foreground">{u.note}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">{u.qty_used}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">${((u.unit_cost || 0) * u.qty_used).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold">${((u.unit_sell || 0) * u.qty_used).toFixed(2)}</td>
                    {canEdit && (
                      <td className="px-3 py-2.5 text-right">
                        <button onClick={() => { if (confirm("Remove this part usage and restore stock?")) removeUsage.mutate(u); }}
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
          <div className="flex justify-end gap-6 text-sm px-1">
            <span className="text-muted-foreground">Parts cost: <strong className="text-foreground">${totalCost.toFixed(2)}</strong></span>
            <span className="text-muted-foreground">Parts sell: <strong className="text-foreground">${totalSell.toFixed(2)}</strong></span>
          </div>
        </>
      )}
    </div>
  );
}