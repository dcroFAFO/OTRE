import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, Loader2, CheckCircle2 } from "lucide-react";
import { SCOOTER_BRANDS, BRAND_NAMES } from "@/config/scooterBrands";
import { useToast } from "@/components/ui/use-toast";
import { logError } from "@/lib/logger";
import { format } from "date-fns";

const BATTERY_CONDITIONS = [
  { key: "good", label: "Good" },
  { key: "fair", label: "Fair" },
  { key: "poor", label: "Poor" },
  { key: "faulty", label: "Faulty" },
  { key: "unknown", label: "Unknown" },
];

export default function IntakePanel({ job, actor, canEdit, onChange }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    make: "",
    model: "",
    serial_number: "",
    battery_condition: "",
    battery_voltage: "",
    odometer_km: "",
    physical_condition: "",
    accessories_received: "",
    powers_on: true,
    initial_issue_notes: "",
    ...(job.intake || {}),
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const models = form.make ? (SCOOTER_BRANDS[form.make] || []) : [];

  const save = async () => {
    setSaving(true);
    try {
      const intake = {
        ...form,
        odometer_km: form.odometer_km === "" ? undefined : Number(form.odometer_km),
        intake_by_name: actor?.full_name || "Technician",
        intake_date: new Date().toISOString(),
      };
      await base44.entities.Job.update(job.id, {
        intake,
        // keep the visible asset label in sync if make/model captured
        ...(form.make ? { asset_label: [form.make, form.model].filter(Boolean).join(" ") } : {}),
      });
      toast({ title: "Intake saved" });
      onChange?.();
    } catch (e) {
      logError("Save intake failed", e, { recordId: job.id });
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return <IntakeReadOnly intake={job.intake} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ClipboardCheck className="h-4 w-4 text-accent" /> Scooter intake
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Make">
          <Select value={form.make || ""} onValueChange={(v) => { set("make", v); set("model", ""); }}>
            <SelectTrigger><SelectValue placeholder="Select make" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {BRAND_NAMES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Model">
          {models.length > 0 ? (
            <Select value={form.model || ""} onValueChange={(v) => set("model", v)}>
              <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input value={form.model || ""} onChange={(e) => set("model", e.target.value)} placeholder="Model" />
          )}
        </Field>
      </div>

      <Field label="Serial / frame number">
        <Input value={form.serial_number || ""} onChange={(e) => set("serial_number", e.target.value)} placeholder="e.g. SN-12345678" />
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Battery condition">
          <Select value={form.battery_condition || ""} onValueChange={(v) => set("battery_condition", v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {BATTERY_CONDITIONS.map((b) => <SelectItem key={b.key} value={b.key}>{b.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Battery voltage">
          <Input value={form.battery_voltage || ""} onChange={(e) => set("battery_voltage", e.target.value)} placeholder="e.g. 54.6V" />
        </Field>
        <Field label="Odometer (km)">
          <Input type="number" value={form.odometer_km ?? ""} onChange={(e) => set("odometer_km", e.target.value)} placeholder="0" />
        </Field>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
        <Label className="text-sm">Powers on at intake</Label>
        <Switch checked={!!form.powers_on} onCheckedChange={(v) => set("powers_on", v)} />
      </div>

      <Field label="Physical condition / existing damage">
        <Textarea value={form.physical_condition || ""} onChange={(e) => set("physical_condition", e.target.value)} placeholder="Scratches, dents, worn tyres..." className="h-20" />
      </Field>

      <Field label="Accessories received">
        <Input value={form.accessories_received || ""} onChange={(e) => set("accessories_received", e.target.value)} placeholder="Charger, key, phone mount..." />
      </Field>

      <Field label="Initial issue notes">
        <Textarea value={form.initial_issue_notes || ""} onChange={(e) => set("initial_issue_notes", e.target.value)} placeholder="Technician's initial assessment of the reported issue..." className="h-24" />
      </Field>

      {job.intake?.intake_date && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          Last completed by {job.intake.intake_by_name || "—"} · {format(new Date(job.intake.intake_date), "d MMM yyyy, h:mm a")}
        </p>
      )}

      <Button className="w-full gap-2" disabled={saving} onClick={save}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Saving..." : "Save intake"}
      </Button>
    </div>
  );
}

function IntakeReadOnly({ intake }) {
  if (!intake || !intake.intake_date) {
    return <p className="text-sm text-muted-foreground text-center py-8">No intake recorded yet.</p>;
  }
  const rows = [
    ["Make", intake.make],
    ["Model", intake.model],
    ["Serial number", intake.serial_number],
    ["Battery condition", intake.battery_condition],
    ["Battery voltage", intake.battery_voltage],
    ["Odometer", intake.odometer_km != null ? `${intake.odometer_km} km` : null],
    ["Powers on", intake.powers_on ? "Yes" : "No"],
    ["Physical condition", intake.physical_condition],
    ["Accessories", intake.accessories_received],
    ["Initial issue notes", intake.initial_issue_notes],
  ].filter(([, v]) => v != null && v !== "");

  return (
    <div className="space-y-2">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-3 gap-2 text-sm border-b border-border/60 py-1.5">
          <span className="text-muted-foreground">{label}</span>
          <span className="col-span-2 capitalize">{value}</span>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}