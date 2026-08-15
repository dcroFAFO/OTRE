import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ listClients: vi.fn() }));

vi.mock("@/services/clientService", () => ({ listClients: mocks.listClients }));

import { useClients } from "@/hooks/useClients";

function wrapper({ children }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useClients bounded customer list", () => {
  beforeEach(() => {
    mocks.listClients.mockReset().mockImplementation(({ page, limit }) => Promise.resolve({
      customers: page === 1
        ? Array.from({ length: 50 }, (_, index) => ({ id: `customer-${index + 1}` }))
        : [{ id: "customer-51" }],
      page,
      limit,
      pagination: { page, limit, has_more: page === 1, next_page: page === 1 ? 2 : null },
      potentially_truncated: page === 1,
      truncation: page === 1 ? { customers: true, jobs: true, scooters: false } : { customers: true, jobs: false, scooters: false },
      query_failures: [],
    }));
  });

  it("loads beyond 50 without replacing stable customer records and preserves partial metadata", async () => {
    const { result } = renderHook(() => useClients("admin"), { wrapper });

    await waitFor(() => expect(result.current.data).toHaveLength(50));
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.relatedDataPartial).toBe(true);

    await act(async () => { await result.current.fetchNextPage(); });

    await waitFor(() => expect(result.current.data).toHaveLength(51));
    expect(result.current.data[0].id).toBe("customer-1");
    expect(result.current.data[50].id).toBe("customer-51");
    expect(result.current.hasNextPage).toBe(false);
    expect(mocks.listClients).toHaveBeenNthCalledWith(2, { page: 2, limit: 50 });
  });
});
