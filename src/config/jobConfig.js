// Backward-compatible job config entry point.
// Default values are OTR seed/demo data, not permanent platform logic.
import {
  DEFAULT_PAYMENT_STATUSES,
  DEFAULT_QUOTE_STATUSES,
  DEFAULT_WAITING_REASONS,
  DEFAULT_JOB_TYPES,
  DEFAULT_INTAKE_STATUS as INTAKE_STATUS,
} from "./platformConfig";

export const JOB_STATUSES = [
  { key: "requested", label: "Requested", group: "intake", color: "slate", is_default_intake: true },
  { key: "booked", label: "Job Scheduled", group: "active", color: "indigo" },
  { key: "repair_in_progress", label: "Repair In Progress", group: "active", color: "teal" },
  { key: "waiting_on_parts", label: "Waiting on Parts", group: "waiting", color: "amber" },
  { key: "ready_for_pickup", label: "Ready for Pickup", group: "done", color: "emerald" },
  { key: "invoice_sent", label: "Invoice Sent", group: "billing", color: "rose" },
  { key: "paid", label: "Paid", group: "billing", color: "emerald" },
  { key: "completed", label: "Completed", group: "done", color: "emerald", is_terminal: true },
  { key: "cancelled", label: "Cancelled", group: "closed", color: "slate", is_terminal: true },
  { key: "on_hold", label: "On Hold", group: "waiting", color: "slate" },
];

export const JOB_STATUS_VALUES = JOB_STATUSES.map((status) => status.key);
export const JOB_STATUS_LABELS = Object.fromEntries(JOB_STATUSES.map((status) => [status.key, status.label]));
export const PAYMENT_STATUSES = DEFAULT_PAYMENT_STATUSES;
export const QUOTE_STATUSES = DEFAULT_QUOTE_STATUSES;
export const WAITING_REASONS = DEFAULT_WAITING_REASONS;
export const JOB_TYPES = DEFAULT_JOB_TYPES;
export const DEFAULT_INTAKE_STATUS = INTAKE_STATUS;

// Color token map -> tailwind classes for status pills (literal strings so
// Tailwind's scanner keeps them).
export const STATUS_PILL_CLASSES = {
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
  violet: "bg-violet-100 text-violet-700 border-violet-200",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  teal: "bg-teal-100 text-teal-700 border-teal-200",
  rose: "bg-rose-100 text-rose-700 border-rose-200",
};

export const LEGACY_STATUS_MAP = {
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

export function normalizeStatusKey(key) {
  return LEGACY_STATUS_MAP[key] || key || "requested";
}

export function isCanonicalJobStatus(key) {
  return JOB_STATUS_VALUES.includes(key);
}

export function getCanonicalJobStatus(key) {
  const normalized = normalizeStatusKey(key);
  return isCanonicalJobStatus(normalized) ? normalized : "requested";
}

export function getStatus(key) {
  const normalized = getCanonicalJobStatus(key);
  return JOB_STATUSES.find((s) => s.key === normalized) || { key: "requested", label: "Requested", color: "slate" };
}
export function getPaymentStatus(key) {
  return PAYMENT_STATUSES.find((s) => s.key === key) || { key, label: key, color: "slate" };
}
export function getQuoteStatus(key) {
  return QUOTE_STATUSES.find((s) => s.key === key) || { key, label: key, color: "slate" };
}