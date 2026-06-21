/**
 * jobDetailsTabConfig.js
 * Central utility for job status normalisation and tab visibility rules.
 */

const LEGACY_STATUS_MAP = {
  quote_required: "requested",
  quote_sent: "booked",
  pending_confirmation: "on_hold",
  quote_approved: "booked",
  active: "repair_in_progress",
  technician_assigned: "booked",
  waiting_parts: "waiting_on_parts",
  waiting_supplier: "on_hold",
  waiting_customer: "on_hold",
  invoice_outstanding: "invoice_sent",
  in_progress: "repair_in_progress",
};

const CLOSED_STATUSES = ["completed", "cancelled"];
const PAID_OR_CLOSED_STATUSES = ["paid", "completed", "cancelled"];

export function normalizeJobStatus(status) {
  if (!status) return "";
  const key = status.trim().toLowerCase().replace(/\s+/g, "_");
  return LEGACY_STATUS_MAP[key] || key;
}

export function getVisibleJobTabs() {
  return ["intake", "quote", "parts", "invoice", "customer", "notes", "private", "timeline", "files"];
}

export function isQuoteReadOnlyForStatus(status) {
  return CLOSED_STATUSES.includes(normalizeJobStatus(status));
}

export function isInvoiceReadOnlyForStatus(status) {
  return PAID_OR_CLOSED_STATUSES.includes(normalizeJobStatus(status));
}