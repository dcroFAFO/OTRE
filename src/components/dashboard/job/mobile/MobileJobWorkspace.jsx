import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, CalendarDays, Wrench, CreditCard, User, History,
  Hash, Bike, StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { can } from "@/config/permissions";
import StatusPill from "@/components/shared/StatusPill";
import JobDetailsHeaderActions from "../JobDetailsHeaderActions";
import JobNotesFilesPanel from "../JobNotesFilesPanel";
import CustomerHistoryPanel from "../CustomerHistoryPanel";
import AuditTimeline from "../AuditTimeline";
import ScheduleTab from "./ScheduleTab";
import RepairTab from "./RepairTab";
import BillingReviewTab from "./BillingReviewTab";
import InvoicePanel from "../InvoicePanel";
import ReferralCard from "./ReferralCard";
import { getVisibleJobTabs } from "@/config/jobDetailsTabConfig";

const TAB_LABELS = { schedule: "Schedule", repair: "Repair", billing: "Invoice", invoice: "Invoice", notes: "Notes", customer: "Customer", timeline: "Timeline" };
const TAB_ICONS = { schedule: CalendarDays, repair: Wrench, billing: CreditCard, invoice: CreditCard, notes: StickyNote, customer: User, timeline: History };

// Contextual primary action + initial tab, driven by the job's current status.
function contextualStep(status) {
  if (["requested"].includes(status)) return { tab: "schedule", label: "Schedule job" };
  if (["scheduled", "on_hold"].includes(status)) return { tab: "repair", label: "Begin repair" };
  if (["repair_in_progress", "waiting_on_parts"].includes(status)) return { tab: "repair", label: "Continue repair" };
  if (["ready_for_pickup", "invoice_outstanding"].includes(status)) return { tab: "billing", label: "Manage invoice" };
  if (["completed", "cancelled"].includes(status)) return { tab: "timeline", label: "View timeline" };
  return { tab: "schedule", label: "Schedule job" };
}

export default function MobileJobWorkspace({
  job, actor, canManage, role, bump, refreshKey, labourReadOnly, invoiceReadOnly, onClose,
}) {
  const step = contextualStep(job.status);
  const visibleTabs = getVisibleJobTabs(job.status);
  const [tab, setTab] = useState(visibleTabs.includes(step.tab) ? step.tab : visibleTabs[0]);
  const scrollRef = useRef(null);
  useEffect(() => {
    const tabs = getVisibleJobTabs(job.status);
    setTab(tabs.includes(step.tab) ? step.tab : tabs[0]);
  }, [job.id, job.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Each tab starts at the top rather than inheriting the previous tab's
  // scroll offset, which otherwise drops staff mid-way down a new section.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  return (
    <div className="lg:hidden fixed inset-0 z-50 bg-background text-foreground flex flex-col">
      <MobileHeader
        job={job}
        onClose={onClose}
        primaryLabel={step.label}
        showPrimary={tab !== step.tab && visibleTabs.includes(step.tab)}
        onPrimary={() => setTab(step.tab)}
      />

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-4 pb-28">
        {/* Keyed so each tab switch plays a short fade/rise — enough to signal
            the change without delaying access to the content. */}
        <div key={tab} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
        {tab === "schedule" && <ScheduleTab job={job} canEdit={canManage} onChange={bump} />}
        {tab === "repair" && (
          <>
            {canManage && <JobDetailsHeaderActions job={job} actor={actor} onChange={bump} context="repair" />}
            <RepairTab job={job} actor={actor} canEdit={canManage} labourReadOnly={labourReadOnly} onChange={bump} />
          </>
        )}
        {tab === "notes" && (
          <JobNotesFilesPanel job={job} actor={actor} canManage={canManage} role={role} onChange={bump} />
        )}
        {tab === "billing" && (
          <div className="space-y-4">
            {canManage && <JobDetailsHeaderActions job={job} actor={actor} onChange={bump} context="invoice" />}
            <BillingReviewTab job={job} actor={actor} canEdit={canManage} invoiceReadOnly={invoiceReadOnly} onChange={bump} />
          </div>
        )}
        {tab === "customer" && (
          <div className="space-y-4">
            <CustomerHistoryPanel job={job} actor={actor} />
            {canManage && <ReferralCard customerId={job.customer_account_id || job.customer_id} />}
          </div>
        )}
        {tab === "invoice" && <InvoicePanel job={job} actor={actor} canEdit={canManage && (can(role, "job.invoice.manage") || role === "admin")} onChange={bump} />}
        {tab === "timeline" && <AuditTimeline job={job} refreshKey={refreshKey} />}
        </div>
      </div>

      <MobileJobTabBar activeTab={tab} onChange={setTab} visibleTabs={visibleTabs} />
    </div>
  );
}

function MobileHeader({ job, onClose, primaryLabel, showPrimary, onPrimary }) {
  return (
    <div className="shrink-0 bg-card border-b border-border">
      <div className="h-14 flex items-center justify-between gap-2 px-3">
        <button onClick={onClose} className="flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold" aria-label="Back to jobs">
          <ArrowLeft className="h-5 w-5" /> Jobs
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-heading font-bold">{job.customer_name}</p>
          <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
            <Bike className="h-3 w-3 shrink-0" />
            <span className="truncate">{job.asset_label || "—"}</span>
            {job.reference && (
              <span className="flex shrink-0 items-center gap-0.5"><Hash className="h-2.5 w-2.5" />{job.reference}</span>
            )}
          </p>
        </div>
        {showPrimary ? (
          <button onClick={onPrimary} className="min-h-11 shrink-0 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground">
            {primaryLabel}
          </button>
        ) : (
          <span className="w-14 shrink-0" aria-hidden="true" />
        )}
      </div>
      <div className="flex items-center gap-1.5 px-3 pb-2.5">
        <StatusPill value={job.status} />
      </div>
    </div>
  );
}

function MobileJobTabBar({ activeTab, onChange, visibleTabs }) {
  const select = (t) => onChange(t);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur pb-safe" aria-label="Job navigation">
      <div className="flex">
        {visibleTabs.map((t) => {
          const Icon = TAB_ICONS[t];
          const active = activeTab === t;
          return (
            <button key={t} onClick={() => select(t)} aria-current={active ? "page" : undefined}
              className={cn("flex flex-1 min-w-0 min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-all active:scale-95",
                active ? "text-accent" : "text-muted-foreground")}>
              <Icon className="h-5 w-5 shrink-0" />
              <span className="max-w-full truncate">{TAB_LABELS[t]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}