import React from "react";
import { cn } from "@/lib/utils";
import { normalizeStatusKey } from "@/config/jobConfig";

// Display-only lifecycle groupings over the existing canonical statuses.
// These do NOT change any status values — they only filter what's shown.
export const LIFECYCLE_GROUPS = [
  { key: "all", label: "All", statuses: null },
  { key: "request_review", label: "Request Review", statuses: ["requested"] },
  { key: "approval_scheduling", label: "Approval / Scheduling", statuses: ["booked"] },
  { key: "repair", label: "Repair", statuses: ["repair_in_progress", "waiting_on_parts"] },
  { key: "invoice", label: "Invoice", statuses: ["ready_for_pickup", "invoice_sent", "paid"] },
  { key: "complete", label: "Complete", statuses: ["completed", "cancelled", "on_hold"] },
];

export default function LifecycleTabs({ jobs, value, onChange }) {
  const counts = Object.fromEntries(
    LIFECYCLE_GROUPS.map((g) => [
      g.key,
      g.statuses ? jobs.filter((j) => g.statuses.includes(normalizeStatusKey(j.status))).length : jobs.length,
    ])
  );

  return (
    <div className="sticky top-14 z-30 -mx-4 bg-background/95 px-4 py-1.5 backdrop-blur lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0">
      <div className="flex flex-wrap gap-1.5">
        {LIFECYCLE_GROUPS.map((g) => {
          const active = value === g.key;
          return (
            <button
              key={g.key}
              onClick={() => onChange(g.key)}
              className={cn(
                "min-h-11 lg:min-h-9 rounded-xl border px-3 text-sm font-semibold transition-colors",
                active
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={active}
            >
              {g.label}
              <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] tabular-nums", active ? "bg-white/20" : "bg-secondary")}>
                {counts[g.key]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}