// Canonical job lifecycle — the single source of truth for the BACKEND.
//
// The customer journey is strictly linear:
//   requested → scheduled → repair_in_progress → ready_for_pickup
//            → invoice_outstanding → completed
//
// `waiting_on_parts`, `on_hold` and `cancelled` are side states reachable from
// anywhere on the main path.
//
// Quote approval is RETIRED. Technicians build invoice line items directly, so
// there is no customer-facing estimate, no approval step and no quote status.
// Never reintroduce quote_sent / quote_approved / quote_required.
//
// The frontend mirror of this list lives in src/config/jobConfig.js (Vite cannot
// import this Deno module). Both MUST be changed together.

export const JOB_STATUSES = [
  'requested',
  'scheduled',
  'repair_in_progress',
  'ready_for_pickup',
  'invoice_outstanding',
  'completed',
  'waiting_on_parts',
  'on_hold',
  'cancelled',
];

// Every retired value ever written, mapped to its canonical replacement, so old
// records keep rendering and can be migrated safely.
export const LEGACY_STATUS_MAP = {
  booked: 'scheduled',
  technician_assigned: 'scheduled',
  quote_required: 'requested',
  quote_sent: 'scheduled',
  quote_approved: 'scheduled',
  pending_confirmation: 'on_hold',
  active: 'repair_in_progress',
  in_progress: 'repair_in_progress',
  waiting_parts: 'waiting_on_parts',
  waiting_supplier: 'on_hold',
  waiting_customer: 'on_hold',
  invoice_sent: 'invoice_outstanding',
  paid: 'completed',
};

export const INTAKE_STATUS = 'requested';
export const READY_STATUS = 'ready_for_pickup';
export const INVOICE_OUTSTANDING_STATUS = 'invoice_outstanding';
export const COMPLETED_STATUS = 'completed';
export const CANCELLED_STATUS = 'cancelled';
export const REOPEN_STATUS = 'scheduled';

// Canonical payment/invoice vocabulary. `paid` on an Invoice drives the job to
// `completed`; there is no separate `paid` job status.
export const INVOICE_STATUSES = ['outstanding', 'paid', 'refunded'];

export function normalizeStatus(status) {
  return LEGACY_STATUS_MAP[status] || status || INTAKE_STATUS;
}

export function isCanonicalStatus(status) {
  return JOB_STATUSES.includes(status);
}

export function isCanonicalInvoiceStatus(status) {
  return INVOICE_STATUSES.includes(status);
}

export function statusLabel(key) {
  return String(key || '')
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}