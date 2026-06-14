/**
 * jobDetailsTabConfig.js
 * Central utility for job status normalisation and tab visibility rules.
 */

// ---------------------------------------------------------------------------
// Status groups (normalised, snake_case)
// ---------------------------------------------------------------------------

export const PRE_QUOTE_STATUSES = [
  "requested",
  "quote_sent",
  "pending_confirmation",
  "quote_required",
];

export const APPROVED_ACTIVE_STATUSES = [
  "quote_approved",
  "active",
  "booked",
  "technician_assigned",
  "waiting_parts",
  "repair_in_progress",
];

export const PICKUP_INVOICE_STATUSES = [
  "ready_for_pickup",
  "invoice_outstanding",
];

export const CLOSED_PAID_STATUSES = [
  "completed",
  "paid",
];

export const HOLD_CANCELLED_STATUSES = [
  "cancelled",
  "on_hold",
];

// ---------------------------------------------------------------------------
// 1. normalizeJobStatus(status)
//    Converts any casing / spacing variant to a canonical snake_case key.
//    e.g. "Quote Approved" → "quote_approved"
// ---------------------------------------------------------------------------
export function normalizeJobStatus(status) {
  if (!status) return "";
  return status.trim().toLowerCase().replace(/\s+/g, "_");
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function inGroup(status, group) {
  return group.includes(normalizeJobStatus(status));
}

// ---------------------------------------------------------------------------
// 2. getVisibleJobTabs(status)
//    Returns the set of tab keys that should be visible for this job status.
//    Falls back to PRE_QUOTE_STATUSES tabs and logs a warning for unknowns.
//
//    Tab keys mirror the Tabs values used in JobDetailModal:
//      manage | intake | checklist | quote | invoice |
//      customer | notes | private | parts | files | activity
//
//    Notes:
//    - "manage", "intake", "checklist", "customer", "notes",
//      "private", "files", "activity" are always shown
//      (role / data guards are applied separately in the modal).
//    - "quote" and "invoice" visibility is controlled here.
// ---------------------------------------------------------------------------
export function getVisibleJobTabs(status) {
  const norm = normalizeJobStatus(status);

  const allKnown = [
    ...PRE_QUOTE_STATUSES,
    ...APPROVED_ACTIVE_STATUSES,
    ...PICKUP_INVOICE_STATUSES,
    ...CLOSED_PAID_STATUSES,
    ...HOLD_CANCELLED_STATUSES,
  ];

  const ALWAYS_VISIBLE = ["manage", "intake", "checklist", "customer", "notes", "private", "parts", "files", "activity"];

  if (!allKnown.includes(norm)) {
    if (norm) {
      console.warn(
        `[jobDetailsTabConfig] Unknown job status: "${status}" (normalised: "${norm}"). ` +
        `Falling back to PRE_QUOTE tab set.`
      );
    }
    // Fallback: same as PRE_QUOTE — show quote, hide invoice
    return new Set([...ALWAYS_VISIBLE, "quote"]);
  }

  if (inGroup(norm, PRE_QUOTE_STATUSES)) {
    return new Set([...ALWAYS_VISIBLE, "quote"]);
  }

  if (inGroup(norm, APPROVED_ACTIVE_STATUSES)) {
    return new Set([...ALWAYS_VISIBLE, "quote", "invoice"]);
  }

  if (inGroup(norm, PICKUP_INVOICE_STATUSES)) {
    return new Set([...ALWAYS_VISIBLE, "quote", "invoice"]);
  }

  if (inGroup(norm, CLOSED_PAID_STATUSES)) {
    return new Set([...ALWAYS_VISIBLE, "quote", "invoice"]);
  }

  if (inGroup(norm, HOLD_CANCELLED_STATUSES)) {
    // Show quote; invoice only if job reached invoice stage
    return new Set([...ALWAYS_VISIBLE, "quote"]);
  }

  // Should never reach here, but be safe
  return new Set([...ALWAYS_VISIBLE, "quote"]);
}

// ---------------------------------------------------------------------------
// 3. isQuoteReadOnlyForStatus(status)
//    Returns true when the quote should be locked from editing.
// ---------------------------------------------------------------------------
export function isQuoteReadOnlyForStatus(status) {
  const norm = normalizeJobStatus(status);
  // Quote is read-only once approved/active or beyond
  return (
    inGroup(norm, APPROVED_ACTIVE_STATUSES) ||
    inGroup(norm, PICKUP_INVOICE_STATUSES) ||
    inGroup(norm, CLOSED_PAID_STATUSES) ||
    inGroup(norm, HOLD_CANCELLED_STATUSES)
  );
}

// ---------------------------------------------------------------------------
// 4. isInvoiceReadOnlyForStatus(status)
//    Returns true when the invoice should be locked from editing.
// ---------------------------------------------------------------------------
export function isInvoiceReadOnlyForStatus(status) {
  const norm = normalizeJobStatus(status);
  // Invoice is read-only once closed/paid
  return (
    inGroup(norm, CLOSED_PAID_STATUSES) ||
    inGroup(norm, HOLD_CANCELLED_STATUSES)
  );
}