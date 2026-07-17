import React from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export default function NotificationRuleCard({ rule, onToggle, saving }) {
  const disabled = !rule.can_receive || rule.mandatory || rule.toggleable_by === "not_toggleable" || saving;
  const checked = rule.mandatory ? true : rule.default_state === "on";
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-sm font-semibold text-foreground">{rule.event_name}</h3>
          <Badge variant="outline" className="text-[10px] uppercase">{rule.channel}</Badge>
          {rule.mandatory && <Badge className="text-[10px]">Mandatory</Badge>}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{rule.description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={(value) => onToggle(rule, value)} aria-label={`Toggle ${rule.event_name}`} />
    </div>
  );
}