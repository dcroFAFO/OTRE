import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DEFAULT_JOB_STATUSES } from "@/config/platformConfig";
import { Loader2, CheckCircle2, Circle, Clock, Wrench, FileText, Receipt, History, CreditCard } from "lucide-react";
import { startInvoicePayment } from "@/services/paymentService";
import SignatureCapture from "@/components/portal/SignatureCapture";

// ─── Status milestones shown to customers (subset of all statuses) ────────────
const MILESTONES = [
  { key: "requested",          label: "Booking Received" },
  { key: "pending_confirmation", label: "Confirmed" },
  { key: "technician_assigned", label: "Technician Assigned" },
  { key: "quote_sent",          label: "Quote Sent" },
  { key: "quote_approved",      label: "Quote Approved" },
  { key: "repair_in_progress",  label: "Repair Underway" },
  { key: "ready_for_pickup",    label: "Ready for Pickup" },
  { key: "invoice_outstanding", label: "Invoice Issued" },
  { key: "paid",                label: "Paid" },
  { key: "completed",           label: "Completed" },
];

// Map status → milestone index (use the highest-ordered milestone that matches
// the current status or any group that precedes it).
const MILESTONE_ORDER = MILESTONES.map((m) => m.key);

function getMilestoneIndex(statusKey) {
  // Direct match first
  const direct = MILESTONE_ORDER.indexOf(statusKey);
  if (direct !== -1) return direct;
  // Group-based fallback
  const status = DEFAULT_JOB_STATUSES.find((s) => s.key === statusKey);
  if (!status) return 0;
  const groupMap = {
    intake: 0, active: 2, waiting: 2, quote: 3,
    billing: 7, done: 9, closed: 9,
  };
  return groupMap[status.group] ?? 0;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusTab({ job }) {
  const current = getMilestoneIndex(job.status);
  const statusDef = DEFAULT_JOB_STATUSES.find((s) => s.key === job.status);
  const canAcknowledgeCompletion = job.status === "completed" || ["done", "closed"].includes(statusDef?.group);
  return (
    <div className="py-2 space-y-4">
      {canAcknowledgeCompletion && (
        <SignatureCapture
          job={job}
          signatureKey="completed-work"
          title="Acknowledge completed work"
          description="Sign here to confirm the completed repair work has been acknowledged."
          fileName={`completed-work-signature-${job.reference || job.id}.png`}
        />
      )}
      <div className="mb-6 rounded-xl bg-secondary/50 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
        <Clock className="h-4 w-4 shrink-0" />
        Current status: <span className="font-semibold text-foreground ml-1">
          {DEFAULT_JOB_STATUSES.find(s => s.key === job.status)?.label || job.status}
        </span>
      </div>
      <ol className="relative space-y-0">
        {MILESTONES.map((m, i) => {
          const done = i < current;
          const active = i === current;
          const pending = i > current;
          return (
            <li key={m.key} className="flex gap-4 pb-6 last:pb-0 relative">
              {/* Vertical connector */}
              {i < MILESTONES.length - 1 && (
                <div className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${done || active ? "bg-primary/40" : "bg-border"}`} />
              )}
              {/* Icon */}
              <div className={`relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors
                ${active ? "border-primary bg-primary text-primary-foreground"
                  : done ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground"}`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : active ? <Wrench className="h-4 w-4" /> : <Circle className="h-4 w-4 opacity-40" />}
              </div>
              {/* Label */}
              <div className="pt-0.5">
                <p className={`text-sm font-medium leading-tight ${active ? "text-foreground" : done ? "text-foreground/70" : "text-muted-foreground"}`}>
                  {m.label}
                </p>
                {active && <p className="text-xs text-primary mt-0.5">In progress</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function HistoryTab({ userEmail }) {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["portalHistory", userEmail],
    queryFn: () => base44.entities.Job.filter({ customer_email: userEmail, archived: false }, "-created_date", 50),
    enabled: !!userEmail,
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8 text-muted-foreground" />;
  if (!jobs.length) return <p className="text-sm text-muted-foreground text-center py-8">No previous repairs found.</p>;

  return (
    <ul className="space-y-3 py-2">
      {jobs.map((j) => {
        const statusDef = DEFAULT_JOB_STATUSES.find(s => s.key === j.status);
        return (
          <li key={j.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{j.asset_label || j.scooter_label || "Scooter"}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{j.issue_description || "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{j.reference} · {new Date(j.created_date).toLocaleDateString()}</p>
            </div>
            <Badge variant="outline" className="shrink-0 text-xs capitalize">{statusDef?.label || j.status}</Badge>
          </li>
        );
      })}
    </ul>
  );
}

function QuotesTab({ job, onUpdate }) {
  const qc = useQueryClient();
  const [acting, setActing] = useState(null);
  const [signedQuotes, setSignedQuotes] = useState({});

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["portalQuotes", job.id],
    queryFn: () => base44.entities.Quote.filter({ job_id: job.id }, "-created_date", 10),
  });

  const visibleQuotes = quotes.filter(q => ["sent", "approved", "rejected"].includes(q.status));

  const handleApproval = async (quoteId, approved) => {
    setActing(quoteId + (approved ? "_approve" : "_reject"));
    await base44.functions.invoke("quoteActions", { action: "set_approval", jobId: job.id, quoteId, approved });
    qc.invalidateQueries({ queryKey: ["portalQuotes", job.id] });
    onUpdate?.();
    setActing(null);
  };

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8 text-muted-foreground" />;
  if (!visibleQuotes.length) return (
    <div className="py-8 text-center text-muted-foreground text-sm">
      <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
      No quote available yet. We'll notify you when one is ready.
    </div>
  );

  return (
    <div className="space-y-4 py-2">
      {visibleQuotes.map((q) => {
        const settled = q.status === "approved" || q.status === "rejected";
        const statusColor = q.status === "approved" ? "text-emerald-600" : q.status === "rejected" ? "text-rose-500" : "text-violet-600";
        return (
          <div key={q.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">Repair Quote</span>
              <span className={`text-xs font-semibold capitalize ${statusColor}`}>{q.status}</span>
            </div>
            {/* Diagnosis */}
            {q.diagnosis_notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Diagnosis</p>
                <p className="text-sm text-foreground">{q.diagnosis_notes}</p>
              </div>
            )}
            {q.recommended_repair && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Recommended Repair</p>
                <p className="text-sm text-foreground">{q.recommended_repair}</p>
              </div>
            )}
            {/* Line items */}
            {q.line_items?.length > 0 && (
              <table className="w-full text-sm border-t border-border pt-2">
                <tbody>
                  {q.line_items.map((li, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 text-muted-foreground">{li.qty > 1 ? `${li.qty}× ` : ""}{li.description}</td>
                      <td className="py-1.5 text-right font-medium">${((Number(li.unit_price) || 0) * (Number(li.qty) || 1)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {/* Total */}
            <div className="flex items-center justify-between pt-1 border-t border-border">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-base font-bold text-foreground">{q.currency || "AUD"} ${Number(q.total || 0).toFixed(2)}</span>
            </div>
            {/* Customer signature */}
            {!settled && (
              <SignatureCapture
                job={job}
                signatureKey={`quote-${q.id}`}
                title="Sign off this repair quote"
                description="Sign here before approving to store your quote sign-off on the job file."
                fileName={`quote-signature-${q.id}.png`}
                onSigned={(url) => setSignedQuotes((current) => ({ ...current, [q.id]: url }))}
              />
            )}
            {/* Approve / deny (only if not yet settled) */}
            {!settled && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!!acting || !signedQuotes[q.id]}
                  onClick={() => handleApproval(q.id, true)}
                >
                  {acting === q.id + "_approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Approve Quote"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-rose-300 text-rose-600 hover:bg-rose-50"
                  disabled={!!acting}
                  onClick={() => handleApproval(q.id, false)}
                >
                  {acting === q.id + "_reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Decline"}
                </Button>
              </div>
            )}
            {settled && (
              <p className="text-xs text-center text-muted-foreground pt-1">
                {q.status === "approved" ? "✓ You approved this quote." : "✗ You declined this quote."}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InvoiceTab({ invoices = [], isLoading }) {
  const [paying, setPaying] = useState(null);

  const visible = invoices.filter(i => i.status && i.status !== "draft");

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8 text-muted-foreground" />;
  if (!visible.length) return (
    <div className="py-8 text-center text-muted-foreground text-sm">
      <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
      No invoice has been issued yet.
    </div>
  );

  return (
    <div className="space-y-4 py-2">
      {visible.map((inv) => {
        const isPaid = inv.status === "paid";
        return (
          <div key={inv.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">{inv.number ? `Invoice ${inv.number}` : "Invoice"}</span>
              <Badge variant="outline" className={`text-xs capitalize ${isPaid ? "border-emerald-300 text-emerald-600" : "border-rose-300 text-rose-500"}`}>
                {inv.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-semibold">Amount Due</span>
              <span className="text-base font-bold text-foreground">{inv.currency || "AUD"} ${Number(inv.amount || 0).toFixed(2)}</span>
            </div>
            {inv.paid_date && (
              <p className="text-xs text-muted-foreground">Paid {new Date(inv.paid_date).toLocaleDateString()}</p>
            )}
            {!isPaid && (
              <Button
                className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={paying === inv.id}
                onClick={async () => {
                  setPaying(inv.id);
                  try {
                    const result = await startInvoicePayment(inv);
                    if (result?.blocked) setPaying(null);
                  } catch (error) {
                    alert(error?.response?.data?.error || "Could not start checkout.");
                    setPaying(null);
                  }
                }}
              >
                {paying === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Pay securely with Stripe
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main modal ──────────────────────────────────────────────────────────────

export default function CustomerJobModal({ job, open, onClose, onUpdate, userEmail }) {
  const [tab, setTab] = useState("status");

  // Check if invoice tab should be visible
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["portalInvoiceCheck", job?.id],
    queryFn: () => base44.entities.Invoice.filter({ job_id: job.id }, "-created_date", 10),
    enabled: !!job?.id,
  });
  const hasInvoice = invoices.some(i => i.status && i.status !== "draft");

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-extrabold flex items-center gap-2">
            <span>{job.asset_label || job.scooter_label || "Your Repair"}</span>
            {job.reference && <span className="text-xs font-normal text-muted-foreground">#{job.reference}</span>}
          </DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className={`grid w-full ${hasInvoice ? "grid-cols-4" : "grid-cols-3"} mb-1`}>
            <TabsTrigger value="status" className="text-xs">Status</TabsTrigger>
            <TabsTrigger value="quotes" className="text-xs">Quote</TabsTrigger>
            {hasInvoice && <TabsTrigger value="invoice" className="text-xs">Invoice</TabsTrigger>}
            <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
          </TabsList>
          <div className="overflow-y-auto flex-1 pr-1">
            <TabsContent value="status" className="mt-0">
              {tab === "status" && <StatusTab job={job} />}
            </TabsContent>
            <TabsContent value="quotes" className="mt-0">
              {tab === "quotes" && <QuotesTab job={job} onUpdate={onUpdate} />}
            </TabsContent>
            {hasInvoice && (
              <TabsContent value="invoice" className="mt-0">
                {tab === "invoice" && <InvoiceTab invoices={invoices} isLoading={invoicesLoading} />}
              </TabsContent>
            )}
            <TabsContent value="history" className="mt-0">
              {tab === "history" && <HistoryTab userEmail={userEmail} />}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}