import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Save, ShieldAlert } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { DEFAULT_BUSINESS_SLUG } from "@/config/platformConfig";

const TOGGLES = [
  { key: "notify_status_change", label: "Job status changes", desc: "Email customers when their job moves to In Progress, Ready for Pickup or Completed." },
  { key: "notify_new_booking", label: "New booking requests", desc: "Email the admin inbox (and assigned technician) when a new booking comes in." },
  { key: "notify_staff_on_booking", label: "Notify assigned technician", desc: "Also email the assigned technician on new bookings." },
  { key: "notify_invoice", label: "Invoices", desc: "Email when an invoice is received (outstanding) or settled (paid)." },
];

export default function Notifications() {
  const { user } = useOutletContext();
  const { toast } = useToast();
  const [setting, setSetting] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.NotificationSetting.list("-created_date", 1).then((rows) => {
      setSetting(rows[0] || {
        business_slug: DEFAULT_BUSINESS_SLUG,
        admin_inbox: "",
        notify_status_change: true,
        notify_new_booking: true,
        notify_staff_on_booking: true,
        notify_invoice: true,
        active: true,
      });
    });
  }, []);

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="font-heading font-bold text-lg">Admins only</p>
        <p className="text-sm text-muted-foreground">Notification settings can only be managed by admins.</p>
      </div>
    );
  }

  if (!setting) {
    return <div className="flex justify-center py-24"><div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" /></div>;
  }

  const update = (key, value) => setSetting((s) => ({ ...s, [key]: value }));

  const save = async () => {
    setSaving(true);
    const payload = { ...setting };
    if (setting.id) {
      await base44.entities.NotificationSetting.update(setting.id, payload);
    } else {
      const created = await base44.entities.NotificationSetting.create(payload);
      setSetting(created);
    }
    setSaving(false);
    toast({ title: "Saved", description: "Notification settings updated." });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid place-items-center h-10 w-10 rounded-xl bg-primary text-primary-foreground"><Bell className="h-5 w-5" /></span>
        <div>
          <h1 className="font-heading text-2xl font-extrabold">Email Notifications</h1>
          <p className="text-sm text-muted-foreground">Control which automated emails are sent.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Mail className="h-4 w-4" /> Business inbox</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="admin_inbox" className="text-sm">Admin / business email</Label>
          <Input
            id="admin_inbox"
            type="email"
            placeholder="hello@otrscooters.com"
            value={setting.admin_inbox || ""}
            onChange={(e) => update("admin_inbox", e.target.value)}
            className="mt-1.5"
          />
          <p className="text-xs text-muted-foreground mt-1.5">New bookings and invoice notifications are sent to this address.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification types</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {TOGGLES.map((t) => (
            <div key={t.key} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
              </div>
              <Switch checked={setting[t.key] !== false} onCheckedChange={(v) => update(t.key, v)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}