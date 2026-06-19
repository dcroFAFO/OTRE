import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Bike, Calendar, User,
  CreditCard, AlertTriangle, Hash
} from "lucide-react";
import StatusPill from "@/components/shared/StatusPill";
import JobDetailsHeaderActions from "./JobDetailsHeaderActions";
import QuotePanel from "./QuotePanel";
import InvoicePanel from "./InvoicePanel";
import NotesPanel from "./NotesPanel.jsx";
import PrivateNotesPanel from "./PrivateNotesPanel";
import AttachmentsPanel from "./AttachmentsPanel";
import JobPartsPanel from "./JobPartsPanel";
import IntakePanel from "./IntakePanel";
import CustomerHistoryPanel from "./CustomerHistoryPanel";
import { can } from "@/config/permissions";
import { cn } from "@/lib/utils";
import { DEFAULT_WAITING_REASONS } from "@/config/platformConfig";
import {
  getVisibleJobTabs,
  isQuoteReadOnlyForStatus,
  isInvoiceReadOnlyForStatus,
} from "@/config/jobDetailsTabConfig";
import { format } from "date-fns";

// Tab label map
const TAB_LABELS = {
  intake: "Intake",
  quote: "Quote",
  invoice: "Invoice",
  customer: "Customer",
  notes: "Notes",
  private: "Private",
  parts: "Parts",
  files: "Files",
};

export default function JobDetailModal({ jobId, actor, open, onClose, onChange }) {
  const [job, setJob] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("intake");

  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    if (!jobId) return;
    setLoadError(false);
    base44.entities.Job.get(jobId).then(setJob).catch(() => setLoadError(true));
  }, [jobId]);

  useEffect(() => { if (open) { load(); setActiveTab("intake"); } }, [jobId, open, load]);
  useEffect(() => { if (!open) setJob(null); }, [open]);

  const bump = () => { load(); setRefreshKey((k) => k + 1); onChange?.(); };
  const role = actor?.role;
  const canManage = can(role, "job.update") || role === "admin";

  const visibleTabs = job ? getVisibleJobTabs(job.status) : ["intake"];
  const quoteReadOnly = job ? isQuoteReadOnlyForStatus(job.status) : false;
  const invoiceReadOnly = job ? isInvoiceReadOnlyForStatus(job.status) : false;

  // If active tab is no longer visible (e.g. after status change), fall back to first tab
  const safeTab = visibleTabs.includes(activeTab) ? activeTab : visibleTabs[0] ?? "intake";

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        {loadError ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
            <p className="text-sm">Failed to load job. Please try again.</p>
            <button onClick={load} className="text-xs underline hover:text-foreground">Retry</button>
          </div>
        ) : !job ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <JobModalHeader job={job} />

            {canManage && (
              <JobDetailsHeaderActions job={job} actor={actor} onChange={bump} />
            )}

            <div className="flex-1 overflow-y-auto">
              <Tabs value={safeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                <div className="border-b border-border px-5 pt-1.5 bg-background sticky top-0 z-10 overflow-x-auto">
                  <TabsList className="h-auto gap-0 bg-transparent p-0 flex-nowrap">
                    {visibleTabs.map((tab) => (
                      <ModalTab
                        key={tab}
                        value={tab}
                        label={TAB_LABELS[tab]}
                        badge={
                          tab === "quote" && job.quote_status && job.quote_status !== "draft"
                            ? job.quote_status
                            : tab === "intake" && job.intake?.intake_date
                            ? "✓"
                            : tab === "invoice" && job.payment_status && job.payment_status !== "unpaid"
                            ? job.payment_status
                            : null
                        }
                      />
                    ))}
                  </TabsList>
                </div>

                <div className="p-5 flex-1">
                  <TabsContent value="intake" className="mt-0">
                    <IntakePanel job={job} actor={actor} canEdit={canManage} onChange={bump} />
                  </TabsContent>
                  <TabsContent value="quote" className="mt-0">
                    <QuotePanel
                      job={job}
                      actor={actor}
                      canEdit={!quoteReadOnly && (can(role, "job.quote.manage") || role === "admin")}
                      onChange={bump}
                    />
                  </TabsContent>
                  <TabsContent value="parts" className="mt-0">
                    <JobPartsPanel job={job} actor={actor} canEdit={canManage} onChange={bump} />
                  </TabsContent>
                  <TabsContent value="invoice" className="mt-0">
                    <InvoicePanel
                      job={job}
                      actor={actor}
                      canEdit={!invoiceReadOnly && (can(role, "job.invoice.manage") || role === "admin")}
                      onChange={bump}
                    />
                  </TabsContent>
                  <TabsContent value="customer" className="mt-0">
                    <CustomerHistoryPanel job={job} />
                  </TabsContent>
                  <TabsContent value="notes" className="mt-0">
                    <NotesPanel job={job} actor={actor} canCustomer={can(role, "job.note.customer") || role === "admin"} onChange={bump} />
                  </TabsContent>
                  <TabsContent value="private" className="mt-0">
                    <PrivateNotesPanel job={job} actor={actor} canEdit={canManage} onChange={bump} />
                  </TabsContent>
                  <TabsContent value="files" className="mt-0">
                    <AttachmentsPanel job={job} actor={actor} canUpload={can(role, "job.attach") || role === "admin"} />
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
    <div className="bg-primary text-primary-foreground px-5 py-3 shrink-0">
      {/* Top row */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-base font-extrabold flex items-center gap-2 truncate">
            <User className="h-4 w-4 text-primary-foreground/70 shrink-0" />
            <span className="truncate">{job.customer_name}</span>
            {job.reference && (
              <span className="text-xs font-normal text-primary-foreground/50 flex items-center gap-0.5 shrink-0">
                <Hash className="h-3 w-3" />{job.reference}
              </span>
            )}
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-primary-foreground/70 truncate">
            <Bike className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{job.asset_label || "—"}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusPill value={job.status} className="bg-white/10 text-primary-foreground border-white/20" />
          {job.scheduled_date && (
            <span className="flex items-center gap-1 text-xs text-primary-foreground/80 whitespace-nowrap">
              <Calendar className="h-3 w-3" />
              {format(new Date(job.scheduled_date + "T12:00:00"), "EEE d MMM")}
            </span>
          )}
          {outstanding && (
            <span className="flex items-center gap-1 text-xs bg-rose-500/30 text-rose-100 rounded-full px-2 py-0.5 border border-rose-400/40">
              <CreditCard className="h-3 w-3" /> Outstanding
            </span>
          )}
          {paid && (
            <span className="flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-100 rounded-full px-2 py-0.5 border border-emerald-400/30">
              <CreditCard className="h-3 w-3" /> Paid
            </span>
          )}
          {isWaiting && (
            <span className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-100 rounded-full px-2 py-0.5 border border-amber-400/40">
              <AlertTriangle className="h-3 w-3" /> Waiting{waitingReason ? ` · ${waitingReason}` : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalTab({ value, label, badge }) {
  return (
    <TabsTrigger
      value={value}
      className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 px-3 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground transition-colors"
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