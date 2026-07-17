import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import NotificationRuleFilters from "@/components/settings/NotificationRuleFilters";
import NotificationRuleCard from "@/components/settings/NotificationRuleCard";

const emptyFilters = { q: "", category: "" };

export default function NotificationSettings() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState(emptyFilters);
  const { data, isLoading } = useQuery({ queryKey: ["notificationConfig"], queryFn: async () => (await base44.functions.invoke("notificationEngine", { action: "list_config" })).data });
  const update = useMutation({
    mutationFn: ({ id, default_state }) => base44.functions.invoke("notificationEngine", { action: "update_config", id, data: { default_state } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notificationConfig"] }); toast.success("Notification updated"); },
    onError: (error) => toast.error(error.response?.data?.error || error.message),
  });
  const rules = data?.rules || [];
  const visible = useMemo(() => rules.filter((rule) => {
    const q = filters.q.toLowerCase();
    return (!q || `${rule.event_name} ${rule.event_key} ${rule.description}`.toLowerCase().includes(q)) && (!filters.category || rule.category === filters.category);
  }), [rules, filters]);
  const grouped = useMemo(() => {
    const map = {};
    visible.forEach((rule) => { (map[rule.category] ||= []).push(rule); });
    return map;
  }, [visible]);

  return (
    <div className="space-y-5">
      <header>
        <div className="flex items-center gap-2"><BellRing className="h-6 w-6 text-accent" /><h1 className="font-heading text-2xl font-extrabold">Notification settings</h1></div>
        <p className="mt-1 text-sm text-muted-foreground">Turn customer and staff notifications on or off. Mandatory notifications can't be disabled.</p>
      </header>
      <NotificationRuleFilters filters={filters} setFilters={setFilters} rules={rules} />
      {isLoading ? (
        <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          {Object.keys(grouped).length === 0 && <p className="text-sm text-muted-foreground">No notifications match your search.</p>}
          {Object.entries(grouped).map(([category, categoryRules]) => (
            <section key={category} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</h2>
              <div className="space-y-2">
                {categoryRules.map((rule) => (
                  <NotificationRuleCard key={rule.id} rule={rule} saving={update.isPending} onToggle={(r, checked) => update.mutate({ id: r.id, default_state: checked ? "on" : "off" })} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}