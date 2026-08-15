import { base44 } from "@/api/base44Client";

// Thin frontend wrapper — invoice creation and manual payment-status transitions
// run server-side in functions/invoiceActions.

const invoke = async (payload) => {
  const res = await base44.functions.invoke("invoiceActions", payload);
  const body = res?.data;
  if (body?.ok === false) {
    const detail = typeof body.error === "string" ? body.error : body.error?.message;
    const error = new Error(detail || "The invoice action could not be completed.");
    error.code = typeof body.error === "object" ? body.error?.code : undefined;
    error.status = res?.status;
    error.response = res;
    throw error;
  }
  if (body?.ok === true && Object.prototype.hasOwnProperty.call(body, "data")) {
    return body.data;
  }
  return body;
};

const invoiceFrom = (payload) => payload?.invoice || payload;

export async function createInvoice(job, amount, lineItems = []) {
  return invoiceFrom(await invoke({ action: "create", jobId: job.id, amount, lineItems }));
}

export async function addPartsToInvoice(job, usageIds) {
  return invoke({ action: "add_parts_to_invoice", jobId: job.id, usageIds });
}

export async function updateInvoiceLineItems(job, invoice, lineItems, internalCostingNotes = "", customerNotes = "") {
  return invoiceFrom(await invoke({ action: "update_line_items", jobId: job.id, invoiceId: invoice.id, lineItems, internalCostingNotes, customerNotes }));
}

export async function setInvoiceVisibility(job, invoice, invoiceVisibility) {
  return invoiceFrom(await invoke({ action: "set_visibility", jobId: job.id, invoiceId: invoice.id, invoiceVisibility }));
}

export async function sendInvoiceToCustomer(job, invoice) {
  return invoiceFrom(await invoke({ action: "send_to_customer", jobId: job.id, invoiceId: invoice.id }));
}

export function manualPaymentOutcome(result) {
  const reconciliation = result?.reconciliation;
  const invoice = reconciliation?.invoice || result?.invoice || null;
  const needsReconciliation = result?.event?.status === "needs_reconciliation"
    || reconciliation?.complete === false;
  return {
    invoice,
    needsReconciliation,
    complete: !needsReconciliation && (reconciliation?.complete === true || invoice?.status === "paid"),
  };
}

export async function recordManualPayment(invoice, job, { method = "other", reference = "" } = {}) {
  const amount = Number(invoice.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("A positive invoice amount is required.");
  const idempotencyKey = `manual_payment:${invoice.id}:${crypto.randomUUID()}`;
  return invoke({
    action: "record_manual_payment",
    jobId: job.id,
    invoiceId: invoice.id,
    amount_minor: Math.round(amount * 100),
    method,
    reference,
    occurred_at: new Date().toISOString(),
    idempotency_key: idempotencyKey,
  });
}

export async function sendPaymentReminder(job, invoice) {
  return invoiceFrom(await invoke({ action: "send_reminder", jobId: job.id, invoiceId: invoice.id }));
}

export async function generateInvoicePdf(job, invoiceDraft, notes = "", regenerateCount = 0) {
  const res = await base44.functions.invoke("invoicePdfActions", {
    action: "preview",
    jobId: job.id,
    invoiceDraft,
    notes,
    regenerateCount,
  });
  return res.data;
}

export async function emailInvoicePdf(job, invoiceDraft, notes = "", regenerateCount = 0) {
  const res = await base44.functions.invoke("invoicePdfActions", {
    action: "email",
    jobId: job.id,
    invoiceDraft,
    notes,
    regenerateCount,
  });
  return res.data;
}

// Read-only display helper — stays client-side.
export async function getJobInvoice(jobId) {
  const invoices = await base44.entities.Invoice.filter({ job_id: jobId }, "-created_date", 1);
  return invoices[0] || null;
}
