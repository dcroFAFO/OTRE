import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const EMPTY_ACTIVITY_FILTERS = { q: "", actor: "all", type: "all", range: "all" };

export const DATE_RANGES = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

export default function ActivityLogFilters({ filters, setFilters, actors, types }) {
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Search activity…"
          className="pl-9 rounded-xl bg-card"
        />
      </div>

      <Select value={filters.actor} onValueChange={(v) => set({ actor: v })}>
        <SelectTrigger className="w-44 rounded-xl bg-card"><SelectValue placeholder="Actor" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All users</SelectItem>
          {actors.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.type} onValueChange={(v) => set({ type: v })}>
        <SelectTrigger className="w-48 rounded-xl bg-card"><SelectValue placeholder="Action" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All actions</SelectItem>
          {types.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.range} onValueChange={(v) => set({ range: v })}>
        <SelectTrigger className="w-40 rounded-xl bg-card"><SelectValue placeholder="Date" /></SelectTrigger>
        <SelectContent>
          {DATE_RANGES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}