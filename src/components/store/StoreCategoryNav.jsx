import React from "react";
import { cn } from "@/lib/utils";
import { STORE_GROUPS } from "@/config/storeConfig";

export default function StoreCategoryNav({ activeCategory, onSelect }) {
  return (
    <nav className="space-y-6">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "text-sm font-medium transition-colors",
          !activeCategory ? "text-accent" : "text-muted-foreground hover:text-foreground"
        )}
      >
        All products
      </button>
      {STORE_GROUPS.map((group) => (
        <div key={group.key}>
          <h4 className="font-heading font-semibold text-sm mb-2">{group.label}</h4>
          <ul className="space-y-1.5 border-l border-border pl-3">
            {group.categories.map((cat) => (
              <li key={cat.key}>
                <button
                  onClick={() => onSelect(cat.key)}
                  className={cn(
                    "text-sm text-left transition-colors",
                    activeCategory === cat.key
                      ? "text-accent font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}