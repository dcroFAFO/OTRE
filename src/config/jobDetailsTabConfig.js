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
// Notes & files and the activity timeline are available at every stage —
// staff need to record findings and audit a job regardless of its status.
const STATUS_TABS = {
  requested: ["schedule", "notes", "customer", "timeline"],
  scheduled: ["schedule", "repair", "notes", "customer", "timeline"],
  on_hold: ["schedule", "repair", "notes", "customer", "timeline"],
  repair_in_progress: ["repair", "notes", "customer", "timeline"],
  waiting_on_parts: ["repair", "notes", "customer", "timeline"],
  ready_for_pickup: ["billing", "notes", "customer", "timeline"],
  invoice_outstanding: ["billing", "notes", "customer", "timeline"],
  completed: ["invoice", "notes", "customer", "timeline"],
  cancelled: ["notes", "customer", "timeline"],
};

export function normalizeJobStatus(status) {
  if (!status) return "";
  const key = status.trim().toLowerCase().replace(/\s+/g, "_");
  return normalizeStatusKey(key);
}

export function getVisibleJobTabs(status) {
  const normalized = normalizeJobStatus(status);
  return STATUS_TABS[normalized] || ["schedule", "notes", "customer", "timeline"];
}

// Labour and consumables can no longer be edited once the job is closed.
export function isLabourReadOnlyForStatus(status) {
  return CLOSED_STATUSES.includes(normalizeJobStatus(status));
}

export function isInvoiceReadOnlyForStatus(status) {
  return SETTLED_OR_CLOSED_STATUSES.includes(normalizeJobStatus(status));
}