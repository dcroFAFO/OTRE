import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { updateScooter } from "@/services/clientService";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { format } from "date-fns";

const BATTERY_CONDITIONS = [
  { key: "good", label: "Good" },
  { key: "fair", label: "Fair" },
  { key: "poor", label: "Poor" },
  { key: "faulty", label: "Faulty" },
  { key: "unknown", label: "Unknown" },
];

function buildForm(scooter) {
  const intake = scooter.intake || {};
  return {
    serial_number: scooter.serial_number || "",
    battery_voltage: scooter.battery_voltage || "",
    odometer_km: scooter.odometer_km ?? "",
    battery_condition: intake.battery_condition || "",
    physical_condition: intake.physical_condition || "",
    accessories_received: intake.accessories_received || "",
    powers_on: intake.powers_on !== false,
    initial_issue_notes: intake.initial_issue_notes || "",
  };
}

export default function AssetIntakeForm({ scooter, customerName, actor, onSaved }) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState(() => buildForm(scooter));
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(buildForm(scooter)); }, [scooter.id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const hasIntake = !!(scooter.intake?.intake_date);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const data = {
        serial_number: form.serial_number,
        battery_voltage: form.battery_voltage,
        odometer_km: form.odometer_km === "" ? null : Number(form.odometer_km),
        intake: {
          ...(scooter.intake || {}),
          battery_condition: form.battery_condition || undefined,
          physical_condition: form.physical_condition || undefined,
          accessories_received: form.accessories_received || undefined,
          powers_on: form.powers_on,
          initial_issue_notes: form.initial_issue_notes || undefined,
          intake_by_name: actor?.full_name || "Staff",
          intake_date: new Date().toISOString(),
        },
      };
      await updateScooter(scooter.id, data, customerName, actor);
      toast.success("Intake saved");
      setExpanded(false);
      onSaved?.();
    } catch (e) {
      logError("Save asset intake failed", e, { recordId: scooter.id });
      toast.error("Save failed — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={`asset-intake-${scooter.id}`}
        className="flex min-h-11 w-full items-center gap-2 px-3 text-left"
      >
        <ClipboardCheck className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-xs font-semibold flex-1">Intake form</span>
        {hasIntake && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            {format(new Date(scooter.intake.intake_date), "d MMM yyyy")}
          </span>
        )}
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div id={`asset-intake-${scooter.id}`} className="space-y-3 border-t border-border px-3 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`asset-intake-serial-${scooter.id}`} className="text-xs">Serial / frame number</Label>
              <Input id={`asset-intake-serial-${scooter.id}`} value={form.serial_number} onChange={(e) => set("serial_number", e.target.value)} placeholder="SN-12345" />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`asset-intake-voltage-${scooter.id}`} className="text-xs">Battery voltage</Label>
              <Input id={`asset-intake-voltage-${scooter.id}`} value={form.battery_voltage} onChange={(e) => set("battery_voltage", e.target.value)} placeholder="54.6V" />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`asset-intake-odometer-${scooter.id}`} className="text-xs">Odometer (km)</Label>
              <Input id={`asset-intake-odometer-${scooter.id}`} type="number" min="0" inputMode="numeric" value={form.odometer_km ?? ""} onChange={(e) => set("odometer_km", e.target.value === "" ? "" : e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`asset-intake-battery-${scooter.id}`} className="text-xs">Battery condition</Label>
              <Select value={form.battery_condition || ""} onValueChange={(v) => set("battery_condition", v)}>
                <SelectTrigger id={`asset-intake-battery-${scooter.id}`}><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {BATTERY_CONDITIONS.map((b) => <SelectItem key={b.key} value={b.key}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <Label htmlFor={`asset-intake-powers-${scooter.id}`} className="text-xs">Powers on at intake</Label>
            <Switch id={`asset-intake-powers-${scooter.id}`} checked={!!form.powers_on} onCheckedChange={(v) => set("powers_on", v)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`asset-intake-condition-${scooter.id}`} className="text-xs">Physical condition / existing damage</Label>
            <Textarea id={`asset-intake-condition-${scooter.id}`} value={form.physical_condition} onChange={(e) => set("physical_condition", e.target.value)} placeholder="Scratches, dents, worn tyres..." className="h-20 text-xs" />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`asset-intake-accessories-${scooter.id}`} className="text-xs">Accessories received</Label>
            <Input id={`asset-intake-accessories-${scooter.id}`} value={form.accessories_received} onChange={(e) => set("accessories_received", e.target.value)} placeholder="Charger, key, phone mount..." />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`asset-intake-issue-${scooter.id}`} className="text-xs">Issue / requested service</Label>
            <Textarea id={`asset-intake-issue-${scooter.id}`} value={form.initial_issue_notes} onChange={(e) => set("initial_issue_notes", e.target.value)} placeholder="Customer's reported issue..." className="h-20 text-xs" />
          </div>

          {hasIntake && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Last completed by {scooter.intake.intake_by_name || "—"} · {format(new Date(scooter.intake.intake_date), "d MMM yyyy, h:mm a")}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" size="touch" className="gap-1 text-xs" disabled={saving} onClick={save}>
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              {saving ? "Saving..." : "Save intake"}
            </Button>
            <Button type="button" size="touch" variant="ghost" className="text-xs" onClick={() => setExpanded(false)} disabled={saving}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
