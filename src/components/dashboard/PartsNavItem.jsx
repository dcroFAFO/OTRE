import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ShoppingBag, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Parts nav link that expands to reveal all part categories.
export default function PartsNavItem({ onNavigate }) {
  const { pathname, search } = useLocation();
  const onParts = pathname === "/dashboard/parts";
  const [expanded, setExpanded] = useState(onParts);
  const activeCategory = new URLSearchParams(search).get("category") || "";

  const { data: products = [] } = useQuery({
    queryKey: ["estore-products"],
    queryFn: () => base44.entities.Product.filter({ supplier: "eScootNow" }, "name", 500),
    enabled: expanded,
    staleTime: 5 * 60 * 1000,
  });

  const categories = [...new Set(products.map((p) => p.category_label).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls="parts-navigation-categories"
        className={cn(
          "flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
          onParts && !activeCategory ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary"
        )}
      >
        <ShoppingBag className="h-[18px] w-[18px]" aria-hidden="true" /> Parts
        <ChevronRight className={cn("ml-auto h-4 w-4 transition-transform", expanded && "rotate-90")} aria-hidden="true" />
      </button>

      {expanded && categories.length > 0 && (
        <div id="parts-navigation-categories" className="mt-1 ml-4 space-y-0.5 border-l border-border pl-3">
          <CategoryLink to="/dashboard/parts" label="All parts" active={onParts && !activeCategory} onNavigate={onNavigate} />
          {categories.map((c) => (
            <CategoryLink
              key={c}
              to={`/dashboard/parts?category=${encodeURIComponent(c)}`}
              label={c}
              active={onParts && activeCategory === c}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryLink({ to, label, active, onNavigate }) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={cn(
        "flex min-h-10 items-center truncate rounded-md px-3 text-sm transition-colors",
        active ? "bg-secondary text-foreground font-semibold" : "text-muted-foreground hover:bg-secondary/60"
      )}
    >
      {label}
    </Link>
  );
}
