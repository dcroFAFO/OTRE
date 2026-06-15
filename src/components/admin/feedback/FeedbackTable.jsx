import React from "react";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle2, Archive } from "lucide-react";
import { StatusBadge, PriorityBadge } from "./FeedbackBadges";
import { format } from "date-fns";

export default function FeedbackTable({ items, onView, onResolve, onArchive, busyId }) {
  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="space-y-2.5 md:hidden">
        {items.map((f) => (
          <div key={f.id} className="rounded-xl border border-border bg-card p-3.5">
            <button onClick={() => onView(f)} className="block w-full text-left">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium truncate">{f.subject}</p>
                <StatusBadge value={f.status} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{f.feedback_type}</span>
                <PriorityBadge value={f.priority} />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground truncate">
                {f.submitted_by_name || "—"}
                {f.created_date && ` · ${format(new Date(f.created_date), "d MMM yyyy")}`}
              </p>
            </button>
            <div className="mt-2.5 flex items-center justify-end gap-1 border-t border-border pt-2.5">
              <Button variant="ghost" size="icon" className="h-9 w-9" title="View" onClick={() => onView(f)}>
                <Eye className="h-4 w-4" />
              </Button>
              {f.status !== "Resolved" && (
                <Button variant="ghost" size="icon" className="h-9 w-9 text-emerald-600" title="Mark resolved"
                  disabled={busyId === f.id} onClick={() => onResolve(f)}>
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}
              {!f.is_archived && (
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" title="Archive"
                  disabled={busyId === f.id} onClick={() => onArchive(f)}>
                  <Archive className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Subject</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Priority</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Submitted by</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((f) => (
              <tr key={f.id} className="hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3 max-w-[240px]">
                  <button onClick={() => onView(f)} className="font-medium text-left hover:underline truncate block w-full">
                    {f.subject}
                  </button>
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{f.feedback_type}</td>
                <td className="px-4 py-3"><PriorityBadge value={f.priority} /></td>
                <td className="px-4 py-3"><StatusBadge value={f.status} /></td>
                <td className="px-4 py-3 max-w-[160px]">
                  <p className="truncate">{f.submitted_by_name || "—"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{f.submitted_by_email}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {f.created_date ? format(new Date(f.created_date), "d MMM yyyy") : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="View" onClick={() => onView(f)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {f.status !== "Resolved" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" title="Mark resolved"
                        disabled={busyId === f.id} onClick={() => onResolve(f)}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    {!f.is_archived && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Archive"
                        disabled={busyId === f.id} onClick={() => onArchive(f)}>
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}