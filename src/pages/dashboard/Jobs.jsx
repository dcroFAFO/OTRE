import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDashboardUser } from "@/components/dashboard/DashboardLayout";
import JobFilters, { EMPTY_FILTERS } from "@/components/dashboard/JobFilters";
import JobDetailModal from "@/components/dashboard/job/JobDetailModal";
import JobListTable from "@/components/dashboard/job/JobListTable";
import BulkActionsBar from "@/components/dashboard/job/BulkActionsBar";
import { useJobs, useStaff, useInvalidateJobs } from "@/hooks/useJobs";
import { DEFAULT_APP_SETTINGS } from "@/config/platformConfig";
import { SlidersHorizontal, Plus } from "lucide-react";
import CreateJobModal from "@/components/dashboard/job/CreateJobModal";
import { Button } from "@/components/ui/button";
import { isStaffRole } from "@/config/roles";

export default function Jobs() {
  const user = useDashboardUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const queryFilter = useMemo(() => ({
    ...(filters.status !== "all" ? { status: filters.status } : {}),
    ...(filters.tech !== "all" ? { assigned_technician_name: filters.tech } : {}),
    ...(filters.payment !== "all" ? { payment_status: filters.payment } : {}),
    ...(filters.type !== "all" ? { job_type: filters.type } : {}),
    ...(filters.waiting !== "all" ? { waiting_reason: filters.waiting } : {}),
  }), [filters.status, filters.tech, filters.payment, filters.type, filters.waiting]);
  const { data: jobs } = useJobs(queryFilter);
  const { data: staff } = useStaff();
  const invalidate = useInvalidateJobs();
  const [createModal, setCreateModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const params = new URLSearchParams(location.search);
  const selectedId = params.get("id");

  const open = (id) => navigate(`/dashboard/jobs?id=${id}`);
  const close = () => { navigate("/dashboard/jobs"); invalidate(); };

  const filtered = useMemo(() => {
    const q = filters.q.toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) =>
      [j.customer_name, j.asset_label, j.scooter_label, j.reference, j.issue_description]
        .some((v) => v?.toLowerCase().includes(q))
    );
  }, [jobs, filters.q]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">
            {DEFAULT_APP_SETTINGS.dashboard.nav.jobs}
          </h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length} {DEFAULT_APP_SETTINGS.terminology.jobPlural}
          </p>
        </div>
      </div>

      {isStaffRole(user.role) ? (
        <button
          onClick={() => setCreateModal(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/20 px-4 py-2.5 font-semibold hover:bg-accent/90 transition-colors text-base">
          
          <Plus className="h-4 w-4" />
          New Job
        </button>
      ) : null}

      <JobFilters filters={filters} setFilters={setFilters} staff={staff} />

      {selectedIds.length > 0 && (
        <BulkActionsBar
          selectedIds={selectedIds}
          allJobs={jobs}
          onClear={() => setSelectedIds([])}
          onDone={() => { setSelectedIds([]); invalidate(); }}
        />
      )}

      {filtered.length === 0 ?
      <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center shadow-sm">
          <SlidersHorizontal className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No jobs to show here.</p>
        </div> :

      <JobListTable
        jobs={filtered}
        onOpen={open}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />
      }

      {/* Spacer so the floating New Job button never covers the last row */}
      <div className="h-16" aria-hidden />

      <JobDetailModal jobId={selectedId} actor={user} open={!!selectedId} onClose={close} />
      <CreateJobModal
        open={createModal}
        onClose={() => setCreateModal(false)}
        onCreated={(job) => {invalidate();open(job.id);}} />
      
    </div>);

}