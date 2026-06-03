// Configurable job status model. NOT hard-coded into logic — referenced by key.
// Re-order / rename / add statuses here without touching business logic.

export const JOB_STATUSES = [
  { key: "requested", label: "Requested", group: "intake", color: "slate" },
  { key: "pending_confirmation", label: "Pending Confirmation", group: "intake", color: "amber" },
  { key: "active", label: "Active", group: "active", color: "indigo" },
  { key: "booked", label: "Booked", group: "active", color: "indigo" },
  { key: "technician_assigned", label: "Technician Assigned", group: "active", color: "indigo" },
  { key: "waiting_customer", label: "Waiting for Customer", group: "waiting", color: "amber" },
  { key: "waiting_technician", label: "Waiting for Technician", group: "waiting", color: "amber" },
  { key: "waiting_supplier", label: "Waiting for Supplier", group: "waiting", color: "amber" },
  { key: "waiting_parts", label: "Waiting for Parts", group: "waiting", color: "amber" },
  { key: "quote_required", label: "Quote Required", group: "quote", color: "violet" },
  { key: "quote_sent", label: "Quote Sent", group: "quote", color: "violet" },
  { key: "quote_approved", label: "Quote Approved", group: "quote", color: "emerald" },
  { key: "on_hold", label: "On Hold", group: "waiting", color: "slate" },
  { key: "repair_in_progress", label: "Repair In Progress", group: "active", color: "teal" },
  { key: "ready_for_pickup", label: "Ready for Pickup", group: "done", color: "emerald" },
  { key: "invoice_outstanding", label: "Invoice Outstanding", group: "billing", color: "rose" },
  { key: "paid", label: "Paid", group: "billing", color: "emerald" },
  { key: "completed", label: "Completed", group: "done", color: "emerald" },
  { key: "cancelled", label: "Cancelled", group: "closed", color: "slate" },
];

export const DEFAULT_INTAKE_STATUS = "requested";

export const PAYMENT_STATUSES = [
  { key: "unpaid", label: "Unpaid", color: "slate" },
  { key: "outstanding", label: "Outstanding", color: "rose" },
  { key: "paid", label: "Paid", color: "emerald" },
  { key: "refunded", label: "Refunded", color: "amber" },
];

export const QUOTE_STATUSES = [
  { key: "draft", label: "Draft", color: "slate" },
  { key: "sent", label: "Sent", color: "violet" },
  { key: "approved", label: "Approved", color: "emerald" },
  { key: "rejected", label: "Rejected", color: "rose" },
];

export const WAITING_REASONS = [
  { key: "customer", label: "Customer" },
  { key: "technician", label: "Technician" },
  { key: "supplier", label: "Supplier" },
  { key: "parts", label: "Parts" },
];

export const JOB_TYPES = [
  { key: "repair", label: "Repair" },
  { key: "service", label: "Service" },
  { key: "diagnostic", label: "Diagnostic" },
  { key: "sales", label: "Sales" },
  { key: "pickup", label: "Pickup / Assessment" },
];

export const ROLES = {
  admin: { key: "admin", label: "Admin" },
  employee: { key: "employee", label: "Employee" },
  technician: { key: "technician", label: "Technician" },
  customer: { key: "customer", label: "Customer" },
};

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