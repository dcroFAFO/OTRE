import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { CLIENT_STATUSES, CLIENT_TAGS } from "@/config/clientConfig";
import { Label } from "@/components/ui/label";

export const EMPTY_CLIENT_FILTERS = { q: "", status: "all", tag: "all", sort: "newest" };

export default function ClientFilters({ filters, setFilters }) {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const dirty = JSON.stringify(filters) !== JSON.stringify(EMPTY_CLIENT_FILTERS);

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
      <label className="relative block sm:col-span-2 lg:w-72">
        <span className="sr-only">Search customers by name, email, or phone</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input value={filters.q} onChange={(e) => set("q", e.target.value)} placeholder="Search customers" className="h-11 pl-9" />
      </label>
      <Label htmlFor="client-status-filter" className="sr-only">Filter by customer status</Label>
      <Select value={filters.status} onValueChange={(v) => set("status", v)}>
        <SelectTrigger id="client-status-filter" className="h-11 w-full lg:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {CLIENT_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Label htmlFor="client-tag-filter" className="sr-only">Filter by customer tag</Label>
      <Select value={filters.tag} onValueChange={(v) => set("tag", v)}>
        <SelectTrigger id="client-tag-filter" className="h-11 w-full lg:w-36"><SelectValue placeholder="Tag" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All tags</SelectItem>
          {CLIENT_TAGS.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Label htmlFor="client-sort-filter" className="sr-only">Sort customers</Label>
      <Select value={filters.sort} onValueChange={(v) => set("sort", v)}>
        <SelectTrigger id="client-sort-filter" className="h-11 w-full lg:w-40"><SelectValue placeholder="Sort" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="oldest">Oldest</SelectItem>
          <SelectItem value="recent_activity">Recently active</SelectItem>
          <SelectItem value="alphabetical">Alphabetical</SelectItem>
        </SelectContent>
      </Select>
      {dirty && <Button type="button" variant="ghost" size="touch" className="text-xs lg:h-9" onClick={() => setFilters(EMPTY_CLIENT_FILTERS)}>Clear filters</Button>}
    </div>
  );
}
