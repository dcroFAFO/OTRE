import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDashboardUser } from "@/components/dashboard/DashboardLayout";
import JobFilters, { EMPTY_FILTERS } from "@/components/dashboard/JobFilters";
import JobDetailModal from "@/components/dashboard/job/JobDetailModal";
import JobListTable from "@/components/dashboard/job/JobListTable";
import { useJobs, useStaff, useInvalidateJobs } from "@/hooks/useJobs";
import { DEFAULT_APP_SETTINGS } from "@/config/platformConfig";
import { SlidersHorizontal, Plus } from "lucide-react";
import { getJobGroup, jobMatchesGroup } from "@/config/jobGroups";
import NewJobFromTemplateModal from "@/components/dashboard/job/NewJobFromTemplateModal";
import { Button } from "@/components/ui/button";

export default function Jobs() {
  const user = useDashboardUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: jobs } = useJobs();
  const { data: staff } = useStaff();
  const invalidate = useInvalidateJobs();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [templateModal, setTemplateModal] = useState(false);

  const params = new URLSearchParams(location.search);
  const selectedId = params.get("id");
  const groupKey = params.get("group") || "all";
  const group = getJobGroup(groupKey);

  const open = (id) => navigate(`/dashboard/jobs?id=${id}`);
  const close = () => { navigate(`/dashboard/jobs${groupKey !== "all" ? `?group=${groupKey}` : ""}`); invalidate(); };

  const filtered = useMemo(() => jobs.filter((j) => {
    if (!jobMatchesGroup(j, groupKey)) return false;
    const q = filters.q.toLowerCase();
    const matchQ = !q || [j.customer_name, j.asset_label, j.scooter_label, j.reference, j.issue_description].some((v) => v?.toLowerCase().includes(q));
    return matchQ
      && (filters.status === "all" || j.status === filters.status)
      && (filters.tech === "all" || j.assigned_technician_name === filters.tech)
      && (filters.payment === "all" || j.payment_status === filters.payment)
      && (filters.type === "all" || j.job_type === filters.type)
      && (filters.waiting === "all" || j.waiting_reason === filters.waiting);
  }), [jobs, filters, groupKey]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">
            {group.key === "all" ? DEFAULT_APP_SETTINGS.dashboard.nav.jobs : group.label}
          </h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length} {DEFAULT_APP_SETTINGS.terminology.jobPlural}
          </p>
        </div>
      </div>

      <button
        onClick={() => setTemplateModal(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <Plus className="h-4 w-4 text-accent" />
        New Job
      </button>

      <JobFilters filters={filters} setFilters={setFilters} staff={staff} />

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-16 text-center">
          <SlidersHorizontal className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No jobs to show here.</p>
        </div>
      ) : (
        <JobListTable jobs={filtered} onOpen={open} />
      )}

      <JobDetailModal jobId={selectedId} actor={user} open={!!selectedId} onClose={close} />
      <NewJobFromTemplateModal
        open={templateModal}
        onClose={() => setTemplateModal(false)}
        onCreated={(job) => { invalidate(); open(job.id); }}
      />
    </div>
  );
}