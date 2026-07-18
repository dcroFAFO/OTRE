import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import PreferredDateField from "@/components/booking/PreferredDateField";

export default function NotesStep({ data, update }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Preferred completion date</Label>
        <PreferredDateField
          value={data.preferredDate || ""}
          onChange={(v) => update({ preferredDate: v })}
        />
        <p className="text-xs text-muted-foreground">Let us know when you'd like the repair completed by (optional).</p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Additional notes (optional)</Label>
        <Textarea
          value={data.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="e.g. when the issue started, noises, error codes, accessories included…"
          className="h-28"
        />
      </div>
    </div>
  );
}