import { base44 } from "@/api/base44Client";
import { logAudit } from "./auditService";
import { DEFAULT_QUOTE_TEMPLATE } from "@/config/platformConfig";

export async function saveQuote(job, data, actor) {
  const total = (Number(data.labour_estimate) || 0) + (Number(data.parts_estimate) || 0);
  let quote;
  if (data.id) {
    quote = await base44.entities.Quote.update(data.id, { ...data, total });
  } else {
    quote = await base44.entities.Quote.create({ ...data, job_id: job.id, total, currency: DEFAULT_QUOTE_TEMPLATE.currency, status: "draft" });
    await base44.entities.Job.update(job.id, { quote_status: "draft" });
    await logAudit({ eventType: "quote_generated", jobId: job.id, actor, summary: "Quote generated", newValue: `${DEFAULT_QUOTE_TEMPLATE.currency} ${total}` });
  }
  return quote;
}

export async function sendQuote(quote, job, actor) {
  const updated = await base44.entities.Quote.update(quote.id, {
    status: "sent",
    sent_date: new Date().toISOString(),
  });
  await base44.entities.Job.update(job.id, { quote_status: "sent", status: "quote_sent" });
  await logAudit({ eventType: "quote_sent", jobId: job.id, actor, summary: "Quote sent to customer", visibility: "customer" });
  return updated;
}

export async function setQuoteApproval(quote, job, approved, actor) {
  const updated = await base44.entities.Quote.update(quote.id, {
    status: approved ? "approved" : "rejected",
    approval_status: approved ? "approved" : "rejected",
  });
  await base44.entities.Job.update(job.id, {
    quote_status: approved ? "approved" : "rejected",
    status: approved ? "quote_approved" : job.status,
  });
  await logAudit({
    eventType: approved ? "quote_approved" : "quote_rejected",
    jobId: job.id,
    actor,
    summary: approved ? "Quote approved" : "Quote rejected",
    visibility: "customer",
  });
  return updated;
}

export async function getJobQuote(jobId) {
  const quotes = await base44.entities.Quote.filter({ job_id: jobId }, "-created_date", 1);
  return quotes[0] || null;
}

// Append technician-selected sourced parts as line items on the job's quote,
// creating the quote if needed, and recompute the parts estimate + total.
export async function addPartsToQuote(job, parts, actor) {
  let quote = await getJobQuote(job.id);
  if (!quote) {
    quote = await base44.entities.Quote.create({
      job_id: job.id,
      currency: DEFAULT_QUOTE_TEMPLATE.currency,
      status: "draft",
      labour_estimate: 0,
      parts_estimate: 0,
      total: 0,
    });
    await base44.entities.Job.update(job.id, { quote_status: "draft" });
  }

  const newItems = parts.map((p) => ({
    description: p.retailer ? `${p.name} (${p.retailer})` : p.name,
    qty: Number(p.qty) || 1,
    unit_price: Number(p.typical_price) || 0,
    kind: "part",
  }));

  const line_items = [...(quote.line_items || []), ...newItems];
  const parts_estimate = line_items
    .filter((li) => li.kind === "part")
    .reduce((s, li) => s + (Number(li.unit_price) || 0) * (Number(li.qty) || 1), 0);
  const total = (Number(quote.labour_estimate) || 0) + parts_estimate;

  const updated = await base44.entities.Quote.update(quote.id, { line_items, parts_estimate, total });
  await logAudit({
    eventType: "quote_generated",
    jobId: job.id,
    actor,
    summary: `Added ${parts.length} sourced part(s) to quote`,
    newValue: `${DEFAULT_QUOTE_TEMPLATE.currency} ${total.toFixed(2)}`,
  });
  return updated;
}