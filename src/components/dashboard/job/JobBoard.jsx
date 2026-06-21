import React, { useEffect, useMemo, useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { JOB_STATUSES, getStatus, isCanonicalJobStatus, normalizeStatusKey } from "@/config/jobConfig";
import KanbanColumn from "@/components/dashboard/kanban/KanbanColumn";
import { updateJobStatusFromEvent } from "@/services/jobWorkflowService";
import { toast } from "sonner";

const BOARD_STATUSES = JOB_STATUSES;

export default function JobBoard({ jobs, onJobClick, onInvalidate }) {
  const columns = useMemo(() => BOARD_STATUSES, []);
  const [boardJobs, setBoardJobs] = useState(jobs);

  useEffect(() => {
    setBoardJobs(jobs.map((job) => ({ ...job, status: normalizeStatusKey(job.status) })));
  }, [jobs]);

  const jobsByStatus = useMemo(() => {
    const map = {};
    columns.forEach((s) => { map[s.key] = []; });
    boardJobs.forEach((job) => {
      const statusKey = normalizeStatusKey(job.status);
      if (map[statusKey] !== undefined) map[statusKey].push({ ...job, status: statusKey });
    });
    return map;
  }, [boardJobs, columns]);

  const onDragEnd = async ({ source, destination, draggableId }) => {
    if (!destination || destination.droppableId === source.droppableId) return;

    const targetStatus = destination.droppableId;
    if (!isCanonicalJobStatus(targetStatus)) {
      toast.error("That column is not a valid job status.");
      return;
    }

    const job = boardJobs.find((item) => item.id === draggableId);
    if (!job) return;

    try {
      const updatedJob = await updateJobStatusFromEvent(job, targetStatus);
      const nextJob = { ...job, ...(updatedJob?.job || updatedJob || {}), status: targetStatus };
      setBoardJobs((current) => current.map((item) => item.id === draggableId ? nextJob : item));
      toast.success(`Moved to ${getStatus(targetStatus).label}.`);
      await onInvalidate?.();
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || "This job can't be moved there yet.");
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