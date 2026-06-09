import React, { useMemo } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { DEFAULT_JOB_STATUSES } from "@/config/platformConfig";
import KanbanColumn from "@/components/dashboard/kanban/KanbanColumn";

// Statuses shown as board columns (exclude cancelled)
const BOARD_STATUSES = DEFAULT_JOB_STATUSES.filter((s) => !["cancelled"].includes(s.key));

const STATUS_GROUPS = [
  { key: "intake", statuses: ["requested", "pending_confirmation"] },
  { key: "active", statuses: ["active", "booked", "technician_assigned", "repair_in_progress"] },
  { key: "waiting", statuses: ["waiting_customer", "waiting_technician", "waiting_supplier", "waiting_parts", "on_hold"] },
  { key: "quote", statuses: ["quote_required", "quote_sent", "quote_approved"] },
  { key: "done", statuses: ["ready_for_pickup", "invoice_outstanding", "paid", "completed"] },
];

const DEFAULT_VISIBLE = ["requested", "active", "repair_in_progress", "quote_sent", "ready_for_pickup", "completed"];

export default function JobBoard({ jobs, onJobClick, onInvalidate, visibleStatuses, setVisibleStatuses }) {
  const columns = useMemo(
    () => BOARD_STATUSES.filter((s) => visibleStatuses.includes(s.key)),
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
    onInvalidate?.();
  };

  const toggleStatus = (key) => {
    setVisibleStatuses((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="space-y-4">
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

      {/* Board — columns wrap so there is no horizontal scroll */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {columns.map((status) => (
            <KanbanColumn
              key={status.key}
              status={status}
              jobs={jobsByStatus[status.key] || []}
              onJobClick={onJobClick}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}

export { DEFAULT_VISIBLE };