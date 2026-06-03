import { base44 } from "@/api/base44Client";
import { logAudit } from "./auditService";
import { DEFAULT_INVOICE_SETTINGS } from "@/config/platformConfig";

// Provider-agnostic payment abstraction. No provider (Stripe/Square/PayPal)
// is hard-coded — a real provider can be wired into the stubs below later.

export const paymentProviderStub = {
  // Replace with real provider integration later.
  async createPaymentIntent(/* invoice */) {
    return { ref: null, provider: null, status: "not_configured" };
  },
  async handleWebhook(/* payload */) {
    // Placeholder for future provider webhook handling.
    return { handled: false };
  },
};

export async function createInvoice(job, amount, actor) {
  const invoice = await base44.entities.Invoice.create({
    job_id: job.id,
    number: `${DEFAULT_INVOICE_SETTINGS.prefix}-${Date.now().toString().slice(-6)}`,
    amount: Number(amount) || 0,
    currency: DEFAULT_INVOICE_SETTINGS.currency,
    status: DEFAULT_INVOICE_SETTINGS.default_status,
  });
  await base44.entities.Job.update(job.id, { payment_status: DEFAULT_INVOICE_SETTINGS.default_status, status: "invoice_outstanding" });
  await logAudit({ eventType: "invoice_created", jobId: job.id, actor, summary: `Invoice created (${DEFAULT_INVOICE_SETTINGS.currency} ${amount})`, visibility: "customer" });
  return invoice;
}

export async function setPaymentStatus(invoice, job, status, actor) {
  const updated = await base44.entities.Invoice.update(invoice.id, {
    status,
    paid_date: status === "paid" ? new Date().toISOString() : null,
  });
  await base44.entities.Job.update(job.id, {
    payment_status: status,
    status: status === "paid" ? "paid" : job.status,
  });
  await logAudit({
    eventType: "payment_status_changed",
    jobId: job.id,
    actor,
    previousValue: invoice.status,
    newValue: status,
    summary: `Payment marked "${status}"`,
    visibility: "customer",
  });
  return updated;
}

export async function getJobInvoice(jobId) {
  const invoices = await base44.entities.Invoice.filter({ job_id: jobId }, "-created_date", 1);
  return invoices[0] || null;
}