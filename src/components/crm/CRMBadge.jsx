import React from "react";
import { cn } from "@/lib/utils";

const TONES = {
  slate: "bg-slate-100 text-slate-700",
  violet: "bg-violet-100 text-violet-700",
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
  rose: "bg-rose-100 text-rose-700",
  accent: "bg-accent/15 text-accent",
};

// Generic CRM pill driven by a config map ({key,label,color}).
export default function CRMBadge({ value, map, fallbackLabel, className }) {
  if (!value) return null;
  const cfg = map?.[value] || {};
  const tone = TONES[cfg.color] || TONES.slate;
  const label = cfg.label || fallbackLabel || String(value).replace(/_/g, " ");
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize", tone, className)}>
      {label}
    </span>
  );
}