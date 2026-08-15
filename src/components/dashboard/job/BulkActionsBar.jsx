import React, { useState } from "react";
import { archiveJob, changeStatus } from "@/services/jobService";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { X, Loader2, Archive } from "lucide-react";
import { JOB_STATUSES } from "@/config/jobConfig";
import { toast } from "sonner";

export default function BulkActionsBar({ selectedIds, allJobs, onClear, onDone, actorRole }) {
  const [statusValue, setStatusValue] = useState("");
  const [loading, setLoading] = useState(false);

  const count = selectedIds.length;
  const canManage = actorRole === "admin";

  if (!canManage) return null;

  const applyStatus = async () => {
    if (!statusValue) return;
    setLoading(true);
    try {
      const selectedJobs = allJobs.filter((job) => selectedIds.includes(job.id));
      await Promise.all(selectedJobs.map((job) => changeStatus(job, statusValue)));
      toast.success(`Updated ${count} job${count !== 1 ? "s" : ""}`, { description: `Status set to "${JOB_STATUSES.find(s => s.key === statusValue)?.label || statusValue}"` });
      setStatusValue("");
      onDone();
    } catch (err) {
      toast.error("Couldn't update jobs", { description: "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const archiveJobs = async () => {
    setLoading(true);
    try {
      const selectedJobs = allJobs.filter((job) => selectedIds.includes(job.id));
      await Promise.all(selectedJobs.map((job) => archiveJob(job, "Bulk archive from job management")));
      toast.success(`Archived ${count} job${count !== 1 ? "s" : ""}`, { description: "Linked records and customer history were retained." });
      onDone();
    } catch (err) {
      toast.error("Couldn't archive jobs", { description: "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap rounded-lg border border-accent/30 bg-accent/10 px-4 py-2.5 shadow-sm">
      <span className="text-sm font-semibold text-accent whitespace-nowrap">
        {count} selected
      </span>

      <div className="hidden sm:block h-4 w-px bg-border" />

      {/* Status change */}
      <div className="flex items-center gap-2 flex-1 sm:flex-none min-w-[180px]">
        <Select value={statusValue} onValueChange={setStatusValue} disabled={loading}>
          <SelectTrigger className="h-11 flex-1 sm:w-44 text-xs">
            <SelectValue placeholder="Set status…" />
          </SelectTrigger>
          <SelectContent>
            {JOB_STATUSES.map((s) => (
              <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={!statusValue || loading} onClick={applyStatus} className="h-11 text-xs">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
        </Button>
      </div>

      <div className="hidden sm:block h-4 w-px bg-border" />

      {/* Bulk archive */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="outline" className="h-11 text-xs gap-1.5 text-destructive hover:text-destructive" disabled={loading}>
            <Archive className="h-3.5 w-3.5" />
            Archive
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {count} job{count !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              Archived jobs leave active work lists, while linked invoices, assets, notes, and customer history are retained.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={archiveJobs}>
              Archive {count} job{count !== 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex-1" />

      <Button size="sm" variant="ghost" className="h-11 text-xs gap-1 text-muted-foreground" onClick={onClear}>
        <X className="h-3.5 w-3.5" /> Clear
      </Button>
    </div>
  );
}
