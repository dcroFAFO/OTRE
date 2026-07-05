import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AddCategoryDialog({ onSave, onClose }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const key = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
    await onSave({ key, name: name.trim(), active: true });
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="font-heading">New Service Category</DialogTitle></DialogHeader>
        <div className="space-y-1 mt-2">
          <Label className="text-xs">Category name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Suspension" onKeyDown={(e) => e.key === "Enter" && name.trim() && handleSave()} />
        </div>
        <div className="flex gap-2 justify-end mt-3">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>{saving ? "Saving…" : "Add category"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}