import React from "react";
import { Users, CheckCircle2, Clock, UserPlus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  default: "text-foreground",
  emerald: "text-emerald-600",
  amber: "text-amber-600",
  accent: "text-accent",
  rose: "text-rose-600",
};

export default function ClientSummaryCards({ clients }) {
  const cards = [
    { label: "Total", value: clients.length, icon: Users, tone: "default" },
    { label: "Active", value: clients.filter((c) => c.status === "active").length, icon: CheckCircle2, tone: "emerald" },
    { label: "Pending", value: clients.filter((c) => c.status === "pending").length, icon: Clock, tone: "amber" },
    { label: "Onboarding", value: clients.filter((c) => c.status === "onboarding").length, icon: UserPlus, tone: "accent" },
    { label: "Needs Follow Up", value: clients.filter((c) => c.status === "needs_follow_up").length, icon: AlertTriangle, tone: "amber" },
    { label: "Suspended", value: clients.filter((c) => c.status === "suspended").length, icon: AlertTriangle, tone: "rose" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
            <c.icon className={cn("h-4 w-4", TONES[c.tone])} />
          </div>
          <p className={cn("mt-1.5 font-heading text-2xl font-extrabold", TONES[c.tone])}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}