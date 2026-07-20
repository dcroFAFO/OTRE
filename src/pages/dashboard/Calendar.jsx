import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDashboardUser } from "@/components/dashboard/DashboardLayout";
import { DragDropContext } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react";
import { startOfWeek, addDays, addWeeks, format, isToday } from "date-fns";
import CalendarColumn from "@/components/dashboard/calendar/CalendarColumn";
import DailyTimeline from "@/components/dashboard/calendar/DailyTimeline";
import JobDetailModal from "@/components/dashboard/job/JobDetailModal";
import { useJobs, useInvalidateJobs } from "@/hooks/useJobs";
import { rescheduleJob } from "@/services/jobService";
import { cn } from "@/lib/utils";

export default function Calendar() {
  const user = useDashboardUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: jobs } = useJobs();
  const invalidate = useInvalidateJobs();
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState("week"); // week | day
  const [selectedDay, setSelectedDay] = useState(format(new Date(), "yyyy-MM-dd"));

  const selectedId = new URLSearchParams(location.search).get("id");
  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const byDay = useMemo(() => {
    const map = {};
    days.forEach((d) => { map[format(d, "yyyy-MM-dd")] = []; });
    jobs.forEach((j) => {
      if (!j.scheduled_date) return;
      const dayKey = String(j.scheduled_date).slice(0, 10);
      if (map[dayKey]) map[dayKey].push(j);
    });
    return map;
  }, [jobs, days]);

  const onDragEnd = async (result) => {
    const { destination, draggableId, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const job = jobs.find((j) => j.id === draggableId);
    if (!job) return;
    await rescheduleJob(job, destination.droppableId, user);
    invalidate();
  };

  const openJob = (id) => navigate(`/dashboard/calendar?id=${id}`);
  const closeJob = () => { navigate("/dashboard/calendar"); invalidate(); };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-accent" /> Calendar
          </h1>
          <p className="text-muted-foreground text-sm">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("week")}
              className={cn("px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors",
                viewMode === "week" ? "bg-accent text-accent-foreground" : "hover:bg-secondary")}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Weekly
            </button>
            <button
              onClick={() => setViewMode("day")}
              className={cn("px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors border-l border-border",
                viewMode === "day" ? "bg-accent text-accent-foreground" : "hover:bg-secondary")}
            >
              <List className="h-3.5 w-3.5" /> Daily
            </button>
          </div>

          {/* Week navigation */}
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => { setWeekOffset(0); setSelectedDay(format(new Date(), "yyyy-MM-dd")); }}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === "week" ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="rounded-3xl border border-border bg-card/70 p-3 shadow-sm grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 pb-3 min-h-[400px]">
            {days.map((d) => (
              <CalendarColumn
                key={format(d, "yyyy-MM-dd")}
                date={d}
                jobs={byDay[format(d, "yyyy-MM-dd")] || []}
                onOpen={openJob}
              />
            ))}
          </div>
        </DragDropContext>
      ) : (
        <>
          {/* Day selector */}
          <div className="flex flex-wrap gap-1.5 pb-1">
            {days.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const count = (byDay[key] || []).length;
              const today = isToday(d);
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(key)}
                  className={cn(
                    "flex flex-col items-center px-3 py-2 rounded-xl border text-xs font-medium transition-all min-w-[60px] shrink-0",
                    selectedDay === key
                      ? "bg-accent text-accent-foreground border-accent shadow-sm"
                      : today
                      ? "border-accent text-accent"
                      : "border-border hover:bg-secondary"
                  )}
                >
                  <span className="text-[10px] uppercase">{format(d, "EEE")}</span>
                  <span className="text-lg font-extrabold font-heading leading-none">{format(d, "d")}</span>
                  {count > 0 && (
                    <span className={cn("mt-0.5 rounded-full text-[10px] font-bold px-1",
                      selectedDay === key ? "bg-accent-foreground/20 text-accent-foreground" : "bg-accent/10 text-accent")}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <DailyTimeline
            date={days.find((d) => format(d, "yyyy-MM-dd") === selectedDay) || days[0]}
            jobs={byDay[selectedDay] || []}
            onOpen={openJob}
            actor={user}
            onRefresh={invalidate}
          />
        </>
      )}

      <JobDetailModal jobId={selectedId} actor={user} open={!!selectedId} onClose={closeJob} />
    </div>
  );
}