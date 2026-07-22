import React, { useState, useEffect } from "react";
import {
  ArrowLeft, CalendarDays, Wrench, CreditCard, User, History,
  Hash, Bike,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { can } from "@/config/permissions";
import StatusPill from "@/components/shared/StatusPill";
import JobDetailsHeaderActions from "../JobDetailsHeaderActions";
import NotesPanel from "../NotesPanel.jsx";
import PrivateNotesPanel from "../PrivateNotesPanel";
import AttachmentsPanel from "../AttachmentsPanel";
import CustomerHistoryPanel from "../CustomerHistoryPanel";
import AuditTimeline from "../AuditTimeline";
import ScheduleTab from "./ScheduleTab";
import RepairTab from "./RepairTab";
import BillingReviewTab from "./BillingReviewTab";
import InvoicePanel from "../InvoicePanel";
import ReferralCard from "./ReferralCard";
import { getVisibleJobTabs } from "@/config/jobDetailsTabConfig";

const TAB_LABELS = { schedule: "Scheduling", repair: "Repair", billing: "Invoice", invoice: "Invoice", customer: "Customer", timeline: "Timeline" };
const TAB_ICONS = { schedule: CalendarDays, repair: Wrench, billing: CreditCard, invoice: CreditCard, customer: User, timeline: History };

// Contextual primary action + initial tab, driven by the job's current status.
function contextualStep(status) {
  if (["requested"].includes(status)) return { tab: "schedule", label: "Schedule job" };
  if (["booked", "on_hold"].includes(status)) return { tab: "repair", label: "Begin repair" };
  if (["repair_in_progress", "waiting_on_parts"].includes(status)) return { tab: "repair", label: "Continue repair" };
  if (["ready_for_pickup", "invoice_sent"].includes(status)) return { tab: "billing", label: "Manage invoice" };
  if (["paid", "completed", "cancelled"].includes(status)) return { tab: "timeline", label: "View timeline" };
  return { tab: "schedule", label: "Schedule job" };
}

export default function MobileJobWorkspace({
  job, actor, canManage, role, bump, refreshKey, quoteReadOnly, invoiceReadOnly, onClose,
}) {
  const step = contextualStep(job.status);
  const visibleTabs = getVisibleJobTabs(job.status);
  const [tab, setTab] = useState(visibleTabs.includes(step.tab) ? step.tab : visibleTabs[0]);
  useEffect(() => {
    const tabs = getVisibleJobTabs(job.status);
    setTab(tabs.includes(step.tab) ? step.tab : tabs[0]);
  }, [job.id, job.status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="lg:hidden fixed inset-0 z-50 bg-background text-foreground flex flex-col">
      <MobileHeader job={job} onClose={onClose} primaryLabel={step.label} onPrimary={() => setTab(step.tab)} />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-28">
        {tab === "schedule" && <ScheduleTab job={job} canEdit={canManage} onChange={bump} />}
        {tab === "repair" && (
          <>
            {canManage && <JobDetailsHeaderActions job={job} actor={actor} onChange={bump} context="repair" />}
            <RepairTab job={job} actor={actor} canEdit={canManage} quoteReadOnly={quoteReadOnly} onChange={bump}
              role={role} canNote={can(role, "job.note.customer") || role === "admin"} canAttach={can(role, "job.attach") || role === "admin"} />
          </>
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
            <NotesPanel job={job} actor={actor} canCustomer={can(role, "job.note.customer") || role === "admin"} onChange={bump} />
            <PrivateNotesPanel job={job} actor={actor} canEdit={canManage} onChange={bump} />
            <AttachmentsPanel job={job} actor={actor} canUpload={can(role, "job.attach") || role === "admin"} />
            {canManage && <ReferralCard customerId={job.customer_account_id || job.customer_id} />}
          </div>
        )}
        {tab === "invoice" && <InvoicePanel job={job} actor={actor} canEdit={canManage && (can(role, "job.invoice.manage") || role === "admin")} onChange={bump} />}
        {tab === "timeline" && <AuditTimeline job={job} refreshKey={refreshKey} />}
      </div>

      <MobileJobTabBar activeTab={tab} onChange={setTab} visibleTabs={visibleTabs} />
    </div>
  );
}

function MobileHeader({ job, onClose, primaryLabel, onPrimary }) {
  return (
    <div className="shrink-0 bg-card border-b border-border">
      <div className="h-14 flex items-center justify-between gap-2 px-3">
        <button onClick={onClose} className="flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold" aria-label="Back to jobs">
          <ArrowLeft className="h-5 w-5" /> Jobs
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-heading font-bold">{job.customer_name}</p>
          <p className="flex items-center justify-center gap-1 truncate text-[11px] text-muted-foreground">
            <Bike className="h-3 w-3 shrink-0" /> {job.asset_label || "—"}
            {job.reference && <span className="flex items-center gap-0.5"><Hash className="h-2.5 w-2.5" />{job.reference}</span>}
          </p>
        </div>
        <button onClick={onPrimary} className="min-h-11 shrink-0 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground">
          {primaryLabel}
        </button>
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
            <button key={t} onClick={() => select(t)}
              className={cn("flex flex-1 min-h-[52px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                active ? "text-accent" : "text-muted-foreground")}>
              <Icon className="h-5 w-5" />
              {TAB_LABELS[t]}
            </button>
          );
        })}
      </div>
    </nav>
  );
}