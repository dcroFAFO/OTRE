import React from "react";
import { format } from "date-fns";
import StatusPill from "@/components/shared/StatusPill";
import ServiceTypeBadge from "@/components/shared/ServiceTypeBadge";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { getTimeWindowLabel, normalizeStatusKey } from "@/config/jobConfig";
import { JOB_CATEGORIES } from "@/components/dashboard/job/JobCategoryFilters";

const fmtDate = (d) => (d ? format(new Date(d), "d MMM yyyy") : "—");
const fmtDateTime = (d) => (d ? format(new Date(d), "d MMM, h:mma") : "—");
const fmtSchedule = (j) => {
  if (!j.scheduled_date) return "—";
  const time = j.preferred_time_window ? getTimeWindowLabel(j.preferred_time_window).split(" ")[0] : "";
  return time ? `${fmtDate(j.scheduled_date)} · ${time}` : fmtDate(j.scheduled_date);
};

const SECTION_CATEGORIES = JOB_CATEGORIES.filter((c) => c.key !== "all");

// List view of jobs grouped by status category, with section headers always visible.
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

  const grouped = SECTION_CATEGORIES.map((c) => ({
    category: c,
    sectionJobs: jobs.filter((j) => c.statuses.includes(normalizeStatusKey(j.status))),
  }));

  return (
    <>
    {/* Mobile: stacked cards with category sections */}
    <div className="sm:hidden space-y-5">
      {grouped.map(({ category, sectionJobs }) => (
        <div key={category.key} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{category.label}</h3>
            <span className="text-[11px] text-muted-foreground/50">({sectionJobs.length})</span>
          </div>
          {sectionJobs.length > 0 ? (
            <div className="space-y-3">
              {sectionJobs.map((j) => (
                <MobileCard key={j.id} j={j} onOpen={onOpen} isSelected={selectedIds.includes(j.id)} toggleOne={toggleOne} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/50 py-3 text-center">
              <p className="text-xs text-muted-foreground/40">No jobs</p>
            </div>
          )}
        </div>
      ))}
    </div>

    {/* Desktop / tablet: full table with category sections */}
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
              <Th>Drop-off</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {grouped.map(({ category, sectionJobs }) => (
              <React.Fragment key={category.key}>
                <tr className="bg-secondary/30">
                  <td colSpan={8} className="px-4 py-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{category.label}</span>
                    <span className="ml-2 text-[11px] text-muted-foreground/50">({sectionJobs.length})</span>
                  </td>
                </tr>
                {sectionJobs.length > 0 ? (
                  sectionJobs.map((j) => (
                    <DesktopRow key={j.id} j={j} onOpen={onOpen} isSelected={selectedIds.includes(j.id)} toggleOne={toggleOne} />
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-2 text-xs text-muted-foreground/40">No jobs</td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}

function MobileCard({ j, onOpen, isSelected, toggleOne }) {
  return (
    <div
      onClick={() => onOpen(j.id)}
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-sm cursor-pointer min-h-[88px]",
        j.payment_status === "outstanding" && "border-l-2 border-l-rose-400",
        isSelected && "bg-accent/10 border-accent/40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span onClick={(e) => e.stopPropagation()} className="grid min-h-11 min-w-11 h-11 w-11 place-items-center shrink-0 -ml-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleOne(j.id, { stopPropagation: () => {} })}
              aria-label={`Select job for ${j.customer_name}`}
            />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-base font-semibold truncate">{j.customer_name || "—"}</p>
            <p className="text-sm text-muted-foreground truncate mt-0.5">{j.intake?.make || j.asset_label || j.scooter_label || "—"}</p>
          </div>
        </div>
        <div className="shrink-0 pr-1 pt-0.5">
          <StatusPill value={j.status || "requested"} kind="job" className="px-3 py-1 text-xs" />
        </div>
      </div>
      {j.issue_description && <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{j.issue_description}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <ServiceTypeBadge job={j} />
        <span>Requested {fmtDateTime(j.created_date)}</span>
        {j.scheduled_date && (
          <span className={j.status === "requested" ? "font-semibold text-accent" : "font-semibold text-indigo-700"}>
            {j.status === "requested" ? "Prefers" : "Scheduled"} {fmtSchedule(j)}
          </span>
        )}
        {j.preferred_time_window === "ASAP" && (
          <span className="font-semibold text-amber-600">ASAP</span>
        )}
      </div>
    </div>
  );
}

function DesktopRow({ j, onOpen, isSelected, toggleOne }) {
  return (
    <tr
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
      <Td className="whitespace-nowrap text-muted-foreground">{fmtSchedule(j)}</Td>
      <Td className="whitespace-nowrap">
        <StatusPill value={j.status || "requested"} kind="job" />
      </Td>
    </tr>
  );
}

function Th({ children }) {
  return <th className="px-4 py-2.5 text-left font-medium">{children}</th>;
}
function Td({ children, className, onClick }) {
  return <td onClick={onClick} className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}