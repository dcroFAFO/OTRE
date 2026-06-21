import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Send, Plus, CalendarDays, Save, Wrench, Package, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { getJobQuote, saveQuote, sendQuote } from "@/services/quoteService";
import { aiService } from "@/services/aiService";
import { DEFAULT_QUOTE_TEMPLATE } from "@/config/platformConfig";
import PartsSourcingPanel from "@/components/dashboard/job/PartsSourcingPanel";
import PartPickerModal from "@/components/dashboard/job/PartPickerModal";
import { format } from "date-fns";

const LABOUR_RATE = 80;

export default function QuotePanel({ job, actor, canEdit, onChange }) {
  const [quote, setQuote] = useState(null);
  const [form, setForm] = useState({
    labour_estimate: 0, parts_estimate: 0,
    diagnosis_notes: "", recommended_repair: "",
  });
  const [labourHours, setLabourHours] = useState("1");
  const [addingLabour, setAddingLabour] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const qc = useQueryClient();

  const labelFor = (key) => DEFAULT_QUOTE_TEMPLATE.fields.find((f) => f.key === key)?.label || key;

  const loadQuote = async () => {
    const q = await getJobQuote(job.id);
    setQuote(q);
    if (q) setForm({ ...q });
  };

  useEffect(() => { loadQuote(); }, [job.id]);

  const lineItems = quote?.line_items || [];
  const partItems = lineItems.filter((li) => li.kind === "part");
  const labourItems = lineItems.filter((li) => li.kind === "labour");

  const total = (Number(quote?.labour_estimate) || 0) + (Number(quote?.parts_estimate) || 0);

  const addLabour = async () => {
    const hrs = Number(labourHours) || 1;
    if (hrs <= 0) return;
    setAddingLabour(true);
    const res = await base44.functions.invoke("quoteActions", { action: "add_labour", jobId: job.id, hours: hrs });
    setQuote(res.data);
    onChange?.();
    setAddingLabour(false);
  };

  const save = async () => {
    setSaving(true);
    const q = await saveQuote(job, { ...form, id: quote?.id }, actor);
    setQuote(q);
    onChange?.();
    setSaving(false);
    toast.success("Estimate saved as draft.");
  };

  const send = async () => {
    setSending(true);
    if (!quote) await save();
    const q = await getJobQuote(job.id);
    const s = await sendQuote(q, job, actor);
    setQuote(s);
    onChange?.();
    setSending(false);
    toast.success("Estimate sent to customer via email.");
  };

  const aiDraft = async () => {
    setAiMsg("Generating AI draft…");
    const r = await aiService.draftQuote(job);
    if (r.available && r.draft) {
      setForm((prev) => ({
        ...prev,
        diagnosis_notes: r.draft.diagnosis_notes || prev.diagnosis_notes,
        recommended_repair: r.draft.recommended_repair || prev.recommended_repair,
      }));
      if (r.draft.labour_hours) setLabourHours(String(r.draft.labour_hours));
      setNotesExpanded(true);
      setAiMsg("AI draft applied — review the notes below and add parts.");
    } else {
      setAiMsg("AI draft failed. Please try again.");
    }
  };

  return (
    <div className="space-y-4">
      {canEdit ? (
        // ── Editable view ────────────────────────────────────────────────────
        <>
          {/* ── LINE ITEMS — hero section ─────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-secondary/50 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" /> Line Items
              </span>
              {/* Labour adder inline */}
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Wrench className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground hidden sm:inline">Labour</span>
                <Input
                  type="number" min={0.25} step={0.25}
                  value={labourHours}
                  onChange={(e) => setLabourHours(e.target.value)}
                  className="h-6 w-14 px-1.5 py-0 text-xs"
                />
                <span className="text-xs text-muted-foreground">hr</span>
                <Button size="sm" variant="outline" className="h-6 text-xs px-2 gap-1" onClick={addLabour} disabled={addingLabour}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Clickable body — opens parts picker */}
            <div
              className="cursor-pointer group min-h-[120px]"
              onClick={() => setPickerOpen(true)}
            >
              {(labourItems.length > 0 || partItems.length > 0) ? (
                <div className="divide-y divide-border">
                  {labourItems.map((li, i) => (
                    <div key={`l-${i}`} className="flex items-center justify-between px-3 py-2.5 text-sm group-hover:bg-secondary/30 transition-colors">
                      <span className="flex items-center gap-1.5 text-foreground">
                        <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />{li.description}
                      </span>
                      <span className="font-medium tabular-nums">
                        ${((Number(li.unit_price) || 0) * (Number(li.qty) || 1)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {partItems.map((li, i) => (
                    <div key={`p-${i}`} className="flex items-center justify-between px-3 py-2.5 text-sm group-hover:bg-secondary/30 transition-colors">
                      <span className="text-foreground">{li.qty > 1 ? `${li.qty}× ` : ""}{li.description}</span>
                      <span className="font-medium tabular-nums">
                        ${((Number(li.unit_price) || 0) * (Number(li.qty) || 1)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {/* Add more hint */}
                  <div className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-muted-foreground group-hover:text-accent transition-colors border-t border-dashed border-border">
                    <Plus className="h-3 w-3" /> Add parts / search catalogue
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground group-hover:text-accent transition-colors">
                  <Package className="h-8 w-8 opacity-30 group-hover:opacity-60 transition-opacity" />
                  <p className="text-sm font-medium">Click to add parts</p>
                  <p className="text-xs opacity-60">Search the parts catalogue</p>
                </div>
              )}
            </div>
          </div>

          <PartPickerModal job={job} actor={actor} open={pickerOpen} onOpenChange={setPickerOpen} onAdded={() => { loadQuote(); onChange?.(); qc.invalidateQueries(["inventoryUsage", job.id]); }} />

          {/* ── TOTAL ────────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
            <span className="text-sm font-medium">Costing total</span>
            <span className="font-heading text-xl font-extrabold">${total.toFixed(2)}</span>
          </div>

          {/* ── ACTIONS ──────────────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={save} disabled={saving} className="gap-1.5">
              {saving ? <Save className="h-3.5 w-3.5 animate-pulse" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "Saving…" : "Save estimate"}
            </Button>
            <Button size="sm" onClick={send} disabled={sending} className="gap-1.5">
              <Send className={`h-4 w-4 ${sending ? "animate-pulse" : ""}`} />
              {sending ? "Sending…" : "Send to customer"}
            </Button>
            <Button size="sm" variant="ghost" onClick={aiDraft} className="gap-1.5 text-accent">
              <Sparkles className="h-4 w-4" /> AI draft
            </Button>
          </div>

          {aiMsg && <p className="text-xs text-muted-foreground italic">{aiMsg}</p>}

          {/* ── NOTES FOOTER (collapsible) ────────────────────────────────── */}
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-secondary/40 transition-colors"
              onClick={() => setNotesExpanded(!notesExpanded)}
            >
              <span>Diagnosis & Notes</span>
              {notesExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {notesExpanded && (
              <div className="px-3 pb-3 space-y-2 border-t border-border bg-secondary/10">
                <div className="space-y-1 pt-2">
                  <Label className="text-xs">{labelFor("diagnosis_notes")}</Label>
                  <Textarea
                    value={form.diagnosis_notes}
                    onChange={(e) => setForm({ ...form, diagnosis_notes: e.target.value })}
                    className="h-16 text-xs resize-none"
                    placeholder="Diagnosis findings…"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{labelFor("recommended_repair")}</Label>
                  <Textarea
                    value={form.recommended_repair}
                    onChange={(e) => setForm({ ...form, recommended_repair: e.target.value })}
                    className="h-10 text-xs resize-none"
                    placeholder="Recommended fix…"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        // ── Read-only view ───────────────────────────────────────────────────
        <QuoteReadOnlyView quote={quote} />
      )}
    </div>
  );
}

function QuoteReadOnlyView({ quote }) {
  if (!quote) {
    return <p className="text-sm text-muted-foreground py-4">No estimate or costing has been created for this job.</p>;
  }

  const allLineItems = (quote.line_items || []);
  return (
    <div className="space-y-4">
      {/* Diagnosis & repair */}
      {quote.diagnosis_notes && (
        <ReadOnlyField label="Diagnosis notes">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{quote.diagnosis_notes}</p>
        </ReadOnlyField>
      )}
      {quote.recommended_repair && (
        <ReadOnlyField label="Recommended repair">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{quote.recommended_repair}</p>
        </ReadOnlyField>
      )}

      {/* Line items */}
      {allLineItems.length > 0 && (
        <ReadOnlyField label="Line items">
          <div className="rounded-xl border border-border divide-y divide-border">
            {allLineItems.map((li, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{li.qty > 1 ? `${li.qty}× ` : ""}{li.description}</span>
                <span className="font-medium tabular-nums">
                  ${((Number(li.unit_price) || 0) * (Number(li.qty) || 1)).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </ReadOnlyField>
      )}

      {/* Total */}
      <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
        <span className="text-sm font-medium">Quote total</span>
        <span className="font-heading text-xl font-extrabold">${(quote.total || 0).toFixed(2)}</span>
      </div>

      {/* Sent date */}
      {quote.sent_date && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          Sent {format(new Date(quote.sent_date), "d MMM yyyy, h:mm a")}
        </p>
      )}
    </div>
  );
}

function ReadOnlyField({ label, children }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}