import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TONES = {
  default: { icon: "text-primary bg-primary/10", ring: "hover:ring-primary/20" },
  accent:  { icon: "text-accent bg-accent/10",   ring: "hover:ring-accent/20" },
  rose:    { icon: "text-rose-600 bg-rose-50",    ring: "hover:ring-rose-200" },
  emerald: { icon: "text-emerald-600 bg-emerald-50", ring: "hover:ring-emerald-200" },
  amber:   { icon: "text-amber-600 bg-amber-50",  ring: "hover:ring-amber-200" },
};

export default function MetricCard({ label, value, icon: Icon, tone = "default", onClick }) {
  const t = TONES[tone] || TONES.default;
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "text-left rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:ring-2",
        t.ring,
        onClick ? "cursor-pointer" : "cursor-default"
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("grid h-9 w-9 place-items-center rounded-xl shrink-0", t.icon)}>
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-extrabold font-heading text-foreground tabular-nums">{value ?? "—"}</p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{label}</p>
    </motion.button>
  );
}