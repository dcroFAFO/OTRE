import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackageCheck, XCircle, RotateCcw, Archive } from "lucide-react";
import { JOB_STATUSES } from "@/config/jobConfig";
import { CANCELLED_STATUS_KEY, COMPLETE_STATUS_KEY, DEFAULT_APP_SETTINGS } from "@/config/platformConfig";
import { changeStatus, assignTechnician, rescheduleJob, markReadyForPickup, cancelJob, reopenJob, archiveJob } from "@/services/jobService";
import { useStaff } from "@/hooks/useJobs";

export default function JobActions({ job, actor, onChange }) {
  const { data: staff } = useStaff();
  const run = (fn) => async (...a) => { await fn(...a); onChange?.(); };

  return (
    <div className="space-y-4">
      <h3 className="font-heading font-bold">Manage {DEFAULT_APP_SETTINGS.terminology.jobSingular}</h3>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={job.status} onValueChange={run((v) => changeStatus(job, v, actor))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{JOB_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{DEFAULT_APP_SETTINGS.terminology.staffAssignmentLabel}</Label>
          <Select value={job.assigned_technician_id || "none"} onValueChange={run((v) => assignTechnician(job, staff.find((s) => s.id === v), actor))}>
            <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.short_name || s.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Scheduled date</Label>
        <Input type="date" defaultValue={job.scheduled_date || ""} onChange={run((e) => rescheduleJob(job, e.target.value, actor))} />
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={run(() => markReadyForPickup(job, actor))}><PackageCheck className="h-4 w-4" /> {DEFAULT_APP_SETTINGS.terminology.readyStateLabel}</Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={run(() => changeStatus(job, COMPLETE_STATUS_KEY, actor))}>Complete</Button>
        {job.status === CANCELLED_STATUS_KEY || job.status === COMPLETE_STATUS_KEY
          ? <Button size="sm" variant="ghost" className="gap-1.5" onClick={run(() => reopenJob(job, actor))}><RotateCcw className="h-4 w-4" /> Reopen</Button>
          : <Button size="sm" variant="ghost" className="gap-1.5 text-rose-600" onClick={run(() => cancelJob(job, actor))}><XCircle className="h-4 w-4" /> Cancel</Button>}
        <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={run(() => archiveJob(job, actor))}><Archive className="h-4 w-4" /> Archive</Button>
      </div>
    </div>
  );
}