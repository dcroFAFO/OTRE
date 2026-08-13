import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AssetBrandPicker from "@/components/landing/AssetBrandPicker";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getSafeErrorMessage } from "@/lib/errors";

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
    if (saving || !valid) return;
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
      toast.error(getSafeErrorMessage(err, "This scooter could not be saved. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !saving) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{scooter ? "Edit scooter" : "Add a scooter"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium leading-none">Make / model <span className="text-accent">*</span></legend>
            <AssetBrandPicker
              id="portal-scooter"
              make={form.make}
              model={form.model}
              customMake={form.customMake}
              customModel={form.customModel}
              onChange={({ make, model, customMake, customModel }) => setForm((f) => ({ ...f, make, model, customMake, customModel }))}
            />
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="portal-scooter-serial" className="text-sm font-medium leading-none">Serial / frame number</label>
              <Input id="portal-scooter-serial" value={form.serial_number} onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="portal-scooter-colour" className="text-sm font-medium leading-none">Colour</label>
              <Input id="portal-scooter-colour" value={form.colour} onChange={(e) => setForm((f) => ({ ...f, colour: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="portal-scooter-notes" className="text-sm font-medium leading-none">Notes</label>
            <Textarea id="portal-scooter-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Accessories, damage, or useful notes" className="min-h-24" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={saving} className="min-h-11">Cancel</Button>
            <Button onClick={save} disabled={!valid || saving} className="min-h-11" aria-busy={saving || undefined}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save scooter"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
