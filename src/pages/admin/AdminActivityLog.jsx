import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import DashboardShell from "@/components/dashboard/DashboardShell";
import RequireCapability from "@/components/auth/RequireCapability";
import ActivityLogFilters, { EMPTY_ACTIVITY_FILTERS } from "@/components/admin/activity/ActivityLogFilters";
import ActivityLogTable from "@/components/admin/activity/ActivityLogTable";
import { listAllAudit } from "@/services/auditService";
import { CAPABILITIES } from "@/config/roles";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle } from "lucide-react";
import { subDays, startOfDay, isAfter } from "date-fns";

export default function AdminActivityLog() {
  const { user, isLoading } = useCurrentUser();
  const [filters, setFilters] = useState(EMPTY_ACTIVITY_FILTERS);

  const { data: events, isLoading: loadingEvents, error } = useQuery({
    queryKey: ["adminActivityLog"],
    queryFn: () => listAllAudit(1000),
    initialData: [],
  });

  const actors = useMemo(
    () => [...new Set(events.map((e) => e.actor_name).filter(Boolean))].sort(),
    [events]
  );
  const types = useMemo(
    () => [...new Set(events.map((e) => e.event_type).filter(Boolean))].sort(),
    [events]
  );

  const filtered = useMemo(() => {
    const q = filters.q.toLowerCase();
    const cutoff =
      filters.range === "today" ? startOfDay(new Date())
      : filters.range === "7d" ? subDays(new Date(), 7)
      : filters.range === "30d" ? subDays(new Date(), 30)
      : null;

    return events.filter((e) => {
      const matchQ = !q || [e.summary, e.event_type, e.actor_name, e.new_value, e.previous_value]
        .some((v) => v?.toLowerCase?.().includes(q));
      const matchActor = filters.actor === "all" || e.actor_name === filters.actor;
      const matchType = filters.type === "all" || e.event_type === filters.type;
      const matchDate = !cutoff || (e.created_date && isAfter(new Date(e.created_date), cutoff));
      return matchQ && matchActor && matchType && matchDate;
    });
  }, [events, filters]);

  if (isLoading) {
    return <div className="fixed inset-0 grid place-items-center"><div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" /></div>;
  }

  return (
    <RequireCapability
      capability={CAPABILITIES.LOG_VIEW}
      deniedTitle="Activity log restricted"
      deniedMessage="You don't have permission to view the activity log."
    >
      <DashboardShell user={user}>
        <div className="space-y-5">
          <div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight">Activity Log</h1>
            <p className="text-muted-foreground text-sm">Every tracked action across the platform, filterable by user, action and date.</p>
          </div>

          <ActivityLogFilters filters={filters} setFilters={setFilters} actors={actors} types={types} />

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-center">
              <AlertTriangle className="h-6 w-6 text-rose-500 mx-auto mb-2" />
              <p className="text-sm text-rose-700">Couldn't load activity. Please refresh and try again.</p>
            </div>
          ) : loadingEvents ? (
            <div className="py-16 grid place-items-center"><div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 py-16 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {events.length === 0 ? "No activity recorded yet." : "No activity matches your filters."}
              </p>
              {events.length > 0 && (
                <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setFilters(EMPTY_ACTIVITY_FILTERS)}>Clear filters</Button>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "event" : "events"}</p>
              <ActivityLogTable events={filtered} />
            </>
          )}
        </div>
      </DashboardShell>
    </RequireCapability>
  );
}