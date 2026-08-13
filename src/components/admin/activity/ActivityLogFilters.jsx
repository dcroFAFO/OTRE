import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const EMPTY_ACTIVITY_FILTERS = { q: "", actor: "all", type: "all", range: "all" };

export const DATE_RANGES = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

export default function ActivityLogFilters({ filters, setFilters, actors, types }) {
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const dirty = JSON.stringify(filters) !== JSON.stringify(EMPTY_ACTIVITY_FILTERS);

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
      <label className="relative block sm:col-span-2 lg:min-w-[240px] lg:flex-1">
        <span className="sr-only">Search activity</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Search activity…"
          className="h-11 bg-card pl-9"
        />
      </label>

      <Label htmlFor="activity-actor-filter" className="sr-only">Filter activity by user</Label>
      <Select value={filters.actor} onValueChange={(v) => set({ actor: v })}>
        <SelectTrigger id="activity-actor-filter" className="h-11 w-full bg-card lg:w-44"><SelectValue placeholder="Actor" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All users</SelectItem>
          {actors.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
        </SelectContent>
      </Select>

      <Label htmlFor="activity-type-filter" className="sr-only">Filter activity by action</Label>
      <Select value={filters.type} onValueChange={(v) => set({ type: v })}>
        <SelectTrigger id="activity-type-filter" className="h-11 w-full bg-card lg:w-48"><SelectValue placeholder="Action" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All actions</SelectItem>
          {types.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
        </SelectContent>
      </Select>

      <Label htmlFor="activity-range-filter" className="sr-only">Filter activity by date</Label>
      <Select value={filters.range} onValueChange={(v) => set({ range: v })}>
        <SelectTrigger id="activity-range-filter" className="h-11 w-full bg-card lg:w-40"><SelectValue placeholder="Date" /></SelectTrigger>
        <SelectContent>
          {DATE_RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
        </SelectContent>
      </Select>
      {dirty ? <Button type="button" variant="ghost" size="touch" className="text-xs lg:h-9" onClick={() => setFilters(EMPTY_ACTIVITY_FILTERS)}>Clear filters</Button> : null}
    </div>
  );
}
