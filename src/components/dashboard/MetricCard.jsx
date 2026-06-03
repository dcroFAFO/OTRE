import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function MetricCard({ label, value, icon: Icon, tone = "default", onClick }) {
  const tones = {
    default: "text-primary bg-secondary",
    accent: "text-accent bg-accent/10",
    rose: "text-rose-600 bg-rose-50",
    emerald: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
  };
  return (
    <motion.button
      whileHover={{ y: -3 }}
      onClick={onClick}
      className={cn("text-left rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md", onClick && "cursor-pointer")}
    >
      <div className="flex items-center justify-between">
        <span className={cn("grid h-10 w-10 place-items-center rounded-xl", tones[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-extrabold font-heading text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </motion.button>
  );
}