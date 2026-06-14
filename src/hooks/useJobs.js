import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { invokeFn } from "@/lib/serviceClient";

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      // No initialData here — we want isError/isLoading to be real so the UI
      // can show a retry state instead of a misleading empty list.
      const data = await invokeFn("listJobs", {});
      return data || [];
    },
    staleTime: 30 * 1000, // 30s — reduces re-fetches on tab switching
  });
}

export function useStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffProfile.filter({ active: true }, "full_name", 100),
    initialData: [],
  });
}

export function useInvalidateJobs() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["jobs"] });
}