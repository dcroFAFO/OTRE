import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { JOB_STATUSES, PAYMENT_STATUSES, JOB_TYPES, WAITING_REASONS } from "@/config/jobConfig";
import { DEFAULT_APP_SETTINGS } from "@/config/platformConfig";
import { JOB_PRIORITIES, SERVICE_TYPES } from "@/config/serviceTypes";
import { cn } from "@/lib/utils";

export const EMPTY_FILTERS = { q: "", status: "all", service_type: "all", priority: "all", payment: "all", type: "all", waiting: "all" };

const isActive = (filters) => Object.entries(filters).some(([k, v]) => k !== "q" ? v !== "all" : v !== "");

export default function JobFilters({ filters, setFilters }) {
  const [localQ, setLocalQ] = useState(filters.q);
  const [showMore, setShowMore] = useState(false);
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const reset = () => { setLocalQ(""); setFilters(EMPTY_FILTERS); };
  const active = isActive(filters);

  useEffect(() => {
    setLocalQ(filters.q);
  }, [filters.q]);

  useEffect(() => {
    const t = setTimeout(() => set("q", localQ), 250);
    return () => clearTimeout(t);
  }, [localQ]);

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm w-full sm:w-auto sm:flex-1">
      <div className="flex flex-wrap gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
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

        {/* Mobile-only toggle keeps the six filter selects tucked away */}
        <Button
          variant="outline"
          onClick={() => setShowMore((v) => !v)}
          className="sm:hidden h-11 rounded-xl gap-1.5 shrink-0"
          aria-expanded={showMore}
        >
          <SlidersHorizontal className="h-4 w-4" /> Filters
          {active && <span className="h-2 w-2 rounded-full bg-accent" aria-label="Filters active" />}
        </Button>

        <div className={cn("w-full flex-wrap gap-2 sm:flex sm:w-auto sm:flex-1", showMore ? "flex" : "hidden")}>
          <FilterSelect value={filters.status} onChange={(v) => set("status", v)} placeholder="Status"
            options={JOB_STATUSES.map((s) => ({ v: s.key, l: s.label }))} />
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

          {active && (
            <Button variant="ghost" onClick={reset} className="h-11 sm:h-9 gap-1.5 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      </div>
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