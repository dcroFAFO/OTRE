import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusPill from "@/components/shared/StatusPill";
import { getJobInvoice, createInvoice, setPaymentStatus } from "@/services/paymentService";

export default function InvoicePanel({ job, actor, canEdit, onChange }) {
  const [invoice, setInvoice] = useState(null);
  const [amount, setAmount] = useState(125);

  useEffect(() => { getJobInvoice(job.id).then(setInvoice); }, [job.id]);

  const create = async () => { const inv = await createInvoice(job, amount, actor); setInvoice(inv); onChange?.(); };
  const setStatus = async (s) => { const inv = await setPaymentStatus(invoice, job, s, actor); setInvoice(inv); onChange?.(); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold">Invoice & Payment</h3>
        {invoice && <StatusPill kind="payment" value={invoice.status} />}
      </div>

      {invoice ? (
        <div className="rounded-xl border border-border p-4 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">{invoice.number}</span><span className="font-heading text-xl font-extrabold">${(invoice.amount || 0).toFixed(2)}</span></div>
          {canEdit ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => setStatus("outstanding")}>Mark outstanding</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setStatus("paid")}>Mark paid</Button>
              <Button size="sm" variant="ghost" onClick={() => setStatus("refunded")}>Refund</Button>
            </div>
          ) : (
            invoice.status !== "paid" && (
              <Button size="sm" disabled className="bg-accent/60 text-accent-foreground cursor-not-allowed">Pay now (coming soon)</Button>
            )
          )}
          <p className="text-[11px] text-muted-foreground pt-1">Payment provider is configurable — not yet connected.</p>
        </div>
      ) : canEdit ? (
        <div className="flex items-end gap-2">
          <div className="space-y-1"><Label>Amount ($)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" /></div>
          <Button size="sm" onClick={create}>Create invoice</Button>
        </div>
      ) : <p className="text-sm text-muted-foreground">No invoice yet.</p>}
    </div>
  );
}