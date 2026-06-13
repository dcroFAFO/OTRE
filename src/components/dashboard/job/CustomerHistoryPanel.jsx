import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Wrench, Receipt, History, ExternalLink } from "lucide-react";
import StatusPill from "@/components/shared/StatusPill";
import { format } from "date-fns";

const fmt = (d) => {
  if (!d) return "—";
  try { return format(new Date(d), "d MMM yyyy"); } catch { return "—"; }
};

// Shows the full repair history for the job's customer: every other job and
// its invoices, so a technician has context on what's been done before.
export default function CustomerHistoryPanel({ job }) {
  const customerId = job.customer_id;
  const email = job.customer_email;

  const { data, isLoading } = useQuery({
    queryKey: ["customerJobHistory", customerId || email],
    enabled: !!(customerId || email),
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [byId, byEmail] = await Promise.all([
        customerId ? base44.entities.Job.filter({ customer_id: customerId }, "-created_date", 100) : [],
        email ? base44.entities.Job.filter({ customer_email: email }, "-created_date", 100) : [],
      ]);
      const map = {};
      [...byId, ...byEmail].forEach((j) => { map[j.id] = j; });
      const jobs = Object.values(map).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      const invoices = (await Promise.all(
        jobs.map((j) => base44.entities.Invoice.filter({ job_id: j.id }, "-created_date", 10))
      )).flat();
      return { jobs, invoices };
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-border border-t-primary rounded-full animate-spin" /></div>;
  }

  const jobs = data?.jobs || [];
  const invoices = data?.invoices || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-heading font-bold">{job.customer_name}'s history</h3>
        <span className="text-xs text-muted-foreground">· {jobs.length} job{jobs.length !== 1 ? "s" : ""}</span>
      </div>

      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No previous jobs for this customer.</p>
      ) : (
        <ol className="space-y-2">
          {jobs.map((j) => {
            const jobInvoices = invoices.filter((i) => i.job_id === j.id);
            const isCurrent = j.id === job.id;
            return (
              <li
                key={j.id}
                className={`rounded-xl border p-3.5 ${isCurrent ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-semibold truncate">
                        {j.reference || (j.job_type || "Service")}
                      </span>
                      {isCurrent && <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-semibold">This job</span>}
                    </div>
                    {j.issue_description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{j.issue_description}</p>
                    )}
                    {jobInvoices.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {jobInvoices.map((i) => (
                          <span key={i.id} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Receipt className="h-3 w-3" />
                            {i.number || "Invoice"} · {i.currency || "AUD"} {Number(i.amount || 0).toFixed(2)} · {i.status || "outstanding"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <StatusPill value={j.status} />
                    <span className="text-[11px] text-muted-foreground">{fmt(j.created_date)}</span>
                    {!isCurrent && (
                      <Link to={`/dashboard/jobs?id=${j.id}`} className="text-[11px] text-primary flex items-center gap-0.5 hover:underline">
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
    </div>
  );
}