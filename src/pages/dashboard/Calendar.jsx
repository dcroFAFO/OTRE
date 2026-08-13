import React, { useEffect, useMemo, useState } from "react";
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
import { EmptyState, ErrorState, TableSkeleton } from "@/components/shared";
import { toast } from "sonner";
import { getSafeErrorMessage } from "@/lib/errors";

export default function Calendar() {
  const user = useDashboardUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: jobs = [], isLoading, error, refetch } = useJobs();
  const invalidate = useInvalidateJobs();
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState(() => (
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? "day" : "week"
  ));
  const [selectedDay, setSelectedDay] = useState(format(new Date(), "yyyy-MM-dd"));

  const selectedId = new URLSearchParams(location.search).get("id");
  const weekStart = useMemo(() => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }), [weekOffset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  useEffect(() => {
    setSelectedDay(format(weekOffset === 0 ? new Date() : weekStart, "yyyy-MM-dd"));
  }, [weekOffset, weekStart]);

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
  const scheduledThisWeek = Object.values(byDay).reduce((count, dayJobs) => count + dayJobs.length, 0);

  const onDragEnd = async (result) => {
    const { destination, draggableId, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const job = jobs.find((j) => j.id === draggableId);
    if (!job) return;
    try {
      await rescheduleJob(job, destination.droppableId);
      await invalidate();
      toast.success("Job rescheduled.");
    } catch (err) {
      toast.error(getSafeErrorMessage(err, "The job could not be rescheduled."));
    }
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
          <div className="flex overflow-hidden rounded-md border border-border" role="group" aria-label="Calendar view">
            <button
              type="button"
              onClick={() => setViewMode("week")}
              aria-pressed={viewMode === "week"}
              className={cn("flex min-h-11 items-center gap-1.5 px-3 text-xs font-medium transition-colors sm:min-h-9",
                viewMode === "week" ? "bg-accent text-accent-foreground" : "hover:bg-secondary")}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Weekly
            </button>
            <button
              type="button"
              onClick={() => setViewMode("day")}
              aria-pressed={viewMode === "day"}
              className={cn("flex min-h-11 items-center gap-1.5 border-l border-border px-3 text-xs font-medium transition-colors sm:min-h-9",
                viewMode === "day" ? "bg-accent text-accent-foreground" : "hover:bg-secondary")}
            >
              <List className="h-3.5 w-3.5" /> Daily
            </button>
          </div>

          {/* Week navigation */}
          <Button variant="outline" size="iconTouch" className="sm:h-9 sm:w-9" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="touch" className="sm:h-9" onClick={() => { setWeekOffset(0); setSelectedDay(format(new Date(), "yyyy-MM-dd")); }}>
            Today
          </Button>
          <Button variant="outline" size="iconTouch" className="sm:h-9 sm:w-9" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error ? (
        <ErrorState title="Calendar jobs could not be loaded" error={error} onRetry={refetch} />
      ) : isLoading ? (
        <TableSkeleton rows={7} columns={3} label="Loading calendar" />
      ) : scheduledThisWeek === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No scheduled jobs this week"
          description="Jobs without a scheduled date remain available in the job list."
          action={<Button variant="outline" onClick={() => navigate("/dashboard/jobs")}>View jobs</Button>}
        />
      ) : viewMode === "week" ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid min-h-[400px] grid-cols-2 gap-2 rounded-lg border border-border bg-card/70 p-3 pb-3 shadow-sm sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
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
          <div className="flex gap-1.5 overflow-x-auto pb-2" aria-label="Choose a day">
            {days.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const count = (byDay[key] || []).length;
              const today = isToday(d);
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelectedDay(key)}
                  aria-pressed={selectedDay === key}
                  aria-label={`${format(d, "EEEE d MMMM")}, ${count} scheduled ${count === 1 ? "job" : "jobs"}`}
                  className={cn(
                    "flex min-h-16 min-w-[60px] shrink-0 flex-col items-center rounded-md border px-3 py-2 text-xs font-medium transition-all",
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
          />
        </>
      )}

      <JobDetailModal jobId={selectedId} actor={user} open={!!selectedId} onClose={closeJob} />
    </div>
  );
}
