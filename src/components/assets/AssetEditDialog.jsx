import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FIELDS = [
  { key: "make", label: "Make" },
  { key: "model", label: "Model *" },
  { key: "year", label: "Year" },
  { key: "serial_number", label: "Serial number" },
  { key: "colour", label: "Colour" },
  { key: "battery_voltage", label: "Battery voltage" },
];

export default function AssetEditDialog({ asset, onSave, onClose }) {
  const [data, setData] = useState(asset);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(data);
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{data.id ? "Edit Asset" : "New Asset"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs">{f.label}</Label>
              <Input value={data[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} />
            </div>
          ))}
          <div className="space-y-1">
            <Label className="text-xs">Odometer (km)</Label>
            <Input type="number" value={data.odometer_km ?? ""} onChange={(e) => set("odometer_km", e.target.value === "" ? null : Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Last service date</Label>
            <Input type="date" value={data.last_service_date || ""} onChange={(e) => set("last_service_date", e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={data.notes || ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !(data.model || "").trim()}>
            {saving ? "Saving…" : "Save asset"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}