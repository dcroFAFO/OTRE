/**
 * jobDetailsTabConfig.js
 * Central utility for job status normalisation and tab visibility rules.
 * Status vocabulary mirrors src/config/jobConfig.js.
 */

import { normalizeStatusKey } from "@/config/jobConfig";

const CLOSED_STATUSES = ["completed", "cancelled"];
const SETTLED_OR_CLOSED_STATUSES = ["completed", "cancelled"];

// Status-based tab visibility — staff only see tabs relevant to the
// current lifecycle stage.
const STATUS_TABS = {
  requested: ["schedule", "customer"],
  scheduled: ["schedule", "customer", "repair"],
  on_hold: ["schedule", "customer", "repair"],
  repair_in_progress: ["repair", "customer"],
  waiting_on_parts: ["repair", "customer"],
  ready_for_pickup: ["billing", "customer"],
  invoice_outstanding: ["billing", "customer"],
  completed: ["invoice", "timeline", "customer"],
  cancelled: ["timeline", "customer"],
};

export function normalizeJobStatus(status) {
  if (!status) return "";
  const key = status.trim().toLowerCase().replace(/\s+/g, "_");
  return normalizeStatusKey(key);
}

export function getVisibleJobTabs(status) {
  const normalized = normalizeJobStatus(status);
  return STATUS_TABS[normalized] || ["schedule", "customer"];
}

// Labour and consumables can no longer be edited once the job is closed.
export function isLabourReadOnlyForStatus(status) {
  return CLOSED_STATUSES.includes(normalizeJobStatus(status));
}

export function isInvoiceReadOnlyForStatus(status) {
  return SETTLED_OR_CLOSED_STATUSES.includes(normalizeJobStatus(status));
}