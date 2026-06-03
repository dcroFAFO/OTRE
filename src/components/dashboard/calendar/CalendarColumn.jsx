import React from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { format, isToday } from "date-fns";
import JobCard from "@/components/shared/JobCard";
import { cn } from "@/lib/utils";

export default function CalendarColumn({ date, jobs, onOpen }) {
  const key = format(date, "yyyy-MM-dd");
  const today = isToday(date);
  return (
    <div className="flex flex-col min-w-[200px] flex-1">
      <div className={cn("text-center pb-2 mb-2 border-b", today ? "border-accent" : "border-border")}>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{format(date, "EEE")}</p>
        <p className={cn("font-heading font-bold text-lg", today && "text-accent")}>{format(date, "d")}</p>
      </div>
      <Droppable droppableId={key}>
        {(provided, snapshot) => (
          <div ref={provided.innerRef} {...provided.droppableProps}
            className={cn("flex-1 space-y-2 rounded-xl p-1.5 min-h-[120px] transition-colors", snapshot.isDraggingOver && "bg-accent/10")}>
            {jobs.map((job, i) => (
              <Draggable key={job.id} draggableId={job.id} index={i}>
                {(prov) => (
                  <div ref={prov.innerRef} {...prov.draggableProps}>
                    <JobCard job={job} compact onClick={() => onOpen(job.id)} dragHandleProps={prov.dragHandleProps} />
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