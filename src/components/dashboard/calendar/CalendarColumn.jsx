import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { format, isToday, isPast } from "date-fns";
import JobCard from "@/components/shared/JobCard";
import { cn } from "@/lib/utils";

export default function CalendarColumn({ date, jobs, onOpen }) {
  const key = format(date, "yyyy-MM-dd");
  const today = isToday(date);
  const past = isPast(date) && !today;

  return (
    <div className="flex flex-col min-w-[190px] flex-1">
      {/* Day header */}
      <div className={cn(
        "text-center pb-2.5 mb-2 border-b-2 transition-colors",
        today ? "border-accent" : "border-border"
      )}>
        <p className={cn("text-[11px] uppercase tracking-widest font-medium", today ? "text-accent" : "text-muted-foreground")}>
          {format(date, "EEE")}
        </p>
        <p className={cn(
          "font-heading font-extrabold text-xl leading-none mt-0.5",
          today ? "text-accent" : past ? "text-muted-foreground/50" : "text-foreground"
        )}>
          {format(date, "d")}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{format(date, "MMM")}</p>
        {jobs.length > 0 && (
          <span className="mt-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
            {jobs.length}
          </span>
        )}
      </div>

      {/* Drop zone */}
      <Droppable droppableId={key}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 rounded-xl p-1.5 min-h-[160px] transition-all duration-150 space-y-2",
              snapshot.isDraggingOver
                ? "bg-accent/15 ring-2 ring-accent/50 ring-dashed"
                : jobs.length === 0
                ? "border border-dashed border-border/50"
                : ""
            )}
          >
            {jobs.length === 0 && !snapshot.isDraggingOver && (
              <div className="h-full flex items-center justify-center">
                <p className="text-[11px] text-muted-foreground/40 text-center">No jobs</p>
              </div>
            )}
            {jobs.map((job, i) => (
              <Draggable key={job.id} draggableId={job.id} index={i}>
                {(prov, snap) => (
                  <div
                    ref={prov.innerRef}
                    {...prov.draggableProps}
                    className={cn(
                      "transition-all duration-100",
                      snap.isDragging && "rotate-1 scale-105 shadow-xl opacity-95 ring-2 ring-accent"
                    )}
                  >
                    <JobCard
                      job={job}
                      compact
                      onClick={() => onOpen(job.id)}
                      dragHandleProps={prov.dragHandleProps}
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