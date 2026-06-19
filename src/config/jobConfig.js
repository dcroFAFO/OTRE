// Backward-compatible job config entry point.
// Default values are OTR seed/demo data, not permanent platform logic.
import {
  DEFAULT_JOB_STATUSES,
  DEFAULT_PAYMENT_STATUSES,
  DEFAULT_QUOTE_STATUSES,
  DEFAULT_WAITING_REASONS,
  DEFAULT_JOB_TYPES,
  DEFAULT_INTAKE_STATUS as INTAKE_STATUS,
} from "./platformConfig";

export const JOB_STATUSES = DEFAULT_JOB_STATUSES;
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

export function getStatus(key) {
  return JOB_STATUSES.find((s) => s.key === key) || { key, label: key, color: "slate" };
}
export function getPaymentStatus(key) {
  return PAYMENT_STATUSES.find((s) => s.key === key) || { key, label: key, color: "slate" };
}
export function getQuoteStatus(key) {
  return QUOTE_STATUSES.find((s) => s.key === key) || { key, label: key, color: "slate" };
}