import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import PreferredDateField from "@/components/booking/PreferredDateField";

export default function NotesStep({ data, update }) {
  const dateError = data.preferredDateValid === false ? "Enter a valid date today or later in DD-MM-YY format." : "";
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="portal-preferred-completion" className="text-xs font-semibold">Preferred completion date</Label>
        <PreferredDateField
          id="portal-preferred-completion"
          value={data.preferredDate || ""}
          onChange={(v) => update({ preferredDate: v })}
          onValidityChange={(valid) => update({ preferredDateValid: valid })}
          describedBy={dateError ? "portal-preferred-completion-error" : "portal-preferred-completion-hint"}
        />
        <p id="portal-preferred-completion-hint" className="text-xs text-muted-foreground">Let us know when you'd like the repair completed by (optional).</p>
        {dateError ? <p id="portal-preferred-completion-error" className="text-sm text-destructive" role="alert">{dateError}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="portal-booking-notes" className="text-xs font-semibold">Additional notes (optional)</Label>
        <Textarea
          id="portal-booking-notes"
          value={data.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="e.g. when the issue started, noises, error codes, accessories included…"
          className="h-28"
        />
      </div>
    </div>
  );
}
