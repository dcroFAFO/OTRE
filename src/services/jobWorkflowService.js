/**
 * jobWorkflowService.js
 *
 * Guarded workflow transitions for jobs.
 * Status MUST only change through updateJobStatusFromEvent() — never via a
 * raw status dropdown or direct field edit.
 */

import { changeStatus, reopenJob } from "./jobService";

// ---------------------------------------------------------------------------
// Transition guard rules
// Each event has:
//   - targetStatus  : the status key to set
//   - allowedFrom   : set of current statuses that permit this transition
//                     (null = any non-terminal status)
//   - check(job)    : optional extra guard; return { ok: false, reason: "…" }
//                     to block, or { ok: true } to allow
// ---------------------------------------------------------------------------

const TERMINAL = ["completed", "cancelled"];

const TRANSITION_RULES = {
  // ── Quote flow ────────────────────────────────────────────────────────────
  quote_sent: {
    targetStatus: "quote_sent",
    allowedFrom: ["requested", "quote_required", "pending_confirmation", "active", "booked"],
    check(job) {
      const hasQuote = job.quote_status && job.quote_status !== "draft";
      if (!hasQuote) {
        return { ok: false, reason: "A quote must be created and saved before marking it as sent." };
      }
      return { ok: true };
    },
  },

  quote_approved: {
    targetStatus: "quote_approved",
    allowedFrom: ["quote_sent", "pending_confirmation"],
    check(job) {
      if (!["sent", "approved"].includes(job.quote_status)) {
        return { ok: false, reason: "The quote must be in 'Sent' status before the customer can approve it." };
      }
      return { ok: true };
    },
  },

  // ── Repair flow ───────────────────────────────────────────────────────────
  repair_in_progress: {
    targetStatus: "repair_in_progress",
    allowedFrom: [
      "quote_approved", "active", "booked", "technician_assigned",
      "waiting_parts", "waiting_supplier", "waiting_customer", "on_hold",
    ],
    check() { return { ok: true }; },
  },

  waiting_parts: {
    targetStatus: "waiting_parts",
    allowedFrom: [
      "quote_approved", "active", "booked", "technician_assigned", "repair_in_progress",
    ],
    check(job, payload) {
      // payload.waitingReason is required
      if (!payload?.waitingReason) {
        return { ok: false, reason: "Please select a waiting reason before marking the job as waiting." };
      }
      return { ok: true };
    },
  },

  ready_for_pickup: {
    targetStatus: "ready_for_pickup",
    allowedFrom: [
      "quote_approved", "active", "booked", "technician_assigned",
      "repair_in_progress", "waiting_parts", "waiting_supplier", "waiting_customer",
    ],
    check(job) {
      const checklist = job.checklist || [];
      const pending = checklist.filter((c) => !c.done).length;
      if (pending > 0) {
        return {
          ok: false,
          reason: `${pending} checklist item${pending !== 1 ? "s" : ""} still need to be completed before marking as ready for pickup.`,
        };
      }
      return { ok: true };
    },
  },

  // ── Billing flow ──────────────────────────────────────────────────────────
  invoice_outstanding: {
    targetStatus: "invoice_outstanding",
    allowedFrom: ["ready_for_pickup"],
    check(job) {
      // An invoice record should exist (payment_status reflects this)
      if (!job.payment_status || job.payment_status === "unpaid") {
        return { ok: false, reason: "An invoice must be created before sending it to the customer." };
      }
      return { ok: true };
    },
  },

  paid: {
    targetStatus: "paid",
    allowedFrom: ["ready_for_pickup", "invoice_outstanding"],
    check(job) {
      if (!["outstanding", "paid"].includes(job.payment_status)) {
        return { ok: false, reason: "Payment cannot be recorded until an invoice has been created and sent." };
      }
      return { ok: true };
    },
  },

  completed: {
    targetStatus: "completed",
    allowedFrom: ["paid", "ready_for_pickup", "invoice_outstanding"],
    check(job) {
      const checklist = job.checklist || [];
      const pending = checklist.filter((c) => !c.done).length;
      if (pending > 0) {
        return {
          ok: false,
          reason: `${pending} checklist item${pending !== 1 ? "s" : ""} must be completed before closing this job.`,
        };
      }
      if (!["paid", "outstanding"].includes(job.payment_status)) {
        return { ok: false, reason: "The job cannot be completed until payment is recorded or an invoice is outstanding." };
      }
      return { ok: true };
    },
  },

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  on_hold: {
    targetStatus: "on_hold",
    allowedFrom: null, // any non-terminal
    check() { return { ok: true }; },
  },

  cancelled: {
    targetStatus: "cancelled",
    allowedFrom: null, // any non-terminal
    check() { return { ok: true }; },
  },

  reopen: {
    targetStatus: "active",
    allowedFrom: ["completed", "cancelled", "on_hold"],
    check() { return { ok: true }; },
  },
};

// ---------------------------------------------------------------------------
// updateJobStatusFromEvent(job, eventType, payload?)
//
// Returns { ok: true } on success, or throws an Error with a user-facing
// message when the transition is blocked.
// ---------------------------------------------------------------------------
export async function updateJobStatusFromEvent(job, eventType, payload = {}) {
  // Special case: archive is not a status change
  if (eventType === "archive") {
    await archiveJob(job);
    return { ok: true };
  }

  const rule = TRANSITION_RULES[eventType];
  if (!rule) {
    throw new Error(`Unknown workflow event: "${eventType}".`);
  }

  const currentStatus = job.status || "";

  // 1. Terminal guard
  if (TERMINAL.includes(currentStatus) && eventType !== "reopen") {
    throw new Error(
      `This job is ${currentStatus} and cannot be changed further. Use "Reopen" to reactivate it.`
    );
  }

  // 2. allowedFrom guard
  if (rule.allowedFrom !== null && !rule.allowedFrom.includes(currentStatus)) {
    throw new Error(
      `Cannot move to "${rule.targetStatus}" from "${currentStatus}". ` +
      `This transition is not part of the allowed workflow.`
    );
  }

  // 3. Business-logic check
  const checkResult = rule.check(job, payload);
  if (!checkResult.ok) {
    throw new Error(checkResult.reason);
  }

  // 4. Execute
  if (eventType === "reopen") {
    await reopenJob(job);
  } else {
    await changeStatus(job, rule.targetStatus);
  }

  return { ok: true };
}