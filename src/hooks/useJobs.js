import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useEntityPages } from "@/hooks/useEntityPages";

export const JOB_PAGE_SIZE = 100;

export function useJobs(filter = {}, options = {}) {
  const hasFilter = Object.keys(filter).length > 0;
  const query = useEntityPages({
    queryKey: ["jobs", filter],
    fetchPage: ({ limit, skip }) => hasFilter
      ? base44.entities.Job.filter(filter, "-created_date", limit, skip)
      : base44.entities.Job.list("-created_date", limit, skip),
    pageSize: options.pageSize || JOB_PAGE_SIZE,
    staleTime: 30_000,
    preservePreviousData: options.preservePreviousData !== false,
  });

  return {
    ...query,
    data: query.data.filter((job) => !job.archived_at),
  };
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
