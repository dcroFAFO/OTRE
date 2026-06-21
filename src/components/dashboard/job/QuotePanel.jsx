import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Send, Plus, CalendarDays, Save, Wrench, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getJobQuote, saveQuote, sendQuote } from "@/services/quoteService";
import { aiService } from "@/services/aiService";
import { DEFAULT_QUOTE_TEMPLATE } from "@/config/platformConfig";
import LabourConsumablePickerModal from "@/components/dashboard/job/LabourConsumablePickerModal";
import { format } from "date-fns";

function lineTotal(item) {
  const base = (Number(item.qty) || 1) * (Number(item.unit_price) || 0);
  const tax = base * ((Number(item.tax_rate) || 0) / 100);
  return base + tax - (Number(item.discount_amount) || 0);
}

function totalsFor(items) {
  return (items || []).reduce((totals, item) => {
    const total = lineTotal(item);
    if (item.kind === "part") totals.parts += total;
    else totals.labour += total;
    return totals;
  }, { labour: 0, parts: 0 });
}

export default function QuotePanel({ job, actor, canEdit, onChange }) {
  const [quote, setQuote] = useState(null);
  const [form, setForm] = useState({ labour_estimate: 0, parts_estimate: 0, diagnosis_notes: "" });
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
    if (q) setForm({ ...q, recommended_repair: undefined });
  };

  useEffect(() => { loadQuote(); }, [job.id]);

  const lineItems = quote?.line_items || [];
  const labourItems = lineItems.filter((li) => li.kind !== "part");
  const total = labourItems.reduce((sum, item) => sum + lineTotal(item), 0);

  const saveWithItems = async (items = lineItems, nextForm = form) => {
    const totals = totalsFor(items);
    const q = await saveQuote(job, {
      ...quote,
      ...nextForm,
      id: quote?.id,
      line_items: items,
      labour_estimate: totals.labour,
      parts_estimate: totals.parts,
      recommended_repair: undefined,
    }, actor);
    setQuote(q);
    setForm({ ...q, recommended_repair: undefined });
    onChange?.();
    return q;
  };

  const save = async () => {
    setSaving(true);
    await saveWithItems();
    setSaving(false);
    toast.success("Labour and consumables saved.");
  };

  const send = async () => {
    setSending(true);
    if (!quote) await saveWithItems();
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
      setForm((prev) => ({ ...prev, diagnosis_notes: r.draft.diagnosis_notes || prev.diagnosis_notes }));
      setNotesExpanded(true);
      setAiMsg("AI diagnosis draft applied — review the notes below.");
    } else {
      setAiMsg("AI draft failed. Please try again.");
    }
  };

  const addLabourConsumables = async (items) => {
    const nextItems = [...lineItems, ...items];
    await saveWithItems(nextItems);
    await loadQuote();
    qc.invalidateQueries({ queryKey: ["inventoryUsage", job.id] });
    toast.success("Labour / consumable added.");
  };

  const removeLine = async (index) => {
    const nextItems = lineItems.filter((_, itemIndex) => itemIndex !== index);
    await saveWithItems(nextItems);
  };

  return (
    <div className="space-y-4">
      {canEdit ? (
        <>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-secondary/50 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5" /> Labour and Consumables
              </span>
              <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)} className="h-7 gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" /> Add Labour / Consumable
              </Button>
            </div>

            <div className="min-h-[120px]">
              {labourItems.length > 0 ? (
                <div className="divide-y divide-border">
                  {lineItems.map((li, sourceIndex) => li.kind === "part" ? null : (
                      <div key={`${li.description}-${sourceIndex}`} className="flex items-center justify-between px-3 py-2.5 text-sm">
                        <span className="flex items-center gap-1.5 text-foreground min-w-0">
                          <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{li.qty > 1 ? `${li.qty}× ` : ""}{li.description}</span>
                          {Number(li.tax_rate) > 0 && <span className="text-xs text-muted-foreground">Tax {li.tax_rate}%</span>}
                        </span>
                        <span className="flex items-center gap-2 font-medium tabular-nums">
                          ${lineTotal(li).toFixed(2)}
                          <button onClick={() => removeLine(sourceIndex)} className="p-1 rounded hover:bg-rose-50 text-muted-foreground hover:text-rose-600 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </div>
                  ))}
                  <button onClick={() => setPickerOpen(true)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-accent transition-colors border-t border-dashed border-border">
                    <Plus className="h-3 w-3" /> Add Labour / Consumable
                  </button>
                </div>
              ) : (
                <button onClick={() => setPickerOpen(true)} className="w-full flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground hover:text-accent transition-colors">
                  <Wrench className="h-8 w-8 opacity-30" />
                  <p className="text-sm font-medium">Add Labour / Consumable</p>
                  <p className="text-xs opacity-60">Browse labour, fees, surcharges and workshop consumables</p>
                </button>
              )}
            </div>
          </div>

          <LabourConsumablePickerModal open={pickerOpen} onOpenChange={setPickerOpen} onAdd={addLabourConsumables} />

          <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
            <span className="text-sm font-medium">Labour and consumables total</span>
            <span className="font-heading text-xl font-extrabold">${total.toFixed(2)}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={save} disabled={saving} className="gap-1.5">
              {saving ? <Save className="h-3.5 w-3.5 animate-pulse" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" onClick={send} disabled={sending} className="gap-1.5">
              <Send className={`h-4 w-4 ${sending ? "animate-pulse" : ""}`} />
              {sending ? "Sending…" : "Send estimate"}
            </Button>
            <Button size="sm" variant="ghost" onClick={aiDraft} className="gap-1.5 text-accent">
              <Sparkles className="h-4 w-4" /> AI draft
            </Button>
          </div>

          {aiMsg && <p className="text-xs text-muted-foreground italic">{aiMsg}</p>}

          <div className="rounded-xl border border-border overflow-hidden">
            <button className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-secondary/40 transition-colors" onClick={() => setNotesExpanded(!notesExpanded)}>
              <span>Diagnosis & Notes</span>
              {notesExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {notesExpanded && (
              <div className="px-3 pb-3 space-y-2 border-t border-border bg-secondary/10">
                <div className="space-y-1 pt-2">
                  <Label className="text-xs">{labelFor("diagnosis_notes")}</Label>
                  <Textarea
                    value={form.diagnosis_notes || ""}
                    onChange={(e) => setForm({ ...form, diagnosis_notes: e.target.value })}
                    className="h-20 text-xs resize-none"
                    placeholder="Diagnosis findings…"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <QuoteReadOnlyView quote={quote} />
      )}
    </div>
  );
}

function QuoteReadOnlyView({ quote }) {
  if (!quote) return <p className="text-sm text-muted-foreground py-4">No labour, consumables, or diagnosis notes have been created for this job.</p>;

  const allLineItems = (quote.line_items || []).filter((li) => li.kind !== "part");
  return (
    <div className="space-y-4">
      {quote.diagnosis_notes && (
        <ReadOnlyField label="Diagnosis notes">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{quote.diagnosis_notes}</p>
        </ReadOnlyField>
      )}

      {allLineItems.length > 0 && (
        <ReadOnlyField label="Labour and consumables">
          <div className="rounded-xl border border-border divide-y divide-border">
            {allLineItems.map((li, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{li.qty > 1 ? `${li.qty}× ` : ""}{li.description}</span>
                <span className="font-medium tabular-nums">${lineTotal(li).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </ReadOnlyField>
      )}

      <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
        <span className="text-sm font-medium">Labour and consumables total</span>
        <span className="font-heading text-xl font-extrabold">${(quote.labour_estimate || 0).toFixed(2)}</span>
      </div>

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