import React from "react";
import { Bike } from "lucide-react";

function formatLabel(value = "") {
  return String(value || "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export default function RepairAssistantJobCard({ job, onSelect }) {
  return (
    <button
      onClick={() => onSelect(job)}
      className="flex aspect-square w-full flex-col justify-between rounded-2xl border border-border bg-background p-3 text-left transition hover:border-accent hover:bg-accent/5"
    >
      <div className="flex items-center gap-1.5 text-accent">
        <Bike className="h-4 w-4" />
        <span className="text-[11px] font-bold">{job.reference || "No ref"}</span>
      </div>
      <div className="space-y-1">
        <p className="line-clamp-2 text-xs font-semibold text-foreground">{job.asset_label || "Scooter"}</p>
        {job.service_type && <p className="line-clamp-1 text-[11px] text-muted-foreground">{formatLabel(job.service_type)}</p>}
      </div>
      <span className="inline-block w-fit rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
        {formatLabel(job.status) || "Active"}
      </span>
    </button>
  );
}