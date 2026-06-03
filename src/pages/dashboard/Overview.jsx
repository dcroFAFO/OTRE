import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Clock, Package, PackageCheck, CreditCard, CheckCircle2, Inbox, Activity } from "lucide-react";
import MetricCard from "@/components/dashboard/MetricCard";
import JobCard from "@/components/shared/JobCard";
import { useJobs } from "@/hooks/useJobs";
import { listRecentAudit } from "@/services/auditService";
import { isThisWeek } from "date-fns";

export default function Overview() {
  const navigate = useNavigate();
  const { data: jobs } = useJobs();
  const { data: audit } = useQuery({ queryKey: ["recentAudit"], queryFn: () => listRecentAudit(12), initialData: [] });

  const m = useMemo(() => {
    const active = jobs.filter((j) => ["active", "booked", "technician_assigned", "repair_in_progress"].includes(j.status));
    return {
      active: active.length,
      awaitingCustomer: jobs.filter((j) => j.status === "waiting_customer").length,
      waitingParts: jobs.filter((j) => ["waiting_parts", "waiting_supplier"].includes(j.status)).length,
      readyPickup: jobs.filter((j) => j.ready_for_pickup || j.status === "ready_for_pickup").length,
      outstanding: jobs.filter((j) => j.payment_status === "outstanding").length,
      completedWeek: jobs.filter((j) => j.status === "completed" && j.updated_date && isThisWeek(new Date(j.updated_date))).length,
      requested: jobs.filter((j) => j.status === "requested").length,
    };
  }, [jobs]);

  const upcoming = [...jobs].filter((j) => j.scheduled_date).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)).slice(0, 4);
  const goJob = (j) => navigate(`/dashboard/jobs?id=${j.id}`);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm">Everything happening across your workshop right now.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active jobs" value={m.active} icon={Briefcase} onClick={() => navigate("/dashboard/jobs")} />
        <MetricCard label="Awaiting customer" value={m.awaitingCustomer} icon={Clock} tone="amber" />
        <MetricCard label="Waiting for parts" value={m.waitingParts} icon={Package} tone="amber" />
        <MetricCard label="Ready for pickup" value={m.readyPickup} icon={PackageCheck} tone="emerald" />
        <MetricCard label="Invoice outstanding" value={m.outstanding} icon={CreditCard} tone="rose" />
        <MetricCard label="Completed this week" value={m.completedWeek} icon={CheckCircle2} tone="emerald" />
        <MetricCard label="Bookings requested" value={m.requested} icon={Inbox} tone="accent" />
        <MetricCard label="Total jobs" value={jobs.length} icon={Activity} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-heading font-bold">Upcoming jobs</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No scheduled jobs.</p>}
            {upcoming.map((j) => <JobCard key={j.id} job={j} onClick={() => goJob(j)} />)}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-heading font-bold">Recent activity</h2>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border">
            {audit.slice(0, 8).map((a) => (
              <div key={a.id} className="p-3.5">
                <p className="text-sm text-foreground">{a.summary}</p>
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