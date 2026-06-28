import React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Bike, CalendarDays, ExternalLink, FileText, Receipt, Wrench } from "lucide-react";
import StatusPill from "@/components/shared/StatusPill";

const fmt = (date) => { try { return date ? format(new Date(date), "d MMM yyyy") : "—"; } catch { return "—"; } };
const money = (amount, currency = "AUD") => amount || amount === 0 ? `${currency} ${Number(amount || 0).toFixed(2)}` : "—";

function Section({ icon: Icon, title, count, children }) {
  return <section className="rounded-xl border border-border bg-card p-3 space-y-3"><div className="flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4 text-primary" />{title}<span className="ml-auto text-xs text-muted-foreground">{count || 0}</span></div>{children}</section>;
}

export default function CustomerRelatedRecords({ history }) {
  const jobs = history?.linked?.jobs || [];
  const invoices = history?.linked?.invoices || [];
  const scooters = history?.linked?.scooters || [];
  return <div className="space-y-4">
    <Section icon={Bike} title="Linked scooters/assets" count={scooters.length}>{scooters.length ? scooters.map((s) => <div key={s.id} className="rounded-lg bg-secondary/40 p-3 text-sm"><p className="font-medium">{[s.make, s.model].filter(Boolean).join(" ") || "Unnamed asset"}</p><p className="text-xs text-muted-foreground">{[s.serial_number && `SN: ${s.serial_number}`, s.colour || s.color, s.notes].filter(Boolean).join(" · ") || "No extra details"}</p><p className="text-xs text-muted-foreground mt-1">{Number(s.related_job_count || 0)} related jobs · Last service {fmt(s.last_service_date)}</p></div>) : <Empty text="No linked scooters/assets yet." />}</Section>
    <Section icon={Wrench} title="Related jobs" count={jobs.length}>{jobs.length ? jobs.map((job) => <div key={job.id} className="rounded-lg border border-border p-3 text-sm space-y-2"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="font-medium truncate">{job.reference || "Job"}</p><p className="text-xs text-muted-foreground">{job.service_type || "Service"}{job.asset_label ? ` · ${job.asset_label}` : ""}</p></div><StatusPill value={job.status} /></div><div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground"><span>Created: {fmt(job.created_date)}</span><span>Scheduled: {fmt(job.scheduled_date)}</span><span>Completed: {fmt(job.completed_date)}</span><span>Quoted: {money(job.quoted_total)}</span><span>Invoiced: {money(job.invoiced_total)}</span></div><Link to={`/dashboard/jobs?id=${job.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Open job <ExternalLink className="h-3 w-3" /></Link></div>) : <Empty text="No related jobs found." />}</Section>
    <Section icon={Receipt} title="Related invoices" count={invoices.length}>{invoices.length ? invoices.map((invoice) => <div key={invoice.id} className="rounded-lg border border-border p-3 text-sm space-y-2"><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="font-medium truncate">{invoice.number || "Invoice"}</p><p className="text-xs text-muted-foreground">Job {invoice.job_reference || "—"}</p></div><StatusPill type="payment" value={invoice.status} /></div><div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground"><span>Issued: {fmt(invoice.issue_date)}</span><span>Due: {fmt(invoice.due_date)}</span><span>Paid: {fmt(invoice.paid_date)}</span><span>Total: {money(invoice.amount, invoice.currency)}</span><span>Outstanding: {money(invoice.outstanding_balance, invoice.currency)}</span></div><Link to={`/dashboard/invoices?id=${invoice.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Open invoice <ExternalLink className="h-3 w-3" /></Link></div>) : <Empty text="No related invoices found." />}</Section>
  </div>;
}

function Empty({ text }) { return <p className="rounded-lg bg-secondary/30 p-3 text-sm text-muted-foreground">{text}</p>; }