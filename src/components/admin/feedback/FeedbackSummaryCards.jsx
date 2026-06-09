import React from "react";
import { Inbox, Eye, CalendarCheck, CheckCircle2, AlertTriangle, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  default: "text-foreground",
  sky: "text-sky-600",
  violet: "text-violet-600",
  emerald: "text-emerald-600",
  rose: "text-rose-600",
};

export default function FeedbackSummaryCards({ items }) {
  const active = items.filter((f) => !f.is_archived);
  const cards = [
    { label: "Total", value: active.length, icon: ListChecks, tone: "default" },
    { label: "New", value: active.filter((f) => f.status === "New").length, icon: Inbox, tone: "sky" },
    { label: "Under Review", value: active.filter((f) => f.status === "Under Review").length, icon: Eye, tone: "violet" },
    { label: "Planned", value: active.filter((f) => f.status === "Planned").length, icon: CalendarCheck, tone: "violet" },
    { label: "Resolved", value: active.filter((f) => f.status === "Resolved").length, icon: CheckCircle2, tone: "emerald" },
    { label: "High Priority", value: active.filter((f) => f.priority === "High" && !["Resolved", "Rejected", "Archived"].includes(f.status)).length, icon: AlertTriangle, tone: "rose" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
            <c.icon className={cn("h-4 w-4", TONES[c.tone])} />
          </div>
          <p className={cn("mt-1.5 font-heading text-2xl font-extrabold", TONES[c.tone])}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}