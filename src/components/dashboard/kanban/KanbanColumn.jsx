import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { cn } from "@/lib/utils";
import JobCard from "@/components/shared/JobCard";

const COLUMN_STYLES = {
  slate:   "border-slate-300 bg-slate-50",
  amber:   "border-amber-300 bg-amber-50",
  indigo:  "border-indigo-300 bg-indigo-50",
  teal:    "border-teal-300 bg-teal-50",
  emerald: "border-emerald-300 bg-emerald-50",
  violet:  "border-violet-300 bg-violet-50",
  rose:    "border-rose-300 bg-rose-50",
};

const DOT_STYLES = {
  slate:   "bg-slate-400",
  amber:   "bg-amber-400",
  indigo:  "bg-indigo-400",
  teal:    "bg-teal-400",
  emerald: "bg-emerald-500",
  violet:  "bg-violet-400",
  rose:    "bg-rose-400",
};

export default function KanbanColumn({ status, jobs, onJobClick }) {
  const colStyle = COLUMN_STYLES[status.color] || COLUMN_STYLES.slate;
  const dotStyle = DOT_STYLES[status.color] || DOT_STYLES.slate;

  return (
    <div className={cn("flex flex-col rounded-xl border-2 min-h-[300px] w-full", colStyle)}>
      {/* Column Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-current/10">
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", dotStyle)} />
          <h3 className="text-sm font-semibold text-foreground">{status.label}</h3>
        </div>
        <span className="text-xs font-bold bg-white/70 border border-current/10 rounded-full px-2 py-0.5 text-muted-foreground tabular-nums">
          {jobs.length}
        </span>
      </div>

      {/* Drop zone */}
      <Droppable droppableId={status.key}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 flex flex-col gap-2 p-2.5 min-h-[60px] transition-colors rounded-b-xl",
              snapshot.isDraggingOver && "bg-white/60"
            )}
          >
            {jobs.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-muted-foreground/50 italic select-none">No jobs</p>
              </div>
            )}
            {jobs.map((job, index) => (
              <Draggable key={job.id} draggableId={job.id} index={index}>
                {(drag, dragSnapshot) => (
                  <div
                    ref={drag.innerRef}
                    {...drag.draggableProps}
                    {...drag.dragHandleProps}
                    className={cn(
                      "transition-transform",
                      dragSnapshot.isDragging && "rotate-1 scale-105 shadow-xl z-50"
                    )}
                  >
                    <JobCard
                      job={job}
                      compact
                      onClick={() => onJobClick(job.id)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}