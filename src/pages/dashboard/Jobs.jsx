import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDashboardUser } from "@/components/dashboard/DashboardLayout";
import JobCard from "@/components/shared/JobCard";
import JobFilters from "@/components/dashboard/JobFilters";
import JobDetailModal from "@/components/dashboard/job/JobDetailModal";
import { useJobs, useStaff } from "@/hooks/useJobs";

const EMPTY = { q: "", status: "all", tech: "all", payment: "all", type: "all", waiting: "all" };

export default function Jobs() {
  const user = useDashboardUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: jobs } = useJobs();
  const { data: staff } = useStaff();
  const [filters, setFilters] = useState(EMPTY);

  const selectedId = new URLSearchParams(location.search).get("id");
  const open = (id) => navigate(`/dashboard/jobs?id=${id}`);
  const close = () => navigate("/dashboard/jobs");

  const filtered = useMemo(() => jobs.filter((j) => {
    const q = filters.q.toLowerCase();
    const matchQ = !q || [j.customer_name, j.scooter_label, j.reference, j.issue_description].some((v) => v?.toLowerCase().includes(q));
    return matchQ
      && (filters.status === "all" || j.status === filters.status)
      && (filters.tech === "all" || j.assigned_technician_name === filters.tech)
      && (filters.payment === "all" || j.payment_status === filters.payment)
      && (filters.type === "all" || j.job_type === filters.type)
      && (filters.waiting === "all" || j.waiting_reason === filters.waiting);
  }), [jobs, filters]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Jobs</h1>
        <p className="text-muted-foreground text-sm">{filtered.length} of {jobs.length} jobs</p>
      </div>

      <JobFilters filters={filters} setFilters={setFilters} staff={staff} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((j) => <JobCard key={j.id} job={j} onClick={() => open(j.id)} />)}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground col-span-full py-10 text-center">No jobs match your filters.</p>}
      </div>

      <JobDetailModal jobId={selectedId} actor={user} open={!!selectedId} onClose={close} />
    </div>
  );
}