import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Phone, Mail, Bike, Calendar, User, Wrench,
  CreditCard, AlertTriangle, MapPin, Clock, Hash
} from "lucide-react";
import StatusPill from "@/components/shared/StatusPill";
import JobActions from "./JobActions";
import QuotePanel from "./QuotePanel";
import InvoicePanel from "./InvoicePanel";
import NotesPanel from "./NotesPanel";
import AttachmentsPanel from "./AttachmentsPanel";
import JobPartsPanel from "./JobPartsPanel";
import JobChecklistPanel from "./JobChecklistPanel";
import AuditTimeline from "./AuditTimeline";
import { can } from "@/config/permissions";
import { cn } from "@/lib/utils";
import { DEFAULT_APP_SETTINGS, DEFAULT_WAITING_REASONS } from "@/config/platformConfig";
import { format } from "date-fns";

export default function JobDetailModal({ jobId, actor, open, onClose, onChange }) {
  const [job, setJob] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    if (jobId) base44.entities.Job.get(jobId).then(setJob);
  }, [jobId]);

  useEffect(() => { if (open) load(); }, [jobId, open, load]);
  useEffect(() => { if (!open) setJob(null); }, [open]);

  const bump = () => { load(); setRefreshKey((k) => k + 1); onChange?.(); };
  const role = actor?.role;
  const canManage = can(role, "job.update") || role === "admin";

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        {!job ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Header */}
            <JobModalHeader job={job} />

            {/* Tabs */}
            <div className="flex-1 overflow-y-auto">
              <Tabs defaultValue={canManage ? "manage" : "notes"} className="flex flex-col h-full">
                <div className="border-b border-border px-5 pt-3 bg-background sticky top-0 z-10">
                  <TabsList className="h-auto gap-0 bg-transparent p-0 flex-wrap">
                    {canManage && <ModalTab value="manage" label="Actions" />}
                    {job.checklist?.length > 0 && (
                      <ModalTab
                        value="checklist"
                        label="Checklist"
                        badge={`${job.checklist.filter((c) => c.done).length}/${job.checklist.length}`}
                      />
                    )}
                    <ModalTab value="quote" label="Quote" badge={job.quote_status && job.quote_status !== "draft" ? job.quote_status : null} />
                    <ModalTab value="invoice" label="Invoice" badge={job.payment_status && job.payment_status !== "unpaid" ? job.payment_status : null} />
                    <ModalTab value="notes" label="Notes" />
                    <ModalTab value="parts" label="Parts" />
                    <ModalTab value="files" label="Files" />
                    <ModalTab value="activity" label="History" />
                  </TabsList>
                </div>

                <div className="p-5 flex-1">
                  {canManage && (
                    <TabsContent value="manage" className="mt-0">
                      <JobActions job={job} actor={actor} onChange={bump} />
                    </TabsContent>
                  )}
                  {job.checklist?.length > 0 && (
                    <TabsContent value="checklist" className="mt-0">
                      <JobChecklistPanel job={job} actor={actor} canEdit={canManage} onChange={bump} />
                    </TabsContent>
                  )}
                  <TabsContent value="quote" className="mt-0">
                    <QuotePanel job={job} actor={actor} canEdit={can(role, "job.quote.manage") || role === "admin"} onChange={bump} />
                  </TabsContent>
                  <TabsContent value="invoice" className="mt-0">
                    <InvoicePanel job={job} actor={actor} canEdit={can(role, "job.invoice.manage") || role === "admin"} onChange={bump} />
                  </TabsContent>
                  <TabsContent value="notes" className="mt-0">
                    <NotesPanel job={job} actor={actor} canCustomer={can(role, "job.note.customer") || role === "admin"} onChange={bump} />
                  </TabsContent>
                  <TabsContent value="parts" className="mt-0">
                    <JobPartsPanel job={job} canEdit={canManage} />
                  </TabsContent>
                  <TabsContent value="files" className="mt-0">
                    <AttachmentsPanel job={job} actor={actor} canUpload={can(role, "job.attach") || role === "admin"} />
                  </TabsContent>
                  <TabsContent value="activity" className="mt-0">
                    <AuditTimeline jobId={job.id} refreshKey={refreshKey} />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function JobModalHeader({ job }) {
  const isWaiting = job.status?.startsWith("waiting_");
  const outstanding = job.payment_status === "outstanding";
  const paid = job.payment_status === "paid";
  const waitingReason = job.waiting_reason
    ? (DEFAULT_WAITING_REASONS?.find((r) => r.key === job.waiting_reason)?.label || job.waiting_reason)
    : null;

  return (
    <div className="bg-primary text-primary-foreground px-5 pt-5 pb-4 shrink-0">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {job.reference && (
            <p className="text-xs text-primary-foreground/60 flex items-center gap-1 mb-1">
              <Hash className="h-3 w-3" /> {job.reference}
            </p>
          )}
          <h2 className="font-heading text-xl font-extrabold flex items-center gap-2">
            <User className="h-5 w-5 text-primary-foreground/70 shrink-0" />
            {job.customer_name}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-primary-foreground/80">
            <Bike className="h-4 w-4 shrink-0" />
            {job.asset_label || job.scooter_label || "—"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusPill value={job.status} />
          {outstanding && (
            <span className="flex items-center gap-1 text-xs bg-rose-500/30 text-rose-100 rounded-full px-2 py-0.5 border border-rose-400/40">
              <CreditCard className="h-3 w-3" /> Invoice outstanding
            </span>
          )}
          {paid && (
            <span className="flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-100 rounded-full px-2 py-0.5 border border-emerald-400/30">
              <CreditCard className="h-3 w-3" /> Paid
            </span>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-primary-foreground/70">
        {job.customer_phone && (
          <a href={`tel:${job.customer_phone}`} className="flex items-center gap-1 hover:text-primary-foreground">
            <Phone className="h-3 w-3" /> {job.customer_phone}
          </a>
        )}
        {job.customer_email && (
          <a href={`mailto:${job.customer_email}`} className="flex items-center gap-1 hover:text-primary-foreground">
            <Mail className="h-3 w-3" /> {job.customer_email}
          </a>
        )}
        {job.scheduled_date && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(job.scheduled_date + "T12:00:00"), "EEE d MMM yyyy")}
            {job.preferred_time_window && ` · ${job.preferred_time_window}`}
          </span>
        )}
        {job.assigned_technician_name && (
          <span className="flex items-center gap-1">
            <Wrench className="h-3 w-3" /> {job.assigned_technician_name}
          </span>
        )}
        {job.location_preference && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {job.location_preference.replace("_", " ")}
          </span>
        )}
      </div>

      {/* Issue */}
      {job.issue_description && (
        <p className="mt-3 text-sm text-primary-foreground/90 border-t border-white/10 pt-3 leading-relaxed">
          {job.issue_description}
        </p>
      )}

      {/* Waiting banner */}
      {isWaiting && (
        <div className="mt-2 flex items-center gap-2 bg-amber-500/20 border border-amber-400/40 rounded-lg px-3 py-1.5 text-xs text-amber-100">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Waiting{waitingReason ? ` for ${waitingReason}` : ""}
          {job.waiting_reason === "supplier" && " — parts on order"}
        </div>
      )}
    </div>
  );
}

function ModalTab({ value, label, badge }) {
  return (
    <TabsTrigger
      value={value}
      className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2.5 px-3 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground transition-colors"
    >
      {label}
      {badge && (
        <span className="ml-1.5 text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-semibold capitalize">
          {badge}
        </span>
      )}
    </TabsTrigger>
  );
}