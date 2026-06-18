import React, { useMemo } from "react";
import { CheckCircle2, Layers, Bike } from "lucide-react";
import { isThisMonth } from "date-fns";
import { cn } from "@/lib/utils";

const prettify = (s) =>
  String(s || "")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

function rank(items, keyFn, limit = 5) {
  const counts = {};
  items.forEach((it) => {
    const key = keyFn(it);
    if (!key) return;
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export default function MonthlySummary({ jobs = [] }) {
  const completedThisMonth = useMemo(
    () => jobs.filter((j) => j.status === "completed" && j.updated_date && isThisMonth(new Date(j.updated_date))),
    [jobs]
  );

  const topCategories = useMemo(
    () => rank(completedThisMonth, (j) => prettify(j.service_category_key || j.job_type)),
    [completedThisMonth]
  );

  // Most-serviced models: derived from the asset label across all (non-archived) jobs this month.
  const monthJobs = useMemo(
    () => jobs.filter((j) => j.updated_date && isThisMonth(new Date(j.updated_date))),
    [jobs]
  );
  const topModels = useMemo(
    () => rank(monthJobs, (j) => (j.asset_label || j.scooter_label || "").trim()),
    [monthJobs]
  );

  const maxCat = topCategories[0]?.count || 1;
  const maxModel = topModels[0]?.count || 1;

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Completed this month */}
      <div className="rounded-3xl border border-border bg-card p-5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Repairs completed</p>
          <span className="grid place-items-center h-8 w-8 rounded-xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-4">
          <p className="font-heading text-4xl font-extrabold text-foreground">{completedThisMonth.length}</p>
          <p className="text-sm text-muted-foreground mt-1">this month</p>
        </div>
      </div>

      {/* Top service categories */}
      <RankList
        title="Top service categories"
        icon={Layers}
        items={topCategories}
        max={maxCat}
        barClass="bg-accent"
        emptyText="No completed repairs yet this month."
      />

      {/* Most-serviced models */}
      <RankList
        title="Most-serviced models"
        icon={Bike}
        items={topModels}
        max={maxModel}
        barClass="bg-primary"
        emptyText="No jobs logged this month."
      />
    </div>
  );
}

function RankList({ title, icon: Icon, items, max, barClass, emptyText }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="grid place-items-center h-8 w-8 rounded-xl bg-secondary text-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3">{emptyText}</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((it) => (
            <div key={it.label}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-foreground truncate pr-2">{it.label}</span>
                <span className="text-muted-foreground shrink-0">{it.count}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn("h-full rounded-full", barClass)}
                  style={{ width: `${Math.round((it.count / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}