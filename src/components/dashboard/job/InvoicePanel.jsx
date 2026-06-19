import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import StatusPill from "@/components/shared/StatusPill";
import { getJobInvoice, createInvoice, copyQuoteToInvoice, setPaymentStatus } from "@/services/paymentService";
import { getJobQuote } from "@/services/quoteService";
import { DEFAULT_INVOICE_SETTINGS } from "@/config/platformConfig";
import { Send, Loader2, FileText, Package, Wrench, Lock, CalendarDays, Copy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function InvoicePanel({ job, actor, canEdit, onChange }) {
  const [invoice, setInvoice] = useState(null);
  const [amount, setAmount] = useState(0);
  const [quote, setQuote] = useState(null);
  const [usageRecords, setUsageRecords] = useState([]);
  const [sending, setSending] = useState(false);
  const [copying, setCopying] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadInvoiceData = () => {
    setLoading(true);
    return Promise.all([
      getJobInvoice(job.id),
      getJobQuote(job.id),
      base44.entities.InventoryUsage.filter({ job_id: job.id }),
    ]).then(([inv, q, usage]) => {
      setInvoice(inv);
      setQuote(q);
      setUsageRecords(usage || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadInvoiceData();
  }, [job.id]);

  // Prefer copied invoice items, then exact quote items, then current job usage.
  const lineItems = (invoice?.line_items?.length ? invoice.line_items : quote?.line_items?.length ? quote.line_items : []);
  if (lineItems.length === 0) {
    if (quote?.labour_estimate > 0) {
      lineItems.push({ description: "Labour", qty: 1, unit_price: Number(quote.labour_estimate), kind: "labour" });
    }
    for (const u of usageRecords) {
      lineItems.push({
        description: u.item_name,
        qty: u.qty_used,
        unit_price: Number(u.unit_sell || u.unit_cost || 0),
        kind: "part",
      });
    }
  }
  const lineTotal = lineItems.reduce((s, li) => s + (Number(li.qty) || 1) * (Number(li.unit_price) || 0), 0);

  const create = async () => {
    const finalAmount = lineTotal > 0 ? lineTotal : amount;
    const inv = await createInvoice(job, finalAmount, actor);
    setInvoice(inv);
    onChange?.();
  };

  const copyQuote = async () => {
    setCopying(true);
    try {
      const inv = await copyQuoteToInvoice(job);
      setInvoice(inv);
      await loadInvoiceData();
      onChange?.();
      toast.success("Quote copied to invoice.");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to copy quote.");
    } finally {
      setCopying(false);
    }
  };

  const setStatus = async (s) => {
    const inv = await setPaymentStatus(invoice, job, s, actor);
    setInvoice(inv);
    onChange?.();
  };

  const sendEmail = async () => {
    if (!job.customer_email) {
      toast.error("No customer email on this job.");
      return;
    }
    setSending(true);
    try {
      await base44.functions.invoke("sendInvoiceEmail", { jobId: job.id });
      toast.success("Invoice emailed to customer!");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to send invoice email.");
    } finally {
      setSending(false);
    }
  };

  const currency = invoice?.currency || DEFAULT_INVOICE_SETTINGS.currency;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold flex items-center gap-2">
          Invoice & Payment
          {!canEdit && (
            <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <Lock className="h-3 w-3" /> Read-only
            </span>
          )}
        </h3>
        {invoice && <StatusPill kind="payment" value={invoice.status} />}
      </div>

      {/* Line items — shown in both editable and read-only */}
      {lineItems.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 bg-secondary/50 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <FileText className="h-3.5 w-3.5" /> Line Items
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-4 py-2 font-medium">Description</th>
                <th className="text-center px-2 py-2 font-medium">Qty</th>
                <th className="text-right px-4 py-2 font-medium">Unit</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2.5 flex items-center gap-1.5">
                    {li.kind === "labour"
                      ? <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      : <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    {li.description}
                  </td>
                  <td className="px-2 py-2.5 text-center text-muted-foreground">{li.qty}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{currency} {(Number(li.unit_price) || 0).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{currency} {((Number(li.qty) || 1) * (Number(li.unit_price) || 0)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-secondary/30">
                <td colSpan={3} className="px-4 py-2.5 text-right font-semibold text-sm">Total</td>
                <td className="px-4 py-2.5 text-right font-heading font-extrabold text-base">
                  {currency} {lineTotal.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {invoice ? (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-mono">{invoice.number}</span>
            <span className="font-heading text-xl font-extrabold">{currency} {(invoice.amount || 0).toFixed(2)}</span>
          </div>

          {/* Paid date (read-only info, always shown if present) */}
          {invoice.paid_date && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Paid {format(new Date(invoice.paid_date), "d MMM yyyy, h:mm a")}
            </p>
          )}

          {canEdit ? (
            // ── Editable controls ──────────────────────────────────────────
            <div className="flex flex-wrap gap-2 pt-1">
              {quote && (
                <Button size="sm" variant="outline" onClick={copyQuote} disabled={copying} className="gap-1.5">
                  {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                  Copy quote
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setStatus("outstanding")}>Mark outstanding</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setStatus("paid")}>Mark paid</Button>
              <Button size="sm" variant="ghost" onClick={() => setStatus("refunded")}>Refund</Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-primary text-primary hover:bg-primary hover:text-primary-foreground ml-auto"
                onClick={sendEmail}
                disabled={sending || !job.customer_email}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Email invoice
              </Button>
            </div>
          ) : (
            // ── Read-only: keep send receipt action ────────────────────────
            <div className="pt-1">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={sendEmail}
                disabled={sending || !job.customer_email}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send receipt
              </Button>
            </div>
          )}

          {!job.customer_email && (
            <p className="text-xs text-amber-600">⚠️ No email address on this job — cannot send invoice.</p>
          )}
        </div>
      ) : canEdit ? (
        // ── No invoice yet, editable: allow creation ───────────────────────
        <div className="space-y-3">
          {lineTotal === 0 && (
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label>Amount ({DEFAULT_INVOICE_SETTINGS.currency})</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32" />
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {quote && (
              <Button size="sm" variant="outline" onClick={copyQuote} disabled={copying} className="gap-1.5">
                {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                Copy quote
              </Button>
            )}
            <Button size="sm" onClick={create}>
              {lineTotal > 0 ? `Create invoice · ${currency} ${lineTotal.toFixed(2)}` : "Create invoice"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Creating an invoice will mark this job as invoice outstanding.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No invoice has been created for this job.</p>
      )}
    </div>
  );
}