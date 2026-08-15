import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { flattenEntityPages, toEntityPage, useEntityPages } from "@/hooks/useEntityPages";

function wrapper({ children }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useEntityPages", () => {
  it("uses a probe row to expose more data without rendering the probe twice", async () => {
    const fetchPage = vi.fn(({ skip }) => Promise.resolve(skip === 0
      ? [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }]
      : [{ id: "4" }, { id: "5" }],
    ));
    const { result } = renderHook(() => useEntityPages({
      queryKey: ["paged-records"],
      fetchPage,
      pageSize: 3,
    }), { wrapper });

    await waitFor(() => expect(result.current.data.map((row) => row.id)).toEqual(["1", "2", "3"]));
    expect(result.current.hasNextPage).toBe(true);
    expect(fetchPage).toHaveBeenNthCalledWith(1, expect.objectContaining({ limit: 4, skip: 0 }));

    await act(async () => { await result.current.fetchNextPage(); });

    await waitFor(() => expect(result.current.data.map((row) => row.id)).toEqual(["1", "2", "3", "4", "5"]));
    expect(result.current.hasNextPage).toBe(false);
    expect(fetchPage).toHaveBeenNthCalledWith(2, expect.objectContaining({ limit: 4, skip: 3 }));
  });

  it("handles malformed pages and deduplicates records by id", () => {
    expect(toEntityPage(null, 10, 0)).toEqual({ items: [], skip: 0, hasMore: false });
    expect(flattenEntityPages([
      { items: [{ id: "same", value: "old" }] },
      { items: [{ id: "same", value: "new" }, { id: "other" }] },
    ])).toEqual([{ id: "same", value: "new" }, { id: "other" }]);
  });
});
