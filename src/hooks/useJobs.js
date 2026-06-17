import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useJobs(filter = {}) {
  return useQuery({
    queryKey: ["jobs", filter],
    queryFn: async () => {
      const jobs = await base44.entities.Job.list("-created_date", 200);
      return jobs.filter((job) => {
        if (job.archived === true) return false;
        return Object.entries(filter).every(([key, value]) => job[key] === value);
      });
    },
    placeholderData: [],
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