import React from "react";
import { User, Wrench, CreditCard, Clock, GripVertical, Calendar, AlertTriangle } from "lucide-react";
import StatusPill from "./StatusPill";
import ServiceTypeBadge from "./ServiceTypeBadge";
import { cn } from "@/lib/utils";
import { DEFAULT_SERVICE_TYPE, getServiceType, SERVICE_TYPE_BORDER_CLASSES, SERVICE_TYPE_STRIP_CLASSES } from "@/config/serviceTypes";
import { DEFAULT_WAITING_REASONS } from "@/config/platformConfig";

export default function JobCard({ job, onClick, dragHandleProps, compact = false, className }) {
  const serviceType = getServiceType(job.service_type || DEFAULT_SERVICE_TYPE);
  const outstanding = job.payment_status === "outstanding";
  const isWaiting = job.status?.startsWith("waiting_") || job.status === "on_hold";
  const waitingLabel = DEFAULT_WAITING_REASONS.find((r) => r.key === job.waiting_reason)?.label;
  const ownershipLabel = job.customer_user_id || job.customer_account_id ? "Claimed" : job.customer_profile_id ? "Guest" : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-2xl border border-l-4 border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-gentle select-none",
        SERVICE_TYPE_BORDER_CLASSES[serviceType.key],
        className
      )}
    >
      <span className={cn("absolute left-4 right-4 top-0 h-1 rounded-b-full", SERVICE_TYPE_STRIP_CLASSES[serviceType.key])} />
      {/* Header row */}
      <div className="flex items-start gap-2 pt-0.5">
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
            <div className="flex items-center gap-1.5 flex-wrap">
              <ServiceTypeBadge value={serviceType.key} />
              <StatusPill value={job.status} />
              {ownershipLabel && <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{ownershipLabel}</span>}
            </div>
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
