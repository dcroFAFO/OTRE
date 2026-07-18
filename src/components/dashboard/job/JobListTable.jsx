import React from "react";
import { format } from "date-fns";
import StatusPill from "@/components/shared/StatusPill";
import ServiceTypeBadge from "@/components/shared/ServiceTypeBadge";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

const fmtDate = (d) => (d ? format(new Date(d), "d MMM yyyy") : "—");

// List view of jobs with optional multi-select.
export default function JobListTable({ jobs, onOpen, selectedIds = [], onSelectionChange }) {
  const allSelected = jobs.length > 0 && jobs.every((j) => selectedIds.includes(j.id));
  const someSelected = jobs.some((j) => selectedIds.includes(j.id));

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !jobs.find((j) => j.id === id)));
    } else {
      const newIds = [...new Set([...selectedIds, ...jobs.map((j) => j.id)])];
      onSelectionChange(newIds);
    }
  };

  const toggleOne = (id, e) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((s) => s !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <>
    {/* Mobile: stacked cards — no horizontal scrolling */}
    <div className="sm:hidden space-y-2">
      {jobs.map((j) => {
        const isSelected = selectedIds.includes(j.id);
        return (
          <div
            key={j.id}
            onClick={() => onOpen(j.id)}
            className={cn(
              "rounded-2xl border border-border bg-card p-3.5 shadow-sm cursor-pointer",
              j.payment_status === "outstanding" && "border-l-2 border-l-rose-400",
              isSelected && "bg-accent/10 border-accent/40"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <span onClick={(e) => e.stopPropagation()} className="grid h-6 w-6 place-items-center shrink-0">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleOne(j.id, { stopPropagation: () => {} })}
                    aria-label={`Select job for ${j.customer_name}`}
                  />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{j.customer_name || "—"}</p>
                  <p className="text-xs text-muted-foreground truncate">{j.intake?.make || j.asset_label || j.scooter_label || "—"}</p>
                </div>
              </div>
              <StatusPill value={j.status || "requested"} kind="job" />
            </div>
            {j.issue_description && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{j.issue_description}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <ServiceTypeBadge job={j} />
              <span>Booked {fmtDate(j.created_date)}</span>
              {j.scheduled_date && (
                <span className={j.status === "requested" ? "font-semibold text-accent" : ""}>
                  {j.status === "requested" ? "Requested" : "Expected"} {fmtDate(j.scheduled_date)}
                </span>
              )}
              {j.preferred_time_window === "ASAP" && (
                <span className="font-semibold text-amber-600">ASAP</span>
              )}
            </div>
          </div>
        );
      })}
    </div>

    {/* Desktop / tablet: full table */}
    <div className="hidden sm:block rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary/40 text-muted-foreground text-xs uppercase tracking-wide">
              <th className="px-4 py-2.5 w-10">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <Th>Brand</Th>
              <Th>Service</Th>
              <Th>Issue</Th>
              <Th>Customer</Th>
              <Th>Booked</Th>
              <Th>Expected</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {jobs.map((j) => {
              const isSelected = selectedIds.includes(j.id);
              return (
                <tr
                  key={j.id}
                  onClick={() => onOpen(j.id)}
                  className={cn(
                    "cursor-pointer hover:bg-secondary/40 transition-colors",
                    j.payment_status === "outstanding" && "border-l-2 border-l-rose-400",
                    isSelected && "bg-accent/10"
                  )}
                >
                  <Td onClick={(e) => e.stopPropagation()} className="w-10">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(j.id, { stopPropagation: () => {} })}
                      aria-label={`Select job for ${j.customer_name}`}
                    />
                  </Td>
                  <Td className="font-semibold whitespace-nowrap">
                    {j.intake?.make || j.asset_label || j.scooter_label || "—"}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <ServiceTypeBadge job={j} />
                  </Td>
                  <Td className="max-w-[260px]">
                    <span className="line-clamp-1 text-muted-foreground">{j.issue_description || "—"}</span>
                  </Td>
                  <Td className="whitespace-nowrap">{j.customer_name || "—"}</Td>
                  <Td className="whitespace-nowrap text-muted-foreground">{fmtDate(j.created_date)}</Td>
                  <Td className="whitespace-nowrap text-muted-foreground">{fmtDate(j.scheduled_date)}</Td>
                  <Td className="whitespace-nowrap">
                    <StatusPill value={j.status || "requested"} kind="job" />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}

function Th({ children }) {
  return <th className="px-4 py-2.5 text-left font-medium">{children}</th>;
}
function Td({ children, className, onClick }) {
  return <td onClick={onClick} className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}