import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { changeStatus } from "@/services/jobService";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, ChevronDown, Loader2, Bell } from "lucide-react";
import { JOB_STATUSES } from "@/config/jobConfig";
import { useToast } from "@/components/ui/use-toast";

export default function BulkActionsBar({ selectedIds, allJobs, onClear, onDone }) {
  const { toast } = useToast();
  const [statusValue, setStatusValue] = useState("");
  const [loading, setLoading] = useState(false);

  const count = selectedIds.length;

  const applyStatus = async () => {
    if (!statusValue) return;
    setLoading(true);
    try {
      const selectedJobs = allJobs.filter((job) => selectedIds.includes(job.id));
      await Promise.all(selectedJobs.map((job) => changeStatus(job, statusValue)));
      toast({ title: `Updated ${count} job${count !== 1 ? "s" : ""}`, description: `Status set to "${JOB_STATUSES.find(s => s.key === statusValue)?.label || statusValue}"` });
      setStatusValue("");
      onDone();
    } finally {
      setLoading(false);
    }
  };

  const sendNotifications = async () => {
    setLoading(true);
    const selectedJobs = allJobs.filter((j) => selectedIds.includes(j.id));
    try {
      await Promise.all(
        selectedJobs
          .filter((j) => j.customer_email)
          .map((j) =>
            base44.integrations.Core.SendEmail({
              to: j.customer_email,
              subject: `Update on your job: ${j.asset_label || j.reference || "your repair"}`,
              body: `Hi ${j.customer_name},\n\nThis is an update regarding your job (${j.reference || j.id}).\n\nCurrent status: ${j.status?.replace(/_/g, " ")}\n\nPlease contact us if you have any questions.\n\nThank you.`,
            })
          )
      );
      toast({ title: `Notifications sent`, description: `Emailed ${selectedJobs.filter(j => j.customer_email).length} customer${selectedJobs.filter(j => j.customer_email).length !== 1 ? "s" : ""}` });
      onDone();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap rounded-2xl border border-accent/30 bg-accent/10 px-4 py-2.5 shadow-sm">
      <span className="text-sm font-semibold text-accent whitespace-nowrap">
        {count} selected
      </span>

      <div className="hidden sm:block h-4 w-px bg-border" />

      {/* Status change */}
      <div className="flex items-center gap-2 flex-1 sm:flex-none min-w-[180px]">
        <Select value={statusValue} onValueChange={setStatusValue}>
          <SelectTrigger className="h-8 flex-1 sm:w-44 text-xs">
            <SelectValue placeholder="Set status…" />
          </SelectTrigger>
          <SelectContent>
            {JOB_STATUSES.map((s) => (
              <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={!statusValue || loading} onClick={applyStatus} className="h-8 text-xs">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
        </Button>
      </div>

      <div className="hidden sm:block h-4 w-px bg-border" />

      {/* Send notifications */}
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" disabled={loading} onClick={sendNotifications}>
        <Bell className="h-3.5 w-3.5" />
        Send notification
      </Button>

      <div className="flex-1" />

      <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-muted-foreground" onClick={onClear}>
        <X className="h-3.5 w-3.5" /> Clear
      </Button>
    </div>
  );
}