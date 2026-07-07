import React from "react";
import { Textarea } from "@/components/ui/textarea";

export default function NotesStep({ data, update }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Anything else we should know? (optional)</p>
      <Textarea
        value={data.notes}
        onChange={(e) => update({ notes: e.target.value })}
        placeholder="e.g. when the issue started, noises, error codes, accessories included…"
        className="h-28"
      />
    </div>
  );
}