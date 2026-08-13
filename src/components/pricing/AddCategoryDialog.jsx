import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSafeErrorMessage } from "@/lib/errors";

export default function AddCategoryDialog({ onSave, onClose }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (saving || !name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const key = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
      await onSave({ key, name: name.trim(), active: true });
    } catch (caught) {
      setError(getSafeErrorMessage(caught, "The category could not be created."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-heading">New Service Category</DialogTitle></DialogHeader>
        <div className="space-y-1 mt-2">
          <Label htmlFor="new-service-category" className="text-xs">Category name</Label>
          <Input id="new-service-category" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Suspension" onKeyDown={(e) => e.key === "Enter" && name.trim() && handleSave()} aria-describedby={error ? "new-service-category-error" : undefined} aria-invalid={!!error} />
          {error && <p id="new-service-category-error" role="alert" className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end mt-3">
          <Button variant="outline" size="touch" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="touch" onClick={handleSave} disabled={saving || !name.trim()} aria-busy={saving || undefined}>{saving ? "Saving…" : "Add category"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
