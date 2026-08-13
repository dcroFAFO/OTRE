import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarDays, Loader2, CheckCircle2, AlertTriangle, Bike } from "lucide-react";
import { rescheduleJob } from "@/services/jobService";
import { updateJobStatusFromEvent } from "@/services/jobWorkflowService";
import { getCanonicalJobStatus } from "@/config/jobConfig";
import { TIME_WINDOWS, normalizeTimeWindow, timeWindowLabel } from "@/config/timeWindows";
import BookingRequestCard from "../BookingRequestCard";
import { toast } from "sonner";
import { getSafeErrorMessage } from "@/lib/errors";

// Until a job is scheduled, the form starts from what the customer asked for
// so staff can confirm the requested slot with one tap.
function requestedDate(job) {
  return job.scheduled_date || job.booking_submission?.preferredDate || "";
}
function requestedWindow(job) {
  return normalizeTimeWindow(job.preferred_time_window || job.booking_submission?.preferredTimeWindow);
}

// Mobile-first, tap/select based scheduling screen. Reuses the same
// scheduled_date / preferred_time_window fields and reschedule workflow
// as the desktop board — no new scheduling model is introduced.
export default function ScheduleTab({ job, canEdit, onChange }) {
  const [date, setDate] = useState(requestedDate(job));
  const [timeWindow, setTimeWindow] = useState(requestedWindow(job));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nearbyJobs, setNearbyJobs] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState("");
  const [nearbyRetry, setNearbyRetry] = useState(0);

  useEffect(() => {
    setDate(requestedDate(job));
    setTimeWindow(requestedWindow(job));
  }, [job.id]);

  useEffect(() => {
    if (!date) { setNearbyJobs([]); return; }
    let cancelled = false;
    setLoadingNearby(true);
    setNearbyError("");
    base44.entities.Job.filter({ scheduled_date: date }, "-created_date", 50)
      .then((rows) => { if (!cancelled) setNearbyJobs(rows.filter((r) => r.id !== job.id)); })
      .catch((error) => { if (!cancelled) setNearbyError(getSafeErrorMessage(error, "Nearby jobs could not be loaded.")); })
      .finally(() => { if (!cancelled) setLoadingNearby(false); });
    return () => { cancelled = true; };
  }, [date, job.id, nearbyRetry]);

  const sameWindowCount = nearbyJobs.filter((j) => j.preferred_time_window && j.preferred_time_window === timeWindow).length;

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    try {
      if (date !== (job.scheduled_date || "")) {
        await rescheduleJob(job, date);
      }
      // Only write a real selection — never blank out a legacy free-text
      // window just because it doesn't map to one of our keys.
      if (timeWindow && timeWindow !== (job.preferred_time_window || "")) {
        await base44.entities.Job.update(job.id, { preferred_time_window: timeWindow });
      }
      // For requested jobs, saving the schedule confirms the booking and
      // transitions the job to "booked" — this triggers the notification flow
      // and refreshes which tabs are visible.
      if (getCanonicalJobStatus(job.status) === "requested") {
        await updateJobStatusFromEvent({ ...job, scheduled_date: date, preferred_time_window: timeWindow }, "booked");
        toast.success("Job scheduled and confirmed");
      } else {
        toast.success("Schedule saved");
      }
      setSaved(true);
      onChange?.();
    } catch (err) {
      toast.error(getSafeErrorMessage(err, "The schedule could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="space-y-3">
        <BookingRequestCard job={job} />
        <ScheduleSummary date={job.scheduled_date} timeWindow={job.preferred_time_window} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BookingRequestCard job={job} />

      <div className="flex items-center gap-2 text-sm font-semibold">
        <CalendarDays className="h-4 w-4 text-accent" /> Confirm schedule
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="mobile-schedule-date" className="text-xs">Booking date</Label>
          <Input id="mobile-schedule-date" type="date" value={date} onChange={(e) => { setDate(e.target.value); setSaved(false); }} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mobile-schedule-window" className="text-xs">Time window</Label>
          <Select value={timeWindow} onValueChange={(v) => { setTimeWindow(v); setSaved(false); }}>
            <SelectTrigger id="mobile-schedule-window" className="h-11"><SelectValue placeholder="Select a time window" /></SelectTrigger>
            <SelectContent>
              {TIME_WINDOWS.map((w) => <SelectItem key={w.key} value={w.key}>{w.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {date && sameWindowCount > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{sameWindowCount} other job{sameWindowCount > 1 ? "s" : ""} already booked in this time window on this day.</p>
        </div>
      )}

      <Button type="button" size="touch" className="w-full gap-2" disabled={saving || !date} onClick={save}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : null}
        {saving ? "Saving..." : saved ? "Saved" : "Save schedule"}
      </Button>

      <div className="space-y-2 pt-2">
        <p className="text-xs text-muted-foreground">
          {date ? `Other jobs on ${date}` : "Select a date to see other scheduled jobs"}
        </p>
        {nearbyError ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert"><span>{nearbyError}</span><Button type="button" variant="outline" size="touch" className="text-xs" onClick={() => setNearbyRetry((value) => value + 1)}>Try again</Button></div> : null}
        {nearbyError && nearbyJobs.length === 0 ? null : loadingNearby ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : date && nearbyJobs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
            No other jobs scheduled for this date.
          </p>
        ) : (
          <div className="space-y-2">
            {nearbyJobs.map((j) => (
              <div key={j.id} className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{j.customer_name}</span>
                  {j.preferred_time_window && (
                    <span className="shrink-0 text-[11px] text-muted-foreground capitalize">
                      {timeWindowLabel(j.preferred_time_window)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground truncate">
                  <Bike className="h-3 w-3 shrink-0" /> {j.asset_label || "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleSummary({ date, timeWindow }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm space-y-1">
      <p><span className="text-muted-foreground">Date:</span> {date || "Not scheduled"}</p>
      <p><span className="text-muted-foreground">Time window:</span> {timeWindowLabel(timeWindow) || "Not set"}</p>
    </div>
  );
}
