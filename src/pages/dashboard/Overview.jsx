import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase, Clock, Package, PackageCheck, CreditCard, CheckCircle2,
  Inbox, Activity, Search, ArrowRight, CalendarDays, AlertTriangle
} from "lucide-react";
import MetricCard from "@/components/dashboard/MetricCard";
import MonthlySummary from "@/components/dashboard/MonthlySummary";
import TurnaroundTracker from "@/components/dashboard/TurnaroundTracker";
import JobCard from "@/components/shared/JobCard";
import { useJobs } from "@/hooks/useJobs";
import { listRecentAudit } from "@/services/auditService";
import { isThisWeek } from "date-fns";
import { DEFAULT_APP_SETTINGS } from "@/config/platformConfig";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Overview() {
  const navigate = useNavigate();
  const { data: jobs } = useJobs();
  const { data: audit } = useQuery({ queryKey: ["recentAudit"], queryFn: () => listRecentAudit(16), initialData: [], staleTime: 60 * 1000 });
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 220);
    return () => clearTimeout(t);
  }, [q]);

  const m = useMemo(() => ({
    active: jobs.filter((j) => ["active", "booked", "technician_assigned", "repair_in_progress"].includes(j.status)).length,
    awaitingCustomer: jobs.filter((j) => j.status === "waiting_customer").length,
    waitingParts: jobs.filter((j) => ["waiting_parts", "waiting_supplier"].includes(j.status)).length,
    readyPickup: jobs.filter((j) => j.ready_for_pickup || j.status === "ready_for_pickup").length,
    outstanding: jobs.filter((j) => j.payment_status === "outstanding").length,
    completedWeek: jobs.filter((j) => j.status === "completed" && j.updated_date && isThisWeek(new Date(j.updated_date))).length,
    requested: jobs.filter((j) => j.status === "requested").length,
    total: jobs.length,
  }), [jobs]);

  const upcoming = useMemo(() =>
    [...jobs]
      .filter((j) => j.scheduled_date && !["completed", "cancelled"].includes(j.status))
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
      .slice(0, 6),
    [jobs]
  );

  const quickSearch = useMemo(() => {
    if (!debouncedQ.trim()) return [];
    const lower = debouncedQ.toLowerCase();
    return jobs.filter((j) =>
      [j.customer_name, j.asset_label, j.scooter_label, j.reference, j.issue_description]
        .some((v) => v?.toLowerCase().includes(lower))
    ).slice(0, 5);
  }, [jobs, debouncedQ]);

  const recentAudit = useMemo(() => audit.slice(0, 10), [audit]);

  const goJob = (j) => navigate(`/dashboard/jobs?id=${j.id}`);

  const metrics = [
    { label: DEFAULT_APP_SETTINGS.dashboard.metrics.active, value: m.active, icon: Briefcase, tone: "default", filter: "status=active" },
    { label: DEFAULT_APP_SETTINGS.dashboard.metrics.awaitingCustomer, value: m.awaitingCustomer, icon: Clock, tone: "amber" },
    { label: DEFAULT_APP_SETTINGS.dashboard.metrics.waitingParts, value: m.waitingParts, icon: Package, tone: "amber" },
    { label: DEFAULT_APP_SETTINGS.dashboard.metrics.readyPickup, value: m.readyPickup, icon: PackageCheck, tone: "emerald" },
    { label: DEFAULT_APP_SETTINGS.dashboard.metrics.outstanding, value: m.outstanding, icon: CreditCard, tone: "rose" },
    { label: DEFAULT_APP_SETTINGS.dashboard.metrics.completedWeek, value: m.completedWeek, icon: CheckCircle2, tone: "emerald" },
    { label: DEFAULT_APP_SETTINGS.dashboard.metrics.requested, value: m.requested, icon: Inbox, tone: "accent" },
    { label: DEFAULT_APP_SETTINGS.dashboard.metrics.total, value: m.total, icon: Activity, tone: "default" },
  ];

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">{DEFAULT_APP_SETTINGS.dashboard.nav.overview}</h1>
          <p className="text-muted-foreground text-sm">{DEFAULT_APP_SETTINGS.dashboard.overviewSubtitle}</p>
        </div>
        {/* Quick search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Quick search jobs..."
            className="pl-9"
          />
          {quickSearch.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
              {quickSearch.map((j) => (
                <button key={j.id} onClick={() => { goJob(j); setQ(""); }}
                  className="w-full text-left px-3 py-2.5 hover:bg-secondary text-sm flex items-center justify-between border-b border-border last:border-0">
                  <span>
                    <span className="font-medium">{j.customer_name}</span>
                    <span className="text-muted-foreground ml-1.5 text-xs">{j.asset_label || j.scooter_label}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{j.reference}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <MetricCard key={m.label} label={m.label} value={m.value} icon={m.icon} tone={m.tone}
            onClick={() => navigate("/dashboard/jobs")} />
        ))}
      </div>

      {/* Monthly summary */}
      <MonthlySummary jobs={jobs} />

      {/* Turnaround tracker */}
      <TurnaroundTracker jobs={jobs} />

      {/* Pending requests alert */}
      {m.requested > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm font-medium text-amber-800">
              {m.requested} pending booking {m.requested === 1 ? "request" : "requests"} need reviewing
            </p>
          </div>
          <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0"
            onClick={() => navigate("/dashboard/jobs")}>
            Review <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Body: upcoming + activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming jobs */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-accent" />
              Upcoming {DEFAULT_APP_SETTINGS.terminology.jobPlural}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/calendar")} className="text-xs gap-1">
              Calendar <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          {upcoming.length === 0
            ? <EmptyState message={`No upcoming ${DEFAULT_APP_SETTINGS.terminology.jobPlural} scheduled.`} />
            : <div className="grid sm:grid-cols-2 gap-3">
                {upcoming.map((j) => <JobCard key={j.id} job={j} onClick={() => goJob(j)} />)}
              </div>
          }
        </div>

        {/* Activity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold flex items-center gap-2"><Activity className="h-4 w-4 text-accent" /> Recent activity</h2>
          </div>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {recentAudit.map((a) => (
              <div key={a.id} className="px-3.5 py-2.5 hover:bg-secondary/40 transition-colors cursor-default">
                <p className="text-sm text-foreground leading-snug">{a.summary}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{a.actor_name} · {new Date(a.created_date).toLocaleString()}</p>
              </div>
            ))}
            {audit.length === 0 && <p className="p-4 text-sm text-muted-foreground">No activity yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 py-10 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}