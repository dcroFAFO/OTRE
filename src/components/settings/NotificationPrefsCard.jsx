import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Bell } from "lucide-react";
import { toast } from "sonner";

const PREFS = [
  { key: "notify_new_booking", label: "New booking alerts", hint: "Email customers and staff when a new booking is created" },
  { key: "notify_status_change", label: "Job status updates", hint: "Email customers and staff when a job status changes" },
  { key: "notify_invoice", label: "Invoice notifications", hint: "Email customers and staff on invoice sent / paid" },
];

export default function NotificationPrefsCard() {
  const qc = useQueryClient();
  const { data: setting } = useQuery({
    queryKey: ["notificationSetting"],
    queryFn: async () => {
      const existing = await base44.entities.NotificationSetting.list("", 1);
      if (existing.length) return existing[0];
      return base44.entities.NotificationSetting.create({ active: true });
    },
  });

  const toggle = async (key, value) => {
    await base44.entities.NotificationSetting.update(setting.id, { [key]: value });
    qc.invalidateQueries({ queryKey: ["notificationSetting"] });
    toast.success("Notification preference updated");
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-accent" />
        <h2 className="font-heading font-bold">Notification Preferences</h2>
      </div>
      <div className="space-y-3">
        {PREFS.map((p) => (
          <div key={p.key} className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{p.label}</p>
              <p className="text-xs text-muted-foreground">{p.hint}</p>
            </div>
            <Switch checked={setting?.[p.key] !== false} disabled={!setting} onCheckedChange={(v) => toggle(p.key, v)} />
          </div>
        ))}
      </div>
    </div>
  );
}