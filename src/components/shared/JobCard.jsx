import React from "react";
import { User, Wrench, CreditCard, Clock, GripVertical, Calendar, AlertTriangle } from "lucide-react";
import StatusPill from "./StatusPill";
import { cn } from "@/lib/utils";
import { getPaymentStatus, getStatus } from "@/config/jobConfig";
import { DEFAULT_WAITING_REASONS } from "@/config/platformConfig";

export default function JobCard({ job, onClick, dragHandleProps, compact = false, className }) {
  const paymentStatus = getPaymentStatus(job.payment_status);
  const outstanding = job.payment_status === "outstanding";
  const isWaiting = job.status?.startsWith("waiting_") || job.status === "on_hold";
  const waitingLabel = DEFAULT_WAITING_REASONS.find((r) => r.key === job.waiting_reason)?.label;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group cursor-pointer rounded-2xl border border-border bg-card p-3 shadow-sm transition-all hover:shadow-gentle hover:border-accent/30 select-none",
        outstanding && "border-l-2 border-l-rose-400",
        isWaiting && "border-l-2 border-l-amber-400",
        className
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-2">
        {dragHandleProps && (
          <span {...dragHandleProps} onClick={(e) => e.stopPropagation()} className="mt-0.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0">
            <GripVertical className="h-4 w-4" />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1.5">
            <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {job.customer_name}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              {outstanding && <CreditCard className="h-3.5 w-3.5 text-rose-500" title="Invoice outstanding" />}
              {isWaiting && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" title={`Waiting: ${waitingLabel}`} />}
            </div>
          </div>

          <p className="mt-0.5 text-xs text-muted-foreground truncate flex items-center gap-1">
            <Wrench className="h-3 w-3 shrink-0" />
            {job.asset_label || job.scooter_label || "—"}
          </p>

          {!compact && job.issue_description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{job.issue_description}</p>
          )}

          <div className="mt-2 flex items-center justify-between gap-1.5 flex-wrap">
            <StatusPill value={job.status} />
            <div className="flex items-center gap-2">
              {job.scheduled_date && !compact && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                  <Calendar className="h-3 w-3" />
                  {job.scheduled_date}
                </span>
              )}
            </div>
          </div>

          {isWaiting && waitingLabel && (
            <p className="mt-1.5 text-[11px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> Waiting: {waitingLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}