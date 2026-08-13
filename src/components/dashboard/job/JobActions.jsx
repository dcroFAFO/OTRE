import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PackageCheck, XCircle, RotateCcw,
  Calendar, CheckCircle2, Loader2
} from "lucide-react";
import { getCanonicalJobStatus, JOB_STATUSES } from "@/config/jobConfig";
import { CANCELLED_STATUS_KEY, COMPLETE_STATUS_KEY, DEFAULT_APP_SETTINGS, DEFAULT_WAITING_REASONS } from "@/config/platformConfig";
import { changeStatus, assignTechnician, rescheduleJob, markReadyForPickup, cancelJob, reopenJob } from "@/services/jobService";
import { useStaff } from "@/hooks/useJobs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getSafeErrorMessage } from "@/lib/errors";

export default function JobActions({ job, actor, onChange }) {
  const { data: staff = [], isLoading: staffLoading } = useStaff();
  const [busy, setBusy] = useState(null);

  const run = (key, fn) => async (...a) => {
    if (busy) return;
    setBusy(key);
    try {
      await fn(...a);
      onChange?.();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "The job could not be updated."));
    } finally {
      setBusy(null);
    }
  };

  const canonicalStatus = getCanonicalJobStatus(job.status);
  const isTerminal = [CANCELLED_STATUS_KEY, COMPLETE_STATUS_KEY].includes(canonicalStatus);

  const checklist = job.checklist || [];
  const pendingChecks = checklist.filter((c) => !c.done).length;
  const checklistBlocked = pendingChecks > 0;

  return (
    <div className="space-y-6">

      {/* Status + Assign row */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="job-action-status" className="text-xs font-semibold uppercase text-muted-foreground">Status</Label>
          <Select value={canonicalStatus} onValueChange={run("status", (v) => changeStatus(job, v, actor))} disabled={Boolean(busy)}>
            <SelectTrigger id="job-action-status" className="h-11">
              {busy === "status" ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue />}
            </SelectTrigger>
            <SelectContent>
              {JOB_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="job-action-technician" className="text-xs font-semibold uppercase text-muted-foreground">
            {DEFAULT_APP_SETTINGS.terminology.staffAssignmentLabel}
          </Label>
          <Select
            value={job.assigned_technician_id || "none"}
            onValueChange={run("tech", (v) => assignTechnician(job, v === "none" ? null : staff.find((s) => s.id === v), actor))}
            disabled={Boolean(busy) || staffLoading}
          >
            <SelectTrigger id="job-action-technician" className="h-11">
              {busy === "tech" ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue placeholder="Unassigned" />}
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
        </div>
      </div>

      {/* Reschedule */}
      <div className="space-y-1.5">
        <Label htmlFor="job-action-date" className="text-xs font-semibold uppercase text-muted-foreground">
          <Calendar className="inline h-3.5 w-3.5 mr-1 align-text-bottom" />
          Scheduled date
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="job-action-date"
            type="date"
            defaultValue={job.scheduled_date || ""}
            onChange={run("date", (e) => rescheduleJob(job, e.target.value, actor))}
            className="h-11 max-w-[180px]"
            disabled={Boolean(busy)}
          />
          {busy === "date" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {/* Waiting reason */}
      <div className="space-y-1.5">
        <Label htmlFor="job-action-waiting" className="text-xs font-semibold uppercase text-muted-foreground">Waiting reason (optional)</Label>
        <Select
          value={job.waiting_reason || "none"}
          onValueChange={run("waiting", async (v) => {
            const newStatus = v === "none" ? "repair_in_progress" :
              v === "parts" ? "waiting_on_parts" :
              "on_hold";
            await changeStatus({ ...job, status: v === "none" ? "repair_in_progress" : job.status }, newStatus, actor);
          })}
          disabled={Boolean(busy)}
        >
          <SelectTrigger id="job-action-waiting" className="h-11 max-w-[220px]">
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not waiting</SelectItem>
            {DEFAULT_WAITING_REASONS.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Quick action buttons */}
      <div className="border-t border-border pt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Quick actions</p>
        <div className="flex flex-wrap gap-2">
          {!isTerminal && (
            <>
              <ActionButton
                label={DEFAULT_APP_SETTINGS.terminology.readyStateLabel}
                icon={PackageCheck}
                onClick={run("pickup", () => markReadyForPickup(job, actor))}
                busy={busy === "pickup"}
                disabled={Boolean(busy)}
                variant="emerald"
              />
              <ActionButton
                label={checklistBlocked ? `Complete job (${pendingChecks} check${pendingChecks !== 1 ? "s" : ""} left)` : "Complete job"}
                icon={CheckCircle2}
                onClick={run("complete", () => changeStatus(job, COMPLETE_STATUS_KEY, actor))}
                busy={busy === "complete"}
                disabled={Boolean(busy) || checklistBlocked}
                variant="emerald"
              />
              <ActionButton
                label="Cancel job"
                icon={XCircle}
                onClick={run("cancel", () => cancelJob(job, actor))}
                busy={busy === "cancel"}
                disabled={Boolean(busy)}
                variant="rose"
              />
            </>
          )}
          {isTerminal && (
            <ActionButton
              label="Reopen job"
              icon={RotateCcw}
              onClick={run("reopen", () => reopenJob(job, actor))}
              busy={busy === "reopen"}
              disabled={Boolean(busy)}
            />
          )}

        </div>
      </div>
    </div>
  );
}

function ActionButton({ label, icon: Icon, onClick, busy, disabled, variant = "default" }) {
  const styles = {
    default: "border-border text-foreground hover:bg-secondary",
    emerald: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
    rose: "border-rose-200 text-rose-600 hover:bg-rose-50",
    muted: "border-border text-muted-foreground hover:bg-secondary",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={cn(
        "flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors disabled:opacity-50",
        styles[variant]
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
