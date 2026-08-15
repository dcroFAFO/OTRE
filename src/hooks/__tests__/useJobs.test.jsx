import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn(), filter: vi.fn() }));

vi.mock("@/api/base44Client", () => ({
  base44: { entities: { Job: { list: mocks.list, filter: mocks.filter } } },
}));

import { useJobs } from "@/hooks/useJobs";

function wrapper({ children }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useJobs bounded active-job list", () => {
  beforeEach(() => {
    mocks.list.mockReset().mockImplementation((_sort, _limit, skip) => Promise.resolve(skip === 0
      ? [
        { id: "job-1" },
        { id: "job-2", archived_at: "2026-08-14T00:00:00Z" },
        { id: "job-3" },
        { id: "job-4" },
      ]
      : [{ id: "job-4" }],
    ));
    mocks.filter.mockReset();
  });

  it("keeps archived jobs hidden while preserving the raw-page continuation offset", async () => {
    const { result } = renderHook(() => useJobs({}, { pageSize: 3 }), { wrapper });

    await waitFor(() => expect(result.current.data.map((job) => job.id)).toEqual(["job-1", "job-3"]));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => { await result.current.fetchNextPage(); });

    await waitFor(() => expect(result.current.data.map((job) => job.id)).toEqual(["job-1", "job-3", "job-4"]));
    expect(mocks.list).toHaveBeenNthCalledWith(2, "-created_date", 4, 3);
    expect(result.current.hasNextPage).toBe(false);
  });
});
