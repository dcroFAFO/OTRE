import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { History, MessageSquare, RefreshCw, Lock, Wrench } from "lucide-react";
import { format } from "date-fns";

const eventIcon = (type) => {
  if (type === "note") return MessageSquare;
  if (type === "private_notes_updated") return Lock;
  if (type?.includes("status") || type?.includes("rescheduled") || type?.includes("reopened")) return RefreshCw;
  return Wrench;
};

export default function AuditTimeline({ job, refreshKey }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!job?.id) return;
    base44.functions.invoke("jobActions", { action: "list_activity", jobId: job.id })
      .then((res) => setItems(res.data || []));
  }, [job?.id, refreshKey]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading font-bold flex items-center gap-1.5">
          <History className="h-4 w-4 text-muted-foreground" /> Activity timeline
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">Notes, status changes, and internal job updates in one place.</p>
      </div>

      <ol className="relative border-l border-border ml-3 space-y-5">
        {items.map((item) => {
          const Icon = eventIcon(item.type);
          return (
            <li key={item.id} className="ml-6">
              <span className="absolute -left-3 grid h-6 w-6 place-items-center rounded-full border border-border bg-card shadow-sm">
                <Icon className="h-3.5 w-3.5 text-accent" />
              </span>
              <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  {item.visibility && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold capitalize text-muted-foreground">
                      {item.visibility}
                    </span>
                  )}
                </div>
                {item.detail && <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap">{item.detail}</p>}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {item.actor} · {item.date ? format(new Date(item.date), "d MMM yyyy, h:mm a") : "Unknown time"}
                </p>
              </div>
            </li>
          );
        })}
        {items.length === 0 && <p className="ml-6 text-sm text-muted-foreground">No activity yet.</p>}
      </ol>
    </div>
  );
}