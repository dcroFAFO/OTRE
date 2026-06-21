/**
 * jobWorkflowService.js
 *
 * Guarded workflow transitions for jobs.
 * Status MUST only change through updateJobStatusFromEvent() — never via a
 * raw status dropdown or direct field edit.
 */

import { changeStatus, reopenJob } from "./jobService";
import { getCanonicalJobStatus, isCanonicalJobStatus, normalizeStatusKey } from "@/config/jobConfig";

const TERMINAL = ["completed", "cancelled"];

function normalizeStatus(status) {
  return getCanonicalJobStatus(status);
}

const TRANSITION_RULES = {
  requested: {
    targetStatus: "requested",
    allowedFrom: null,
    check() { return { ok: true }; },
  },
  booked: {
    targetStatus: "booked",
    allowedFrom: ["requested", "on_hold"],
    check() { return { ok: true }; },
  },
  repair_in_progress: {
    targetStatus: "repair_in_progress",
    allowedFrom: ["requested", "booked", "on_hold", "waiting_on_parts"],
    check() { return { ok: true }; },
  },
  waiting_on_parts: {
    targetStatus: "waiting_on_parts",
    allowedFrom: ["booked", "repair_in_progress", "ready_for_pickup", "on_hold"],
    check() { return { ok: true }; },
  },
  ready_for_pickup: {
    targetStatus: "ready_for_pickup",
    allowedFrom: ["booked", "repair_in_progress", "waiting_on_parts", "on_hold"],
    check(job) {
      const pending = (job.checklist || []).filter((c) => !c.done).length;
      if (pending > 0) {
        return { ok: false, reason: `${pending} checklist item${pending !== 1 ? "s" : ""} still need to be completed before marking as ready for pickup.` };
      }
      return { ok: true };
    },
  },
  invoice_sent: {
    targetStatus: "invoice_sent",
    allowedFrom: ["repair_in_progress", "waiting_on_parts", "ready_for_pickup", "paid"],
    check(job) {
      if (!job.invoice_id && (!job.payment_status || job.payment_status === "unpaid")) {
        return { ok: false, reason: "An invoice must be created before marking it as sent." };
      }
      return { ok: true };
    },
  },
  paid: {
    targetStatus: "paid",
    allowedFrom: ["ready_for_pickup", "invoice_sent"],
    check(job) {
      if (!["outstanding", "paid"].includes(job.payment_status)) {
        return { ok: false, reason: "Payment cannot be recorded until an invoice has been created." };
      }
      return { ok: true };
    },
  },
  completed: {
    targetStatus: "completed",
    allowedFrom: ["paid", "invoice_sent", "ready_for_pickup"],
    check(job) {
      const pending = (job.checklist || []).filter((c) => !c.done).length;
      if (pending > 0) {
        return { ok: false, reason: `${pending} checklist item${pending !== 1 ? "s" : ""} must be completed before closing this job.` };
      }
      return { ok: true };
    },
  },
  on_hold: {
    targetStatus: "on_hold",
    allowedFrom: null,
    check() { return { ok: true }; },
  },
  cancelled: {
    targetStatus: "cancelled",
    allowedFrom: null,
    check() { return { ok: true }; },
  },
  reopen: {
    targetStatus: "booked",
    allowedFrom: ["completed", "cancelled", "on_hold"],
    check() { return { ok: true }; },
  },
};

export async function updateJobStatusFromEvent(job, eventType, payload = {}) {
  const canonicalEventType = normalizeStatusKey(eventType);
  if (!isCanonicalJobStatus(canonicalEventType) && canonicalEventType !== "reopen") {
    throw new Error(`Invalid job status: "${eventType}".`);
  }

  const rule = TRANSITION_RULES[canonicalEventType];
  if (!rule) throw new Error(`Unknown workflow event: "${eventType}".`);

  const currentStatus = normalizeStatus(job.status);
  if (TERMINAL.includes(currentStatus) && canonicalEventType !== "reopen") {
    throw new Error(`This job is ${currentStatus} and cannot be changed further. Use "Reopen" to reactivate it.`);
  }

  if (rule.allowedFrom !== null && !rule.allowedFrom.includes(currentStatus)) {
    throw new Error(`Cannot move to "${rule.targetStatus}" from "${currentStatus}". This transition is not part of the allowed workflow.`);
  }

  const checkResult = rule.check({ ...job, status: currentStatus }, payload);
  if (!checkResult.ok) throw new Error(checkResult.reason);

  return canonicalEventType === "reopen"
    ? await reopenJob(job)
    : await changeStatus(job, rule.targetStatus);
}