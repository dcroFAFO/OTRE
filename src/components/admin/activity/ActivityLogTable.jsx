import React from "react";
import { UserCircle } from "lucide-react";
import { roleLabel, roleBadgeClass } from "@/config/roles";
import { cn } from "@/lib/utils";

export default function ActivityLogTable({ events }) {
  return (
    <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="hidden md:grid grid-cols-[1fr_180px_160px_180px] gap-3 px-4 py-2.5 border-b border-border bg-secondary/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Activity</span>
        <span>User</span>
        <span>Action</span>
        <span>When</span>
      </div>
      <div className="divide-y divide-border">
        {events.map((e) => (
          <div key={e.id} className="grid md:grid-cols-[1fr_180px_160px_180px] gap-1 md:gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
            <div className="min-w-0">
              <p className="text-sm text-foreground leading-snug">{e.summary || e.event_type}</p>
              {(e.previous_value || e.new_value) && (
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {e.previous_value ? `${e.previous_value} → ` : ""}{e.new_value}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate">{e.actor_name || "System"}</span>
              {e.actor_role && e.actor_role !== "system" && (
                <span className={cn("hidden lg:inline rounded-full px-1.5 py-0.5 text-[9px] font-semibold shrink-0", roleBadgeClass(e.actor_role))}>
                  {roleLabel(e.actor_role)}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground self-center">{(e.event_type || "").replace(/_/g, " ")}</span>
            <span className="text-xs text-muted-foreground self-center">{e.created_date ? new Date(e.created_date).toLocaleString() : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}