import React from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export default function FinancialChartCard({ title, subtitle, value, icon: Icon, children, tone = "default" }) {
  const toneClass = tone === "rose"
    ? "bg-rose-50 text-rose-600"
    : tone === "emerald"
      ? "bg-emerald-50 text-emerald-600"
      : "bg-primary/10 text-primary";

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-1 font-heading text-2xl font-extrabold text-foreground">{value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", toneClass)}>
          {React.createElement(Icon, { className: "h-4.5 w-4.5" })}
        </span>
      </div>
      <div className="mt-5 h-56">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}