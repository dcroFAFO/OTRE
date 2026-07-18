import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import StatusPill from "@/components/shared/StatusPill";
import { getJobInvoice, copyQuoteToInvoice, setPaymentStatus, generateInvoicePdf, emailInvoicePdf, startInvoicePayment, updateInvoiceLineItems } from "@/services/paymentService";
import { getJobQuote } from "@/services/quoteService";
import InvoicePdfPreviewDialog from "./InvoicePdfPreviewDialog";
import PartPickerModal from "./PartPickerModal";
import LabourConsumablePickerModal from "./LabourConsumablePickerModal";
import { DEFAULT_INVOICE_SETTINGS } from "@/config/platformConfig";
import { AlertCircle, CheckCircle2, Clock, Copy, CreditCard, FileText, Loader2, Lock, Package, Plus, Save, Send, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { PARTS_MARKUP_PERCENT, getUsageCustomerUnitPrice, roundMoney } from "@/lib/partsPricing";
import { addInventoryParts } from "@/services/jobService";
import { saveQuote } from "@/services/quoteService";

function normalizeDraftItem(item = {}) {
  const qty = Number(item.qty) || 1;
  const unitPrice = Number(item.unit_price ?? item.customer_unit_price) || 0;
  return {
    description: item.description || "Line item",
    qty,
    unit_price: unitPrice,
    internal_cost_price: Number(item.internal_cost_price ?? item.cost_price) || 0,
    markup_percentage: Number(item.markup_percentage) || (item.kind === "part" ? PARTS_MARKUP_PERCENT : 0),
    customer_unit_price: Number(item.customer_unit_price ?? unitPrice) || 0,
    customer_line_total: roundMoney(unitPrice * qty),
    is_custom_misc_part: !!item.is_custom_misc_part,
    staff_notes: item.staff_notes || item.note || "",
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

const ASYNC_STATES = {
  IDLE: "idle",
  VALIDATING: "validating",
  GENERATING_PREVIEW: "generating_preview",
  PREVIEW_READY: "preview_ready",
  SENDING: "sending",
  SENT: "sent",
  SEND_FAILED: "send_failed",
  GENERATION_FAILED: "generation_failed",
};

function staffErrorMessage(error, fallback) {
  console.error("[FinaliseInvoice]", fallback, error);
  return error?.response?.data?.error || error?.message || fallback;
}

function validateInvoiceDraft(job, items) {
  if (!String(job.customer_name || "").trim()) return "Invoice could not be generated. Missing customer name.";
  if (!String(job.customer_email || "").trim()) return "Missing customer email.";
  if (!String(job.reference || job.job_id || job.id || "").trim()) return "Invoice could not be generated. Missing job/reference number.";
  if (!items.length) return "No billing line items found.";
  const invalidItem = items.find((item) => {
    const qty = Number(item.qty);
    const unitPrice = Number(item.unit_price);
    return !item.description || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0;
  });
  if (invalidItem) return "Invoice could not be generated. Check line item quantities and prices.";
  return "";
}

function usageToLineItem(usage) {
  const isLabour = String(usage.item_id || "").startsWith("labour-");
  const customerUnitPrice = getUsageCustomerUnitPrice(usage);
  const qty = Number(usage.qty_used) || 1;
  return normalizeDraftItem({
    description: usage.item_name || "Part",
    qty,
    unit_price: customerUnitPrice,
    internal_cost_price: Number(usage.unit_cost) || 0,
    markup_percentage: Number(usage.markup_percentage) || PARTS_MARKUP_PERCENT,
    customer_unit_price: customerUnitPrice,
    customer_line_total: roundMoney(customerUnitPrice * qty),
    is_custom_misc_part: !!usage.is_custom_misc_part,
    staff_notes: usage.note || "",
    kind: isLabour ? "labour" : "part",
    sku: usage.product_sku || usage.item_id || "",
    source_usage_id: usage.id,
  });
}

export default function InvoicePanel({ job, actor, canEdit, onChange, buttonOnly = false }) {
  const [invoice, setInvoice] = useState(null);
  const [quote, setQuote] = useState(null);
  const [usageRecords, setUsageRecords] = useState([]);
  const [sending, setSending] = useState(false);
  const [copying, setCopying] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pdfRevision, setPdfRevision] = useState(0);
  const [paying, setPaying] = useState(false);
  const [savingLines, setSavingLines] = useState(false);
  const [draftItems, setDraftItems] = useState([]);
  const [internalNotes, setInternalNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [finaliseStatus, setFinaliseStatus] = useState(ASYNC_STATES.IDLE);
  const [sendError, setSendError] = useState("");
  const [partsPickerOpen, setPartsPickerOpen] = useState(false);
  const [labourPickerOpen, setLabourPickerOpen] = useState(false);
  const [addingParts, setAddingParts] = useState(false);
  const [addingLabour, setAddingLabour] = useState(false);

  const loadInvoiceData = async () => {
    setLoading(true);
    const [inv, q, primaryUsage, legacyUsage] = await Promise.all([
      getJobInvoice(job.id),
      getJobQuote(job.id),
      base44.entities.InventoryUsage.filter({ job_id: job.id }),
      job.job_id && job.job_id !== job.id ? base44.entities.InventoryUsage.filter({ job_id: job.job_id }) : Promise.resolve([]),
    ]);
    const seen = new Set();
    const usage = [...(primaryUsage || []), ...(legacyUsage || [])].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    const usageById = new Map(usage.map((item) => [item.id, item]));
    setInvoice(inv);
    setQuote(q);
    setUsageRecords(usage);
    setDraftItems((inv?.line_items || []).map((item) => {
      const usage = usageById.get(item.source_usage_id);
      if (!usage || item.kind !== "part") return normalizeDraftItem(item);
      return normalizeDraftItem({ ...item, internal_cost_price: usage.unit_cost, markup_percentage: usage.markup_percentage, is_custom_misc_part: usage.is_custom_misc_part, staff_notes: usage.note });
    }));
    setInternalNotes(inv?.internalCostingNotes || "");
    setFinaliseStatus(inv?.invoiceSentAt ? ASYNC_STATES.SENT : ASYNC_STATES.IDLE);
    setLoading(false);
  };

  useEffect(() => { loadInvoiceData(); }, [job.id]);

  const usageSourceIds = new Set(usageRecords.map((usage) => usage.id));
  const billingItems = [
    ...usageRecords.map(usageToLineItem),
    ...((quote?.line_items || []).filter((item) => item.kind !== "part" && !usageSourceIds.has(item.source_usage_id)).map(normalizeDraftItem)),
  ];

  const activeItems = invoice ? draftItems : billingItems;
  const lineTotal = activeItems.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  const invoiceNotes = quote?.diagnosis_notes || job.issue_description || "";
  const currency = invoice?.currency || DEFAULT_INVOICE_SETTINGS.currency;

  const getFinaliseItems = () => {
    if (!invoice) return billingItems;
    const existingKeys = new Set(draftItems.map((item) => `${item.source_usage_id || ""}|${item.kind}|${item.description}`));
    const missingBillingItems = billingItems.filter((item) => !existingKeys.has(`${item.source_usage_id || ""}|${item.kind}|${item.description}`));
    return [...draftItems, ...missingBillingItems];
  };

  const downloadPdf = () => {
    if (!pdfDocument?.pdfBase64) return;
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${pdfDocument.pdfBase64}`;
    link.download = pdfDocument.fileName || "tax-invoice.pdf";
    link.click();
  };

  const printPdf = () => {
    if (!pdfDocument?.pdfBase64) return;
    const win = window.open(`data:application/pdf;base64,${pdfDocument.pdfBase64}`, "_blank");
    setTimeout(() => win?.print?.(), 500);
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

  const removeLine = (index) => setDraftItems((items) => items.filter((_, i) => i !== index));

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

  const buildInvoiceDraft = () => {
    const lineItems = getFinaliseItems().map(normalizeDraftItem);
    return {
      invoiceId: invoice?.id || "",
      number: invoice?.number || "",
      currency,
      amount: lineItems.reduce((sum, item) => sum + calculateLineTotal(item), 0),
      lineItems,
      internalCostingNotes: internalNotes,
    };
  };

  const finaliseInvoice = async () => {
    setCreating(true);
    setSendError("");
    setFinaliseStatus(ASYNC_STATES.VALIDATING);
    try {
      const draft = buildInvoiceDraft();
      const validationError = validateInvoiceDraft(job, draft.lineItems);
      if (validationError) {
        setFinaliseStatus(ASYNC_STATES.GENERATION_FAILED);
        toast.error(validationError);
        return;
      }

      setFinaliseStatus(ASYNC_STATES.GENERATING_PREVIEW);
      const nextRevision = pdfRevision + 1;
      const doc = await generateInvoicePdf(job, draft, invoiceNotes, nextRevision);
      setPdfDocument(doc);
      setPdfRevision(nextRevision);
      setFinaliseStatus(ASYNC_STATES.PREVIEW_READY);
      setPreviewOpen(true);
    } catch (err) {
      const message = staffErrorMessage(err, "Invoice could not be generated.");
      setFinaliseStatus(ASYNC_STATES.GENERATION_FAILED);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const confirmSend = async () => {
    const draft = buildInvoiceDraft();
    const validationError = validateInvoiceDraft(job, draft.lineItems);
    if (validationError) {
      setSendError(validationError);
      setFinaliseStatus(ASYNC_STATES.SEND_FAILED);
      return;
    }
    setSending(true);
    setSendError("");
    setFinaliseStatus(ASYNC_STATES.SENDING);
    try {
      await emailInvoicePdf(job, draft, invoiceNotes, pdfRevision);
      await loadInvoiceData();
      setFinaliseStatus(ASYNC_STATES.SENT);
      toast.success("Invoice finalised and visible to the customer.");
      onChange?.();
    } catch (err) {
      const message = staffErrorMessage(err, "Email sending failed.");
      setSendError(message);
      setFinaliseStatus(ASYNC_STATES.SEND_FAILED);
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const closePreview = () => {
    if (finaliseStatus !== ASYNC_STATES.SENT) {
      setPdfDocument(null);
      setFinaliseStatus(invoice?.invoiceSentAt ? ASYNC_STATES.SENT : ASYNC_STATES.IDLE);
    }
    setPreviewOpen(false);
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

  const setStatus = async (status) => {
    const inv = await setPaymentStatus(invoice, job, status, actor);
    setInvoice(inv);
    onChange?.();
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

  const handleAddParts = async (chosen) => {
    setAddingParts(true);
    try {
      await addInventoryParts(job, chosen);
      await loadInvoiceData();
      onChange?.();
      toast.success("Parts added to invoice.");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to add parts.");
    } finally {
      setAddingParts(false);
    }
  };

  const handleAddLabour = async (items) => {
    setAddingLabour(true);
    try {
      const currentQuote = quote || await getJobQuote(job.id);
      const nextItems = [...(currentQuote?.line_items || []), ...items];
      await saveQuote(job, { ...currentQuote, id: currentQuote?.id, line_items: nextItems }, "invoice");
      await loadInvoiceData();
      onChange?.();
      toast.success("Labour / consumable added to invoice.");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to add labour / consumable.");
    } finally {
      setAddingLabour(false);
    }
  };

  if (loading) {
    return buttonOnly
      ? <Button size="sm" disabled className="gap-1.5"><Loader2 className="h-4 w-4 animate-spin" /> Finalise Invoice</Button>
      : <div className="flex items-center justify-center h-24"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (buttonOnly) {
    return (
      <>
        <Button size="sm" onClick={finaliseInvoice} disabled={!canEdit || creating || sending} className="gap-1.5">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {creating ? "Generating…" : "Send Invoice"}
        </Button>
        <InvoicePdfPreviewDialog
          open={previewOpen}
          document={pdfDocument}
          generating={creating}
          sending={sending}
          sendStatus={finaliseStatus}
          sendError={sendError}
          onClose={closePreview}
          onDownload={downloadPdf}
          onPrint={printPdf}
          onConfirmSend={confirmSend}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold flex items-center gap-2">
          Invoice & Payment
          {!canEdit && <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground"><Lock className="h-3 w-3" /> Read-only</span>}
        </h3>
        <div className="flex items-center gap-2">
          <FinaliseBadge status={finaliseStatus} />
          {invoice && <StatusPill kind="payment" value={invoice.status} />}
        </div>
      </div>

      {activeItems.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 bg-secondary/50 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <FileText className="h-3.5 w-3.5" /> Invoice Items
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
              {activeItems.map((item, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {item.kind === "part" ? <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                      {canEdit && invoice ? <Input value={item.description} onChange={(e) => updateDraft(i, { description: e.target.value })} className="h-8 min-w-[180px]" /> : item.description}
                    </div>
                    {canEdit && invoice && (
                      <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-4">
                        <Input type="number" step="0.01" value={item.qty} onChange={(e) => updateDraft(i, { qty: e.target.value })} className="h-7 text-xs" placeholder="Qty" />
                        <Input type="number" step="0.01" value={item.unit_price} onChange={(e) => updateDraft(i, { unit_price: e.target.value, customer_unit_price: e.target.value })} className="h-7 text-xs" placeholder="Customer price" />
                        <Input type="number" step="0.01" value={item.tax_rate} onChange={(e) => updateDraft(i, { tax_rate: e.target.value })} className="h-7 text-xs" placeholder="Tax %" />
                        <Input type="number" step="0.01" value={item.discount_amount} onChange={(e) => updateDraft(i, { discount_amount: e.target.value })} className="h-7 text-xs" placeholder="Discount" />
                      </div>
                    )}
                    {canEdit && item.kind === "part" && (
                      <p className="mt-1 text-[11px] text-muted-foreground">Cost price {(Number(item.internal_cost_price) || 0).toFixed(2)} · Customer price {(Number(item.unit_price) || 0).toFixed(2)}</p>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-center text-muted-foreground">{item.qty}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{currency} {(Number(item.unit_price) || 0).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    <div>{currency} {calculateLineTotal(item).toFixed(2)}</div>
                    {canEdit && invoice && <button onClick={() => removeLine(i)} className="mt-1 text-xs text-rose-600 hover:underline"><Trash2 className="inline h-3 w-3" /> Remove</button>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-secondary/30">
                <td colSpan={3} className="px-4 py-2.5 text-right font-semibold text-sm">Total</td>
                <td className="px-4 py-2.5 text-right font-heading font-extrabold text-base">{currency} {lineTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          {canEdit && invoice && (
            <div className="flex flex-wrap gap-2 border-t border-border bg-secondary/20 px-4 py-3">
              <Button size="sm" variant="outline" onClick={() => addLine("labour")} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add labour</Button>
              <Button size="sm" variant="outline" onClick={() => addLine("expense")} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add expense</Button>
              <Button size="sm" variant="outline" onClick={() => addLine("discount")} className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Add discount</Button>
              <Button size="sm" onClick={saveLineItems} disabled={savingLines} className="gap-1.5 ml-auto">
                {savingLines ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save invoice items
              </Button>
            </div>
          )}
        </div>
      )}

      {invoice ? (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex justify-between items-start gap-3 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground font-mono">{invoice.number}</span>
              <div className="flex flex-wrap gap-1.5"><VisibilityBadge invoice={invoice} /></div>
            </div>
            <span className="font-heading text-xl font-extrabold">{currency} {(invoice.amount || lineTotal || 0).toFixed(2)}</span>
          </div>

          {canEdit && (
            <div className="space-y-1">
              <Label>Internal costing notes</Label>
              <Input value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Internal notes only — never shown to customers" />
            </div>
          )}

          {canEdit ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {quote && <Button size="sm" variant="outline" onClick={copyQuote} disabled={copying} className="gap-1.5">{copying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} Copy costing</Button>}
              <Button size="sm" variant="outline" onClick={() => setPartsPickerOpen(true)} disabled={addingParts} className="gap-1.5">
                {addingParts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />} Add parts
              </Button>
              <Button size="sm" variant="outline" onClick={() => setLabourPickerOpen(true)} disabled={addingLabour} className="gap-1.5">
                {addingLabour ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />} Add labour / consumable
              </Button>
              {invoice.status !== "paid" && invoice.status !== "refunded" && <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={payOnline} disabled={paying}>{paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Pay with Stripe</Button>}
              <Button size="sm" variant="outline" onClick={() => setStatus("outstanding")}>Mark outstanding</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setStatus("paid")}>Mark paid</Button>
              <Button size="sm" variant="ghost" onClick={() => setStatus("refunded")}>Refund</Button>
              <Button size="sm" className="gap-1.5 border-primary ml-auto" onClick={finaliseInvoice} disabled={creating || sending}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send Invoice
              </Button>
            </div>
          ) : null}

          {!job.customer_email && <p className="text-xs text-amber-600">⚠️ No email address on this job — cannot send invoice.</p>}
        </div>
      ) : canEdit ? (
        <div className="space-y-3">
          {billingItems.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-center">
              <p className="text-sm text-muted-foreground">No parts or labour have been added to this job yet. Add them from the Repair tab or use the buttons below.</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {quote && <Button size="sm" variant="outline" onClick={copyQuote} disabled={copying} className="gap-1.5">{copying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} Copy costing</Button>}
            <Button size="sm" variant="outline" onClick={() => setPartsPickerOpen(true)} disabled={addingParts} className="gap-1.5">
              {addingParts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />} Add parts
            </Button>
            <Button size="sm" variant="outline" onClick={() => setLabourPickerOpen(true)} disabled={addingLabour} className="gap-1.5">
              {addingLabour ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />} Add labour / consumable
            </Button>
            <Button size="sm" onClick={finaliseInvoice} disabled={creating || sending || billingItems.length === 0} className="gap-1.5 ml-auto">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Invoice{lineTotal > 0 ? ` · ${currency} ${lineTotal.toFixed(2)}` : ""}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Send Invoice creates an internal preview first. Nothing is sent or shown to the customer until you confirm.</p>
          {!job.customer_email && <p className="text-xs text-amber-600">⚠️ No email address on this job — cannot send invoice.</p>}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No invoice has been created for this job.</p>
      )}

      <InvoicePdfPreviewDialog
        open={previewOpen}
        document={pdfDocument}
        generating={creating}
        sending={sending}
        sendStatus={finaliseStatus}
        sendError={sendError}
        onClose={closePreview}
        onDownload={downloadPdf}
        onPrint={printPdf}
        onConfirmSend={confirmSend}
      />

      {canEdit && (
        <>
          <PartPickerModal
            job={job}
            actor={actor}
            open={partsPickerOpen}
            onOpenChange={setPartsPickerOpen}
            onAdd={handleAddParts}
          />
          <LabourConsumablePickerModal
            open={labourPickerOpen}
            onOpenChange={setLabourPickerOpen}
            onAdd={handleAddLabour}
          />
        </>
      )}
    </div>
  );
}

function FinaliseBadge({ status }) {
  const config = {
    idle: { label: "Not finalised", className: "border-amber-200 bg-amber-50 text-amber-700", icon: Clock },
    validating: { label: "Validating", className: "border-blue-200 bg-blue-50 text-blue-700", icon: Loader2 },
    generating_preview: { label: "Generating preview", className: "border-blue-200 bg-blue-50 text-blue-700", icon: Loader2 },
    preview_ready: { label: "Preview ready", className: "border-blue-200 bg-blue-50 text-blue-700", icon: FileText },
    sending: { label: "Sending", className: "border-blue-200 bg-blue-50 text-blue-700", icon: Loader2 },
    sent: { label: "Sent to customer", className: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
    send_failed: { label: "Send failed", className: "border-rose-200 bg-rose-50 text-rose-700", icon: AlertCircle },
    generation_failed: { label: "Generation failed", className: "border-rose-200 bg-rose-50 text-rose-700", icon: AlertCircle },
  }[status] || {};
  const Icon = config.icon || Clock;
  const spinning = status === "validating" || status === "generating_preview" || status === "sending";
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${config.className}`}><Icon className={`h-3 w-3 ${spinning ? "animate-spin" : ""}`} />{config.label}</span>;
}

function VisibilityBadge({ invoice }) {
  const visible = invoice?.invoiceVisibility === "customer_visible";
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${visible ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{visible ? "Visible to customer" : "Internal only"}</span>;
}