import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
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
    // Jobs stay fresh for a short window so switching filters, opening a job or
    // returning to the list renders from cache instead of refetching every
    // time. Any mutation still calls useInvalidateJobs() for immediate refresh.
    staleTime: 30_000,
    // Preserve real, previously fetched rows while a filter-specific query is
    // refreshing. The first load remains undefined, so callers can show a
    // genuine skeleton instead of a false empty state.
    placeholderData: keepPreviousData,
  });
}

export function useStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffProfile.filter({ active: true }, "full_name", 100),
    staleTime: 5 * 60_000,
  });
}

export function useInvalidateJobs() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["jobs"], refetchType: "all" });
}
