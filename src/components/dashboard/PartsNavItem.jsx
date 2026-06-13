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
  });

  const categories = [...new Set(products.map((p) => p.category_label).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  return (
    <div>
      <button
        onClick={() => setExpanded((e) => !e)}
        className={cn(
          "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          onParts && !activeCategory ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
        )}
      >
        <ShoppingBag className="h-4.5 w-4.5" /> Parts
        <ChevronRight className={cn("h-4 w-4 ml-auto transition-transform", expanded && "rotate-90")} />
      </button>

      {expanded && categories.length > 0 && (
        <div className="mt-1 ml-4 space-y-0.5 border-l border-border pl-3">
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
        "block rounded-lg px-3 py-1.5 text-sm transition-colors truncate",
        active ? "bg-secondary text-foreground font-semibold" : "text-muted-foreground hover:bg-secondary/60"
      )}
    >
      {label}
    </Link>
  );
}