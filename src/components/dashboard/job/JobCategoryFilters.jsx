import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { PAYMENT_STATUSES, JOB_TYPES, WAITING_REASONS, normalizeStatusKey } from "@/config/jobConfig";
import { DEFAULT_APP_SETTINGS } from "@/config/platformConfig";
import { JOB_PRIORITIES, SERVICE_TYPES } from "@/config/serviceTypes";
import { cn } from "@/lib/utils";

export const EMPTY_FILTERS = { q: "", status: "all", service_type: "all", priority: "all", payment: "all", type: "all", waiting: "all" };

export const JOB_CATEGORIES = [
  { key: "all", label: "All", statuses: null, order: 0 },
  { key: "requested", label: "Requested", statuses: ["requested"], order: 1 },
  { key: "scheduled", label: "Scheduled", statuses: ["booked"], order: 2 },
  { key: "repair", label: "Repair Underway", statuses: ["repair_in_progress", "waiting_on_parts", "on_hold"], order: 3 },
  { key: "ready", label: "Ready for Pickup", statuses: ["ready_for_pickup", "invoice_sent", "paid"], order: 4 },
  { key: "completed", label: "Completed", statuses: ["completed", "cancelled"], order: 5 },
];

export function getCategoryOrder(status) {
  const normalized = normalizeStatusKey(status);
  return JOB_CATEGORIES.find((c) => c.statuses?.includes(normalized))?.order ?? 99;
}

const isFilterActive = (filters) =>
  Object.entries(filters).some(([k, v]) => (k !== "q" ? v !== "all" : v !== ""));

export default function JobCategoryFilters({ filters, setFilters, counts }) {
  const [localQ, setLocalQ] = useState(filters.q);
  const [expanded, setExpanded] = useState(false);
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const reset = () => { setLocalQ(""); setFilters(EMPTY_FILTERS); };
  const active = isFilterActive(filters);

  useEffect(() => {
    setLocalQ(filters.q);
  }, [filters.q]);

  useEffect(() => {
    const t = setTimeout(() => set("q", localQ), 250);
    return () => clearTimeout(t);
  }, [localQ]);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm w-full">
      {/* Search + Filters toggle — always visible */}
      <div className="flex gap-2 p-3">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            placeholder={`Search ${DEFAULT_APP_SETTINGS.terminology.customerSingular}, ${DEFAULT_APP_SETTINGS.terminology.assetSingular}, ref...`}
            className="pl-9 rounded-xl bg-background h-11 sm:h-9"
          />
          {localQ && (
            <button onClick={() => { setLocalQ(""); set("q", ""); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => setExpanded((v) => !v)}
          className="h-11 sm:h-9 rounded-xl gap-1.5 shrink-0"
          aria-expanded={expanded}
        >
          <SlidersHorizontal className="h-4 w-4" /> Filters
          {active && <span className="h-2 w-2 rounded-full bg-accent" aria-label="Filters active" />}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
        </Button>
      </div>

      {/* Expandable filter panel */}
      {expanded && (
        <div className="border-t border-border p-3 space-y-3">
          {/* Status pills */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Status</p>
            <div className="flex flex-wrap gap-2">
              {JOB_CATEGORIES.map((c) => {
                const isActivePill = filters.status === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => set("status", isActivePill && c.key !== "all" ? "all" : c.key)}
                    className={cn(
                      "min-h-9 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                      isActivePill
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    )}
                    aria-pressed={isActivePill}
                  >
                    {c.label}
                    {counts?.[c.key] !== undefined && (
                      <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] tabular-nums", isActivePill ? "bg-white/20" : "bg-secondary")}>
                        {counts[c.key]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Other filter dropdowns */}
          <div className="flex flex-wrap gap-2">
            <FilterSelect value={filters.service_type} onChange={(v) => set("service_type", v)} placeholder="Service type"
              options={SERVICE_TYPES.map((s) => ({ v: s.key, l: s.label }))} />
            <FilterSelect value={filters.priority} onChange={(v) => set("priority", v)} placeholder="Priority"
              options={JOB_PRIORITIES.map((s) => ({ v: s.key, l: s.label }))} />
            <FilterSelect value={filters.payment} onChange={(v) => set("payment", v)} placeholder="Payment"
              options={PAYMENT_STATUSES.map((s) => ({ v: s.key, l: s.label }))} />
            <FilterSelect value={filters.type} onChange={(v) => set("type", v)} placeholder="Job type"
              options={JOB_TYPES.map((s) => ({ v: s.key, l: s.label }))} />
            <FilterSelect value={filters.waiting} onChange={(v) => set("waiting", v)} placeholder="Waiting"
              options={WAITING_REASONS.map((s) => ({ v: s.key, l: s.label }))} />
          </div>

          {active && (
            <Button variant="ghost" onClick={reset} className="h-9 gap-1.5 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" /> Clear all filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, placeholder, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="flex-1 min-w-[140px] sm:flex-none sm:w-[145px] rounded-xl bg-background h-11 sm:h-9">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {placeholder.toLowerCase()}</SelectItem>
        {options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}