// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  canonicalCurrentStatus,
  isCanonicalStatus,
  normalizeStatus,
  pendingChecklistCount,
  statusLabel,
  validateStatusTransition,
} from "../../base44/functions/jobActions/domain";

describe("job action domain rules", () => {
  it("normalizes legacy, blank, and mixed-case statuses", () => {
    expect(normalizeStatus(" Active ")).toBe("repair_in_progress");
    expect(normalizeStatus("waiting_parts")).toBe("waiting_on_parts");
    expect(normalizeStatus("")).toBe("requested");
  });

  it("recognizes only canonical statuses", () => {
    expect(isCanonicalStatus("ready_for_pickup")).toBe(true);
    expect(isCanonicalStatus("waiting_parts")).toBe(false);
    expect(canonicalCurrentStatus("unknown_legacy_value")).toBe("requested");
  });

  it("formats normalized statuses for audit messages", () => {
    expect(statusLabel("waiting_parts")).toBe("Waiting On Parts");
  });

  it("counts unfinished and malformed checklist entries", () => {
    expect(pendingChecklistCount({ checklist: [{ done: true }, { done: false }, null] })).toBe(2);
    expect(pendingChecklistCount({})).toBe(0);
  });

  it("allows defined forward workflow transitions", () => {
    expect(validateStatusTransition({ status: "requested" }, "booked")).toMatchObject({
      ok: true,
      currentStatus: "requested",
      nextStatus: "booked",
    });
    expect(validateStatusTransition({ status: "waiting_parts" }, "repair_in_progress").ok).toBe(true);
  });

  it("rejects unknown and out-of-order transitions", () => {
    expect(validateStatusTransition({ status: "requested" }, "made_up")).toMatchObject({
      ok: false,
      error: "Invalid job status: made_up",
    });
    expect(validateStatusTransition({ status: "booked" }, "paid")).toMatchObject({
      ok: false,
      error: 'Cannot move to "paid" from "booked".',
    });
  });

  it("requires pending checklist work to be completed", () => {
    const job = { status: "repair_in_progress", checklist: [{ label: "Brake test", done: false }] };
    expect(validateStatusTransition(job, "ready_for_pickup")).toMatchObject({
      ok: false,
      error: "1 checklist item must be completed first.",
    });
    expect(validateStatusTransition({ ...job, checklist: [{ done: true }] }, "ready_for_pickup").ok).toBe(true);
  });

  it("requires an invoice before invoice-sent status", () => {
    expect(validateStatusTransition({ status: "repair_in_progress", payment_status: "unpaid" }, "invoice_sent")).toMatchObject({
      ok: false,
      error: "An invoice must be created before marking it as sent.",
    });
    expect(validateStatusTransition({ status: "repair_in_progress", invoice_id: "invoice-1" }, "invoice_sent").ok).toBe(true);
  });

  it("requires an invoice payment state before paid status", () => {
    expect(validateStatusTransition({ status: "invoice_sent", payment_status: "unpaid" }, "paid")).toMatchObject({
      ok: false,
      error: "Payment cannot be recorded until an invoice has been created.",
    });
    expect(validateStatusTransition({ status: "invoice_sent", payment_status: "outstanding" }, "paid").ok).toBe(true);
  });

  it("blocks terminal jobs until they are reopened", () => {
    expect(validateStatusTransition({ status: "completed" }, "requested")).toMatchObject({
      ok: false,
      error: "This job is completed and must be reopened before it can change status.",
    });
    expect(validateStatusTransition({ status: "cancelled" }, "booked", { reopen: true }).ok).toBe(true);
    expect(validateStatusTransition({ status: "on_hold" }, "booked", { reopen: true }).ok).toBe(true);
    expect(validateStatusTransition({ status: "requested" }, "booked", { reopen: true })).toMatchObject({
      ok: false,
      error: 'Cannot reopen a job from "requested".',
    });
  });

  it("keeps exact repeated transitions idempotent", () => {
    expect(validateStatusTransition({ status: "completed" }, "completed").ok).toBe(true);
  });
});
