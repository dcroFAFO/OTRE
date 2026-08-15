import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CreditCard, FileText, RefreshCw, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusPill from "@/components/shared/StatusPill";
import { BoundedDataNotice, CardSkeleton, EmptyState, ErrorState, NoResultsState, TableSkeleton } from "@/components/shared";
import { useDashboardUser } from "@/components/dashboard/DashboardLayout";
import JobDetailModal from "@/components/dashboard/job/JobDetailModal";
import { useEntityPages } from "@/hooks/useEntityPages";

const OPEN_STATUSES = new Set(["outstanding", "unpaid"]);
const STATUS_FILTERS = ["all", "outstanding", "paid", "refunded"];
const INVOICE_PAGE_SIZE = 100;
const JOB_LOOKUP_CHUNK_SIZE = 100;

function currency(amount, code = "AUD") {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: code || "AUD" }).format(Number(amount || 0));
}

export function isIssuedInvoice(invoice) {
  return invoice?.invoiceVisibility === "customer_visible" && Boolean(invoice?.invoiceSentAt);
}

export function paymentStatus(invoice) {
  return ["unpaid", "issued"].includes(invoice?.status) ? "outstanding" : (invoice?.status || "outstanding");
}

async function listInvoiceJobs(jobIds) {
  const chunks = [];
  for (let index = 0; index < jobIds.length; index += JOB_LOOKUP_CHUNK_SIZE) {
    chunks.push(jobIds.slice(index, index + JOB_LOOKUP_CHUNK_SIZE));
  }
  const pages = await Promise.all(chunks.map((ids) =>
    base44.entities.Job.filter({ id: { $in: ids } }, "-created_date", ids.length),
  ));
  return pages.flat();
}

export default function Invoices() {
  const user = useDashboardUser();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedJobId, setSelectedJobId] = useState(/** @type {string | null} */ (null));

  const invoiceQuery = useEntityPages({
    queryKey: ["dashboardInvoices"],
    fetchPage: ({ limit, skip }) => base44.entities.Invoice.list("-created_date", limit, skip),
    pageSize: INVOICE_PAGE_SIZE,
  });
  const invoiceRecords = /** @type {Array<Record<string, any>>} */ (invoiceQuery.data || []);
  const invoiceJobIds = useMemo(() => [...new Set(invoiceRecords.map((invoice) => invoice.job_id).filter(Boolean))].sort(), [invoiceRecords]);
  const jobsQuery = useQuery({
    queryKey: ["invoiceJobs", invoiceJobIds],
    queryFn: () => listInvoiceJobs(invoiceJobIds),
    enabled: invoiceJobIds.length > 0,
  });

  const invoices = useMemo(() => invoiceRecords.filter(isIssuedInvoice), [invoiceRecords]);
  const jobs = /** @type {Array<Record<string, any>>} */ (jobsQuery.data || []);
  const jobById = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);
  const enriched = /** @type {Array<Record<string, any>>} */ (useMemo(() => invoices.map((invoice) => ({
    ...invoice,
    job: jobById.get(invoice.job_id),
    paymentStatus: paymentStatus(invoice),
  })), [invoices, jobById]));

  const filtered = enriched.filter((invoice) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [
      invoice.number,
      invoice.job?.reference,
      invoice.job?.customer_name,
      invoice.job?.customer_email,
      invoice.customer_id,
    ].some((value) => String(value || "").toLowerCase().includes(term));
    const matchesStatus = statusFilter === "all" || invoice.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totals = enriched.reduce((acc, invoice) => {
    const amount = Number(invoice.amount) || 0;
    acc.total += amount;
    if (invoice.paymentStatus === "paid") acc.paid += amount;
    if (OPEN_STATUSES.has(invoice.paymentStatus)) acc.outstanding += amount;
    return acc;
  }, { total: 0, paid: 0, outstanding: 0 });

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };
  const hasFilters = Boolean(search.trim()) || statusFilter !== "all";
  const openInvoiceJob = (invoice) => {
    if (invoice.job_id) setSelectedJobId(invoice.job_id);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-foreground">Invoices</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Track issued invoices and manually recorded payment status. Issued invoices are due on receipt.</p>
        </div>
        {invoiceQuery.isFetching && !invoiceQuery.isLoading ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Refreshing invoices
          </span>
        ) : null}
      </header>

      {invoiceQuery.isLoading ? (
        <CardSkeleton count={4} />
      ) : invoiceQuery.error && !invoices.length ? null : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Total issued" value={currency(totals.total)} icon={FileText} />
          <SummaryCard label="Due now" value={currency(totals.outstanding)} icon={CreditCard} />
          <SummaryCard label="Paid" value={currency(totals.paid)} icon={CalendarDays} />
          <SummaryCard label="Payment terms" value="Due on receipt" icon={CalendarDays} />
        </div>
      )}

      <BoundedDataNotice
        noun="invoices"
        loadedCount={invoiceRecords.length}
        hasMore={invoiceQuery.hasNextPage}
        isLoadingMore={invoiceQuery.isFetchingNextPage}
        onLoadMore={invoiceQuery.fetchNextPage}
        description={`Invoice rows and financial totals currently cover ${invoiceRecords.length} loaded records. Load more before treating totals or search results as complete.`}
      />

      <div className="space-y-3 border-y border-border py-4">
        <label className="relative block max-w-md">
          <span className="sr-only">Search invoices or customers</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search invoices or customers" className="h-11 pl-9" />
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter invoices by status">
          {STATUS_FILTERS.map((status) => (
            <Button
              key={status}
              type="button"
              size="touch"
              variant={statusFilter === status ? "default" : "outline"}
              className="shrink-0 capitalize sm:h-9"
              aria-pressed={statusFilter === status}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {invoiceQuery.error && invoiceRecords.length ? (
        <ErrorState title="Latest invoice changes could not be loaded" description="Previously loaded invoices remain visible." error={invoiceQuery.error} onRetry={invoiceQuery.refetch} />
      ) : null}
      {jobsQuery.error ? (
        <ErrorState title="Linked job details could not be loaded" description="Invoice totals and statuses remain available." error={jobsQuery.error} onRetry={jobsQuery.refetch} />
      ) : null}

      {invoiceQuery.isLoading ? (
        <TableSkeleton rows={7} columns={5} label="Loading invoices" />
      ) : invoiceQuery.error && !invoiceRecords.length ? (
        <ErrorState title="Invoices could not be loaded" error={invoiceQuery.error} onRetry={invoiceQuery.refetch} />
      ) : !invoices.length && invoiceQuery.hasNextPage ? (
        <EmptyState
          icon={FileText}
          title="No issued invoices in the loaded records"
          description="Older issued invoices may still exist. Load the next page to continue checking."
          action={<Button type="button" onClick={() => invoiceQuery.fetchNextPage()} disabled={invoiceQuery.isFetchingNextPage}>{invoiceQuery.isFetchingNextPage ? "Loading invoices…" : "Load more invoices"}</Button>}
        />
      ) : !invoices.length ? (
        <EmptyState icon={FileText} title="No invoices have been issued" description="Invoices created from a job will appear here with their payment status." />
      ) : !filtered.length ? (
        <NoResultsState title="No invoices match these filters" description="Clear the search or status filter to return to all invoices." onClear={clearFilters} />
      ) : (
        <InvoiceResults invoices={filtered} jobsLoading={jobsQuery.isLoading} onOpenJob={openInvoiceJob} />
      )}

      <JobDetailModal
        jobId={selectedJobId}
        actor={user}
        open={Boolean(selectedJobId)}
        onClose={() => {
          setSelectedJobId(null);
          queryClient.invalidateQueries({ queryKey: ["dashboardInvoices"] });
        }}
      />
    </div>
  );
}

/** @param {{ invoices: Array<Record<string, any>>, jobsLoading: boolean, onOpenJob: (invoice: Record<string, any>) => void }} props */
function InvoiceResults({ invoices, jobsLoading, onOpenJob }) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {invoices.map((invoice) => <InvoiceCard key={invoice.id} invoice={invoice} jobsLoading={jobsLoading} onOpenJob={onOpenJob} />)}
      </div>
      <div className="hidden overflow-hidden rounded-lg border border-border bg-card shadow-sm md:block">
        <table className="w-full table-fixed text-sm">
          <caption className="sr-only">Issued invoices and manually recorded payment statuses</caption>
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase text-muted-foreground">
              <th className="w-[28%] px-4 py-3 text-left lg:w-[22%]">Invoice</th>
              <th className="w-[28%] px-4 py-3 text-left lg:w-[24%]">Customer</th>
              <th className="hidden w-[22%] px-4 py-3 text-left lg:table-cell">Issued / Due</th>
              <th className="w-[18%] px-4 py-3 text-right lg:w-[14%]">Amount</th>
              <th className="w-[26%] px-4 py-3 text-left lg:w-[18%]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="transition-colors">
                <td className="overflow-hidden px-4 py-3">
                  {invoice.job_id ? (
                    <button type="button" onClick={() => onOpenJob(invoice)} className="max-w-full text-left font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="block truncate">{invoice.number || "Invoice"}</span>
                    </button>
                  ) : <p className="truncate font-semibold">{invoice.number || "Invoice"}</p>}
                  <p className="truncate text-xs text-muted-foreground">{invoice.job?.reference || invoice.job_id || "No linked job"}</p>
                </td>
                <td className="overflow-hidden px-4 py-3">
                  <p className="truncate font-medium">{invoice.job?.customer_name || (jobsLoading ? "Loading job details..." : "Not available")}</p>
                  <p className="truncate text-xs text-muted-foreground">{invoice.job?.customer_email || invoice.customer_id || ""}</p>
                </td>
                <td className="hidden overflow-hidden px-4 py-3 text-muted-foreground lg:table-cell">
                  <p className="truncate">Issued {formatDate(invoice.invoiceSentAt)}</p>
                  <p className="truncate text-xs">Due on receipt</p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-heading font-bold">{currency(invoice.amount, invoice.currency)}</td>
                <td className="px-4 py-3">
                   <StatusPill kind="payment" value={invoice.paymentStatus} />
                  {invoice.paid_date ? <p className="mt-1 truncate text-xs text-muted-foreground">Paid {formatDate(invoice.paid_date)}</p> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** @param {{ invoice: Record<string, any>, jobsLoading: boolean, onOpenJob: (invoice: Record<string, any>) => void }} props */
function InvoiceCard({ invoice, jobsLoading, onOpenJob }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{invoice.number || "Invoice"}</h2>
          <p className="truncate text-xs text-muted-foreground">{invoice.job?.reference || invoice.job_id || "No linked job"}</p>
        </div>
        <StatusPill kind="payment" value={invoice.paymentStatus} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div><dt className="text-xs text-muted-foreground">Customer</dt><dd className="mt-0.5 truncate font-medium">{invoice.job?.customer_name || (jobsLoading ? "Loading..." : "Not available")}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Amount</dt><dd className="mt-0.5 font-heading font-bold">{currency(invoice.amount, invoice.currency)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Issued</dt><dd className="mt-0.5">{formatDate(invoice.invoiceSentAt)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Due</dt><dd className="mt-0.5">On receipt</dd></div>
      </dl>
      {invoice.job_id ? <Button type="button" variant="outline" size="touch" className="mt-4 w-full" onClick={() => onOpenJob(invoice)}>Open linked job</Button> : null}
    </article>
  );
}

/** @param {any} value */
function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("en-AU") : "Not set";
}

/** @param {{ label: string, value: string, icon: React.ElementType, danger?: boolean }} props */
function SummaryCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="mt-2 font-heading text-xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}
