export const JOB_STATUSES = [
  "requested",
  "booked",
  "repair_in_progress",
  "waiting_on_parts",
  "ready_for_pickup",
  "invoice_sent",
  "paid",
  "completed",
  "cancelled",
  "on_hold",
] as const;

export const LEGACY_STATUS_MAP: Record<string, string> = {
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

export const READY_STATUS = "ready_for_pickup";
export const CANCELLED_STATUS = "cancelled";
export const REOPEN_STATUS = "booked";

const TERMINAL_STATUSES = new Set(["completed", "cancelled"]);
const REOPEN_ALLOWED_FROM = new Set(["completed", "cancelled", "on_hold"]);

const ALLOWED_FROM: Record<string, string[] | null> = {
  requested: null,
  booked: ["requested", "on_hold"],
  repair_in_progress: ["requested", "booked", "on_hold", "waiting_on_parts"],
  waiting_on_parts: ["booked", "repair_in_progress", "ready_for_pickup", "on_hold"],
  ready_for_pickup: ["booked", "repair_in_progress", "waiting_on_parts", "on_hold"],
  invoice_sent: ["repair_in_progress", "waiting_on_parts", "ready_for_pickup", "paid"],
  paid: ["ready_for_pickup", "invoice_sent"],
  completed: ["paid", "invoice_sent", "ready_for_pickup"],
  on_hold: null,
  cancelled: null,
};

export function normalizeStatus(status: unknown): string {
  const value = String(status || "").trim().toLowerCase();
  return LEGACY_STATUS_MAP[value] || value || "requested";
}

export function isCanonicalStatus(status: unknown): boolean {
  return JOB_STATUSES.includes(status as (typeof JOB_STATUSES)[number]);
}

export function canonicalCurrentStatus(status: unknown): string {
  const normalized = normalizeStatus(status);
  return isCanonicalStatus(normalized) ? normalized : "requested";
}

export function statusLabel(status: unknown): string {
  return normalizeStatus(status)
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function pendingChecklistCount(job: Record<string, unknown>): number {
  const checklist = Array.isArray(job?.checklist) ? job.checklist : [];
  return checklist.filter((item) => !item || typeof item !== "object" || !(item as { done?: boolean }).done).length;
}

type TransitionResult = {
  ok: boolean;
  currentStatus: string;
  nextStatus: string;
  error?: string;
};

export function validateStatusTransition(
  job: Record<string, unknown> = {},
  requestedStatus: unknown,
  options: { reopen?: boolean } = {},
): TransitionResult {
  const currentStatus = canonicalCurrentStatus(job.status);
  const nextStatus = options.reopen ? REOPEN_STATUS : normalizeStatus(requestedStatus);

  if (!isCanonicalStatus(nextStatus)) {
    return { ok: false, currentStatus, nextStatus, error: `Invalid job status: ${String(requestedStatus)}` };
  }

  if (currentStatus === nextStatus && !options.reopen) {
    return { ok: true, currentStatus, nextStatus };
  }

  if (options.reopen) {
    if (!REOPEN_ALLOWED_FROM.has(currentStatus)) {
      return {
        ok: false,
        currentStatus,
        nextStatus,
        error: `Cannot reopen a job from "${currentStatus}".`,
      };
    }
    return { ok: true, currentStatus, nextStatus };
  }

  if (TERMINAL_STATUSES.has(currentStatus)) {
    return {
      ok: false,
      currentStatus,
      nextStatus,
      error: `This job is ${currentStatus} and must be reopened before it can change status.`,
    };
  }

  const allowedFrom = ALLOWED_FROM[nextStatus];
  if (allowedFrom && !allowedFrom.includes(currentStatus)) {
    return {
      ok: false,
      currentStatus,
      nextStatus,
      error: `Cannot move to "${nextStatus}" from "${currentStatus}".`,
    };
  }

  if ([READY_STATUS, "completed"].includes(nextStatus)) {
    const pending = pendingChecklistCount(job);
    if (pending > 0) {
      return {
        ok: false,
        currentStatus,
        nextStatus,
        error: `${pending} checklist item${pending === 1 ? "" : "s"} must be completed first.`,
      };
    }
  }

  if (nextStatus === "invoice_sent" && !job.invoice_id && (!job.payment_status || job.payment_status === "unpaid")) {
    return {
      ok: false,
      currentStatus,
      nextStatus,
      error: "An invoice must be created before marking it as sent.",
    };
  }

  if (nextStatus === "paid" && !["outstanding", "paid"].includes(String(job.payment_status || ""))) {
    return {
      ok: false,
      currentStatus,
      nextStatus,
      error: "Payment cannot be recorded until an invoice has been created.",
    };
  }

  return { ok: true, currentStatus, nextStatus };
}
