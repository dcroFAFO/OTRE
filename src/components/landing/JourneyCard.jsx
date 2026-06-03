import React from "react";
import { CalendarCheck, UserCheck, Search, FileText, Clock, Wrench, PackageCheck, CreditCard, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { CalendarCheck, UserCheck, Search, FileText, Clock, Wrench, PackageCheck, CreditCard };

// Small floating journey card used in the hero parallax composition.
export default function JourneyCard({ item, active = false, className, style }) {
  const Icon = ICONS[item.icon] || Circle;
  return (
    <div
      style={style}
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border bg-card/90 backdrop-blur px-3.5 py-2.5 shadow-lg shadow-primary/5",
        active ? "border-accent/40 ring-1 ring-accent/30" : "border-border",
        className
      )}
    >
      <span className={cn("grid place-items-center h-8 w-8 rounded-xl", active ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground")}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-sm font-semibold text-foreground whitespace-nowrap">{item.label}</span>
    </div>
  );
}