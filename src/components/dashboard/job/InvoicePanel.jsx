import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import StatusPill from "@/components/shared/StatusPill";
import { getJobInvoice, createInvoice, copyQuoteToInvoice, setPaymentStatus, generateInvoicePdf, emailInvoicePdf, startInvoicePayment, updateInvoiceLineItems, setInvoiceVisibility, sendInvoiceToCustomer } from "@/services/paymentService";
import { getJobQuote } from "@/services/quoteService";
import InvoicePdfPreviewDialog from "./InvoicePdfPreviewDialog";
import { DEFAULT_INVOICE_SETTINGS } from "@/config/platformConfig";
import { Send, Loader2, FileText, Package, Wrench, Lock, CalendarDays, Copy, CreditCard, Plus, Trash2, Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

function normalizeDraftItem(item = {}) {
  return {
    description: item.description || "Line item",
    qty: Number(item.qty) || 1,
    unit_price: Number(item.unit_price) || 0,
    tax_rate: Number(item.tax_rate) || 0,
    discount_amount: Number(item.discount_amount) || 0,
    kind: item.kind || "item",
    sku: item.sku || "",
    source_usage_id: item.source_usage_id || "",
  };
}

function calculateLineTotal(item) {
  const base = (Number(item.qty) || 1) * (Number(item.unit_price) || 0);
  const tax = base * ((Number(item.tax_rate) || 0) / 100);
  return base + tax - (Number(item.discount_amount) || 0);
}

export default function InvoicePanel({ job, actor, canEdit, onChange }) {
  const [invoice, setInvoice] = useState(null);
  const [amount, setAmount] = useState(0);
  const [quote, setQuote] = useState(null);
  const [usageRecords, setUsageRecords] = useState([]);
  const [sending, setSending] = useState(false);
  const [copying, setCopying] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pdfRevision, setPdfRevision] = useState(0);
  const [emailingPdf, setEmailingPdf] = useState(false);
  const [paying, setPaying] = useState(false);
  const [savingLines, setSavingLines] = useState(false);
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [draftItems, setDraftItems] = useState([]);
  const [internalNotes, setInternalNotes] = useState("");
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
      setDraftItems((inv?.line_items || []).map(normalizeDraftItem));
      setInternalNotes(inv?.internalCostingNotes || "");
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
      lineItems.push({ description: "Labour", qty: 1, unit_price: Number(quote.labour_estimate), tax_rate: 0, discount_amount: 0, kind: "labour" });
    }
    for (const u of usageRecords) {
      lineItems.push({
        description: u.item_name,
        qty: u.qty_used,
        unit_price: Number(u.unit_sell || u.unit_cost || 0),
        tax_rate: 0,
        discount_amount: 0,
        kind: String(u.item_id || "").startsWith("labour-") ? "labour" : "part",
        source_usage_id: u.id,
      });
    }
  }
  const activeItems = invoice ? draftItems : lineItems;
  const lineTotal = activeItems.reduce((s, li) => s + calculateLineTotal(li), 0);

  const invoiceNotes = job.issue_description || "";

  const downloadPdf = () => {
    if (!pdfDocument?.pdfBase64) return;
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${pdfDocument.pdfBase64}`;
    link.download = pdfDocument.fileName || "tax-invoice.pdf";
    link.click();
  };

  const generatePdfPreview = async (inv, revision = 0) => {
    const doc = await generateInvoicePdf(job, inv, invoiceNotes, revision);
    setPdfDocument(doc);
    setPdfRevision(revision);
    setPreviewOpen(true);
  };

  const create = async () => {
    setCreating(true);
    try {
      const finalAmount = lineTotal > 0 ? lineTotal : amount;
      const inv = await createInvoice(job, finalAmount, lineItems);
      setInvoice(inv);
      setDraftItems((inv?.line_items || []).map(normalizeDraftItem));
      setInternalNotes(inv?.internalCostingNotes || "");
      await generatePdfPreview(inv, 0);
      onChange?.();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to create invoice preview.");
    } finally {
      setCreating(false);
    }
  };

  const regeneratePdf = async () => {
    if (!invoice) return;
    setCreating(true);
    try {
      await generatePdfPreview(invoice, pdfRevision + 1);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to regenerate invoice PDF.");
    } finally {
      setCreating(false);
    }
  };

  const emailPdf = async () => {
    if (!invoice) return;
    setEmailingPdf(true);
    try {
      await emailInvoicePdf(job, invoice, invoiceNotes, pdfRevision);
      toast.success("Tax invoice PDF emailed to customer.");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to email invoice PDF.");
    } finally {
      setEmailingPdf(false);
    }
  };

  const copyQuote = async () => {
    setCopying(true);
    try {
      const inv = await copyQuoteToInvoice(job);
      setInvoice(inv);
      setDraftItems((inv?.line_items || []).map(normalizeDraftItem));
      setInternalNotes(inv?.internalCostingNotes || "");
      await loadInvoiceData();
      onChange?.();
      toast.success("Costing copied to invoice.");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to copy costing.");
    } finally {
      setCopying(false);
    }
  };

  const setStatus = async (s) => {
    const inv = await setPaymentStatus(invoice, job, s, actor);
    setInvoice(inv);
    onChange?.();
  };

  const updateDraft = (index, patch) => {
    setDraftItems((items) => items.map((item, i) => i === index ? normalizeDraftItem({ ...item, ...patch }) : item));
  };

  const addLine = (kind) => {
    const defaults = {
      labour: { description: "Labour", qty: 1, unit_price: 80, kind: "labour" },
      expense: { description: "Additional expense", qty: 1, unit_price: 0, kind: "expense" },
      discount: { description: "Discount", qty: 1, unit_price: 0, discount_amount: 0, kind: "discount" },
    };
    setDraftItems((items) => [...items, normalizeDraftItem(defaults[kind] || defaults.expense)]);
  };

  const removeLine = (index) => {
    setDraftItems((items) => items.filter((_, i) => i !== index));
  };

  const saveLineItems = async () => {
    if (!invoice) return;
    setSavingLines(true);
    try {
      const inv = await updateInvoiceLineItems(job, invoice, draftItems, internalNotes);
      setInvoice(inv);
      setDraftItems((inv?.line_items || []).map(normalizeDraftItem));
      toast.success("Invoice line items saved.");
      onChange?.();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save invoice line items.");
    } finally {
      setSavingLines(false);
    }
  };

  const changeVisibility = async (visibility) => {
    if (!invoice) return;
    setVisibilityBusy(true);
    try {
      const inv = await setInvoiceVisibility(job, invoice, visibility);
      setInvoice(inv);
      toast.success(visibility === "customer_visible" ? "Invoice is now visible to the customer." : "Invoice is internal only.");
      onChange?.();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to update invoice visibility.");
    } finally {
      setVisibilityBusy(false);
    }
  };

  const sendToCustomer = async () => {
    if (!invoice) return;
    if (!job.customer_email) {
      toast.error("No customer email on this job.");
      return;
    }
    setSending(true);
    try {
      const inv = await sendInvoiceToCustomer(job, invoice);
      setInvoice(inv);
      toast.success("Invoice sent and made visible to the customer.");
      onChange?.();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to send invoice to customer.");
    } finally {
      setSending(false);
    }
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

  const payOnline = async () => {
    if (!invoice) return;
    setPaying(true);
    try {
      const result = await startInvoicePayment(invoice);
      if (result?.blocked) setPaying(false);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to start checkout.");
      setPaying(false);
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
      {activeItems.length > 0 && (
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
              {activeItems.map((li, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {li.kind === "labour"
                        ? <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        : <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      {canEdit && invoice ? (
                        <Input value={li.description} onChange={(e) => updateDraft(i, { description: e.target.value })} className="h-8 min-w-[180px]" />
                      ) : li.description}
                    </div>
                    {canEdit && invoice && (
                      <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-4">
                        <Input type="number" step="0.01" value={li.qty} onChange={(e) => updateDraft(i, { qty: e.target.value })} className="h-7 text-xs" placeholder="Qty" />
                        <Input type="number" step="0.01" value={li.unit_price} onChange={(e) => updateDraft(i, { unit_price: e.target.value })} className="h-7 text-xs" placeholder="Unit" />
                        <Input type="number" step="0.01" value={li.tax_rate} onChange={(e) => updateDraft(i, { tax_rate: e.target.value })} className="h-7 text-xs" placeholder="Tax %" />
                        <Input type="number" step="0.01" value={li.discount_amount} onChange={(e) => updateDraft(i, { discount_amount: e.target.value })} className="h-7 text-xs" placeholder="Discount" />
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-center text-muted-foreground">{li.qty}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{currency} {(Number(li.unit_price) || 0).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    <div>{currency} {calculateLineTotal(li).toFixed(2)}</div>
                    {canEdit && invoice && <button onClick={() => removeLine(i)} className="mt-1 text-xs text-rose-600 hover:underline"><Trash2 className="inline h-3 w-3" /> Remove</button>}
                  </td>
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
          {canEdit && invoice && (
            <div className="flex flex-wrap gap-2 border-t border-border bg-secondary/20 px-4 py-3">
              <Button size="sm" variant="outline" onClick={() => addLine("labour")} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add labour</Button>
              <Button size="sm" variant="outline" onClick={() => addLine("expense")} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add expense</Button>
              <Button size="sm" variant="outline" onClick={() => addLine("discount")} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add discount</Button>
              <Button size="sm" onClick={saveLineItems} disabled={savingLines} className="gap-1.5 ml-auto">
                {savingLines ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save invoice items
              </Button>
            </div>
          )}
        </div>
      )}

      {invoice && canEdit && activeItems.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 space-y-3">
          <p className="text-sm text-muted-foreground">No invoice line items yet. Add labour, expenses, discounts, or copy costing.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => addLine("labour")} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add labour</Button>
            <Button size="sm" variant="outline" onClick={() => addLine("expense")} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add expense</Button>
            <Button size="sm" variant="outline" onClick={() => addLine("discount")} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add discount</Button>
            <Button size="sm" onClick={saveLineItems} disabled={savingLines || draftItems.length === 0} className="gap-1.5">
              {savingLines ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save invoice items
            </Button>
          </div>
        </div>
      )}

      {invoice ? (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex justify-between items-start gap-3 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground font-mono">{invoice.number}</span>
              <div className="flex flex-wrap gap-1.5">
                <VisibilityBadge invoice={invoice} />
                {invoice.invoiceSentAt && <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Sent to customer on {format(new Date(invoice.invoiceSentAt), "d MMM yyyy")}</span>}
              </div>
            </div>
            <span className="font-heading text-xl font-extrabold">{currency} {(invoice.amount || lineTotal || 0).toFixed(2)}</span>
          </div>

          {canEdit && (
            <div className="space-y-1">
              <Label>Internal costing notes</Label>
              <Input value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Internal notes only — never shown to customers" />
            </div>
          )}

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
                  Copy costing
                </Button>
              )}
              {invoice.status !== "paid" && invoice.status !== "refunded" && (
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={payOnline} disabled={paying}>
                  {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Pay with Stripe
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setStatus("outstanding")}>Mark outstanding</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setStatus("paid")}>Mark paid</Button>
              <Button size="sm" variant="ghost" onClick={() => setStatus("refunded")}>Refund</Button>
              <Button size="sm" variant="outline" onClick={() => changeVisibility("internal")} disabled={visibilityBusy} className="gap-1.5">
                <EyeOff className="h-4 w-4" /> Internal only
              </Button>
              <Button size="sm" variant="outline" onClick={() => changeVisibility("customer_visible")} disabled={visibilityBusy} className="gap-1.5">
                <Eye className="h-4 w-4" /> Mark visible
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-primary text-primary hover:bg-primary hover:text-primary-foreground ml-auto"
                onClick={sendToCustomer}
                disabled={sending || !job.customer_email}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send to customer
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
            <Button size="sm" onClick={create} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              {lineTotal > 0 ? `Create invoice · ${currency} ${lineTotal.toFixed(2)}` : "Create invoice"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Creating an invoice saves the bill internally. Email it when you are ready to send the final invoice.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No invoice has been created for this job.</p>
      )}

      <InvoicePdfPreviewDialog
        open={previewOpen}
        document={pdfDocument}
        generating={creating}
        emailing={emailingPdf}
        onClose={() => setPreviewOpen(false)}
        onDownload={downloadPdf}
        onEmail={emailPdf}
        onRegenerate={regeneratePdf}
      />
    </div>
  );
}

function VisibilityBadge({ invoice }) {
  const visible = invoice?.invoiceVisibility === "customer_visible";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${visible ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
      {visible ? "Visible to customer" : "Internal only"}
    </span>
  );
}