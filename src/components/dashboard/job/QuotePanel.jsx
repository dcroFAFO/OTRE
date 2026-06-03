import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Send } from "lucide-react";
import StatusPill from "@/components/shared/StatusPill";
import { getJobQuote, saveQuote, sendQuote, setQuoteApproval } from "@/services/quoteService";
import { aiService } from "@/services/aiService";
import { DEFAULT_QUOTE_TEMPLATE } from "@/config/platformConfig";

export default function QuotePanel({ job, actor, canEdit, onChange }) {
  const [quote, setQuote] = useState(null);
  const labelFor = (key) => DEFAULT_QUOTE_TEMPLATE.fields.find((f) => f.key === key)?.label || key;
  const [form, setForm] = useState({ labour_estimate: 0, parts_estimate: 0, diagnosis_notes: "", recommended_repair: "" });
  const [aiMsg, setAiMsg] = useState("");

  useEffect(() => { getJobQuote(job.id).then((q) => { setQuote(q); if (q) setForm(q); }); }, [job.id]);

  const total = (Number(form.labour_estimate) || 0) + (Number(form.parts_estimate) || 0);

  const save = async () => { const q = await saveQuote(job, { ...form, id: quote?.id }, actor); setQuote(q); onChange?.(); };
  const send = async () => { if (!quote) await save(); const q = await getJobQuote(job.id); const s = await sendQuote(q, job, actor); setQuote(s); onChange?.(); };
  const approve = async (ok) => { const s = await setQuoteApproval(quote, job, ok, actor); setQuote(s); onChange?.(); };
  const aiDraft = async () => { const r = await aiService.draftQuote(job); setAiMsg(r.message); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold">Quote</h3>
        {quote && <StatusPill kind="quote" value={quote.status} />}
      </div>

      {canEdit ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>{labelFor("labour_estimate")} ($)</Label><Input type="number" value={form.labour_estimate} onChange={(e) => setForm({ ...form, labour_estimate: e.target.value })} /></div>
            <div className="space-y-1"><Label>{labelFor("parts_estimate")} ($)</Label><Input type="number" value={form.parts_estimate} onChange={(e) => setForm({ ...form, parts_estimate: e.target.value })} /></div>
          </div>
          <div className="space-y-1"><Label>{labelFor("diagnosis_notes")}</Label><Textarea value={form.diagnosis_notes} onChange={(e) => setForm({ ...form, diagnosis_notes: e.target.value })} className="h-20" /></div>
          <div className="space-y-1"><Label>{labelFor("recommended_repair")}</Label><Textarea value={form.recommended_repair} onChange={(e) => setForm({ ...form, recommended_repair: e.target.value })} className="h-20" /></div>
          <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
            <span className="text-sm font-medium">Quote total</span>
            <span className="font-heading text-xl font-extrabold">${total.toFixed(2)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={save}>Save quote</Button>
            <Button size="sm" onClick={send} className="gap-1.5"><Send className="h-4 w-4" /> Send to customer</Button>
            {quote?.status === "sent" && <Button size="sm" variant="outline" onClick={() => approve(true)}>Approve manually</Button>}
            <Button size="sm" variant="ghost" onClick={aiDraft} className="gap-1.5 text-accent"><Sparkles className="h-4 w-4" /> AI draft</Button>
          </div>
          {aiMsg && <p className="text-xs text-muted-foreground italic">{aiMsg}</p>}
        </>
      ) : (
        <div className="rounded-xl border border-border p-4 space-y-2">
          {quote ? (
            <>
              <p className="text-sm">{quote.recommended_repair || "Quote prepared for your review."}</p>
              <p className="font-heading text-xl font-extrabold">${(quote.total || 0).toFixed(2)}</p>
              {quote.status === "sent" && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={() => approve(true)} className="bg-emerald-600 hover:bg-emerald-700">Approve quote</Button>
                  <Button size="sm" variant="outline" onClick={() => approve(false)}>Reject</Button>
                </div>
              )}
            </>
          ) : <p className="text-sm text-muted-foreground">No quote yet.</p>}
        </div>
      )}
    </div>
  );
}