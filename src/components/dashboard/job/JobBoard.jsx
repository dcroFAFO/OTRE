import React, { useMemo } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { DEFAULT_JOB_STATUSES } from "@/config/platformConfig";
import { normalizeStatusKey } from "@/config/jobConfig";
import KanbanColumn from "@/components/dashboard/kanban/KanbanColumn";
import { updateJobStatusFromEvent } from "@/services/jobWorkflowService";
import { toast } from "sonner";

const BOARD_STATUSES = DEFAULT_JOB_STATUSES;

export default function JobBoard({ jobs, onJobClick, onInvalidate }) {
  const columns = useMemo(() => BOARD_STATUSES, []);

  const jobsByStatus = useMemo(() => {
    const map = {};
    columns.forEach((s) => { map[s.key] = []; });
    jobs.forEach((job) => {
      const statusKey = normalizeStatusKey(job.status);
      if (map[statusKey] !== undefined) map[statusKey].push(job);
    });
    return map;
  }, [jobs, columns]);

  const onDragEnd = async ({ source, destination, draggableId }) => {
    if (!destination || destination.droppableId === source.droppableId) return;
    const job = jobs.find((item) => item.id === draggableId);
    if (!job) return;

    try {
      await updateJobStatusFromEvent(job, destination.droppableId);
      toast.success(`Moved to ${columns.find((s) => s.key === destination.droppableId)?.label || "new status"}.`);
      onInvalidate?.();
    } catch (error) {
      toast.error(error.message || "This job can't be moved there yet.");
    }
  };


  return (
    <div className="space-y-4">
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