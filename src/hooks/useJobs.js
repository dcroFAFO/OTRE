import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useJobs(filter = {}) {
  return useQuery({
    queryKey: ["jobs", filter],
    queryFn: () => base44.entities.Job.filter({ archived: false, ...filter }, "-created_date", 200),
    initialData: [],
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