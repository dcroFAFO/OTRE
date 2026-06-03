import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDashboardUser } from "@/components/dashboard/DashboardLayout";
import { DragDropContext } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { startOfWeek, addDays, addWeeks, format } from "date-fns";
import CalendarColumn from "@/components/dashboard/calendar/CalendarColumn";
import JobDetailModal from "@/components/dashboard/job/JobDetailModal";
import { useJobs, useInvalidateJobs } from "@/hooks/useJobs";
import { rescheduleJob } from "@/services/jobService";

export default function Calendar() {
  const user = useDashboardUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: jobs } = useJobs();
  const invalidate = useInvalidateJobs();
  const [weekOffset, setWeekOffset] = useState(0);

  const selectedId = new URLSearchParams(location.search).get("id");
  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const byDay = useMemo(() => {
    const map = {};
    days.forEach((d) => { map[format(d, "yyyy-MM-dd")] = []; });
    jobs.forEach((j) => { if (j.scheduled_date && map[j.scheduled_date]) map[j.scheduled_date].push(j); });
    return map;
  }, [jobs, days]);

  const onDragEnd = async (result) => {
    const { destination, draggableId, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const job = jobs.find((j) => j.id === draggableId);
    await rescheduleJob(job, destination.droppableId, user);
    invalidate();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight flex items-center gap-2"><CalendarDays className="h-6 w-6 text-accent" /> Calendar</h1>
          <p className="text-muted-foreground text-sm">{format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-2 overflow-x-auto pb-3">
          {days.map((d) => (
            <CalendarColumn key={format(d, "yyyy-MM-dd")} date={d} jobs={byDay[format(d, "yyyy-MM-dd")] || []} onOpen={(id) => navigate(`/dashboard/calendar?id=${id}`)} />
          ))}
        </div>
      </DragDropContext>

      <JobDetailModal jobId={selectedId} actor={user} open={!!selectedId} onClose={() => navigate("/dashboard/calendar")} />
    </div>
  );
}