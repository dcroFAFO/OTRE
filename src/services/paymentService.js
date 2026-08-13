import { base44 } from "@/api/base44Client";

// Thin frontend wrapper — invoice creation and payment transitions run
// server-side in functions/invoiceActions.

const invoke = async (payload) => {
  const res = await base44.functions.invoke("invoiceActions", payload);
  return res.data;
};

export async function createInvoice(job, amount, lineItems = []) {
  return invoke({ action: "create", jobId: job.id, amount, lineItems });
}

export async function addPartsToInvoice(job, usageIds) {
  return invoke({ action: "add_parts_to_invoice", jobId: job.id, usageIds });
}

export async function updateInvoiceLineItems(job, invoice, lineItems, internalCostingNotes = "", customerNotes = "") {
  return invoke({ action: "update_line_items", jobId: job.id, invoiceId: invoice.id, lineItems, internalCostingNotes, customerNotes });
}

export async function setInvoiceVisibility(job, invoice, invoiceVisibility) {
  return invoke({ action: "set_visibility", jobId: job.id, invoiceId: invoice.id, invoiceVisibility });
}

export async function sendInvoiceToCustomer(job, invoice) {
  return invoke({ action: "send_to_customer", jobId: job.id, invoiceId: invoice.id });
}

export async function setPaymentStatus(invoice, job, status) {
  if (!["outstanding", "paid"].includes(status)) {
    throw new Error("Only outstanding or paid can be recorded manually.");
  }
  return invoke({ action: "set_payment_status", jobId: job.id, invoiceId: invoice.id, status });
}

export async function sendPaymentReminder(job, invoice) {
  return invoke({ action: "send_reminder", jobId: job.id, invoiceId: invoice.id });
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

// Shown when checkout is attempted from inside the builder preview iframe.
export const PREVIEW_CHECKOUT_MESSAGE =
  "Online checkout only works from the published site, not inside the preview.";

function checkoutAttemptId() {
  return globalThis.crypto?.randomUUID?.() || `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function currentReturnPath(fallback) {
  if (typeof window === "undefined") return fallback;
  const url = new URL(window.location.href);
  ["payment", "checkout_result", "session_id", "order", "invoice", "attempt"].forEach((key) => url.searchParams.delete(key));
  return `${url.pathname}${url.search}` || fallback;
}

export async function startInvoicePayment(invoice, options = {}) {
  if (window.self !== window.top) {
    return { blocked: true, reason: PREVIEW_CHECKOUT_MESSAGE };
  }
  const res = await base44.functions.invoke("createInvoiceCheckout", {
    invoiceId: invoice.id,
    checkoutAttemptId: options.checkoutAttemptId || checkoutAttemptId(),
    returnPath: options.returnPath || currentReturnPath("/portal"),
  });
  if (res.data?.url) window.location.href = res.data.url;
  return res.data;
}

export async function startStorePayment({ customer, items, notes, checkoutAttemptId: attemptId }) {
  if (window.self !== window.top) {
    return { blocked: true, reason: PREVIEW_CHECKOUT_MESSAGE };
  }
  const res = await base44.functions.invoke("createStoreCheckout", {
    customer,
    items,
    notes,
    checkoutAttemptId: attemptId,
  });
  if (res.data?.url) window.location.href = res.data.url;
  return res.data;
}

export async function verifyCheckoutStatus(payload) {
  const res = await base44.functions.invoke("checkoutStatus", payload);
  return res.data;
}

// Read-only display helper — stays client-side.
export async function getJobInvoice(jobId) {
  const invoices = await base44.entities.Invoice.filter({ job_id: jobId }, "-created_date", 1);
  return invoices[0] || null;
}
