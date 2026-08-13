import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listClients } from "@/services/clientService";
import { hasAtLeastRole } from "@/config/roles";

// Shared customer list. Any screen needing the full customer list uses this so
// the data is fetched once and reused from cache instead of each page issuing
// its own request.
export const CLIENTS_QUERY_KEY = ["adminCustomers"];

export function useClients(role) {
  return useQuery({
    queryKey: CLIENTS_QUERY_KEY,
    queryFn: listClients,
    enabled: hasAtLeastRole(role, "technician"),
    staleTime: 60_000,
  });
}

export function useInvalidateClients() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
}
