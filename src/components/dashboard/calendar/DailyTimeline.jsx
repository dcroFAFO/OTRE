import React from "react";
import { format, isToday } from "date-fns";
import JobCard from "@/components/shared/JobCard";
import { cn } from "@/lib/utils";
import { Calendar, Clock } from "lucide-react";

export default function DailyTimeline({ date, jobs, onOpen }) {
  const today = isToday(date);

  // Group by preferred_time_window or put in "Unscheduled"
  const timeGroups = [
    { key: "Morning (9–12)", label: "Morning", time: "9:00 – 12:00" },
    { key: "Midday (12–3)", label: "Midday", time: "12:00 – 15:00" },
    { key: "Afternoon (3–5:30)", label: "Afternoon", time: "15:00 – 17:30" },
    { key: "Anytime", label: "Anytime", time: "Flexible" },
    { key: null, label: "Unscheduled", time: "" },
  ];

  const grouped = timeGroups.map((g) => ({
    ...g,
    jobs: jobs.filter((j) =>
      g.key === null
        ? !j.preferred_time_window || !timeGroups.slice(0, -1).find((tg) => tg.key === j.preferred_time_window)
        : j.preferred_time_window === g.key
    ),
  })).filter((g) => g.jobs.length > 0 || g.key !== null);

  return (
    <div className="rounded-3xl border border-border bg-card/70 p-4 shadow-sm space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Calendar className="h-4 w-4 text-accent" />
        <h2 className={cn("font-heading font-bold text-lg", today && "text-accent")}>
          {format(date, "EEEE, MMMM d")}
          {today && <span className="ml-2 text-sm font-medium bg-accent/10 text-accent rounded-full px-2 py-0.5">Today</span>}
        </h2>
        <span className="text-sm text-muted-foreground ml-auto">{jobs.length} job{jobs.length !== 1 ? "s" : ""}</span>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background/70 py-16 text-center">
          <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No jobs scheduled for this day.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            group.jobs.length === 0 ? null : (
              <div key={group.key ?? "unscheduled"} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{group.label}</span>
                  {group.time && <span className="text-xs text-muted-foreground">· {group.time}</span>}
                  <span className="ml-auto text-xs text-muted-foreground">{group.jobs.length}</span>
                </div>
                <div className="pl-4 border-l-2 border-border/50 space-y-2">
                  {group.jobs.map((job) => (
                    <JobCard key={job.id} job={job} onClick={() => onOpen(job.id)} />
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}