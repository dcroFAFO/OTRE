import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useJobs(filter = {}) {
  return useQuery({
    queryKey: ["jobs", filter],
    queryFn: () => {
      const hasFilter = Object.keys(filter).length > 0;
      return hasFilter
        ? base44.entities.Job.filter(filter, "-created_date", 200)
        : base44.entities.Job.list("-created_date", 200);
    },
    placeholderData: [],
    staleTime: 0,
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
  return () => qc.invalidateQueries({ queryKey: ["jobs"], refetchType: "all" });
}