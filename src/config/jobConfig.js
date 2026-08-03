// Backward-compatible job config entry point.
// Default values are OTR seed/demo data, not permanent platform logic.
import {
  DEFAULT_PAYMENT_STATUSES,
  DEFAULT_QUOTE_STATUSES,
  DEFAULT_WAITING_REASONS,
  DEFAULT_JOB_TYPES,
  DEFAULT_INTAKE_STATUS as INTAKE_STATUS,
} from "./platformConfig";

// Canonical job lifecycle (frontend mirror of base44/shared/jobLifecycle.ts —
// change both together). Main path is linear:
//   requested → scheduled → repair_in_progress → ready_for_pickup
//            → invoice_outstanding → completed
// waiting_on_parts / on_hold / cancelled are side states reachable from anywhere.
// Quote approval is retired: technicians build invoice line items directly.
export const JOB_STATUSES = [
  { key: "requested", label: "Booking Requested", group: "intake", color: "slate", is_default_intake: true },
  { key: "scheduled", label: "Scheduled", group: "active", color: "indigo" },
  { key: "repair_in_progress", label: "Repair In Progress", group: "active", color: "teal" },
  { key: "ready_for_pickup", label: "Ready for Pickup", group: "done", color: "emerald" },
  { key: "invoice_outstanding", label: "Invoice Outstanding", group: "billing", color: "rose" },
  { key: "completed", label: "Completed", group: "done", color: "emerald", is_terminal: true },
  { key: "waiting_on_parts", label: "Waiting on Parts", group: "waiting", color: "amber" },
  { key: "on_hold", label: "On Hold", group: "waiting", color: "slate" },
  { key: "cancelled", label: "Cancelled", group: "closed", color: "slate", is_terminal: true },
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

// Every retired status ever written, mapped to its canonical replacement.
export const LEGACY_STATUS_MAP = {
  booked: "scheduled",
  technician_assigned: "scheduled",
  quote_required: "requested",
  quote_sent: "scheduled",
  quote_approved: "scheduled",
  pending_confirmation: "on_hold",
  active: "repair_in_progress",
  in_progress: "repair_in_progress",
  waiting_parts: "waiting_on_parts",
  waiting_supplier: "on_hold",
  waiting_customer: "on_hold",
  invoice_sent: "invoice_outstanding",
  paid: "completed",
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

// Drop-off time windows arranged with the customer during scheduling.
export const TIME_WINDOW_LABELS = {
  morning: "Morning (8am–12pm)",
  afternoon: "Afternoon (12pm–4pm)",
  evening: "Evening (4pm–6pm)",
  asap: "ASAP / any time",
};

export function getTimeWindowLabel(key) {
  return TIME_WINDOW_LABELS[key] || (key ? key : "");
}