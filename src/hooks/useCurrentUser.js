import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Returns the current authenticated user or null.
export function useCurrentUser() {
  const { data, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  return { user: data, role: data?.role, isLoading };
}