import React, { useState } from "react";
import { Package, Wrench, StickyNote, Paperclip, PlayCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import JobPartsPanel from "../JobPartsPanel";
import QuotePanel from "../QuotePanel";
import NotesPanel from "../NotesPanel";
import PrivateNotesPanel from "../PrivateNotesPanel";
import AttachmentsPanel from "../AttachmentsPanel";
import { updateJobStatusFromEvent } from "@/services/jobWorkflowService";
import { toast } from "sonner";

// Status-driven repair workspace:
// - booked/on_hold: "Begin Repair" button → repair_in_progress
// - repair_in_progress/waiting_on_parts: parts + labour catalogues (no invoice
//   actions) + "Complete Repair" button → ready_for_pickup
export default function RepairTab({ job, actor, canEdit, quoteReadOnly, onChange, role, canNote, canAttach }) {
  const status = job.status;

  if (["booked", "on_hold", "quote_approved", "requested"].includes(status)) {
    return <BeginRepairCard job={job} onChange={onChange} />;
  }

  return (
    <div className="space-y-5">
      <RepairSection title="Parts" icon={Package}>
        <JobPartsPanel job={job} actor={actor} canEdit={canEdit} onChange={onChange} />
      </RepairSection>

      <RepairSection title="Labour and Consumables" icon={Wrench}>
        <QuotePanel job={job} actor={actor} canEdit={canEdit && !quoteReadOnly} onChange={onChange} repairMode />
      </RepairSection>

      <RepairSection title="Notes" icon={StickyNote}>
        <NotesPanel job={job} actor={actor} canCustomer={canNote} onChange={onChange} />
        <PrivateNotesPanel job={job} actor={actor} canEdit={canEdit} onChange={onChange} />
      </RepairSection>

      <RepairSection title="Files" icon={Paperclip}>
        <AttachmentsPanel job={job} actor={actor} canUpload={canAttach} />
      </RepairSection>

      <CompleteRepairCard job={job} onChange={onChange} />
    </div>
  );
}

function BeginRepairCard({ job, onChange }) {
  const [busy, setBusy] = useState(false);
  const begin = async () => {
    setBusy(true);
    try {
      await updateJobStatusFromEvent(job, "repair_in_progress");
      onChange?.();
      toast.success("Repair started.");
    } catch (err) {
      toast.error(err.message || "Failed to start repair.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4 text-center">
      <div className="mx-auto rounded-full bg-primary/10 p-3 w-fit">
        <PlayCircle className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h3 className="font-heading text-base font-extrabold">Ready to begin repair</h3>
        <p className="text-sm text-muted-foreground mt-1">Start the repair process to add parts, labour, and notes.</p>
      </div>
      <Button className="gap-2" disabled={busy} onClick={begin}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
        {busy ? "Starting…" : "Begin Repair"}
      </Button>
    </div>
  );
}

function CompleteRepairCard({ job, onChange }) {
  const [busy, setBusy] = useState(false);
  const complete = async () => {
    setBusy(true);
    try {
      await updateJobStatusFromEvent(job, "ready_for_pickup");
      onChange?.();
      toast.success("Repair complete. Job is ready for pickup.");
    } catch (err) {
      toast.error(err.message || "Failed to complete repair.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        <h3 className="font-heading text-sm font-extrabold text-emerald-800">Repair complete?</h3>
      </div>
      <p className="text-xs text-emerald-700">Mark this repair as complete to move the job to invoicing and pickup.</p>
      <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={complete}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {busy ? "Completing…" : "Complete Repair"}
      </Button>
    </div>
  );
}

function RepairSection({ title, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="font-heading text-sm font-extrabold text-foreground">{title}</h3>
      </div>
      {children}
    </section>
  );
}