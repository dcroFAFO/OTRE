import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDashboardUser } from "@/components/dashboard/DashboardLayout";
import JobCard from "@/components/shared/JobCard";
import JobFilters, { EMPTY_FILTERS } from "@/components/dashboard/JobFilters";
import JobDetailModal from "@/components/dashboard/job/JobDetailModal";
import { useJobs, useStaff, useInvalidateJobs } from "@/hooks/useJobs";
import StatusPill from "@/components/shared/StatusPill";
import { DEFAULT_APP_SETTINGS } from "@/config/platformConfig";
import { LayoutGrid, List, SlidersHorizontal, FileText, Kanban } from "lucide-react";
import NewJobFromTemplateModal from "@/components/dashboard/job/NewJobFromTemplateModal";
import JobBoard, { DEFAULT_VISIBLE } from "@/components/dashboard/job/JobBoard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Jobs() {
  const user = useDashboardUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: jobs } = useJobs();
  const { data: staff } = useStaff();
  const invalidate = useInvalidateJobs();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [view, setView] = useState("board"); // board | grid | list
  const [templateModal, setTemplateModal] = useState(false);
  const [visibleStatuses, setVisibleStatuses] = useState(DEFAULT_VISIBLE);

  const selectedId = new URLSearchParams(location.search).get("id");
  const open = (id) => navigate(`/dashboard/jobs?id=${id}`);
  const close = () => { navigate("/dashboard/jobs"); invalidate(); };

  const filtered = useMemo(() => jobs.filter((j) => {
    const q = filters.q.toLowerCase();
    const matchQ = !q || [j.customer_name, j.asset_label, j.scooter_label, j.reference, j.issue_description].some((v) => v?.toLowerCase().includes(q));
    return matchQ
      && (filters.status === "all" || j.status === filters.status)
      && (filters.tech === "all" || j.assigned_technician_name === filters.tech)
      && (filters.payment === "all" || j.payment_status === filters.payment)
      && (filters.type === "all" || j.job_type === filters.type)
      && (filters.waiting === "all" || j.waiting_reason === filters.waiting);
  }), [jobs, filters]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">{DEFAULT_APP_SETTINGS.dashboard.nav.jobs}</h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length !== jobs.length
              ? `${filtered.length} of ${jobs.length} ${DEFAULT_APP_SETTINGS.terminology.jobPlural}`
              : `${jobs.length} ${DEFAULT_APP_SETTINGS.terminology.jobPlural}`
            }
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setTemplateModal(true)}>
            <FileText className="h-4 w-4" /> New from Template
          </Button>
          <Button variant={view === "board" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView("board")}>
            <Kanban className="h-4 w-4" />
          </Button>
          <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView("grid")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setView("list")}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <JobFilters filters={filters} setFilters={setFilters} staff={staff} />

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-16 text-center">
          <SlidersHorizontal className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No jobs match your filters.</p>
          <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</Button>
        </div>
      ) : view === "board" ? (
        <JobBoard
          jobs={filtered}
          onJobClick={open}
          onInvalidate={invalidate}
          visibleStatuses={visibleStatuses}
          setVisibleStatuses={setVisibleStatuses}
        />
      ) : view === "grid" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((j) => <JobCard key={j.id} job={j} onClick={() => open(j.id)} />)}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {filtered.map((j) => <JobListRow key={j.id} job={j} onClick={() => open(j.id)} />)}
        </div>
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

function JobListRow({ job, onClick }) {
  const outstanding = job.payment_status === "outstanding";
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors flex items-center gap-4",
        outstanding && "border-l-2 border-l-rose-400"
      )}
    >
      <div className="flex-1 min-w-0 grid sm:grid-cols-4 gap-x-4 gap-y-0.5 items-center">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{job.customer_name}</p>
          <p className="text-xs text-muted-foreground truncate">{job.asset_label || job.scooter_label}</p>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1 hidden sm:block">{job.issue_description}</p>
        <div className="hidden sm:flex items-center gap-2">
          <StatusPill value={job.status} />
        </div>
        <div className="flex items-center gap-2 justify-end">
          <span className="text-xs text-muted-foreground hidden sm:block">{job.assigned_technician_name || "—"}</span>
          {outstanding && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Outstanding invoice" />}
        </div>
      </div>
    </button>
  );
}