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
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
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
  );
}

function Th({ children }) {
  return <th className="px-4 py-2.5 text-left font-medium">{children}</th>;
}
function Td({ children, className, onClick }) {
  return <td onClick={onClick} className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}