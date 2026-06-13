import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { CLIENT_STATUSES, ACCOUNT_TYPES, CLIENT_TAGS } from "@/config/clientConfig";

export const EMPTY_CLIENT_FILTERS = { q: "", status: "all", account_type: "all", tag: "all", sort: "newest" };

export default function ClientFilters({ filters, setFilters }) {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const dirty = JSON.stringify(filters) !== JSON.stringify(EMPTY_CLIENT_FILTERS);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={filters.q} onChange={(e) => set("q", e.target.value)} placeholder="Search name, email, phone, company..." className="pl-9" />
      </div>
      <Select value={filters.status} onValueChange={(v) => set("status", v)}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {CLIENT_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.account_type} onValueChange={(v) => set("account_type", v)}>
        <SelectTrigger className="w-36"><SelectValue placeholder="Account type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {ACCOUNT_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.tag} onValueChange={(v) => set("tag", v)}>
        <SelectTrigger className="w-36"><SelectValue placeholder="Tag" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All tags</SelectItem>
          {CLIENT_TAGS.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.sort} onValueChange={(v) => set("sort", v)}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Sort" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="oldest">Oldest</SelectItem>
          <SelectItem value="recent_activity">Recently active</SelectItem>
          <SelectItem value="alphabetical">Alphabetical</SelectItem>
        </SelectContent>
      </Select>
      {dirty && <Button variant="ghost" size="sm" className="text-xs" onClick={() => setFilters(EMPTY_CLIENT_FILTERS)}>Clear</Button>}
    </div>
  );
}