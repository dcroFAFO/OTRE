import React from "react";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  "New": "bg-sky-100 text-sky-700",
  "Under Review": "bg-violet-100 text-violet-700",
  "Planned": "bg-indigo-100 text-indigo-700",
  "In Progress": "bg-amber-100 text-amber-700",
  "Resolved": "bg-emerald-100 text-emerald-700",
  "Rejected": "bg-rose-100 text-rose-700",
  "Archived": "bg-slate-100 text-slate-600",
};

const PRIORITY_STYLES = {
  "Low": "bg-slate-100 text-slate-600",
  "Medium": "bg-amber-100 text-amber-700",
  "High": "bg-rose-100 text-rose-700",
};

export function StatusBadge({ value }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", STATUS_STYLES[value] || "bg-secondary text-secondary-foreground")}>
      {value}
    </span>
  );
}

export function PriorityBadge({ value }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", PRIORITY_STYLES[value] || "bg-secondary text-secondary-foreground")}>
      {value}
    </span>
  );
}