import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";

const ALL = "__all__";

export default function PartsFilters({ filters, setFilters, categories, brands }) {
  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v === ALL ? "" : v }));
  const hasActive = filters.search || filters.category || filters.brand || filters.suits || filters.stock;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, SKU, description…"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      <FilterSelect label="Category" value={filters.category} onChange={(v) => set("category", v)} options={categories} />
      <FilterSelect label="Brand" value={filters.brand} onChange={(v) => set("brand", v)} options={brands} />
      <FilterSelect label="Suits" value={filters.suits} onChange={(v) => set("suits", v)} options={brands} />

      <Select value={filters.stock || ALL} onValueChange={(v) => set("stock", v)}>
        <SelectTrigger className="w-[140px] rounded-xl"><SelectValue placeholder="Stock" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All stock</SelectItem>
          <SelectItem value="in">In stock</SelectItem>
          <SelectItem value="out">Out of stock</SelectItem>
        </SelectContent>
      </Select>

      {hasActive && (
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
          onClick={() => setFilters({ search: "", category: "", brand: "", suits: "", stock: "" })}>
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <Select value={value || ALL} onValueChange={onChange}>
      <SelectTrigger className="w-[160px] rounded-xl"><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent className="max-h-72">
        <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}