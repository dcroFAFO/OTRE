import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import StatusPill from "@/components/shared/StatusPill";
import { cn } from "@/lib/utils";
import { AlertTriangle, CalendarDays, CreditCard, FileText, Loader2, Search } from "lucide-react";

const OVERDUE_DAYS = 14;
const OPEN_STATUSES = new Set(["outstanding", "unpaid"]);

function currency(amount, code = "AUD") {
  return `${code} ${Number(amount || 0).toFixed(2)}`;
}

function daysSince(dateValue) {
  if (!dateValue) return 0;
  return Math.floor((Date.now() - new Date(dateValue).getTime()) / 86400000);
}

function dueDateFor(invoice) {
  const baseDate = invoice.created_date || invoice.updated_date;
  if (!baseDate) return null;
  const due = new Date(baseDate);
  due.setDate(due.getDate() + OVERDUE_DAYS);
  return due;
}

function isOverdue(invoice) {
  return OPEN_STATUSES.has(invoice.status || "outstanding") && daysSince(invoice.created_date || invoice.updated_date) > OVERDUE_DAYS;
}

export default function Invoices() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["dashboardInvoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 200),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["invoiceJobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 300),
  });

  const jobById = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);

  const enriched = useMemo(() => invoices.map((invoice) => ({
    ...invoice,
    job: jobById.get(invoice.job_id),
    overdue: isOverdue(invoice),
    dueDate: dueDateFor(invoice),
  })), [invoices, jobById]);

  const filtered = enriched.filter((invoice) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [
      invoice.number,
      invoice.job?.reference,
      invoice.job?.customer_name,
      invoice.job?.customer_email,
      invoice.customer_id,
    ].some((value) => String(value || "").toLowerCase().includes(term));
    const matchesStatus = statusFilter === "all" || (statusFilter === "overdue" ? invoice.overdue : invoice.status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  const totals = enriched.reduce((acc, invoice) => {
    const amount = Number(invoice.amount) || 0;
    acc.total += amount;
    if (invoice.status === "paid") acc.paid += amount;
    if (OPEN_STATUSES.has(invoice.status || "outstanding")) acc.outstanding += amount;
    if (invoice.overdue) acc.overdue += amount;
    return acc;
  }, { total: 0, paid: 0, outstanding: 0, overdue: 0 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track issued invoices, payment status, and overdue payments.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total issued" value={currency(totals.total)} icon={FileText} />
        <SummaryCard label="Outstanding" value={currency(totals.outstanding)} icon={CreditCard} />
        <SummaryCard label="Paid" value={currency(totals.paid)} icon={CalendarDays} />
        <SummaryCard label="Overdue" value={currency(totals.overdue)} icon={AlertTriangle} danger={totals.overdue > 0} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices, customers…" className="pl-9 rounded-xl" />
        </div>
        {["all", "outstanding", "paid", "refunded", "overdue"].map((status) => (
          <Button
            key={status}
            size="sm"
            variant={statusFilter === status ? "default" : "outline"}
            className="rounded-xl capitalize"
            onClick={() => setStatusFilter(status)}
          >
            {status}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">No invoices found</p>
          <p className="text-sm mt-1">Issued invoices will appear here.</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 text-left">Invoice</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Customer</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Issued / Due</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((invoice) => (
                <tr key={invoice.id} className={cn("transition-colors hover:bg-secondary/30", invoice.overdue && "bg-rose-50/70 hover:bg-rose-50")}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{invoice.number || "Invoice"}</p>
                    <p className="text-xs text-muted-foreground">{invoice.job?.reference || invoice.job_id || "No linked job"}</p>
                    {invoice.overdue && <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><AlertTriangle className="h-3 w-3" /> Overdue</p>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="font-medium text-foreground">{invoice.job?.customer_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{invoice.job?.customer_email || invoice.customer_id || "—"}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    <p>Issued {invoice.created_date ? new Date(invoice.created_date).toLocaleDateString() : "—"}</p>
                    <p className={cn("text-xs", invoice.overdue && "font-semibold text-rose-600")}>Due {invoice.dueDate ? invoice.dueDate.toLocaleDateString() : "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-heading font-bold">{currency(invoice.amount, invoice.currency)}</td>
                  <td className="px-4 py-3">
                    <StatusPill kind="payment" value={invoice.status || "outstanding"} />
                    {invoice.paid_date && <p className="mt-1 text-xs text-muted-foreground">Paid {new Date(invoice.paid_date).toLocaleDateString()}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, danger = false }) {
  return (
    <div className={cn("rounded-3xl border bg-card p-4 shadow-sm", danger ? "border-rose-200 bg-rose-50" : "border-border")}>
      <div className="flex items-center justify-between gap-3">
        <p className={cn("text-xs font-semibold uppercase tracking-wide", danger ? "text-rose-600" : "text-muted-foreground")}>{label}</p>
        {React.createElement(Icon, { className: cn("h-4 w-4", danger ? "text-rose-500" : "text-muted-foreground") })}
      </div>
      <p className="mt-2 font-heading text-xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}