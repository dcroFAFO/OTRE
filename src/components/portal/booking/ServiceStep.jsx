import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { Check } from "lucide-react";

export default function ServiceStep({ data, update }) {
  const { data: { services } } = usePlatformConfig();
  const tiles = [...services.map((s) => ({ name: s.name, description: s.description })), { name: "Other", description: "Not listed? Describe the issue yourself" }];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">What does your scooter need?</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {tiles.map((t) => {
          const selected = data.service === t.name;
          return (
            <button key={t.name} type="button" onClick={() => update({ service: t.name })}
              className={`relative rounded-xl border p-3 text-left transition ${selected ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"}`}>
              {selected && <Check className="absolute right-2.5 top-2.5 h-4 w-4 text-accent" />}
              <span className="block pr-6 text-sm font-semibold">{t.name === "Other" ? "Other / Not listed" : t.name}</span>
              {t.description && <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">{t.description}</span>}
            </button>
          );
        })}
      </div>
      {data.service === "Other" && (
        <Textarea value={data.customIssue} onChange={(e) => update({ customIssue: e.target.value })} placeholder="Describe the issue with your scooter…" className="h-24" />
      )}
    </div>
  );
}