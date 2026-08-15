import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import RequireCapability from "@/components/auth/RequireCapability";
import ActivityLogFilters, { EMPTY_ACTIVITY_FILTERS } from "@/components/admin/activity/ActivityLogFilters";
import ActivityLogTable from "@/components/admin/activity/ActivityLogTable";
import { listAllAudit } from "@/services/auditService";
import { CAPABILITIES, hasCapability } from "@/config/roles";
import { Activity } from "lucide-react";
import { subDays, startOfDay, isAfter } from "date-fns";
import SEO from "@/components/SEO";
import { EmptyState, ErrorState, NoResultsState, PageLoader, TableSkeleton } from "@/components/shared";

export default function AdminActivityLog() {
  const { user, isLoading } = useCurrentUser();
  const [filters, setFilters] = useState(EMPTY_ACTIVITY_FILTERS);
  const canViewLog = hasCapability(user?.role, CAPABILITIES.LOG_VIEW);

  const { data: events = [], isLoading: loadingEvents, error, refetch } = useQuery({
    queryKey: ["adminActivityLog"],
    queryFn: () => listAllAudit(1000),
    enabled: canViewLog,
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

  const seo = <SEO title="Activity Log | On The Run Electrics" description="Private admin activity log for reviewing operational actions across the On The Run Electrics platform." canonical="/admin/activity" noindex />;

  if (isLoading) {
    return <>{seo}<PageLoader label="Loading activity log" fullScreen /></>;
  }

  return (
    <>
    {seo}
    <RequireCapability
      capability={CAPABILITIES.LOG_VIEW}
      deniedTitle="Activity log restricted"
      deniedMessage="You don't have permission to view the activity log."
    >
        <div className="space-y-5">
          <div>
            <h1 className="font-heading text-2xl font-extrabold tracking-tight">Activity Log</h1>
            <p className="text-muted-foreground text-sm">Every tracked action across the platform, filterable by user, action and date.</p>
          </div>

          <ActivityLogFilters filters={filters} setFilters={setFilters} actors={actors} types={types} />

          {error && events.length ? <ErrorState title="Latest activity could not be loaded" description="Previously loaded activity remains visible." error={error} onRetry={refetch} /> : null}

          {error && !events.length ? (
            <ErrorState title="Activity could not be loaded" error={error} onRetry={refetch} />
          ) : loadingEvents ? (
            <TableSkeleton rows={8} columns={5} label="Loading activity" />
          ) : filtered.length === 0 ? (
            events.length === 0 ? (
              <EmptyState icon={Activity} title="No activity recorded" description="Tracked staff and system actions will appear here." />
            ) : (
              <NoResultsState
                title="No activity matches these filters"
                description={filters.q ? `No matches for “${filters.q}”.` : "Try a broader user, action, or date range."}
                onClear={() => setFilters(EMPTY_ACTIVITY_FILTERS)}
              />
            )
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "event" : "events"}</p>
              <ActivityLogTable events={filtered} />
            </>
          )}
        </div>
    </RequireCapability>
    </>
  );
}
