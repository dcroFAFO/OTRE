import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AssetBrandPicker from "@/components/landing/AssetBrandPicker";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const EMPTY = { make: "", model: "", customMake: "", customModel: "", serial_number: "", colour: "", notes: "" };

export default function ScooterFormDialog({ open, scooter, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(scooter
      ? { make: scooter.make || "", model: scooter.model || "", customMake: "", customModel: "", serial_number: scooter.serial_number || "", colour: scooter.colour || "", notes: scooter.notes || "" }
      : EMPTY);
  }, [open, scooter]);

  const resolvedMake = form.make === "Other" ? form.customMake : form.make;
  const resolvedModel = form.model === "Other model" || form.make === "Other" ? form.customModel || form.model : form.model;
  const valid = !!(resolvedMake || "").trim() && !!(resolvedModel || "").trim();

  const save = async () => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke("customerSettings", {
        action: "saveScooter",
        scooter_id: scooter?.id || undefined,
        data: { make: resolvedMake.trim(), model: resolvedModel.trim(), serial_number: form.serial_number.trim(), colour: form.colour.trim(), notes: form.notes.trim() },
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(scooter ? "Scooter updated" : "Scooter added");
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || "Couldn't save this scooter.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{scooter ? "Edit scooter" : "Add a scooter"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Make / model <span className="text-accent">*</span></Label>
            <AssetBrandPicker
              make={form.make}
              model={form.model}
              customMake={form.customMake}
              customModel={form.customModel}
              onChange={({ make, model, customMake, customModel }) => setForm((f) => ({ ...f, make, model, customMake, customModel }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Serial / frame number</Label>
              <Input value={form.serial_number} onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Colour</Label>
              <Input value={form.colour} onChange={(e) => setForm((f) => ({ ...f, colour: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Accessories, damage, or useful notes" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={!valid || saving} className="rounded-xl">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save scooter"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}