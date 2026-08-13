import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, Sparkles, Loader2 } from "lucide-react";
import { aiService } from "@/services/aiService";
import { toast } from "sonner";
import { getSafeErrorMessage } from "@/lib/errors";

// Technician diagnosis findings, stored on Job.diagnosis_notes.
export default function DiagnosisNotesCard({ job, canEdit, onChange }) {
  const [notes, setNotes] = useState(job.diagnosis_notes || "");
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);

  const save = async () => {
    if (saving || drafting) return;
    setSaving(true);
    try {
      await base44.entities.Job.update(job.id, { diagnosis_notes: notes });
      onChange?.();
      toast.success("Diagnosis notes saved.");
    } catch (err) {
      toast.error(getSafeErrorMessage(err, "Diagnosis notes could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const aiDraft = async () => {
    if (drafting || saving) return;
    setDrafting(true);
    try {
      const result = await aiService.draftQuote(job);
      if (result.available && result.draft?.diagnosis_notes) {
        setNotes(result.draft.diagnosis_notes);
        toast.success("AI draft applied — review before saving.");
      } else {
        toast.error("AI draft is unavailable right now.");
      }
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "An AI draft could not be created."));
    } finally {
      setDrafting(false);
    }
  };

  if (!canEdit) {
    return notes
      ? <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{notes}</p>
      : <p className="text-sm text-muted-foreground">No diagnosis notes recorded.</p>;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`diagnosis-notes-${job.id}`} className="text-xs">Diagnosis notes</Label>
      <Textarea
        id={`diagnosis-notes-${job.id}`}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="h-20 resize-none text-xs"
        placeholder="Diagnosis findings…"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="touch" variant="outline" onClick={save} disabled={saving || drafting} className="gap-1.5 sm:h-9">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="touch" variant="ghost" onClick={aiDraft} disabled={drafting || saving} className="gap-1.5 text-accent sm:h-9">
          {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI draft
        </Button>
      </div>
    </div>
  );
}
