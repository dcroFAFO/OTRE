import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, Sparkles, Loader2 } from "lucide-react";
import { aiService } from "@/services/aiService";
import { toast } from "sonner";

// Technician diagnosis findings, stored on Job.diagnosis_notes.
export default function DiagnosisNotesCard({ job, canEdit, onChange }) {
  const [notes, setNotes] = useState(job.diagnosis_notes || "");
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.Job.update(job.id, { diagnosis_notes: notes });
      onChange?.();
      toast.success("Diagnosis notes saved.");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save diagnosis notes.");
    } finally {
      setSaving(false);
    }
  };

  const aiDraft = async () => {
    setDrafting(true);
    try {
      const result = await aiService.draftQuote(job);
      if (result.available && result.draft?.diagnosis_notes) {
        setNotes(result.draft.diagnosis_notes);
        toast.success("AI draft applied — review before saving.");
      } else {
        toast.error("AI draft is unavailable right now.");
      }
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
      <Label className="text-xs">Diagnosis notes</Label>
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="h-20 resize-none text-xs"
        placeholder="Diagnosis findings…"
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={save} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={aiDraft} disabled={drafting} className="gap-1.5 text-accent">
          {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI draft
        </Button>
      </div>
    </div>
  );
}