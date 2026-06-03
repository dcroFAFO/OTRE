import React, { useState, useMemo } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { useJobs, useInvalidateJobs } from "@/hooks/useJobs";
import { DEFAULT_JOB_STATUSES } from "@/config/platformConfig";
import KanbanColumn from "@/components/dashboard/kanban/KanbanColumn";
import JobDetailModal from "@/components/dashboard/job/JobDetailModal";
import { useDashboardUser } from "@/components/dashboard/DashboardLayout";

// Statuses to show as columns (excludes terminal/closed statuses)
const KANBAN_STATUSES = DEFAULT_JOB_STATUSES.filter(
  (s) => !["cancelled"].includes(s.key)
);

// Group statuses into logical swimlanes for the selector
const STATUS_GROUPS = [
  { key: "intake",  label: "Intake",   statuses: ["requested", "pending_confirmation"] },
  { key: "active",  label: "Active",   statuses: ["active", "booked", "technician_assigned", "repair_in_progress"] },
  { key: "waiting", label: "Waiting",  statuses: ["waiting_customer", "waiting_technician", "waiting_supplier", "waiting_parts", "on_hold"] },
  { key: "quote",   label: "Quote",    statuses: ["quote_required", "quote_sent", "quote_approved"] },
  { key: "done",    label: "Done",     statuses: ["ready_for_pickup", "invoice_outstanding", "paid", "completed"] },
];

const DEFAULT_VISIBLE = ["requested", "active", "repair_in_progress", "quote_sent", "ready_for_pickup", "completed"];

export default function Kanban() {
  const { data: jobs = [] } = useJobs();
  const invalidate = useInvalidateJobs();
  const actor = useDashboardUser();

  const [visibleStatuses, setVisibleStatuses] = useState(DEFAULT_VISIBLE);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const columns = useMemo(
    () => KANBAN_STATUSES.filter((s) => visibleStatuses.includes(s.key)),
    [visibleStatuses]
  );

  const jobsByStatus = useMemo(() => {
    const map = {};
    columns.forEach((s) => { map[s.key] = []; });
    jobs.forEach((job) => {
      if (map[job.status] !== undefined) map[job.status].push(job);
    });
    return map;
  }, [jobs, columns]);

  const onDragEnd = async ({ source, destination, draggableId }) => {
    if (!destination || destination.droppableId === source.droppableId) return;
    await base44.entities.Job.update(draggableId, { status: destination.droppableId });
    invalidate();
  };

  const toggleStatus = (key) => {
    setVisibleStatuses((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold font-heading text-foreground">Kanban Board</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Drag and drop jobs between statuses</p>
        </div>
        <span className="text-xs text-muted-foreground bg-secondary border border-border rounded-full px-3 py-1">
          {jobs.length} active jobs
        </span>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_GROUPS.map((group) =>
          group.statuses.map((key) => {
            const s = DEFAULT_JOB_STATUSES.find((x) => x.key === key);
            if (!s) return null;
            const active = visibleStatuses.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleStatus(key)}
                className={`text-xs rounded-full border px-2.5 py-1 font-medium transition-all ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {s.label}
              </button>
            );
          })
        )}
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 h-full min-w-max">
            {columns.map((status) => (
              <KanbanColumn
                key={status.key}
                status={status}
                jobs={jobsByStatus[status.key] || []}
                onJobClick={(id) => { setSelectedJobId(id); setModalOpen(true); }}
              />
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Job Detail Modal */}
      <JobDetailModal
        jobId={selectedJobId}
        actor={actor}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onChange={invalidate}
      />
    </div>
  );
}