import React from "react";
import { UserCircle } from "lucide-react";
import { roleBadgeClass, roleLabel } from "@/config/roles";
import { cn } from "@/lib/utils";

/** @param {{ events: Array<Record<string, any>> }} props */
export default function ActivityLogTable({ events }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm" aria-label="Activity events">
      <div className="hidden grid-cols-[1fr_180px_160px_180px] gap-3 border-b border-border bg-secondary/40 px-4 py-2.5 text-[11px] font-semibold uppercase text-muted-foreground md:grid" aria-hidden="true">
        <span>Activity</span><span>User</span><span>Action</span><span>When</span>
      </div>
      <ol className="divide-y divide-border">
        {events.map((event) => (
          <li key={event.id} className="grid gap-3 px-4 py-4 transition-colors hover:bg-secondary/30 md:grid-cols-[1fr_180px_160px_180px] md:py-3">
            <div className="min-w-0">
              <p className="text-sm leading-snug text-foreground">{event.summary || formatEventType(event.event_type)}</p>
              {(event.previous_value || event.new_value) ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{event.previous_value ? `${event.previous_value} to ` : ""}{event.new_value}</p> : null}
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="w-14 shrink-0 text-xs text-muted-foreground md:sr-only">User</span>
              <UserCircle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate text-sm">{event.actor_name || "System"}</span>
              {event.actor_role && event.actor_role !== "system" ? <span className={cn("hidden shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold lg:inline", roleBadgeClass(event.actor_role))}>{roleLabel(event.actor_role)}</span> : null}
            </div>
            <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-14 shrink-0 md:sr-only">Action</span><span className="truncate">{formatEventType(event.event_type)}</span>
            </div>
            <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-14 shrink-0 md:sr-only">When</span><time dateTime={event.created_date || undefined}>{formatDateTime(event.created_date)}</time>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** @param {any} value */
function formatEventType(value) {
  return String(value || "Activity").replace(/_/g, " ");
}

/** @param {any} value */
function formatDateTime(value) {
  return value ? new Date(value).toLocaleString("en-AU") : "Time not recorded";
}
