import { describe, expect, it } from "vitest";
import {
  CUSTOMER_JOB_MILESTONES,
  JOB_STATUSES,
  LEGACY_STATUS_MAP,
  countJobsByCategory,
  getCanonicalJobStatus,
  getCustomerJobProgress,
  getJobCategory,
} from "@/config/jobConfig";

describe("canonical job lifecycle", () => {
  it.each(JOB_STATUSES.map(({ key }) => [key]))("keeps canonical status %s unchanged", (status) => {
    expect(getCanonicalJobStatus(status)).toBe(status);
  });

  it.each(Object.entries(LEGACY_STATUS_MAP))("normalises legacy status %s to %s", (legacy, canonical) => {
    expect(getCanonicalJobStatus(legacy)).toBe(canonical);
  });

  it("keeps waiting, ready, billing, completed and cancelled in separate categories", () => {
    expect(getJobCategory("waiting_parts").key).toBe("waiting");
    expect(getJobCategory("ready_for_pickup").key).toBe("ready");
    expect(getJobCategory("invoice_sent").key).toBe("billing");
    expect(getJobCategory("paid").key).toBe("completed");
    expect(getJobCategory("cancelled").key).toBe("cancelled");
  });

  it("counts legacy and canonical records through the same category selectors", () => {
    const counts = countJobsByCategory([
      { status: "requested" },
      { status: "booked" },
      { status: "active" },
      { status: "waiting_parts" },
      { status: "ready_for_pickup" },
      { status: "invoice_sent" },
      { status: "paid" },
      { status: "cancelled" },
    ]);

    expect(counts).toMatchObject({
      all: 8,
      requested: 1,
      scheduled: 1,
      repair: 1,
      waiting: 1,
      ready: 1,
      billing: 1,
      completed: 1,
      cancelled: 1,
    });
  });

  it("exposes Ready before Payment and never maps Cancelled to Complete", () => {
    expect(CUSTOMER_JOB_MILESTONES.map(({ key }) => key)).toEqual([
      "requested",
      "scheduled",
      "repair_in_progress",
      "ready_for_pickup",
      "invoice_outstanding",
      "completed",
    ]);
    expect(getCustomerJobProgress("ready_for_pickup")).toMatchObject({ currentIndex: 3, cancelled: false });
    expect(getCustomerJobProgress("cancelled")).toEqual({ status: "cancelled", currentIndex: -1, cancelled: true });
  });
});
