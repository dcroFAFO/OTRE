import React from "react";
import { StickyNote } from "lucide-react";
import NotesPanel from "./NotesPanel.jsx";
import PrivateNotesPanel from "./PrivateNotesPanel";
import AttachmentsPanel from "./AttachmentsPanel";
import { can } from "@/config/permissions";

/**
 * Single home for technician notes and photo/document attachments.
 * Used by the desktop job modal and the mobile job workspace so the same
 * panels are never rendered twice within one job view.
 */
export default function JobNotesFilesPanel({ job, actor, canManage, role, onChange }) {
  const canNote = can(role, "job.note.customer") || role === "admin";
  const canAttach = can(role, "job.attach") || role === "admin";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
          <StickyNote className="h-4 w-4" />
        </span>
        <div>
          <h3 className="font-heading text-sm font-extrabold">Notes &amp; Files</h3>
          <p className="text-xs text-muted-foreground">Technician notes, customer-visible updates, and photos for this job.</p>
        </div>
      </div>

      <NotesPanel job={job} actor={actor} canCustomer={canNote} onChange={onChange} />
      <PrivateNotesPanel job={job} actor={actor} canEdit={canManage} onChange={onChange} />
      <AttachmentsPanel job={job} actor={actor} canUpload={canAttach} />
    </div>
  );
}