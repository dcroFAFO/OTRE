import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { JOB_STATUSES, PAYMENT_STATUSES, JOB_TYPES, WAITING_REASONS } from "@/config/jobConfig";

export default function JobFilters({ filters, setFilters, staff }) {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  return (
    <div className="flex flex-wrap gap-2.5">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={filters.q} onChange={(e) => set("q", e.target.value)} placeholder="Search customer, scooter, ref..." className="pl-9" />
      </div>
      <FilterSelect value={filters.status} onChange={(v) => set("status", v)} placeholder="Status" options={JOB_STATUSES.map((s) => ({ v: s.key, l: s.label }))} />
      <FilterSelect value={filters.tech} onChange={(v) => set("tech", v)} placeholder="Technician" options={staff.map((s) => ({ v: s.short_name || s.full_name, l: s.short_name || s.full_name }))} />
      <FilterSelect value={filters.payment} onChange={(v) => set("payment", v)} placeholder="Payment" options={PAYMENT_STATUSES.map((s) => ({ v: s.key, l: s.label }))} />
      <FilterSelect value={filters.type} onChange={(v) => set("type", v)} placeholder="Job type" options={JOB_TYPES.map((s) => ({ v: s.key, l: s.label }))} />
      <FilterSelect value={filters.waiting} onChange={(v) => set("waiting", v)} placeholder="Waiting" options={WAITING_REASONS.map((s) => ({ v: s.key, l: s.label }))} />
    </div>
  );
}

function FilterSelect({ value, onChange, placeholder, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[150px]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {placeholder.toLowerCase()}</SelectItem>
        {options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}