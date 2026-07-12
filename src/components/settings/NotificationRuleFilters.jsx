import React from "react";
import { Input } from "@/components/ui/input";

const fields = [
  ["category", "All categories"], ["recipient_type", "All recipients"], ["channel", "All channels"],
  ["enabled", "Any enabled state"], ["mandatory", "Any mandatory state"], ["timing", "Any timing"],
];

export default function NotificationRuleFilters({ filters, setFilters, rules }) {
  const values = (key) => [...new Set(rules.map((r) => key === "enabled" ? (r.default_state === "on" ? "on" : "off") : key === "mandatory" ? String(r.mandatory) : r[key]).filter(Boolean))];
  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
      <Input aria-label="Filter notification events" placeholder="Search event or key" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
      {fields.map(([key, label]) => (
        <label key={key} className="text-xs font-medium text-muted-foreground">
          <span className="sr-only">{label}</span>
          <select aria-label={label} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={filters[key]} onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}>
            <option value="">{label}</option>
            {values(key).map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
          </select>
        </label>
      ))}
    </div>
  );
}