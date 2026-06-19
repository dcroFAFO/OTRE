import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  RotateCcw, CalendarDays, Loader2, AlertCircle, X
} from "lucide-react";
import { rescheduleJob } from "@/services/jobService";
import { updateJobStatusFromEvent } from "@/services/jobWorkflowService";

import { DEFAULT_WAITING_REASONS } from "@/config/platformConfig";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ---------------------------------------------------------------------------
// Workflow events — rendered as buttons in the action strip.
// applicableStatuses: which current statuses show this button.
//                     null = all non-terminal statuses.
// ---------------------------------------------------------------------------
const WORKFLOW_EVENTS = [
  {
    key: "quote_sent",
    label: "Quote sent",
    variant: "default",
    applicableStatuses: ["requested", "quote_required", "pending_confirmation", "active", "booked"],
  },
  {
    key: "quote_approved",
    label: "Customer approved quote",
    variant: "default",
    applicableStatuses: ["quote_sent", "pending_confirmation"],
  },
  {
    key: "repair_in_progress",
    label: "Start repair",
    variant: "default",
    applicableStatuses: ["quote_approved", "active", "booked", "waiting_parts", "waiting_supplier", "waiting_customer", "on_hold"],
  },
  {
    key: "waiting_parts",
    label: "Mark waiting for parts",
    variant: "amber",
    applicableStatuses: ["quote_approved", "active", "booked", "repair_in_progress"],
    requiresReason: true,
  },
  {
    key: "ready_for_pickup",
    label: "Ready for pickup",
    variant: "emerald",
    applicableStatuses: ["quote_approved", "active", "repair_in_progress", "waiting_parts", "waiting_supplier", "waiting_customer"],
  },
  {
    key: "invoice_outstanding",
    label: "Send invoice",
    variant: "default",
    applicableStatuses: ["ready_for_pickup"],
  },
  {
    key: "paid",
    label: "Record payment",
    variant: "emerald",
    applicableStatuses: ["ready_for_pickup", "invoice_outstanding"],
  },
  {
    key: "completed",
    label: "Complete job",
    variant: "emerald",
    applicableStatuses: ["paid", "ready_for_pickup", "invoice_outstanding"],
  },
  {
    key: "on_hold",
    label: "Put on hold",
    variant: "rose",
    applicableStatuses: ["requested", "quote_sent", "quote_approved", "active", "booked", "repair_in_progress", "waiting_parts"],
  },
  {
    key: "cancelled",
    label: "Cancel job",
    variant: "rose",
    applicableStatuses: null,
  },
];

const TERMINAL = ["completed", "cancelled"];

export default function JobDetailsHeaderActions({ job, actor, onChange }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  // Waiting-reason modal state
  const [waitingPrompt, setWaitingPrompt] = useState(false);
  const [waitingReason, setWaitingReason] = useState("");

  const isTerminal = TERMINAL.includes(job.status);

  // Run a workflow event, optionally with a payload
  const runEvent = async (eventKey, payload = {}) => {
    setBusy(eventKey);
    setError(null);
    try {
      await updateJobStatusFromEvent(job, eventKey, payload);
      onChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const runUtil = (key, fn) => async (...args) => {
    setBusy(key);
    setError(null);
    try {
      await fn(...args);
      onChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const handleEventClick = (ev) => {
    if (ev.requiresReason) {
      setWaitingPrompt(true);
      return;
    }
    runEvent(ev.key);
  };

  const confirmWaitingReason = () => {
    setWaitingPrompt(false);
    runEvent("waiting_parts", { waitingReason });
    setWaitingReason("");
  };

  const visibleEvents = WORKFLOW_EVENTS.filter((ev) => {
    if (isTerminal) return false;
    if (ev.applicableStatuses === null) return true;
    return ev.applicableStatuses.includes(job.status);
  });

  return (
    <>
      <div className="bg-card border-b border-border px-5 py-3 flex flex-wrap items-center gap-3 shrink-0">
        {/* Reschedule */}
        <ReschedulePicker
          job={job}
          busy={busy === "date"}
          onReschedule={runUtil("date", (v) => rescheduleJob(job, v))}
        />

        <div className="flex-1" />

        {/* Workflow event buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {visibleEvents.map((ev) => (
            <WorkflowButton
              key={ev.key}
              label={ev.label}
              busy={busy === ev.key}
              variant={ev.variant}
              onClick={() => handleEventClick(ev)}
            />
          ))}

          {isTerminal && (
            <WorkflowButton
              label="Reopen job"
              icon={RotateCcw}
              busy={busy === "reopen"}
              onClick={() => runEvent("reopen")}
            />
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 bg-destructive/10 border-b border-destructive/20 px-5 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 hover:opacity-70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Waiting reason prompt */}
      <Dialog open={waitingPrompt} onOpenChange={(o) => !o && setWaitingPrompt(false)}>
        <DialogContent className="max-w-sm">
          <div className="space-y-4 p-1">
            <div>
              <h3 className="font-heading font-semibold text-base">Mark waiting for parts</h3>
              <p className="text-sm text-muted-foreground mt-1">Select what the job is waiting on to proceed.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Waiting reason</Label>
              <Select value={waitingReason} onValueChange={setWaitingReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason…" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_WAITING_REASONS.map((r) => (
                    <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setWaitingPrompt(false)}>Cancel</Button>
              <Button size="sm" disabled={!waitingReason || busy === "waiting_parts"} onClick={confirmWaitingReason}>
                {busy === "waiting_parts" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------


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

function WorkflowButton({ label, icon: Icon, onClick, busy, variant = "default" }) {
  const styles = {
    default: "border-border text-foreground hover:bg-secondary",
    emerald: "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950",
    amber:   "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950",
    rose:    "border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-950",
    muted:   "border-border text-muted-foreground hover:bg-secondary",
  };
  return (
    <button
      onClick={onClick}
      disabled={busy}
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