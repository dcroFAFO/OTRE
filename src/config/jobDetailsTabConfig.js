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

// Status-based tab visibility — staff only see tabs relevant to the
// current lifecycle stage.
const STATUS_TABS = {
  requested: ["schedule", "customer"],
  booked: ["schedule", "customer", "repair"],
  on_hold: ["schedule", "customer", "repair"],
  repair_in_progress: ["repair", "customer"],
  waiting_on_parts: ["repair", "customer"],
  ready_for_pickup: ["billing", "customer"],
  invoice_sent: ["billing", "customer"],
  paid: ["timeline", "customer"],
  completed: ["timeline", "customer"],
  cancelled: ["timeline", "customer"],
};

export function normalizeJobStatus(status) {
  if (!status) return "";
  const key = status.trim().toLowerCase().replace(/\s+/g, "_");
  return LEGACY_STATUS_MAP[key] || key;
}

export function getVisibleJobTabs(status) {
  const normalized = normalizeJobStatus(status);
  return STATUS_TABS[normalized] || ["schedule", "customer"];
}

export function isQuoteReadOnlyForStatus(status) {
  return CLOSED_STATUSES.includes(normalizeJobStatus(status));
}

export function isInvoiceReadOnlyForStatus(status) {
  return PAID_OR_CLOSED_STATUSES.includes(normalizeJobStatus(status));
}