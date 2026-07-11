import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function NewsBrowseControls({ query, onQuery, categoryId, onCategory, tagId, onTag, categories, tags }) {
  return (
    <section aria-label="Browse articles" className="my-8 grid gap-3 border-y border-border bg-card py-4 md:grid-cols-[1.4fr_1fr_1fr]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Search articles" placeholder="Search news and events…" value={query} onChange={(event) => onQuery(event.target.value)} className="pl-9" />
      </div>
      <select aria-label="Filter by category" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={categoryId} onChange={(event) => onCategory(event.target.value)}>
        <option value="all">All sections</option>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select>
      <select aria-label="Filter by topic" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={tagId} onChange={(event) => onTag(event.target.value)}>
        <option value="all">All topics</option>
        {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
      </select>
    </section>
  );
}