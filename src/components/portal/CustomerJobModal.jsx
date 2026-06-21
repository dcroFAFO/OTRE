import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DEFAULT_JOB_STATUSES } from "@/config/platformConfig";
import { Loader2, CheckCircle2, Circle, Clock, Wrench, FileText, Receipt, CreditCard } from "lucide-react";
import { startInvoicePayment } from "@/services/paymentService";
import SignatureCapture from "@/components/portal/SignatureCapture";

const MILESTONES = [
  { key: "requested", label: "Booking Received" },
  { key: "booked", label: "Job Booked" },
  { key: "repair_in_progress", label: "Repair Underway" },
  { key: "ready_for_pickup", label: "Ready for Pickup" },
  { key: "invoice_sent", label: "Invoice Issued" },
  { key: "paid", label: "Paid" },
  { key: "completed", label: "Completed" },
];

const LEGACY_STATUS_MAP = {
  pending_confirmation: "on_hold",
  technician_assigned: "booked",
  quote_required: "requested",
  quote_sent: "booked",
  quote_approved: "booked",
  active: "repair_in_progress",
  waiting_parts: "waiting_on_parts",
  invoice_outstanding: "invoice_sent",
};

function normalizedStatus(status) {
  return LEGACY_STATUS_MAP[status] || status;
}

function getMilestoneIndex(statusKey) {
  const status = normalizedStatus(statusKey);
  const direct = MILESTONES.findIndex((m) => m.key === status);
  if (direct !== -1) return direct;
  if (status === "waiting_on_parts" || status === "on_hold") return 2;
  if (status === "cancelled") return MILESTONES.length - 1;
  return 0;
}

function StatusTab({ job }) {
  const current = getMilestoneIndex(job.status);
  const statusDef = DEFAULT_JOB_STATUSES.find((s) => s.key === normalizedStatus(job.status));
  const canAcknowledgeCompletion = normalizedStatus(job.status) === "completed";

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
        Current status: <span className="font-semibold text-foreground ml-1">{statusDef?.label || job.status}</span>
      </div>
      <ol className="relative space-y-0">
        {MILESTONES.map((m, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={m.key} className="flex gap-4 pb-6 last:pb-0 relative">
              {i < MILESTONES.length - 1 && <div className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${done || active ? "bg-primary/40" : "bg-border"}`} />}
              <div className={`relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : done ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"}`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : active ? <Wrench className="h-4 w-4" /> : <Circle className="h-4 w-4 opacity-40" />}
              </div>
              <div className="pt-0.5">
                <p className={`text-sm font-medium leading-tight ${active ? "text-foreground" : done ? "text-foreground/70" : "text-muted-foreground"}`}>{m.label}</p>
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
        const statusDef = DEFAULT_JOB_STATUSES.find((s) => s.key === normalizedStatus(j.status));
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

function QuotesTab({ job }) {
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["portalQuotes", job.id],
    queryFn: () => base44.entities.Quote.filter({ job_id: job.id }, "-created_date", 10),
  });
  const visibleQuotes = quotes.filter((q) => ["sent", "approved", "rejected"].includes(q.status));

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8 text-muted-foreground" />;
  if (!visibleQuotes.length) return <div className="py-8 text-center text-muted-foreground text-sm"><FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />No estimate available yet. We'll notify you when one is ready.</div>;

  return (
    <div className="space-y-4 py-2">
      {visibleQuotes.map((q) => (
        <div key={q.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">Repair Estimate</span>
            <span className="text-xs font-semibold capitalize text-muted-foreground">{q.status}</span>
          </div>
          {q.diagnosis_notes && <Field label="Diagnosis">{q.diagnosis_notes}</Field>}
          {q.recommended_repair && <Field label="Recommended Repair">{q.recommended_repair}</Field>}
          {q.line_items?.length > 0 && <LineItems items={q.line_items} currency={q.currency} />}
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className="text-sm font-semibold">Estimate Total</span>
            <span className="text-base font-bold text-foreground">{q.currency || "AUD"} ${Number(q.total || 0).toFixed(2)}</span>
          </div>
          <p className="text-xs text-muted-foreground pt-1">This estimate is for your information. Our team will contact you if anything changes.</p>
        </div>
      ))}
    </div>
  );
}

function InvoiceTab({ invoices = [], isLoading }) {
  const [paying, setPaying] = useState(null);
  const visible = invoices.filter((i) => i.invoiceVisibility === "customer_visible" && i.status && i.status !== "draft");

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin mx-auto mt-8 text-muted-foreground" />;
  if (!visible.length) return <div className="py-8 text-center text-muted-foreground text-sm"><Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />No invoice has been issued yet.</div>;

  return (
    <div className="space-y-4 py-2">
      {visible.map((inv) => {
        const isPaid = inv.status === "paid";
        return (
          <div key={inv.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">{inv.number ? `Invoice ${inv.number}` : "Invoice"}</span>
              <Badge variant="outline" className={`text-xs capitalize ${isPaid ? "border-emerald-300 text-emerald-600" : "border-rose-300 text-rose-500"}`}>{inv.status}</Badge>
            </div>
            {inv.line_items?.length > 0 && <LineItems items={inv.line_items} currency={inv.currency} />}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-semibold">Amount Due</span>
              <span className="text-base font-bold text-foreground">{inv.currency || "AUD"} ${Number(inv.amount || 0).toFixed(2)}</span>
            </div>
            {inv.paid_date && <p className="text-xs text-muted-foreground">Paid {new Date(inv.paid_date).toLocaleDateString()}</p>}
            {!isPaid && (
              <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={paying === inv.id} onClick={async () => {
                setPaying(inv.id);
                const result = await startInvoicePayment(inv);
                if (result?.blocked) setPaying(null);
              }}>
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

export default function CustomerJobModal({ job, open, onClose, userEmail }) {
  const [tab, setTab] = useState("status");
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["portalInvoiceCheck", job?.id],
    queryFn: () => base44.entities.Invoice.filter({ job_id: job.id }, "-created_date", 10),
    enabled: !!job?.id,
  });
  const hasInvoice = invoices.some((i) => i.invoiceVisibility === "customer_visible" && i.status && i.status !== "draft");

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
            <TabsTrigger value="quotes" className="text-xs">Estimate</TabsTrigger>
            {hasInvoice && <TabsTrigger value="invoice" className="text-xs">Invoice</TabsTrigger>}
            <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
          </TabsList>
          <div className="overflow-y-auto flex-1 pr-1">
            <TabsContent value="status" className="mt-0">{tab === "status" && <StatusTab job={job} />}</TabsContent>
            <TabsContent value="quotes" className="mt-0">{tab === "quotes" && <QuotesTab job={job} />}</TabsContent>
            {hasInvoice && <TabsContent value="invoice" className="mt-0">{tab === "invoice" && <InvoiceTab invoices={invoices} isLoading={invoicesLoading} />}</TabsContent>}
            <TabsContent value="history" className="mt-0">{tab === "history" && <HistoryTab userEmail={userEmail} />}</TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return <div><p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p><p className="text-sm text-foreground">{children}</p></div>;
}

function lineTotal(item) {
  const base = (Number(item.unit_price) || 0) * (Number(item.qty) || 1);
  const tax = base * ((Number(item.tax_rate) || 0) / 100);
  return base + tax - (Number(item.discount_amount) || 0);
}

function LineItems({ items, currency = "AUD" }) {
  return (
    <table className="w-full text-sm border-t border-border pt-2">
      <tbody>
        {items.map((li, i) => (
          <tr key={i} className="border-b border-border/50 last:border-0">
            <td className="py-1.5 text-muted-foreground">{li.qty > 1 ? `${li.qty}× ` : ""}{li.description}</td>
            <td className="py-1.5 text-right font-medium">{currency} ${lineTotal(li).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}