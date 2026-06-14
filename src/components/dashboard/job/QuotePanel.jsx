import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Plus, Clock, Lock, CheckCircle2, XCircle, CalendarDays } from "lucide-react";
import StatusPill from "@/components/shared/StatusPill";
import { getJobQuote, saveQuote, sendQuote, setQuoteApproval } from "@/services/quoteService";
import { aiService } from "@/services/aiService";
import { DEFAULT_QUOTE_TEMPLATE } from "@/config/platformConfig";
import PartsSourcingPanel from "@/components/dashboard/job/PartsSourcingPanel";
import PartPickerModal from "@/components/dashboard/job/PartPickerModal";
import { format } from "date-fns";

const LABOUR_RATE = 80;
const MIN_HOURS = 1;
const labourCost = (hours) => Math.max(MIN_HOURS, Number(hours) || 0) * LABOUR_RATE;

export default function QuotePanel({ job, actor, canEdit, onChange }) {
  const [quote, setQuote] = useState(null);
  const [form, setForm] = useState({
    labour_hours: "", labour_estimate: 0, parts_estimate: 0,
    diagnosis_notes: "", recommended_repair: "",
  });
  const [aiMsg, setAiMsg] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const labelFor = (key) => DEFAULT_QUOTE_TEMPLATE.fields.find((f) => f.key === key)?.label || key;

  const loadQuote = async () => {
    const q = await getJobQuote(job.id);
    setQuote(q);
    if (q) setForm({ labour_hours: "", ...q });
  };

  useEffect(() => { loadQuote(); }, [job.id]);

  const partItems = (quote?.line_items || []).filter((li) => li.kind === "part");

  const labour = form.labour_hours !== ""
    ? labourCost(form.labour_hours)
    : (Number(form.labour_estimate) || 0);
  const total = labour + (Number(form.parts_estimate) || 0);

  const save = async () => {
    const q = await saveQuote(job, { ...form, id: quote?.id }, actor);
    setQuote(q);
    onChange?.();
  };

  const send = async () => {
    if (!quote) await save();
    const q = await getJobQuote(job.id);
    const s = await sendQuote(q, job, actor);
    setQuote(s);
    onChange?.();
  };

  const approve = async (ok) => {
    const s = await setQuoteApproval(quote, job, ok, actor);
    setQuote(s);
    onChange?.();
  };

  const aiDraft = async () => {
    const r = await aiService.draftQuote(job);
    setAiMsg(r.message);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold flex items-center gap-2">
          Quote
          {!canEdit && (
            <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
              <Lock className="h-3 w-3" /> Read-only
            </span>
          )}
        </h3>
        {quote && <StatusPill kind="quote" value={quote.status} />}
      </div>

      {canEdit ? (
        // ── Editable view ────────────────────────────────────────────────────
        <>
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-accent" /> Time to complete (hours)
            </Label>
            <Input
              type="number" min={0} step="0.25" placeholder="e.g. 1.5"
              value={form.labour_hours}
              onChange={(e) => setForm({ ...form, labour_hours: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Labour at ${LABOUR_RATE}/hr (min {MIN_HOURS}hr) ={" "}
              <span className="font-semibold text-foreground">${labour.toFixed(2)}</span>
            </p>
          </div>

          <div className="space-y-1">
            <Label>{labelFor("diagnosis_notes")}</Label>
            <Textarea
              value={form.diagnosis_notes}
              onChange={(e) => setForm({ ...form, diagnosis_notes: e.target.value })}
              className="h-20"
            />
          </div>

          <div className="space-y-1">
            <Label>{labelFor("recommended_repair")}</Label>
            <Textarea
              value={form.recommended_repair}
              onChange={(e) => setForm({ ...form, recommended_repair: e.target.value })}
              className="h-20"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Parts on quote</Label>
            <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Add item
            </Button>
          </div>

          {partItems.length > 0 ? (
            <div className="rounded-xl border border-border divide-y divide-border">
              {partItems.map((li, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-foreground">{li.qty > 1 ? `${li.qty}× ` : ""}{li.description}</span>
                  <span className="font-medium tabular-nums">
                    ${((Number(li.unit_price) || 0) * (Number(li.qty) || 1)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No parts added yet. Use "Add item" to pick from the parts catalogue.
            </p>
          )}

          <PartsSourcingPanel job={job} actor={actor} onAdded={() => { loadQuote(); onChange?.(); }} />
          <PartPickerModal job={job} actor={actor} open={pickerOpen} onOpenChange={setPickerOpen} onAdded={() => { loadQuote(); onChange?.(); }} />

          <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
            <span className="text-sm font-medium">Quote total</span>
            <span className="font-heading text-xl font-extrabold">${total.toFixed(2)}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={save}>Save quote</Button>
            <Button size="sm" onClick={send} className="gap-1.5">
              <Send className="h-4 w-4" /> Send to customer
            </Button>
            {quote?.status === "sent" && (
              <Button size="sm" variant="outline" onClick={() => approve(true)}>Approve manually</Button>
            )}
            <Button size="sm" variant="ghost" onClick={aiDraft} className="gap-1.5 text-accent">
              <Sparkles className="h-4 w-4" /> AI draft
            </Button>
          </div>

          {aiMsg && <p className="text-xs text-muted-foreground italic">{aiMsg}</p>}
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
    return <p className="text-sm text-muted-foreground py-4">No quote has been created for this job.</p>;
  }

  const partItems = (quote.line_items || []).filter((li) => li.kind === "part");

  return (
    <div className="space-y-4">
      {/* Approval status banner */}
      {quote.approval_status && quote.approval_status !== "pending" && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border ${
          quote.approval_status === "approved"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
            : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
        }`}>
          {quote.approval_status === "approved"
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <XCircle className="h-4 w-4 shrink-0" />}
          Quote {quote.approval_status}
        </div>
      )}

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

      {/* Labour */}
      {(quote.labour_estimate != null && quote.labour_estimate > 0) && (
        <ReadOnlyField label="Labour">
          <p className="text-sm font-medium tabular-nums">${Number(quote.labour_estimate).toFixed(2)}</p>
        </ReadOnlyField>
      )}

      {/* Parts list */}
      {partItems.length > 0 && (
        <ReadOnlyField label="Parts">
          <div className="rounded-xl border border-border divide-y divide-border">
            {partItems.map((li, i) => (
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