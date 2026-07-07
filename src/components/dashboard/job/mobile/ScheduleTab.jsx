import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarDays, Loader2, CheckCircle2, AlertTriangle, Bike } from "lucide-react";
import { rescheduleJob } from "@/services/jobService";
import { toast } from "sonner";

const TIME_WINDOWS = [
  { key: "morning", label: "Morning (8am - 12pm)" },
  { key: "afternoon", label: "Afternoon (12pm - 4pm)" },
  { key: "evening", label: "Evening (4pm - 6pm)" },
  { key: "asap", label: "ASAP / any time" },
];

// Mobile-first, tap/select based scheduling screen. Reuses the same
// scheduled_date / preferred_time_window fields and reschedule workflow
// as the desktop board — no new scheduling model is introduced.
export default function ScheduleTab({ job, canEdit, onChange }) {
  const [date, setDate] = useState(job.scheduled_date || "");
  const [timeWindow, setTimeWindow] = useState(job.preferred_time_window || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nearbyJobs, setNearbyJobs] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);

  useEffect(() => {
    setDate(job.scheduled_date || "");
    setTimeWindow(job.preferred_time_window || "");
  }, [job.id]);

  useEffect(() => {
    if (!date) { setNearbyJobs([]); return; }
    let cancelled = false;
    setLoadingNearby(true);
    base44.entities.Job.filter({ scheduled_date: date }, "-created_date", 50)
      .then((rows) => { if (!cancelled) setNearbyJobs(rows.filter((r) => r.id !== job.id)); })
      .finally(() => { if (!cancelled) setLoadingNearby(false); });
    return () => { cancelled = true; };
  }, [date, job.id]);

  const sameWindowCount = nearbyJobs.filter((j) => j.preferred_time_window && j.preferred_time_window === timeWindow).length;

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      if (date !== (job.scheduled_date || "")) {
        await rescheduleJob(job, date);
      }
      if (timeWindow !== (job.preferred_time_window || "")) {
        await base44.entities.Job.update(job.id, { preferred_time_window: timeWindow });
      }
      toast.success("Schedule saved");
      setSaved(true);
      onChange?.();
    } catch (err) {
      toast.error(err.message || "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="space-y-3">
        <ScheduleSummary date={job.scheduled_date} timeWindow={job.preferred_time_window} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <CalendarDays className="h-4 w-4 text-accent" /> Scheduling
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Booking date</Label>
          <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setSaved(false); }} className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Time window</Label>
          <Select value={timeWindow} onValueChange={(v) => { setTimeWindow(v); setSaved(false); }}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Select a time window" /></SelectTrigger>
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

      <Button className="w-full gap-2 min-h-11" disabled={saving || !date} onClick={save}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : null}
        {saving ? "Saving..." : saved ? "Saved" : "Save schedule"}
      </Button>

      <div className="space-y-2 pt-2">
        <Label className="text-xs text-muted-foreground">
          {date ? `Other jobs on ${date}` : "Select a date to see other scheduled jobs"}
        </Label>
        {loadingNearby ? (
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
                      {TIME_WINDOWS.find((w) => w.key === j.preferred_time_window)?.label || j.preferred_time_window}
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
      <p><span className="text-muted-foreground">Time window:</span> {TIME_WINDOWS.find((w) => w.key === timeWindow)?.label || "Not set"}</p>
    </div>
  );
}