import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useJobs(filter = {}) {
  return useQuery({
    queryKey: ["jobs", filter],
    queryFn: async () => {
      const res = await base44.functions.invoke("listDashboardData", { type: "jobs", filter });
      return res.data?.jobs || [];
    },
    placeholderData: [],
    staleTime: 30 * 1000, // 30s — reduces re-fetches on tab switching
  });
}

export function useStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const res = await base44.functions.invoke("listDashboardData", { type: "staff" });
      return res.data?.staff || [];
    },
    initialData: [],
  });
}

export function useInvalidateJobs() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["jobs"] });
}