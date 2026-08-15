import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { listClients } from "@/services/clientService";
import { hasAtLeastRole } from "@/config/roles";

// Shared customer list. Any screen needing the full customer list uses this so
// the data is fetched once and reused from cache instead of each page issuing
// its own request.
export const CLIENTS_QUERY_KEY = ["adminCustomers"];
const CLIENT_PAGE_SIZE = 50;

export function useClients(role) {
  const query = useInfiniteQuery({
    queryKey: CLIENTS_QUERY_KEY,
    queryFn: ({ pageParam }) => listClients({ page: pageParam, limit: CLIENT_PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.pagination?.next_page || undefined,
    enabled: hasAtLeastRole(role, "admin"),
    staleTime: 60_000,
  });
  const pages = query.data?.pages || [];
  const data = [...new Map(pages.flatMap((page) => page.customers || []).map((customer) => [customer.id, customer])).values()];
  const relatedDataPartial = pages.some((page) =>
    page.truncation?.jobs || page.truncation?.scooters || page.query_failures?.length > 0,
  );
  return {
    ...query,
    data,
    loadedPages: pages.length,
    relatedDataPartial,
    potentiallyTruncated: pages.some((page) => page.potentially_truncated),
  };
}

export function useInvalidateClients() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
}
