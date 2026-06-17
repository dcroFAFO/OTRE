import { base44 } from "@/api/base44Client";

// Thin frontend wrapper — quote totals, status transitions, job sync and
// audit logging all run server-side in functions/quoteActions.

const invoke = async (payload) => {
  const res = await base44.functions.invoke("quoteActions", payload);
  return res.data;
};

export async function saveQuote(job, data) {
  return invoke({ action: "save", jobId: job.id, data });
}

export async function sendQuote(quote, job) {
  return invoke({ action: "send", jobId: job.id, quoteId: quote.id });
}

export async function setQuoteApproval(quote, job, approved, denyReason) {
  return invoke({ action: "set_approval", jobId: job.id, quoteId: quote.id, approved, deny_reason: denyReason || null });
}

export async function addPartsToQuote(job, parts) {
  return invoke({ action: "add_parts", jobId: job.id, parts });
}

// Read-only display helper — stays client-side.
export async function getJobQuote(jobId) {
  const quotes = await base44.entities.Quote.filter({ job_id: jobId }, "-created_date", 1);
  return quotes[0] || null;
}