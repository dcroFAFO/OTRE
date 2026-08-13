import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bike, Calendar, User, CreditCard, AlertTriangle, Hash } from "lucide-react";
import StatusPill from "@/components/shared/StatusPill";
import BillingPanel from "./BillingPanel";
import InvoicePanel from "./InvoicePanel";
import JobNotesFilesPanel from "./JobNotesFilesPanel";
import CustomerHistoryPanel from "./CustomerHistoryPanel";
import AuditTimeline from "./AuditTimeline";
import JobDetailsHeaderActions from "./JobDetailsHeaderActions";
import ScheduleTab from "./mobile/ScheduleTab";
import RepairTab from "./mobile/RepairTab";
import MobileJobWorkspace from "./mobile/MobileJobWorkspace";
import { can } from "@/config/permissions";
import { DEFAULT_WAITING_REASONS } from "@/config/platformConfig";
import {
  getVisibleJobTabs,
  isLabourReadOnlyForStatus,
  isInvoiceReadOnlyForStatus,
} from "@/config/jobDetailsTabConfig";
import { normalizeStatusKey } from "@/config/jobConfig";
import { format } from "date-fns";
import { ErrorState, LoadingSpinner } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getSafeErrorMessage } from "@/lib/errors";

// Tab label map (desktop modal only — mobile uses its own workspace tabs)
const TAB_LABELS = {
  schedule: "Scheduling",
  repair: "Repair",
  billing: "Invoice",
  invoice: "Invoice",
  notes: "Notes & Files",
  customer: "Customer",
  timeline: "Timeline",
};

// Matches the "lg:hidden" breakpoint used by DashboardShell/MobileJobWorkspace
// so the full-screen mobile workspace is used whenever the app is already in
// its mobile/tablet navigation mode, instead of falling back to the desktop modal.
function useMobileJobWorkspace() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1023px)").matches : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}

/** @param {{ jobId?: string | null, actor?: Record<string, any> | null, open: boolean, onClose: () => void, onChange?: () => void }} props */
export default function JobDetailModal({ jobId, actor, open, onClose, onChange }) {
  const [job, setJob] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState(null);

  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoadError(false);
    setLoading(true);
    try {
      setJob(await base44.entities.Job.get(jobId));
    } catch (error) {
      setLoadError(true);
      setJob((current) => {
        if (current) toast.error(getSafeErrorMessage(error, "Latest job details could not be loaded."));
        return current;
      });
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { if (open) { load(); setActiveTab(null); } }, [jobId, open, load]);
  useEffect(() => { if (!open) setJob(null); }, [open]);

  const bump = () => { load(); setRefreshKey((k) => k + 1); onChange?.(); };
  const role = actor?.role;
  const canManage = can(role, "job.update") || role === "admin";

  const visibleTabs = job ? getVisibleJobTabs(job.status) : ["billing"];
  const labourReadOnly = job ? isLabourReadOnlyForStatus(job.status) : false;
  const invoiceReadOnly = job ? isInvoiceReadOnlyForStatus(job.status) : false;
  const isMobileWorkspace = useMobileJobWorkspace();

  // If active tab is no longer visible (e.g. after status change), fall back to first tab
  const safeTab = visibleTabs.includes(activeTab) ? activeTab : visibleTabs[0] ?? "billing";

  if (!open) return null;

  if (isMobileWorkspace) {
    if (loadError && !job) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background px-5 lg:hidden">
          <ErrorState className="w-full max-w-lg" title="Job could not be loaded" onRetry={load} />
          <Button type="button" variant="ghost" size="touch" onClick={onClose}>Close</Button>
        </div>
      );
    }
    if (!job) {
      return (
        <div className="lg:hidden fixed inset-0 z-50 bg-background flex items-center justify-center">
          <LoadingSpinner label="Loading job details" />
        </div>
      );
    }
    return (
      <MobileJobWorkspace
        job={job}
        actor={actor}
        canManage={canManage}
        role={role}
        bump={bump}
        refreshKey={refreshKey}
        labourReadOnly={labourReadOnly}
        invoiceReadOnly={invoiceReadOnly}
        onClose={onClose}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-lg">
        {loadError && !job ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
            <ErrorState className="w-full max-w-lg" title="Job could not be loaded" onRetry={load} />
          </div>
        ) : !job ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner label="Loading job details" />
          </div>
        ) : (
          <>
            {loading ? <span className="sr-only" role="status">Refreshing job details</span> : null}
            {loadError ? <div className="p-4"><ErrorState title="Latest job details could not be loaded" description="Previously loaded details remain visible." onRetry={load} /></div> : null}
            <JobModalHeader job={job} />

            {/* Staff workflow actions — same strip the mobile workspace uses,
                shown in full (no context) on desktop. */}
            {canManage && (
              <JobDetailsHeaderActions job={job} actor={actor} onChange={bump} />
            )}

            <div className="flex-1 overflow-y-auto">
              <Tabs value={safeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
                <div className="border-b border-border px-5 pt-1.5 bg-background sticky top-0 z-10">
                  <TabsList className="h-auto gap-0 bg-transparent p-0 flex-wrap justify-start">
                    {visibleTabs.map((tab) => (
                      <ModalTab
                        key={tab}
                        value={tab}
                        label={TAB_LABELS[tab]}
                        badge={
                          tab === "billing" && job.payment_status && job.payment_status !== "unpaid"
                            ? job.payment_status
                            : null
                        }
                      />
                    ))}
                  </TabsList>
                </div>

                <div className="p-5 flex-1 pb-safe">
                  <TabsContent value="schedule" className="mt-0">
                    {safeTab === "schedule" && (
                      <ScheduleTab job={job} canEdit={canManage} onChange={bump} />
                    )}
                  </TabsContent>
                  <TabsContent value="repair" className="mt-0">
                    {safeTab === "repair" && (
                      <RepairTab
                        job={job}
                        actor={actor}
                        canEdit={canManage}
                        labourReadOnly={labourReadOnly}
                        onChange={bump}
                      />
                    )}
                  </TabsContent>
                  <TabsContent value="notes" className="mt-0">
                    {safeTab === "notes" && (
                      <JobNotesFilesPanel job={job} actor={actor} canManage={canManage} role={role} onChange={bump} />
                    )}
                  </TabsContent>
                  <TabsContent value="billing" className="mt-0">
                    {safeTab === "billing" && (
                      <BillingPanel
                        job={job}
                        actor={actor}
                        canEdit={canManage}
                        invoiceReadOnly={invoiceReadOnly || !(can(role, "job.invoice.manage") || role === "admin")}
                        onChange={bump}
                      />
                    )}
                  </TabsContent>
                  <TabsContent value="customer" className="mt-0">
                    {safeTab === "customer" && (
                      <CustomerHistoryPanel job={job} actor={actor} />
                    )}
                  </TabsContent>
                  <TabsContent value="invoice" className="mt-0">
                    {safeTab === "invoice" && (
                      <InvoicePanel job={job} actor={actor} canEdit={canManage && (can(role, "job.invoice.manage") || role === "admin")} onChange={bump} />
                    )}
                  </TabsContent>
                  <TabsContent value="timeline" className="mt-0">
                    {safeTab === "timeline" && <AuditTimeline job={job} refreshKey={refreshKey} />}
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
  const canonicalStatus = normalizeStatusKey(job.status);
  const isWaiting = canonicalStatus === "waiting_on_parts" || canonicalStatus === "on_hold";
  const outstanding = job.payment_status === "outstanding";
  const paid = job.payment_status === "paid";
  const waitingReason = canonicalStatus === "waiting_on_parts"
    ? "Parts"
    : job.waiting_reason
    ? (DEFAULT_WAITING_REASONS?.find((r) => r.key === job.waiting_reason)?.label || job.waiting_reason)
    : null;

  return (
    <div className="bg-primary text-primary-foreground px-5 py-3 shrink-0">
      {/* Top row */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5 sm:flex-nowrap sm:items-center">
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
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
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
      className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 pt-2 sm:pt-0 px-3 min-h-11 sm:min-h-0 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground transition-colors"
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
