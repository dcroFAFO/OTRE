import { describe, expect, it, vi } from "vitest";

vi.mock("@/api/base44Client", () => ({
  base44: { entities: { Invoice: { list: vi.fn() }, Job: { list: vi.fn() } } },
}));

import { isIssuedInvoice, paymentStatus } from "@/pages/dashboard/Invoices";

describe("invoice visibility and manual status semantics", () => {
  it("counts only invoices actually issued to customers", () => {
    expect(isIssuedInvoice({ invoiceVisibility: "customer_visible", invoiceSentAt: "2026-08-13T00:00:00Z" })).toBe(true);
    expect(isIssuedInvoice({ invoiceVisibility: "customer_visible" })).toBe(false);
    expect(isIssuedInvoice({ invoiceVisibility: "internal", invoiceSentAt: "2026-08-13T00:00:00Z" })).toBe(false);
  });

  it("normalizes legacy unpaid records to outstanding", () => {
    expect(paymentStatus({ status: "unpaid" })).toBe("outstanding");
    expect(paymentStatus({ status: "issued" })).toBe("outstanding");
    expect(paymentStatus({ status: "paid" })).toBe("paid");
    expect(paymentStatus({})).toBe("outstanding");
  });
});
