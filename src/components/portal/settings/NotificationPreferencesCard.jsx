import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function NotificationPreferencesCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notificationPreferences"], queryFn: async () => (await base44.functions.invoke("notificationEngine", { action: "list_preferences" })).data });
  const save = useMutation({ mutationFn: (payload) => base44.functions.invoke("notificationEngine", { action: "update_preference", ...payload }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["notificationPreferences"] }); toast.success("Notification preference saved"); }, onError: (error) => toast.error(error.response?.data?.error || error.message) });
  const prefMap = new Map((data?.preferences || []).map((p) => [`${p.event_key}|${p.channel}`, p]));
  return <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
    <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent"><Bell className="h-4.5 w-4.5" /></span><div><h2 className="font-heading text-lg font-extrabold">Notifications</h2><p className="text-xs text-muted-foreground">Transactional and marketing choices are kept separate.</p></div></div>
    {isLoading ? <Loader2 className="mx-auto mt-6 h-5 w-5 animate-spin" /> : <div className="mt-4 divide-y divide-border">{(data?.rules || []).map((rule) => {
      const pref = prefMap.get(`${rule.event_key}|${rule.channel}`); const enabled = pref ? pref.enabled : rule.default_state === "on"; const locked = rule.mandatory || !rule.toggleable;
      return <div key={rule.id} className="flex items-start justify-between gap-4 py-3"><div><p className="text-sm font-semibold">{rule.event_name} <span className="font-normal capitalize text-muted-foreground">· {rule.channel}</span></p><p className="text-xs text-muted-foreground">{rule.mandatory ? "Mandatory" : rule.notification_type === "marketing" ? "Marketing consent required" : rule.description}</p></div><input aria-label={`${rule.event_name} ${rule.channel}`} type="checkbox" checked={!!enabled} disabled={locked || save.isPending} onChange={(e) => save.mutate({ event_key: rule.event_key, channel: rule.channel, enabled: e.target.checked, consent_granted: rule.notification_type === "marketing" ? e.target.checked : false })} className="mt-1 h-4 w-4" /></div>;
    })}</div>}
  </section>;
}