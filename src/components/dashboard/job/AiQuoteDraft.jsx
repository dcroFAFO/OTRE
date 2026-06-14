import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import { aiService } from "@/services/aiService";
import { errorMessage } from "@/lib/errors";

const LABOUR_RATE = 80;

// AI quote drafting with mandatory review-before-use. Generates a draft into a
// preview card; the technician must explicitly apply it (which only fills the
// editable form fields — nothing is saved until they hit "Save quote").
export default function AiQuoteDraft({ job, onApply }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError("");
    setDraft(null);
    try {
      const r = await aiService.draftQuote(job);
      if (!r.draft) {
        setError("No draft was generated. Please try again.");
      } else {
        setDraft(r.draft);
      }
    } catch (e) {
      setError(errorMessage(e));
    }
    setLoading(false);
  };

  const apply = () => {
    onApply?.(draft);
    setDraft(null);
  };

  return (
    <div className="space-y-2">
      {!draft && (
        <Button
          size="sm"
          variant="ghost"
          onClick={generate}
          disabled={loading}
          className="gap-1.5 text-accent"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Drafting…" : "AI draft"}
        </Button>
      )}

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {draft && (
        <div className="space-y-3 rounded-xl border border-accent/40 bg-accent/5 p-3.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-accent">
            <Sparkles className="h-3.5 w-3.5" /> AI draft — review before applying
          </p>

          <DraftField label="Diagnosis notes" value={draft.diagnosis_notes} />
          <DraftField label="Recommended repair" value={draft.recommended_repair} />

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Labour</p>
            <p className="text-sm text-foreground">
              {draft.labour_hours} hr{draft.labour_hours === 1 ? "" : "s"}{" "}
              <span className="text-muted-foreground">
                (≈ ${(Math.max(1, draft.labour_hours || 0) * LABOUR_RATE).toFixed(2)})
              </span>
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground italic">
            Applying fills the fields below — review and edit, then Save quote. Nothing is saved automatically.
          </p>

          <div className="flex gap-2">
            <Button size="sm" onClick={apply} className="gap-1.5">
              <Check className="h-4 w-4" /> Apply to form
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)} className="gap-1.5">
              <X className="h-4 w-4" /> Discard
            </Button>
            <Button size="sm" variant="outline" onClick={generate} disabled={loading} className="gap-1.5 ml-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Regenerate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DraftField({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{value}</p>
    </div>
  );
}