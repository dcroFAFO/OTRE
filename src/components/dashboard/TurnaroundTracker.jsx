import React, { useMemo } from "react";
import { Timer, AlertTriangle, CheckCircle2 } from "lucide-react";
import { DEFAULT_TURNAROUND_TARGET_DAYS } from "@/config/platformConfig";
import { cn } from "@/lib/utils";

const prettify = (s) =>
  String(s || "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export default function TurnaroundTracker({ jobs = [], targetDays = DEFAULT_TURNAROUND_TARGET_DAYS }) {
  const categories = useMemo(() => {
    const completed = jobs.filter(
      (j) => j.status === "completed" && j.created_date && j.updated_date
    );

    const groups = {};
    completed.forEach((j) => {
      const key = prettify(j.service_category_key || j.job_type || "Uncategorised");
      const days = (new Date(j.updated_date) - new Date(j.created_date)) / MS_PER_DAY;
      if (days < 0) return;
      (groups[key] ||= []).push(days);
    });

    return Object.entries(groups)
      .map(([label, arr]) => ({
        label,
        count: arr.length,
        avg: arr.reduce((s, d) => s + d, 0) / arr.length,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [jobs]);

  const maxAvg = Math.max(targetDays, ...categories.map((c) => c.avg), 1);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-heading font-bold flex items-center gap-2">
          <Timer className="h-4 w-4 text-accent" />
          Turnaround by service category
        </h2>
        <span className="text-xs text-muted-foreground">
          Standard target: <strong className="text-foreground">{targetDays} days</strong>
        </span>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No completed repairs to measure yet.</p>
      ) : (
        <div className="space-y-3.5">
          {categories.map((c) => {
            const overTarget = c.avg > targetDays;
            const pct = Math.min(100, Math.round((c.avg / maxAvg) * 100));
            const targetPct = Math.min(100, Math.round((targetDays / maxAvg) * 100));
            return (
              <div key={c.label}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium text-foreground flex items-center gap-1.5">
                    {overTarget
                      ? <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                      : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                    {c.label}
                    <span className="text-muted-foreground font-normal">· {c.count} job{c.count !== 1 ? "s" : ""}</span>
                  </span>
                  <span className={cn("font-semibold tabular-nums", overTarget ? "text-rose-600" : "text-emerald-600")}>
                    {c.avg.toFixed(1)}d
                  </span>
                </div>
                <div className="relative h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", overTarget ? "bg-rose-400" : "bg-emerald-400")}
                    style={{ width: `${pct}%` }}
                  />
                  {/* Target marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-foreground/50"
                    style={{ left: `${targetPct}%` }}
                    title={`Target: ${targetDays} days`}
                  />
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-4 pt-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Within target</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" /> Over target</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-foreground/50" /> Target line</span>
          </div>
        </div>
      )}
    </div>
  );
}