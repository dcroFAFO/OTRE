import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CUSTOMER_JOB_MILESTONES, getCustomerJobProgress, getStatus, normalizeStatusKey } from "@/config/jobConfig";
import { AlertCircle, CheckCircle2, Circle, Clock, Wrench, Receipt } from "lucide-react";
import { startInvoicePayment } from "@/services/paymentService";
import SignatureCapture from "@/components/portal/SignatureCapture";
import CustomerInvoiceCard from "@/components/portal/CustomerInvoiceCard";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/shared";
import { getSafeErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

function normalizedStatus(status) {
  return normalizeStatusKey(status);
}

function StatusTab({ job }) {
  const progress = getCustomerJobProgress(job.status);
  const current = progress.currentIndex;
  const statusDef = getStatus(job.status);
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
      {progress.cancelled ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Job cancelled</AlertTitle>
          <AlertDescription>This job is closed as cancelled. It has not been marked complete.</AlertDescription>
        </Alert>
      ) : (
      <ol className="relative space-y-0" aria-label="Job progress">
        {CUSTOMER_JOB_MILESTONES.map((m, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={m.key} className="flex gap-4 pb-6 last:pb-0 relative">
              {i < CUSTOMER_JOB_MILESTONES.length - 1 && <div className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${done || active ? "bg-primary/40" : "bg-border"}`} />}
              <div className={`relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${active ? m.active : done ? m.done : "border-border bg-background text-muted-foreground"}`}>
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
      )}
    </div>
  );
}

function jobBalance(job, invoices) {
  const jobInvoices = invoices.filter((inv) => inv.job_id === job.id && inv.invoiceVisibility === "customer_visible" && inv.status && inv.status !== "draft");
  if (!jobInvoices.length) return "Balance unavailable";
  const owing = jobInvoices.filter((inv) => inv.status !== "paid" && inv.status !== "refunded").reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  if (owing > 0) return `Owing: $${owing.toFixed(2)}`;
  const paid = jobInvoices.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  if (paid > 0) return `Paid: $${paid.toFixed(2)}`;
  return "Balance: $0.00";
}

function HistoryTab({ userEmail }) {
  const jobsQuery = useQuery({
    queryKey: ["portalHistory", userEmail],
    queryFn: () => base44.entities.Job.filter({ customer_email: userEmail, archived: false }, "-created_date", 50),
    enabled: !!userEmail,
  });
  // RLS restricts results to the customer's own customer-visible invoices.
  const invoicesQuery = useQuery({
    queryKey: ["portalHistoryInvoices", userEmail],
    queryFn: () => base44.entities.Invoice.list("-created_date", 100),
    enabled: !!userEmail,
  });
  const jobs = jobsQuery.data || [];
  const invoices = invoicesQuery.data || [];

  if (jobsQuery.isLoading) return <CardSkeleton compact label="Loading repair history" className="py-2" />;
  if (jobsQuery.error) return <ErrorState title="Repair history could not be loaded" error={jobsQuery.error} onRetry={jobsQuery.refetch} />;
  if (!jobs.length) return <EmptyState compact icon={Wrench} title="No repair history yet" description="Completed and previous repairs will appear here." />;

  return (
    <div className="space-y-3 py-2">
      {invoicesQuery.isLoading ? <CardSkeleton compact label="Loading repair balances" /> : null}
      {invoicesQuery.error ? <ErrorState title="Repair balances could not be loaded" error={invoicesQuery.error} onRetry={invoicesQuery.refetch} /> : null}
      <ul className="space-y-3">
        {jobs.map((job) => {
          const statusDef = getStatus(job.status);
          const balance = invoicesQuery.error || invoicesQuery.isLoading ? "Balance unavailable" : jobBalance(job, invoices);
          return (
            <li key={job.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{job.asset_label || job.scooter_label || "Scooter"}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{job.issue_description || "No issue description supplied"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{job.reference} · {new Date(job.created_date).toLocaleDateString("en-AU")}</p>
                <p className={`mt-1 text-xs font-semibold ${balance.startsWith("Owing") ? "text-rose-700" : balance.startsWith("Paid") ? "text-emerald-700" : "text-muted-foreground"}`}>{balance}</p>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs">{statusDef?.label || job.status}</Badge>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function InvoiceTab({ invoices = [], isLoading, error, onRetry, userId, onChanged }) {
  const [paying, setPaying] = useState(null);
  const visible = invoices.filter((i) => i.invoiceVisibility === "customer_visible" && i.status && i.status !== "draft");

  const pay = async (invoice) => {
    if (paying) return;
    setPaying(invoice.id);
    try {
      const result = await startInvoicePayment(invoice);
      if (result?.blocked) {
        toast.error(result.reason);
        setPaying(null);
      } else if (!result?.url) {
        toast.error("Secure checkout could not be started. Please try again.");
        setPaying(null);
      }
    } catch (caught) {
      toast.error(getSafeErrorMessage(caught, "Could not start payment. Please try again."));
      setPaying(null);
    }
  };

  if (isLoading) return <CardSkeleton compact label="Loading job invoices" className="py-2" />;
  if (error) return <ErrorState title="Invoices could not be loaded" error={error} onRetry={onRetry} />;
  if (!visible.length) return <EmptyState compact icon={Receipt} title="No invoice issued yet" description="An invoice will appear here after it is finalised by the workshop." />;

  return (
    <div className="space-y-4 py-2">
      {visible.map((invoice) => (
        <CustomerInvoiceCard
          key={invoice.id}
          invoice={invoice}
          userId={userId}
          onChanged={onChanged}
          onPay={() => pay(invoice)}
          paymentPending={paying === invoice.id}
        />
      ))}
    </div>
  );
}

/** @param {{ job: any, open: boolean, onClose: () => void, onUpdate?: () => void, userEmail?: string, userId?: string }} props */
export default function CustomerJobModal({ job, open, onClose, onUpdate, userEmail, userId }) {
  const [tab, setTab] = useState("status");
  // All invoices issued to this customer — RLS restricts results to their own customer-visible invoices.
  const { data: invoices = [], isLoading: invoicesLoading, error: invoicesError, refetch: refetchInvoices } = useQuery({
    queryKey: ["portalInvoices", userEmail],
    queryFn: () => base44.entities.Invoice.list("-created_date", 50),
    enabled: open,
  });

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
          <TabsList className="grid w-full grid-cols-3 mb-1">
            <TabsTrigger value="status" className="text-xs">Status</TabsTrigger>
            <TabsTrigger value="invoice" className="text-xs">Invoices</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
          </TabsList>
          <div className="overflow-y-auto flex-1 pr-1">
            <TabsContent value="status" className="mt-0">{tab === "status" && <StatusTab job={job} />}</TabsContent>
            <TabsContent value="invoice" className="mt-0">{tab === "invoice" && <InvoiceTab invoices={invoices} isLoading={invoicesLoading} error={invoicesError} onRetry={refetchInvoices} userId={userId} onChanged={refetchInvoices} />}</TabsContent>
            <TabsContent value="history" className="mt-0">{tab === "history" && <HistoryTab userEmail={userEmail} />}</TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
