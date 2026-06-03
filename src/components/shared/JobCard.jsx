import React from "react";
import { motion } from "framer-motion";
import { User, Bike, Wrench, CreditCard, GripVertical } from "lucide-react";
import StatusPill from "./StatusPill";
import { cn } from "@/lib/utils";

// Reusable job card used in calendar board, timeline and lists.
export default function JobCard({ job, onClick, dragHandleProps, compact = false, className }) {
  const outstanding = job.payment_status === "outstanding";
  return (
    <motion.div
      layout
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md hover:border-primary/30",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {dragHandleProps && (
            <span {...dragHandleProps} className="hidden sm:block text-muted-foreground/40 group-hover:text-muted-foreground">
              <GripVertical className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground truncate">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {job.customer_name}
            </p>
          </div>
        </div>
        {outstanding && (
          <span title="Invoice outstanding" className="shrink-0 text-rose-500">
            <CreditCard className="h-4 w-4" />
          </span>
        )}
      </div>

      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
        <Bike className="h-3.5 w-3.5 shrink-0" />
        {job.scooter_label || "—"}
      </p>
      {!compact && (
        <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground line-clamp-2">
          <Wrench className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {job.issue_description || "No description"}
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <StatusPill value={job.status} />
        {job.assigned_technician_name && (
          <span className="text-[11px] font-medium text-muted-foreground truncate">
            {job.assigned_technician_name}
          </span>
        )}
      </div>
    </motion.div>
  );
}