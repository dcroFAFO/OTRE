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

export async function setPaymentStatus(invoice, job, status) {
  return invoke({ action: "set_payment_status", jobId: job.id, invoiceId: invoice.id, status });
}

// Read-only display helper — stays client-side.
export async function getJobInvoice(jobId) {
  const invoices = await base44.entities.Invoice.filter({ job_id: jobId }, "-created_date", 1);
  return invoices[0] || null;
}