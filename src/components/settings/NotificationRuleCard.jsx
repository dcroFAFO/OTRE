import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Field = ({ label, value }) => <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-0.5 text-sm text-foreground">{String(value ?? "—").replaceAll("_", " ")}</dd></div>;

export default function NotificationRuleCard({ rule, onEdit }) {
  const permission = !rule.can_receive ? "Not permitted" : rule.mandatory ? "Mandatory" : rule.default_state === "on" ? "Enabled by default" : rule.timing === "digest" ? "Included in digest" : "Permitted but disabled";
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div><div className="flex flex-wrap gap-2"><Badge variant="outline">{rule.category}</Badge><Badge>{permission}</Badge></div><h2 className="mt-2 font-heading font-bold">{rule.event_name}</h2><code className="text-xs text-muted-foreground">{rule.event_key}</code></div>
        <Button variant="outline" size="sm" onClick={() => onEdit(rule)}>Edit</Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{rule.description}</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Trigger" value={rule.trigger_condition} /><Field label="Recipient" value={rule.recipient_type} /><Field label="Channel" value={rule.channel} /><Field label="Can receive" value={rule.can_receive ? "Allowed" : "Not allowed"} />
        <Field label="Default" value={rule.default_state} /><Field label="Mandatory" value={rule.mandatory ? "Yes" : "No"} /><Field label="Toggle" value={rule.toggleable_by} /><Field label="Type" value={rule.notification_type} />
        <Field label="Consent" value={rule.consent_requirement} /><Field label="Timing" value={rule.timing} /><Field label="Schedule" value={rule.timing === "delayed" ? `${rule.delay_minutes || 0} minutes` : rule.digest_schedule || "Immediate"} /><Field label="Template" value={rule.template_reference} />
        <Field label="Deduplication" value={rule.deduplication_rule} /><Field label="Status" value={rule.active_status} />
      </dl>
    </article>
  );
}