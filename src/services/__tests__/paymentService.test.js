import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/api/base44Client", () => ({
  base44: { functions: { invoke } },
}));

import { setPaymentStatus } from "@/services/paymentService";

describe("manual invoice payment status", () => {
  beforeEach(() => invoke.mockReset());

  it("rejects user-triggered refunded transitions before invoking Base44", async () => {
    await expect(setPaymentStatus({ id: "invoice-1" }, { id: "job-1" }, "refunded"))
      .rejects.toThrow("Only outstanding or paid can be recorded manually.");
    expect(invoke).not.toHaveBeenCalled();
  });

  it.each(["outstanding", "paid"])("allows %s and forwards the canonical action", async (status) => {
    invoke.mockResolvedValue({ data: { id: "invoice-1", status } });
    await expect(setPaymentStatus({ id: "invoice-1" }, { id: "job-1" }, status))
      .resolves.toEqual({ id: "invoice-1", status });
    expect(invoke).toHaveBeenCalledWith("invoiceActions", {
      action: "set_payment_status",
      jobId: "job-1",
      invoiceId: "invoice-1",
      status,
    });
  });
});
