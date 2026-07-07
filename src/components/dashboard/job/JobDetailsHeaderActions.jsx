import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  RotateCcw, CalendarDays, Loader2, AlertCircle, X, Copy
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
const LEGACY_STATUS_MAP = {
  quote_required: "requested",
  quote_sent: "booked",
  pending_confirmation: "on_hold",
  quote_approved: "booked",
  active: "repair_in_progress",
  technician_assigned: "booked",
  waiting_parts: "waiting_on_parts",
  waiting_supplier: "on_hold",
  waiting_customer: "on_hold",
  invoice_outstanding: "invoice_sent",
  in_progress: "repair_in_progress",
};

const normalizeStatus = (status) => LEGACY_STATUS_MAP[status] || status;

const WORKFLOW_EVENTS = [
  { key: "booked", label: "Book job", variant: "default", applicableStatuses: ["requested", "on_hold"] },
  { key: "repair_in_progress", label: "Start repair", variant: "default", applicableStatuses: ["requested", "booked", "on_hold", "waiting_on_parts"] },
  { key: "waiting_on_parts", label: "Waiting on parts", variant: "amber", applicableStatuses: ["booked", "repair_in_progress", "ready_for_pickup", "on_hold"] },
  { key: "ready_for_pickup", label: "Ready for pickup", variant: "emerald", applicableStatuses: ["booked", "repair_in_progress", "waiting_on_parts", "on_hold"] },
  { key: "invoice_sent", label: "Invoice sent", variant: "default", applicableStatuses: ["repair_in_progress", "waiting_on_parts", "ready_for_pickup", "paid"] },
  { key: "paid", label: "Record payment", variant: "emerald", applicableStatuses: ["ready_for_pickup", "invoice_sent"] },
  { key: "completed", label: "Complete job", variant: "emerald", applicableStatuses: ["paid", "ready_for_pickup", "invoice_sent"] },
  { key: "on_hold", label: "Put on hold", variant: "rose", applicableStatuses: ["requested", "booked", "repair_in_progress", "waiting_on_parts", "ready_for_pickup", "invoice_sent"] },
  { key: "cancelled", label: "Cancel job", variant: "rose", applicableStatuses: null },
];

const TERMINAL = ["completed", "cancelled"];

export default function JobDetailsHeaderActions({ job, actor, onChange }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  // Waiting-reason modal state
  const [waitingPrompt, setWaitingPrompt] = useState(false);
  const [waitingReason, setWaitingReason] = useState("");
  const [copiedManageLink, setCopiedManageLink] = useState(false);

  const currentStatus = normalizeStatus(job.status);
  const isTerminal = TERMINAL.includes(currentStatus);

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
    if (ev.key === "ready_for_pickup" && !job.invoice_id && (!job.payment_status || job.payment_status === "unpaid")) {
      const proceed = confirm("No invoice exists yet. You can still mark this job ready for pickup, but create the invoice from Billing before charging the customer.");
      if (!proceed) return;
    }
    runEvent(ev.key);
  };

  const confirmWaitingReason = () => {
    setWaitingPrompt(false);
    runEvent("waiting_on_parts", { waitingReason });
    setWaitingReason("");
  };

  const copyManageLink = async () => {
    setBusy("manage_link");
    setError(null);
    try {
      const email = job.customer_email || "";
      const managePath = `/register?email=${encodeURIComponent(email)}&next=${encodeURIComponent("/portal")}`;
      await navigator.clipboard.writeText(`${window.location.origin}${managePath}`);
      setCopiedManageLink(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const visibleEvents = WORKFLOW_EVENTS.filter((ev) => {
    if (isTerminal) return false;
    if (ev.applicableStatuses === null) return true;
    return ev.applicableStatuses.includes(currentStatus);
  });

  return (
    <>
      <div className="bg-card border-b border-border px-4 sm:px-5 py-3 flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Reschedule */}
        <ReschedulePicker
          job={job}
          busy={busy === "date"}
          onReschedule={runUtil("date", (v) => rescheduleJob(job, v))}
        />

        <button
          onClick={copyManageLink}
          disabled={busy === "manage_link"}
          className="flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 min-h-11 sm:min-h-0 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          title="Copy the customer portal account link"
        >
          {busy === "manage_link" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
          {copiedManageLink ? "Copied manage link" : "Copy manage link"}
        </button>

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
              <h3 className="font-heading font-semibold text-base">Mark waiting on parts</h3>
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
              <Button size="sm" disabled={!waitingReason || busy === "waiting_on_parts"} onClick={confirmWaitingReason}>
                {busy === "waiting_on_parts" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm"}
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
        "flex items-center gap-1.5 px-3 py-2.5 sm:py-1.5 min-h-11 sm:min-h-0 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50",
        styles[variant]
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {label}
    </button>
  );
}