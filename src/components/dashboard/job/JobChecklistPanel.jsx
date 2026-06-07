import React, { useState } from "react";
import { ClipboardList, Check, Loader2 } from "lucide-react";
import { toggleChecklistItem } from "@/services/jobService";
import { cn } from "@/lib/utils";

export default function JobChecklistPanel({ job, actor, canEdit, onChange }) {
  const [busy, setBusy] = useState(null);
  const checklist = job.checklist || [];
  const doneCount = checklist.filter((c) => c.done).length;
  const allDone = checklist.length > 0 && doneCount === checklist.length;

  const toggle = async (i) => {
    if (!canEdit) return;
    setBusy(i);
    await toggleChecklistItem(job, i, actor);
    setBusy(null);
    onChange?.();
  };

  if (checklist.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No checklist for this job.</p>
        <p className="text-xs mt-1">Add checklist items to the job's template to track repair steps.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-sm text-foreground">Repair Checklist</h3>
        <span className={cn(
          "text-xs font-semibold rounded-full px-2.5 py-1",
          allDone ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-muted-foreground"
        )}>
          {doneCount}/{checklist.length} done
        </span>
      </div>

      <div className="space-y-1.5">
        {checklist.map((c, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            disabled={!canEdit || busy === i}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
              c.done ? "border-emerald-200 bg-emerald-50/60" : "border-border bg-card hover:bg-secondary/40",
              !canEdit && "cursor-default"
            )}
          >
            <span className={cn(
              "grid place-items-center h-5 w-5 rounded-md border shrink-0 transition-colors",
              c.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-input bg-background"
            )}>
              {busy === i ? <Loader2 className="h-3 w-3 animate-spin" /> : c.done && <Check className="h-3.5 w-3.5" />}
            </span>
            <span className={cn("flex-1", c.done && "line-through text-muted-foreground")}>{c.label}</span>
          </button>
        ))}
      </div>

      {!allDone && canEdit && (
        <p className="text-xs text-muted-foreground">Complete all steps to mark the job as completed.</p>
      )}
    </div>
  );
}