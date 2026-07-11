import React from "react";

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Wrench, Receipt, History, ExternalLink, Mail, Phone, User,
  Bike, CreditCard
} from "lucide-react";
import StatusPill from "@/components/shared/StatusPill";
import { Badge } from "@/components/ui/badge";
import CustomerEditPanel from "@/components/admin/clients/CustomerEditPanel";
import { resolveCustomerForJob, fetchClientHistory } from "@/services/clientService";
import { format } from "date-fns";

const fmt = (d) => {
  if (!d) return "—";
  try { return format(new Date(d), "d MMM yyyy"); } catch { return "—"; }
};

const STAFF_ROLES = new Set(["admin", "employee", "technician", "staff"]);

export default function CustomerHistoryPanel({ job, actor }) {
  const email = job.customer_email;
  const isStaff = STAFF_ROLES.has(String(actor?.role || "").toLowerCase());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["customerProfile", job.id, job.customer_id, job.customer_account_id, job.customer_user_id, job.asset_id, job.updated_date || job.updatedAt || email],
    enabled: !!job?.id,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const customer = await resolveCustomerForJob(job);
      const history = customer?.id ? await fetchClientHistory(customer.id) : null;
      const jobs = history?.linked?.jobs || [];
      const invoices = history?.linked?.invoices || [];
      const assets = history?.linked?.scooters || [];

      return { customer, jobs, invoices, assets, history };
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-border border-t-primary rounded-full animate-spin" /></div>;
  }

  const customer = data?.customer;
  const jobs = data?.jobs || [];
  const invoices = data?.invoices || [];
  const currentJob = jobs.find((item) => item.id === job.id) || job;

  const totalSpend = invoices
    .filter((i) => i.status !== "cancelled")
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  return (
    <div className="space-y-6">

      {/* ── Profile card ── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading font-bold text-base truncate">{customer?.full_name || job.customer_name || "Unknown customer"}</p>
            <p className="text-xs text-muted-foreground">Customer profile</p>
          </div>
        </div>

        <div className="divide-y divide-border">
          {(customer?.email || job.customer_email) && (
            <div className="flex items-center gap-2.5 py-2 text-sm">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a href={`mailto:${customer?.email || job.customer_email}`} className="text-primary hover:underline truncate">
                {customer?.email || job.customer_email}
              </a>
            </div>
          )}
          {(customer?.phone_display || customer?.phone || job.customer_phone) && (
            <div className="flex items-center gap-2.5 py-2 text-sm">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a href={`tel:${customer?.phone || job.customer_phone}`} className="hover:underline">
                {customer?.phone_display || customer?.phone || job.customer_phone}
              </a>
            </div>
          )}
        </div>

        {isStaff && customer && (
          <div className="rounded-lg border border-border bg-secondary/20 p-3">
            <CustomerEditPanel
              customer={customer}
              actor={actor}
              linkedAssetId={currentJob.asset_id || job.asset_id}
              linkedAssetLabel={currentJob.asset_label || job.asset_label || job.scooter_make_model || job.scooter_details}
              onChange={refetch}
            />
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <StatChip icon={<Wrench className="h-3.5 w-3.5" />} label="Jobs" value={jobs.length} />
          <StatChip icon={<Receipt className="h-3.5 w-3.5" />} label="Invoices" value={invoices.length} />
          <StatChip icon={<CreditCard className="h-3.5 w-3.5" />} label="Spend" value={`$${totalSpend.toFixed(0)}`} />
        </div>
      </div>

      {/* ── Job history ── */}
      <section className="space-y-2">
        <SectionHeading icon={<History className="h-3.5 w-3.5" />} title="Job history" count={jobs.length} />

        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No jobs found for this customer yet.</p>
        ) : (
          <ol className="space-y-2">
            {jobs.map((j) => {
              const jobInvoices = invoices.filter((i) => i.job_id === j.id);
              const isCurrent = j.id === job.id;
              const assetLabel = j.asset_label || j.scooter_label || j.scooter_make_model || [j.intake?.make, j.intake?.model].filter(Boolean).join(" ");
              return (
                <li
                  key={j.id}
                  className={`rounded-xl border p-3 ${isCurrent ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate">
                          {j.reference || j.job_type || "Service"}
                        </span>
                        {isCurrent && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">This job</Badge>
                        )}
                      </div>

                      {assetLabel && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Bike className="h-3 w-3" /> {assetLabel}
                        </p>
                      )}

                      {(j.issue_summary || j.issue_description || j.service_type) && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{j.issue_summary || j.issue_description || j.service_type}</p>
                      )}

                      {jobInvoices.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {jobInvoices.map((i) => (
                            <span key={i.id} className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                              <Receipt className="h-2.5 w-2.5" />
                              {i.currency || "AUD"} {Number(i.amount || 0).toFixed(2)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusPill value={j.status} />
                      <span className="text-[11px] text-muted-foreground">{fmt(j.created_date)}</span>
                      {!isCurrent && (
                        <Link
                          to={`/dashboard/jobs?id=${j.id}`}
                          className="text-[11px] text-primary flex items-center gap-0.5 hover:underline"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

function StatChip({ icon, label, value }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg bg-secondary px-2 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="font-heading font-bold text-sm">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function SectionHeading({ icon, title, count }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {icon}
      <span>{title}</span>
      {count != null && <span className="ml-auto font-normal normal-case text-[11px]">{count} total</span>}
    </div>
  );
}
