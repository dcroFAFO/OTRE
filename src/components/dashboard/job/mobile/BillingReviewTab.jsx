import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import InvoicePanel from "../InvoicePanel";
import { updateJobStatusFromEvent } from "@/services/jobWorkflowService";
import { toast } from "sonner";

// Billing tab: review of repair-generated parts/labour, invoice
// preview/generation/issuing, payment management, and "Invoice Settled"
// for cash/external payments → completed.
export default function BillingReviewTab({ job, actor, canEdit, invoiceReadOnly, onChange }) {
  const [settling, setSettling] = useState(false);

  const settleInvoice = async () => {
    setSettling(true);
    try {
      await updateJobStatusFromEvent(job, "completed");
      onChange?.();
      toast.success("Invoice settled. Job marked as completed.");
    } catch (err) {
      toast.error(err.message || "Failed to settle invoice.");
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="space-y-4">
      <InvoicePanel job={job} actor={actor} canEdit={canEdit && !invoiceReadOnly} onChange={onChange} />

      {canEdit && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h3 className="font-heading text-sm font-extrabold text-emerald-800">Payment received externally?</h3>
          </div>
          <p className="text-xs text-emerald-700">
            Mark this invoice as settled if payment was received via cash, bank transfer, or another method not handled by the online checkout.
          </p>
          <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700" disabled={settling} onClick={settleInvoice}>
            {settling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {settling ? "Settling…" : "Invoice Settled"}
          </Button>
        </div>
      )}
    </div>
  );
}