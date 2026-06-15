import React from "react";
import { format } from "date-fns";
import StatusPill from "@/components/shared/StatusPill";
import { cn } from "@/lib/utils";

const fmtDate = (d) => (d ? format(new Date(d), "d MMM yyyy") : "—");

// List view of jobs with technician-focused columns.
export default function JobListTable({ jobs, onOpen }) {
  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="space-y-2.5 lg:hidden">
        {jobs.map((j) => (
          <button
            key={j.id}
            onClick={() => onOpen(j.id)}
            className={cn(
              "w-full text-left rounded-xl border border-border bg-card p-3.5 active:bg-secondary/40 transition-colors",
              j.payment_status === "outstanding" && "border-l-2 border-l-rose-400"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">{j.intake?.make || j.asset_label || j.scooter_label || "—"}</p>
                <p className="text-sm text-muted-foreground truncate">{j.customer_name || "—"}</p>
              </div>
              <StatusPill value={j.payment_status || "unpaid"} kind="payment" />
            </div>
            {j.issue_description && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{j.issue_description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              <span>Booked {fmtDate(j.created_date)}</span>
              <span>Expected {fmtDate(j.scheduled_date)}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden lg:block rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary/50 text-muted-foreground text-xs uppercase tracking-wide">
              <Th>Brand</Th>
              <Th>Issue</Th>
              <Th>Customer</Th>
              <Th>Booked</Th>
              <Th>Expected</Th>
              <Th>Invoice</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {jobs.map((j) => (
              <tr
                key={j.id}
                onClick={() => onOpen(j.id)}
                className={cn(
                  "cursor-pointer hover:bg-secondary/40 transition-colors",
                  j.payment_status === "outstanding" && "border-l-2 border-l-rose-400"
                )}
              >
                <Td className="font-semibold whitespace-nowrap">
                  {j.intake?.make || j.asset_label || j.scooter_label || "—"}
                </Td>
                <Td className="max-w-[260px]">
                  <span className="line-clamp-1 text-muted-foreground">{j.issue_description || "—"}</span>
                </Td>
                <Td className="whitespace-nowrap">{j.customer_name || "—"}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">{fmtDate(j.created_date)}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">{fmtDate(j.scheduled_date)}</Td>
                <Td className="whitespace-nowrap">
                  <StatusPill value={j.payment_status || "unpaid"} kind="payment" />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Th({ children }) {
  return <th className="px-4 py-2.5 text-left font-medium">{children}</th>;
}
function Td({ children, className }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}