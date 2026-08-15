import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/api/base44Client", () => ({
  base44: { functions: { invoke } },
}));

import { createInvoice, manualPaymentOutcome, recordManualPayment } from "@/services/paymentService";

describe("manual invoice payment recording", () => {
  beforeEach(() => invoke.mockReset());

  it("rejects a missing or non-positive invoice amount before invoking Base44", async () => {
    await expect(recordManualPayment({ id: "invoice-1", amount: 0 }, { id: "job-1" }))
      .rejects.toThrow("A positive invoice amount is required.");
    expect(invoke).not.toHaveBeenCalled();
  });

  it("forwards the exact full payment with a unique idempotency key", async () => {
    invoke.mockResolvedValue({
      status: 200,
      data: { ok: true, data: { event: { status: "complete" }, reconciliation: { complete: true } } },
    });
    await expect(recordManualPayment(
      { id: "invoice-1", amount: 125.45 },
      { id: "job-1" },
      { method: "bank_transfer", reference: "EFT-123" },
    )).resolves.toEqual({ event: { status: "complete" }, reconciliation: { complete: true } });

    expect(invoke).toHaveBeenCalledWith("invoiceActions", expect.objectContaining({
      action: "record_manual_payment",
      jobId: "job-1",
      invoiceId: "invoice-1",
      amount_minor: 12545,
      method: "bank_transfer",
      reference: "EFT-123",
      idempotency_key: expect.stringMatching(/^manual_payment:invoice-1:/),
      occurred_at: expect.any(String),
    }));
  });

  it("unwraps invoice action envelopes for invoice-returning helpers", async () => {
    const invoice = { id: "invoice-1", status: "draft" };
    invoke.mockResolvedValue({ status: 201, data: { ok: true, data: { invoice }, request_id: "req-1" } });

    await expect(createInvoice({ id: "job-1" }, 25, [{ description: "Labour" }])).resolves.toEqual(invoice);
  });

  it("surfaces a structured Base44 error envelope instead of treating it as success", async () => {
    invoke.mockResolvedValue({
      status: 409,
      data: { ok: false, error: { code: "invalid_state", message: "Only an issued invoice can be paid." } },
    });

    await expect(recordManualPayment({ id: "invoice-1", amount: 25 }, { id: "job-1" }))
      .rejects.toMatchObject({ message: "Only an issued invoice can be paid.", code: "invalid_state", status: 409 });
  });

  it("classifies a 202-style needs-reconciliation result as pending, never complete", () => {
    const paidProjection = { id: "invoice-1", status: "paid" };
    expect(manualPaymentOutcome({
      event: { status: "needs_reconciliation" },
      reconciliation: { complete: false, invoice: paidProjection },
    })).toEqual({
      invoice: paidProjection,
      needsReconciliation: true,
      complete: false,
    });
  });
});
