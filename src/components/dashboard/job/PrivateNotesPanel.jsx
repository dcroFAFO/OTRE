import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Save, Check, Loader2, Trash2 } from "lucide-react";
import { savePrivateNotes } from "@/services/jobService";

export default function PrivateNotesPanel({ job, canEdit, onChange }) {
  const [value, setValue] = useState(job.private_notes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setValue(job.private_notes || ""); }, [job.id, job.private_notes]);

  const dirty = value !== (job.private_notes || "");

  const save = async (nextValue = value) => {
    setSaving(true);
    setError("");
    try {
      await savePrivateNotes(job, nextValue);
      setValue(nextValue);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onChange?.();
    } catch (err) {
      setError(err?.response?.data?.error || "Private note could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-heading font-bold flex items-center gap-1.5">
          <Lock className="h-4 w-4 text-muted-foreground" /> Private notes
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Internal only — document repair issues or part failures. Never visible to the customer.
        </p>
      </div>

      {canEdit ? (
        <>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. Rear hub motor bearing seized — likely water ingress. Controller showing intermittent fault under load."
            className="h-48 leading-relaxed"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex items-center justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => save("")} disabled={!value.trim() || saving} className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Delete note
            </Button>
            <Button type="button" size="sm" onClick={() => save()} disabled={!dirty || saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              {saved ? "Saved" : "Save"}
            </Button>
          </div>
        </>
      ) : value ? (
        <p className="text-sm text-foreground whitespace-pre-wrap rounded-xl border border-border bg-secondary/40 p-3">{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground">No private notes.</p>
      )}
    </div>
  );
}
