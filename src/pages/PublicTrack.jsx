import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StatusPill from "@/components/shared/StatusPill";
import { AlertCircle, CheckCircle2, CreditCard, FileText, Loader2, MessageSquare, Upload } from "lucide-react";

function money(value, currency = "AUD") {
  return `${currency} ${(Number(value) || 0).toFixed(2)}`;
}

export default function PublicTrack() {
  const { jobId } = useParams();
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(null);

  const invoke = async (payload) => {
    const res = await base44.functions.invoke("publicJobAccessActions", { jobId, token, ...payload });
    return res.data;
  };

  const load = async () => {
    setError(null);
    setBusy("load");
    try {
      setData(await invoke({ action: "get" }));
    } catch (err) {
      setError(err?.response?.data?.error || "This tracking link is invalid or unavailable.");
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => { load(); }, [jobId, token]);

  const can = (permission) => data?.permissions?.includes(permission);

  const addNote = async () => {
    if (!note.trim()) return;
    setBusy("note");
    setData(await invoke({ action: "add_note", note }));
    setNote("");
    setBusy(null);
  };

  const uploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("file");
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setData(await invoke({ action: "upload_file", file_url, file_name: file.name, kind: file.type.startsWith("image") ? "photo" : "document" }));
    e.target.value = "";
    setBusy(null);
  };

  const decideQuote = async (approved) => {
    if (!data?.quote?.id) return;
    setBusy(approved ? "approve" : "reject");
    setData(await invoke({ action: "quote_decision", quoteId: data.quote.id, approved }));
    setBusy(null);
  };

  const payInvoice = async () => {
    if (!data?.invoice?.id) return;
    if (window.self !== window.top) {
      alert("Online checkout works only from the published app, not inside the preview.");
      return;
    }
    setBusy("pay");
    const result = await invoke({ action: "start_payment", invoiceId: data.invoice.id });
    if (result?.url) window.location.href = result.url;
    setBusy(null);
  };

  return (
    <>
      <SEO title="Track Repair Job | OTR Scooters" description="Secure public repair job tracking." canonical={`/track/${jobId}`} noindex />
      <main className="min-h-screen bg-background text-foreground">
        <section className="mx-auto max-w-4xl px-5 py-10 sm:py-16">
          <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-foreground">← Back to home</Link>

          {busy === "load" && !data ? (
            <div className="mt-10 rounded-3xl border border-border bg-card p-10 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-muted-foreground" /></div>
          ) : error ? (
            <div className="mt-10 rounded-3xl border border-destructive/20 bg-destructive/10 p-8 text-center text-destructive">
              <AlertCircle className="mx-auto h-8 w-8" />
              <h1 className="mt-3 font-heading text-2xl font-extrabold">Tracking link unavailable</h1>
              <p className="mt-2 text-sm">{error}</p>
            </div>
          ) : data ? (
            <div className="mt-8 space-y-5">
              <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Repair job {data.job.reference || data.job.id}</p>
                    <h1 className="mt-2 font-heading text-3xl font-extrabold">{data.job.asset_label || "Scooter repair"}</h1>
                    <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{data.job.issueDescription || data.job.issue_description}</p>
                  </div>
                  <StatusPill value={data.job.status} />
                </div>
              </div>

              {data.quote && (
                <Card title="Quote" icon={FileText}>
                  <div className="space-y-3">
                    {data.quote.diagnosis_notes && <p className="text-sm text-muted-foreground whitespace-pre-wrap"><strong className="text-foreground">Diagnosis:</strong> {data.quote.diagnosis_notes}</p>}
                    {data.quote.recommended_repair && <p className="text-sm text-muted-foreground whitespace-pre-wrap"><strong className="text-foreground">Recommended repair:</strong> {data.quote.recommended_repair}</p>}
                    {(data.quote.line_items || []).length > 0 && <LineItems items={data.quote.line_items} currency={data.quote.currency} />}
                    <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3"><span className="text-sm font-medium">Quote total</span><strong>{money(data.quote.total, data.quote.currency)}</strong></div>
                    {can("quote_decision") && data.quote.status === "sent" && (
                      <div className="flex gap-2">
                        <Button onClick={() => decideQuote(true)} disabled={!!busy}>{busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve quote</Button>
                        <Button variant="outline" onClick={() => decideQuote(false)} disabled={!!busy}>Reject quote</Button>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {data.invoice && (
                <Card title="Invoice" icon={CreditCard}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between"><span className="font-mono text-sm text-muted-foreground">{data.invoice.number}</span><strong>{money(data.invoice.amount, data.invoice.currency)}</strong></div>
                    {(data.invoice.line_items || []).length > 0 && <LineItems items={data.invoice.line_items} currency={data.invoice.currency} />}
                    {can("pay_invoice") && data.invoice.status !== "paid" && <Button onClick={payInvoice} disabled={!!busy} className="gap-2 bg-emerald-600 hover:bg-emerald-700">{busy === "pay" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Pay invoice</Button>}
                  </div>
                </Card>
              )}

              <Card title="Messages" icon={MessageSquare}>
                <div className="space-y-3">
                  {data.notes?.map((n) => <div key={n.id} className="rounded-xl border border-border bg-secondary/30 p-3 text-sm"><p className="whitespace-pre-wrap">{n.body}</p><p className="mt-1 text-xs text-muted-foreground">{n.author_name || "OTR Scooters"}</p></div>)}
                  {data.notes?.length === 0 && <p className="text-sm text-muted-foreground">No public messages yet.</p>}
                  {can("add_note") && <div className="space-y-2 pt-2"><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Send a message to the team…" /><Button onClick={addNote} disabled={!note.trim() || !!busy}>{busy === "note" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send message"}</Button></div>}
                </div>
              </Card>

              <Card title="Files" icon={Upload}>
                <div className="space-y-3">
                  {data.attachments?.map((a) => <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer" className="block rounded-xl border border-border px-3 py-2 text-sm hover:border-accent">{a.file_name || "File"}</a>)}
                  {data.attachments?.length === 0 && <p className="text-sm text-muted-foreground">No public files yet.</p>}
                  {can("upload_file") && <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-accent transition-colors">{busy === "file" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload photo or file<input type="file" className="hidden" onChange={uploadFile} disabled={!!busy} /></label>}
                </div>
              </Card>
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}

function Card({ title, icon: Icon, children }) {
  return <section className="rounded-3xl border border-border bg-card p-5 shadow-sm"><h2 className="font-heading text-lg font-extrabold flex items-center gap-2 mb-4"><Icon className="h-5 w-5 text-accent" /> {title}</h2>{children}</section>;
}

function LineItems({ items, currency }) {
  return <div className="rounded-xl border border-border divide-y divide-border">{items.map((li, i) => <div key={i} className="flex items-center justify-between px-3 py-2 text-sm"><span>{li.qty > 1 ? `${li.qty}× ` : ""}{li.description}</span><span className="font-medium">{money((Number(li.unit_price) || 0) * (Number(li.qty) || 1), currency)}</span></div>)}</div>;
}