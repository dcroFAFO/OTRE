import { base44 } from "@/api/base44Client";

// Thin frontend wrapper — invoice creation and payment transitions run
// server-side in functions/invoiceActions.

const invoke = async (payload) => {
  const res = await base44.functions.invoke("invoiceActions", payload);
  return res.data;
};

export async function createInvoice(job, amount) {
  return invoke({ action: "create", jobId: job.id, amount });
}

export async function copyQuoteToInvoice(job) {
  return invoke({ action: "copy_quote", jobId: job.id });
}

export async function addPartsToInvoice(job, usageIds) {
  return invoke({ action: "add_parts_to_invoice", jobId: job.id, usageIds });
}

export async function setPaymentStatus(invoice, job, status) {
  return invoke({ action: "set_payment_status", jobId: job.id, invoiceId: invoice.id, status });
}

export async function generateInvoicePdf(job, invoice, notes = "", regenerateCount = 0) {
  const res = await base44.functions.invoke("invoicePdfActions", {
    action: regenerateCount > 0 ? "regenerate" : "generate",
    jobId: job.id,
    invoiceId: invoice.id,
    notes,
    regenerateCount,
  });
  return res.data;
}

export async function emailInvoicePdf(job, invoice, notes = "", regenerateCount = 0) {
  const res = await base44.functions.invoke("invoicePdfActions", {
    action: "email",
    jobId: job.id,
    invoiceId: invoice.id,
    notes,
    regenerateCount,
  });
  return res.data;
}

export async function startInvoicePayment(invoice) {
  if (window.self !== window.top) {
    alert("Online checkout works only from the published app, not inside the preview.");
    return { blocked: true };
  }
  const res = await base44.functions.invoke("createInvoiceCheckout", { invoiceId: invoice.id });
  if (res.data?.url) window.location.href = res.data.url;
  return res.data;
}

// Read-only display helper — stays client-side.
export async function getJobInvoice(jobId) {
  const invoices = await base44.entities.Invoice.filter({ job_id: jobId }, "-created_date", 1);
  return invoices[0] || null;
}