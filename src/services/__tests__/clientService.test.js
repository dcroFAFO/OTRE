import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/api/base44Client", () => ({
  base44: { functions: { invoke: mocks.invoke }, entities: {} },
}));
vi.mock("@/services/auditService", () => ({ logAudit: vi.fn() }));

import { addClientNote, archiveScooter, deleteScooter, listClientNotes, listClients, searchClients, updateClientReferral } from "@/services/clientService";

describe("admin scooter lifecycle", () => {
  beforeEach(() => mocks.invoke.mockReset());

  it("uses the history-preserving archive action for linked scooters", async () => {
    const archived = { id: "scooter-1", archived_at: "2026-08-14T00:00:00Z" };
    mocks.invoke.mockResolvedValue({ data: { archived: true, scooter: archived } });

    await expect(archiveScooter("scooter-1", "Service history retained")).resolves.toBe(archived);
    expect(mocks.invoke).toHaveBeenCalledWith("scooterActions", {
      action: "archiveScooter",
      scooter_id: "scooter-1",
      reason: "Service history retained",
    });
  });

  it("keeps unlinked hard deletion as a distinct explicit action", async () => {
    mocks.invoke.mockResolvedValue({ data: { success: true } });
    await deleteScooter("scooter-2");
    expect(mocks.invoke).toHaveBeenCalledWith("scooterActions", { action: "deleteScooter", scooter_id: "scooter-2" });
  });

  it("preserves bounded customer-list pagination and partial metadata", async () => {
    mocks.invoke.mockResolvedValue({
      data: {
        customers: [{ id: "customer-51" }],
        page: 2,
        limit: 50,
        partial: true,
        potentially_truncated: true,
        pagination: { page: 2, limit: 50, has_more: false, next_page: null },
        truncation: { customers: true, jobs: false, scooters: true },
        query_failures: ["scooters"],
      },
    });

    await expect(listClients({ page: 2, limit: 50 })).resolves.toMatchObject({
      customers: [{ id: "customer-51" }],
      partial: true,
      potentially_truncated: true,
      pagination: { page: 2, has_more: false },
      query_failures: ["scooters"],
    });
    expect(mocks.invoke).toHaveBeenCalledWith("customerRead", { action: "list", page: 2, limit: 50 });
  });

  it("routes staff customer search and internal notes through authenticated functions", async () => {
    mocks.invoke
      .mockResolvedValueOnce({ data: { customers: [{ id: "customer-1", name: "Jane" }] } })
      .mockResolvedValueOnce({ data: { notes: [{ id: "note-1", body: "Called customer" }] } })
      .mockResolvedValueOnce({ data: { note: { id: "note-2", body: "Repair approved" } } });

    await expect(searchClients("name", "Jane")).resolves.toEqual([{ id: "customer-1", name: "Jane" }]);
    await expect(listClientNotes("customer-1")).resolves.toEqual([{ id: "note-1", body: "Called customer" }]);
    await expect(addClientNote({ id: "customer-1" }, "Repair approved")).resolves.toEqual({ id: "note-2", body: "Repair approved" });

    expect(mocks.invoke).toHaveBeenNthCalledWith(1, "customerRead", { action: "search", field: "name", query: "Jane" });
    expect(mocks.invoke).toHaveBeenNthCalledWith(2, "customerRead", { action: "listNotes", customer_id: "customer-1" });
    expect(mocks.invoke).toHaveBeenNthCalledWith(3, "customerWrite", { action: "addNote", customer_id: "customer-1", body: "Repair approved" });
  });

  it("routes referral mutations through the audited backend boundary", async () => {
    mocks.invoke.mockResolvedValue({ data: { customer: { id: "customer-1", referral_status: "completed" } } });
    await expect(updateClientReferral("customer-1", { referral_status: "completed" })).resolves.toMatchObject({ referral_status: "completed" });
    expect(mocks.invoke).toHaveBeenCalledWith("customerWrite", {
      action: "updateReferral",
      customer_id: "customer-1",
      changes: { referral_status: "completed" },
    });
  });
});
