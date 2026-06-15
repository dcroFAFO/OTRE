import React from "react";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle2, Archive } from "lucide-react";
import { StatusBadge, PriorityBadge } from "./FeedbackBadges";
import { format } from "date-fns";

export default function FeedbackTable({ items, onView, onResolve, onArchive, busyId }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
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
    </div>
  );
}