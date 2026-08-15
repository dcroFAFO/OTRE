import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/api/base44Client", () => ({
  base44: { functions: { invoke: mocks.invoke } },
}));

import { getCustomerPortalJob, getCustomerPortalOverview } from "@/services/customerPortalService";

describe("customerPortalService", () => {
  beforeEach(() => mocks.invoke.mockReset());

  it("unwraps the authenticated overview envelope", async () => {
    const overview = { jobs: [], scooters: [], invoices: [], potentially_truncated: false };
    mocks.invoke.mockResolvedValue({ data: { ok: true, data: overview, request_id: "request-1" } });

    await expect(getCustomerPortalOverview()).resolves.toBe(overview);
    expect(mocks.invoke).toHaveBeenCalledWith("customerPortalData", { action: "overview" });
  });

  it("requests one customer-owned repair and exposes safe function errors", async () => {
    mocks.invoke.mockResolvedValueOnce({
      status: 404,
      data: { ok: false, error: { code: "not_found", message: "Repair not found." }, request_id: "request-2" },
    });

    await expect(getCustomerPortalJob("job-1")).rejects.toMatchObject({
      message: "Repair not found.",
      code: "not_found",
      status: 404,
    });
    expect(mocks.invoke).toHaveBeenCalledWith("customerPortalData", { action: "job", job_id: "job-1" });
  });
});
