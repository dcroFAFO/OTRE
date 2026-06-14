import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PackageCheck, XCircle, RotateCcw, Archive, CheckCircle2,
  Clock, CalendarDays, Loader2, UserCircle2, ChevronDown
} from "lucide-react";
import StatusPill from "@/components/shared/StatusPill";
import {
  markReadyForPickup, cancelJob, reopenJob, archiveJob,
  changeStatus, assignTechnician, rescheduleJob
} from "@/services/jobService";
import { useStaff } from "@/hooks/useJobs";
import { CANCELLED_STATUS_KEY, COMPLETE_STATUS_KEY, DEFAULT_APP_SETTINGS, DEFAULT_WAITING_REASONS } from "@/config/platformConfig";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ---------------------------------------------------------------------------
// Explicit workflow events — the only way to change status
// ---------------------------------------------------------------------------
const WORKFLOW_EVENTS = [
  { key: "quote_sent",        label: "Quote sent",              applicableStatuses: ["requested", "quote_required", "pending_confirmation"] },
  { key: "quote_approved",    label: "Customer approved quote", applicableStatuses: ["quote_sent", "pending_confirmation"] },
  { key: "waiting_parts",     label: "Mark waiting for parts",  applicableStatuses: ["quote_approved", "active", "booked", "technician_assigned", "repair_in_progress"] },
  { key: "repair_in_progress",label: "Mark repair in progress", applicableStatuses: ["quote_approved", "active", "booked", "technician_assigned", "waiting_parts", "waiting_supplier", "waiting_customer"] },
  { key: "ready_for_pickup",  label: "Mark ready for pickup",   applicableStatuses: ["quote_approved", "active", "repair_in_progress", "waiting_parts", "waiting_supplier", "waiting_customer", "technician_assigned"] },
  { key: "invoice_sent",      label: "Invoice sent",            applicableStatuses: ["ready_for_pickup"] },
  { key: "paid",              label: "Payment received",        applicableStatuses: ["ready_for_pickup", "invoice_outstanding", "invoice_sent"] },
  { key: "completed",         label: "Mark completed",          applicableStatuses: ["paid", "ready_for_pickup", "invoice_outstanding"] },
  { key: "on_hold",           label: "Put on hold",             applicableStatuses: ["requested", "quote_sent", "quote_approved", "active", "booked", "technician_assigned", "repair_in_progress", "waiting_parts"] },
  { key: "cancelled",         label: "Cancel job",              applicableStatuses: null }, // null = always available unless terminal
];

const TERMINAL = [CANCELLED_STATUS_KEY, COMPLETE_STATUS_KEY];

export default function JobDetailsHeaderActions({ job, actor, onChange }) {
  const { data: staff = [] } = useStaff();
  const [busy, setBusy] = useState(null);

  const run = (key, fn) => async (...args) => {
    setBusy(key);
    await fn(...args);
    setBusy(null);
    onChange?.();
  };

  const isTerminal = TERMINAL.includes(job.status);

  const applicableEvents = WORKFLOW_EVENTS.filter((ev) => {
    if (isTerminal && ev.key !== "completed") return false; // terminal: only reopen/archive shown separately
    if (ev.applicableStatuses === null) return !isTerminal;
    return ev.applicableStatuses.includes(job.status);
  });

  const checklist = job.checklist || [];
  const pendingChecks = checklist.filter((c) => !c.done).length;

  return (
    <div className="bg-card border-b border-border px-5 py-3 flex flex-wrap items-center gap-3 shrink-0">
      {/* Status badge (read-only) */}
      <StatusPill value={job.status} />

      {/* Scheduled date (read-only display) */}
      {job.scheduled_date && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {format(new Date(job.scheduled_date + "T12:00:00"), "EEE d MMM yyyy")}
          {job.preferred_time_window && ` · ${job.preferred_time_window}`}
        </span>
      )}

      {/* Assigned technician (read-only display + quick-assign) */}
      <TechAssignButton
        job={job}
        staff={staff}
        busy={busy === "tech"}
        onAssign={run("tech", (v) =>
          assignTechnician(job, v === "none" ? null : staff.find((s) => s.id === v))
        )}
      />

      {/* Reschedule date (compact inline) */}
      <ReschedulePicker
        job={job}
        busy={busy === "date"}
        onReschedule={run("date", (v) => rescheduleJob(job, v))}
      />

      {/* Workflow event buttons */}
      <div className="flex-1" />
      <div className="flex flex-wrap items-center gap-2">
        {!isTerminal && applicableEvents.map((ev) => (
          <WorkflowButton
            key={ev.key}
            label={ev.label}
            busy={busy === ev.key}
            disabled={ev.key === "completed" && pendingChecks > 0}
            variant={
              ev.key === "cancelled" || ev.key === "on_hold" ? "rose"
              : ev.key === "completed" || ev.key === "paid" || ev.key === "ready_for_pickup" ? "emerald"
              : "default"
            }
            onClick={run(ev.key, () => changeStatus(job, ev.key, actor))}
          />
        ))}

        {isTerminal && (
          <WorkflowButton
            label="Reopen job"
            icon={RotateCcw}
            busy={busy === "reopen"}
            onClick={run("reopen", () => reopenJob(job, actor))}
          />
        )}

        <WorkflowButton
          label="Archive"
          icon={Archive}
          busy={busy === "archive"}
          variant="muted"
          onClick={run("archive", () => archiveJob(job, actor))}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TechAssignButton({ job, staff, busy, onAssign }) {
  return (
    <Select value={job.assigned_technician_id || "none"} onValueChange={onAssign} disabled={busy}>
      <SelectTrigger className="h-7 text-xs gap-1 px-2 border-dashed w-auto min-w-[130px] bg-transparent">
        {busy
          ? <Loader2 className="h-3 w-3 animate-spin" />
          : <UserCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
        }
        <SelectValue placeholder={DEFAULT_APP_SETTINGS.terminology.staffAssignmentLabel || "Assign tech"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Unassigned</SelectItem>
        {staff.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.short_name || s.full_name}
            {s.role_label && <span className="text-muted-foreground ml-1.5 text-xs">· {s.role_label}</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ReschedulePicker({ job, busy, onReschedule }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer group">
      <CalendarDays className="h-3.5 w-3.5 group-hover:text-accent transition-colors" />
      <span className="sr-only">Reschedule</span>
      <input
        type="date"
        defaultValue={job.scheduled_date || ""}
        onChange={(e) => onReschedule(e.target.value)}
        className="bg-transparent border-none outline-none text-xs text-muted-foreground cursor-pointer w-[100px] hover:text-foreground transition-colors"
        title="Reschedule job"
      />
      {busy && <Loader2 className="h-3 w-3 animate-spin" />}
    </label>
  );
}

function WorkflowButton({ label, icon: Icon, onClick, busy, disabled, variant = "default" }) {
  const styles = {
    default:  "border-border text-foreground hover:bg-secondary",
    emerald:  "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950",
    rose:     "border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-950",
    muted:    "border-border text-muted-foreground hover:bg-secondary",
  };
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50",
        styles[variant]
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {label}
    </button>
  );
}