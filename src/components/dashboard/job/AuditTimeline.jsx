import React, { useState, useEffect } from "react";
import { listJobAudit } from "@/services/auditService";
import { History } from "lucide-react";

export default function AuditTimeline({ jobId, refreshKey }) {
  const [events, setEvents] = useState([]);
  useEffect(() => { listJobAudit(jobId).then(setEvents); }, [jobId, refreshKey]);

  return (
    <div className="space-y-3">
      <h3 className="font-heading font-bold flex items-center gap-1.5"><History className="h-4 w-4" /> Activity log</h3>
      <ol className="relative border-l border-border ml-1.5 space-y-4">
        {events.map((e) => (
          <li key={e.id} className="ml-4">
            <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
            <p className="text-sm text-foreground">{e.summary}</p>
            <p className="text-[11px] text-muted-foreground">{e.actor_name} · {new Date(e.created_date).toLocaleString()}</p>
          </li>
        ))}
        {events.length === 0 && <p className="ml-4 text-sm text-muted-foreground">No activity yet.</p>}
      </ol>
    </div>
  );
}