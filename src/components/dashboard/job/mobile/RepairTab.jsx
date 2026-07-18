import React from "react";
import { Package, Wrench, StickyNote, Paperclip } from "lucide-react";
import JobPartsPanel from "../JobPartsPanel";
import QuotePanel from "../QuotePanel";
import NotesPanel from "../NotesPanel";
import PrivateNotesPanel from "../PrivateNotesPanel";
import AttachmentsPanel from "../AttachmentsPanel";

// Scooter-focused repair workspace: parts picker, labour/consumables,
// notes, and files — all in one scrollable view.
// Intake is now managed per-asset in the customer profile, not per-job.
export default function RepairTab({ job, actor, canEdit, quoteReadOnly, onChange, role, canNote, canAttach }) {
  return (
    <div className="space-y-5">
      <RepairSection title="Parts" icon={Package}>
        <JobPartsPanel job={job} actor={actor} canEdit={canEdit} onChange={onChange} />
      </RepairSection>

      <RepairSection title="Labour and Consumables" icon={Wrench}>
        <QuotePanel job={job} actor={actor} canEdit={canEdit && !quoteReadOnly} onChange={onChange} />
      </RepairSection>

      <RepairSection title="Notes" icon={StickyNote}>
        <NotesPanel job={job} actor={actor} canCustomer={canNote} onChange={onChange} />
        <PrivateNotesPanel job={job} actor={actor} canEdit={canEdit} onChange={onChange} />
      </RepairSection>

      <RepairSection title="Files" icon={Paperclip}>
        <AttachmentsPanel job={job} actor={actor} canUpload={canAttach} />
      </RepairSection>
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