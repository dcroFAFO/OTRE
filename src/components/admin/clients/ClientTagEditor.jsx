import React from "react";
import { CLIENT_TAGS } from "@/config/clientConfig";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

// Multi-select tag toggles.
export default function ClientTagEditor({ value = [], onChange, labelledBy }) {
  const toggle = (key) => {
    onChange(value.includes(key) ? value.filter((t) => t !== key) : [...value, key]);
  };
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-labelledby={labelledBy}>
      {CLIENT_TAGS.map((t) => {
        const on = value.includes(t.key);
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => toggle(t.key)}
            aria-pressed={on}
            className={cn(
              "inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors sm:min-h-9",
              on ? "border-accent bg-accent/15 text-accent" : "border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            {on && <Check className="h-3 w-3" />} {t.label}
          </button>
        );
      })}
    </div>
  );
}
