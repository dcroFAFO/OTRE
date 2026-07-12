import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import NotificationRuleFilters from "@/components/settings/NotificationRuleFilters";
import NotificationRuleCard from "@/components/settings/NotificationRuleCard";
import NotificationRuleEditor from "@/components/settings/NotificationRuleEditor";

const emptyFilters = { q: "", category: "", recipient_type: "", channel: "", enabled: "", mandatory: "", timing: "" };

export default function NotificationSettings() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState(emptyFilters);
  const [editing, setEditing] = useState(null);
  const { data, isLoading } = useQuery({ queryKey: ["notificationConfig"], queryFn: async () => (await base44.functions.invoke("notificationEngine", { action: "list_config" })).data });
  const update = useMutation({ mutationFn: (form) => base44.functions.invoke("notificationEngine", { action: "update_config", id: form.id, data: form }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["notificationConfig"] }); setEditing(null); toast.success("Notification rule saved"); }, onError: (error) => toast.error(error.response?.data?.error || error.message) });
  const rules = data?.rules || [];
  const visible = useMemo(() => rules.filter((rule) => {
    const q = filters.q.toLowerCase();
    return (!q || `${rule.event_name} ${rule.event_key} ${rule.description}`.toLowerCase().includes(q))
      && (!filters.category || rule.category === filters.category) && (!filters.recipient_type || rule.recipient_type === filters.recipient_type)
      && (!filters.channel || rule.channel === filters.channel) && (!filters.enabled || (rule.default_state === "on" ? "on" : "off") === filters.enabled)
      && (!filters.mandatory || String(rule.mandatory) === filters.mandatory) && (!filters.timing || rule.timing === filters.timing);
  }), [rules, filters]);
  return <div className="space-y-5">
    <header><div className="flex items-center gap-2"><BellRing className="h-6 w-6 text-accent" /><h1 className="font-heading text-2xl font-extrabold">Notification settings</h1></div><p className="mt-1 text-sm text-muted-foreground">Configure the Request → Scheduling → Repair → Invoice → Complete notification workflow and supporting events.</p></header>
    <NotificationRuleFilters filters={filters} setFilters={setFilters} rules={rules} />
    <p className="text-sm text-muted-foreground" aria-live="polite">{visible.length} configuration records</p>
    {isLoading ? <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div> : <div className="space-y-3">{visible.map((rule) => <NotificationRuleCard key={rule.id} rule={rule} onEdit={setEditing} />)}</div>}
    <NotificationRuleEditor rule={editing} onClose={() => setEditing(null)} onSave={(form) => update.mutate(form)} saving={update.isPending} />
  </div>;
}