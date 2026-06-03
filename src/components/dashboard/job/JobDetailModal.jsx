import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Phone, Mail, Bike, Calendar } from "lucide-react";
import StatusPill from "@/components/shared/StatusPill";
import JobActions from "./JobActions";
import QuotePanel from "./QuotePanel";
import InvoicePanel from "./InvoicePanel";
import NotesPanel from "./NotesPanel";
import AttachmentsPanel from "./AttachmentsPanel";
import AuditTimeline from "./AuditTimeline";
import { can } from "@/config/permissions";

export default function JobDetailModal({ jobId, actor, open, onClose, onChange }) {
  const [job, setJob] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = () => jobId && base44.entities.Job.get(jobId).then(setJob);
  useEffect(() => { if (open) load(); }, [jobId, open]);

  const bump = () => { load(); setRefreshKey((k) => k + 1); onChange?.(); };
  const role = actor?.role;
  const canManage = can(role, "job.update") || role === "admin";

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <div className="bg-primary text-primary-foreground p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-primary-foreground/70">{job.reference}</p>
              <h2 className="font-heading text-xl font-extrabold">{job.customer_name}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-primary-foreground/80"><Bike className="h-4 w-4" /> {job.asset_label || job.scooter_label}</p>
            </div>
            <StatusPill value={job.status} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-primary-foreground/70">
            {job.customer_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {job.customer_phone}</span>}
            {job.customer_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {job.customer_email}</span>}
            {job.scheduled_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {job.scheduled_date}</span>}
          </div>
          <p className="mt-3 text-sm text-primary-foreground/90 border-t border-white/10 pt-3">{job.issue_description}</p>
        </div>

        <div className="p-5">
          <Tabs defaultValue={canManage ? "manage" : "notes"}>
            <TabsList className="flex-wrap h-auto">
              {canManage && <TabsTrigger value="manage">Manage</TabsTrigger>}
              <TabsTrigger value="quote">Quote</TabsTrigger>
              <TabsTrigger value="invoice">Invoice</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            {canManage && <TabsContent value="manage" className="pt-4"><JobActions job={job} actor={actor} onChange={bump} /></TabsContent>}
            <TabsContent value="quote" className="pt-4"><QuotePanel job={job} actor={actor} canEdit={can(role, "job.quote.manage") || role === "admin"} onChange={bump} /></TabsContent>
            <TabsContent value="invoice" className="pt-4"><InvoicePanel job={job} actor={actor} canEdit={can(role, "job.invoice.manage") || role === "admin"} onChange={bump} /></TabsContent>
            <TabsContent value="notes" className="pt-4"><NotesPanel job={job} actor={actor} canCustomer={can(role, "job.note.customer") || role === "admin"} onChange={bump} /></TabsContent>
            <TabsContent value="files" className="pt-4"><AttachmentsPanel job={job} actor={actor} canUpload={can(role, "job.attach") || role === "admin"} /></TabsContent>
            <TabsContent value="activity" className="pt-4"><AuditTimeline jobId={job.id} refreshKey={refreshKey} /></TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}