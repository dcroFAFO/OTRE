import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Label } from "@/components/ui/label";

export const STATUSES = ["New", "Under Review", "Planned", "In Progress", "Resolved", "Rejected", "Archived"];
export const TYPES = ["Bug Report", "Feature Request", "General Feedback", "UI / UX Issue", "Performance Issue", "Other"];
export const PRIORITIES = ["Low", "Medium", "High"];

export const EMPTY_FB_FILTERS = { q: "", status: "all", type: "all", priority: "all", sort: "newest" };

export default function FeedbackFilters({ filters, setFilters }) {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const dirty = JSON.stringify(filters) !== JSON.stringify(EMPTY_FB_FILTERS);

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
      <label className="relative block sm:col-span-2 lg:w-64">
        <span className="sr-only">Search feedback</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input value={filters.q} onChange={(e) => set("q", e.target.value)} placeholder="Search feedback" className="h-11 pl-9" />
      </label>
      <Label htmlFor="feedback-status-filter" className="sr-only">Filter feedback by status</Label>
      <Select value={filters.status} onValueChange={(v) => set("status", v)}>
        <SelectTrigger id="feedback-status-filter" className="h-11 w-full lg:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Label htmlFor="feedback-type-filter" className="sr-only">Filter feedback by type</Label>
      <Select value={filters.type} onValueChange={(v) => set("type", v)}>
        <SelectTrigger id="feedback-type-filter" className="h-11 w-full lg:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>
      <Label htmlFor="feedback-priority-filter" className="sr-only">Filter feedback by priority</Label>
      <Select value={filters.priority} onValueChange={(v) => set("priority", v)}>
        <SelectTrigger id="feedback-priority-filter" className="h-11 w-full lg:w-32"><SelectValue placeholder="Priority" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priority</SelectItem>
          {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>
      <Label htmlFor="feedback-sort-filter" className="sr-only">Sort feedback</Label>
      <Select value={filters.sort} onValueChange={(v) => set("sort", v)}>
        <SelectTrigger id="feedback-sort-filter" className="h-11 w-full lg:w-32"><SelectValue placeholder="Sort" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="oldest">Oldest</SelectItem>
          <SelectItem value="priority">Priority</SelectItem>
          <SelectItem value="status">Status</SelectItem>
        </SelectContent>
      </Select>
      {dirty && (
        <Button type="button" variant="ghost" size="touch" className="text-xs lg:h-9" onClick={() => setFilters(EMPTY_FB_FILTERS)}>Clear filters</Button>
      )}
    </div>
  );
}
