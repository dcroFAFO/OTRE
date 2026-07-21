import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDashboardUser } from "@/components/dashboard/DashboardLayout";
import JobFilters, { EMPTY_FILTERS } from "@/components/dashboard/JobFilters";
import JobDetailModal from "@/components/dashboard/job/JobDetailModal";
import JobListTable from "@/components/dashboard/job/JobListTable";
import JobBoard from "@/components/dashboard/job/JobBoard";
import LifecycleTabs, { LIFECYCLE_GROUPS } from "@/components/dashboard/job/LifecycleTabs";
import BulkActionsBar from "@/components/dashboard/job/BulkActionsBar";
import { useJobs, useInvalidateJobs } from "@/hooks/useJobs";
import { DEFAULT_APP_SETTINGS } from "@/config/platformConfig";
import { normalizeStatusKey } from "@/config/jobConfig";
import { DEFAULT_SERVICE_TYPE } from "@/config/serviceTypes";
import { SlidersHorizontal, Plus, LayoutGrid, List } from "lucide-react";
import CreateJobModal from "@/components/dashboard/job/CreateJobModal";
import { Button } from "@/components/ui/button";
import { isStaffRole } from "@/config/roles";

const FILTER_PARAM_KEYS = ["status", "service_type", "priority", "payment", "type", "waiting", "q"];

const filtersFromSearch = (search) => {
  const params = new URLSearchParams(search);
  return {
    ...EMPTY_FILTERS,
    q: params.get("q") || "",
    status: params.get("status") || "all",
    service_type: params.get("service_type") || "all",
    priority: params.get("priority") || "all",
    payment: params.get("payment") || "all",
    type: params.get("type") || "all",
    waiting: params.get("waiting") || "all",
  };
};

const hasFilterParams = (search) => {
  const params = new URLSearchParams(search);
  return search === "" || FILTER_PARAM_KEYS.some((key) => params.has(key));
};

export default function Jobs() {
  const user = useDashboardUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [filters, setFilters] = useState(() => filtersFromSearch(location.search));

  useEffect(() => {
    if (hasFilterParams(location.search)) {
      setFilters(filtersFromSearch(location.search));
    }
  }, [location.search]);

  const jobsPath = (nextParams = {}) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.service_type !== "all") params.set("service_type", filters.service_type);
    if (filters.priority !== "all") params.set("priority", filters.priority);
    if (filters.payment !== "all") params.set("payment", filters.payment);
    if (filters.type !== "all") params.set("type", filters.type);
    if (filters.waiting !== "all") params.set("waiting", filters.waiting);

    Object.entries(nextParams).forEach(([key, value]) => {
      if (value == null || value === "") params.delete(key);
      else params.set(key, value);
    });

    const query = params.toString();
    return query ? `/dashboard/jobs?${query}` : "/dashboard/jobs";
  };

  const queryFilter = useMemo(() => ({
    ...(filters.payment !== "all" ? { payment_status: filters.payment } : {}),
    ...(filters.type !== "all" ? { job_type: filters.type } : {}),
    ...(filters.waiting !== "all" ? { waiting_reason: filters.waiting } : {}),
  }), [filters.payment, filters.type, filters.waiting]);
  const { data: jobs } = useJobs(queryFilter);
  const invalidate = useInvalidateJobs();
  const [createModal, setCreateModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [view, setView] = useState("list");
  const [lifecycle, setLifecycle] = useState("all");

  const params = new URLSearchParams(location.search);
  const selectedId = params.get("id");

  const open = (id) => navigate(jobsPath({ id }));
  const close = () => { navigate(jobsPath({ id: null })); invalidate(); };

  const filtered = useMemo(() => {
    const q = filters.q.toLowerCase();
    const result = jobs.filter((j) => {
      const matchesSearch = !q || [j.customer_name, j.asset_label, j.scooter_label, j.reference, j.issue_description]
        .some((v) => v?.toLowerCase().includes(q));
      const statusKey = normalizeStatusKey(j.status);
      const matchesStatus = view === "board" || filters.status === "all" || statusKey === filters.status;
      const matchesService = filters.service_type === "all" || (j.service_type || DEFAULT_SERVICE_TYPE) === filters.service_type;
      const matchesPriority = filters.priority === "all" || (j.priority || "medium") === filters.priority;
      // Hide cancelled jobs by default — only show when explicitly filtered
      const matchesCancelled = filters.status !== "all" || statusKey !== "cancelled";
      return matchesSearch && matchesStatus && matchesService && matchesPriority && matchesCancelled;
    });
    // Sort by booking age: most recent first
    return result.sort((a, b) => {
      const dateA = new Date(a.created_date || a.createdAt || a.created_at || 0).getTime();
      const dateB = new Date(b.created_date || b.createdAt || b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [jobs, filters.q, filters.status, filters.service_type, filters.priority, view]);

  // Display-only lifecycle grouping — filters which statuses are shown.
  const lifecycleStatuses = LIFECYCLE_GROUPS.find((g) => g.key === lifecycle)?.statuses || null;
  const visibleJobs = useMemo(
    () => (lifecycleStatuses ? filtered.filter((j) => lifecycleStatuses.includes(normalizeStatusKey(j.status))) : filtered),
    [filtered, lifecycleStatuses]
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">
            {DEFAULT_APP_SETTINGS.dashboard.nav.jobs}
          </h1>
          <p className="text-muted-foreground text-sm">
            {visibleJobs.length} {DEFAULT_APP_SETTINGS.terminology.jobPlural}
          </p>
        </div>
      </div>

      {isStaffRole(user.role) ? (
        <button
          onClick={() => setCreateModal(true)}
          className="fixed bottom-20 lg:bottom-5 right-5 z-40 mb-safe lg:mb-0 flex items-center gap-2 rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/20 px-4 py-3 lg:py-2.5 font-semibold hover:bg-accent/90 transition-colors text-base">
          
          <Plus className="h-4 w-4" />
          New Job
        </button>
      ) : null}

      <LifecycleTabs jobs={filtered} value={lifecycle} onChange={setLifecycle} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <JobFilters filters={filters} setFilters={setFilters} />
        <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-sm">
          <Button size="sm" variant={view === "board" ? "default" : "ghost"} onClick={() => setView("board")} className="gap-1.5 h-10 sm:h-8">
            <LayoutGrid className="h-4 w-4" /> Board
          </Button>
          <Button size="sm" variant={view === "list" ? "default" : "ghost"} onClick={() => setView("list")} className="gap-1.5 h-10 sm:h-8">
            <List className="h-4 w-4" /> List
          </Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <BulkActionsBar
          selectedIds={selectedIds}
          allJobs={jobs}
          onClear={() => setSelectedIds([])}
          onDone={() => { setSelectedIds([]); invalidate(); }}
        />
      )}

      {visibleJobs.length === 0 ?
      <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center shadow-sm">
          <SlidersHorizontal className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No jobs to show here.</p>
        </div> :

      view === "board" ? (
        <JobBoard
          jobs={visibleJobs}
          statusKeys={lifecycleStatuses}
          onJobClick={open}
          onInvalidate={invalidate}
        />
      ) : (
        <JobListTable
          jobs={visibleJobs}
          onOpen={open}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      )
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