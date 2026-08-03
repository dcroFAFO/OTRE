import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Wrench, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getJobInvoice, createInvoice, updateInvoiceLineItems } from "@/services/paymentService";
import LabourConsumablePickerModal from "./LabourConsumablePickerModal";

function lineTotal(item) {
  const base = (Number(item.qty) || 1) * (Number(item.unit_price) || 0);
  return base + base * ((Number(item.tax_rate) || 0) / 100) - (Number(item.discount_amount) || 0);
}

// Labour, fees and consumables are written straight onto the job's invoice —
// there is no separate estimate or quote record.
export default function JobLabourPanel({ job, canEdit, onChange }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setInvoice(await getJobInvoice(job.id));
    setLoading(false);
  };

  useEffect(() => { load(); }, [job.id]);

  const allItems = invoice?.line_items || [];
  const labourItems = allItems.filter((item) => item.kind !== "part");

  const persist = async (nextItems) => {
    setBusy(true);
    try {
      if (invoice) {
        await updateInvoiceLineItems(job, invoice, nextItems, invoice.internalCostingNotes || "", invoice.customer_notes || "");
      } else {
        await createInvoice(job, 0, nextItems);
      }
      await load();
      onChange?.();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to update invoice items.");
    } finally {
      setBusy(false);
    }
  };

  const add = async (items) => {
    await persist([...allItems, ...items]);
    toast.success("Added to the invoice.");
  };

  const remove = async (item) => {
    await persist(allItems.filter((existing) => existing !== item));
  };

  if (loading) return <div className="flex h-20 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {labourItems.length > 0 ? (
          <div className="divide-y divide-border">
            {labourItems.map((item, index) => (
              <div key={`${item.description}-${index}`} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Wrench className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{Number(item.qty) > 1 ? `${item.qty}× ` : ""}{item.description}</span>
                </span>
                <span className="flex items-center gap-2 font-medium tabular-nums">
                  ${lineTotal(item).toFixed(2)}
                  {canEdit && (
                    <button onClick={() => remove(item)} disabled={busy} className="rounded p-1 text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              </div>
            ))}
            {canEdit && (
              <button onClick={() => setPickerOpen(true)} disabled={busy} className="flex w-full items-center justify-center gap-1.5 border-t border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-accent">
                <Plus className="h-3 w-3" /> Add Labour / Consumable
              </button>
            )}
          </div>
        ) : canEdit ? (
          <button onClick={() => setPickerOpen(true)} disabled={busy} className="flex w-full flex-col items-center justify-center gap-2 py-8 text-muted-foreground transition-colors hover:text-accent">
            <Wrench className="h-8 w-8 opacity-30" />
            <p className="text-sm font-medium">Add Labour / Consumable</p>
            <p className="text-xs opacity-60">Labour, fees, surcharges and workshop consumables</p>
          </button>
        ) : (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">No labour or consumables added.</p>
        )}
      </div>

      {canEdit && <LabourConsumablePickerModal open={pickerOpen} onOpenChange={setPickerOpen} onAdd={add} />}
    </div>
  );
}