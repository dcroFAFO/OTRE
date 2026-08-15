import { describe, expect, it } from "vitest";
import { mergeClientHistoryPages } from "@/services/clientHistoryMerge";

describe("mergeClientHistoryPages", () => {
  it("deduplicates accumulated history and follows the final page cursor", () => {
    const merged = mergeClientHistoryPages([
      {
        linked: { jobs: [{ id: "job-1" }], invoices: [{ id: "invoice-1" }], scooters: [{ id: "scooter-1" }], feedback: [] },
        timeline: [{ kind: "note", title: "Shared note", date: "2026-01-01" }],
        pagination: { page: 1, has_more: true, next_page: 2 },
        truncation: { jobs: true, notes: false },
      },
      {
        linked: { jobs: [{ id: "job-2" }], invoices: [{ id: "invoice-1" }], scooters: [{ id: "scooter-1" }], feedback: [] },
        timeline: [{ kind: "note", title: "Shared note", date: "2026-01-01" }, { kind: "job", title: "Older job", date: "2025-01-01" }],
        pagination: { page: 2, has_more: false, next_page: null },
        truncation: { jobs: true, notes: false },
      },
    ]);

    expect(merged.linked.jobs.map((job) => job.id)).toEqual(["job-1", "job-2"]);
    expect(merged.linked.invoices).toHaveLength(1);
    expect(merged.timeline).toHaveLength(2);
    expect(merged.pagination.has_more).toBe(false);
    expect(merged.truncation.jobs).toBe(false);
    expect(merged.potentially_truncated).toBe(false);
  });

  it("keeps non-job truncation visible after all job pages load", () => {
    const merged = mergeClientHistoryPages([{
      linked: { jobs: [], invoices: [], scooters: [], feedback: [] },
      timeline: [],
      pagination: { page: 1, has_more: false, next_page: null },
      truncation: { jobs: false, audits: true },
      query_failures: ["notes"],
    }]);

    expect(merged.partial).toBe(true);
    expect(merged.query_failures).toEqual(["notes"]);
  });
});
