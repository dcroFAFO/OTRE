import React from "react";
import { Input } from "@/components/ui/input";

export default function NotificationRuleFilters({ filters, setFilters, rules }) {
  const categories = [...new Set(rules.map((r) => r.category).filter(Boolean))];
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
      <Input aria-label="Search notifications" placeholder="Search notifications" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} className="sm:max-w-xs" />
      <select aria-label="Filter by category" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground sm:w-56" value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
        <option value="">All categories</option>
        {categories.map((c) => <option key={c} value={c}>{c.replaceAll("_", " ")}</option>)}
      </select>
    </div>
  );
}