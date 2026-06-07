import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Plus, Check, ExternalLink, Store } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PartsSourcingPanel({ job, actor, onAdded }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState({});
  const [adding, setAdding] = useState(false);

  const research = async () => {
    setLoading(true);
    setError("");
    setSelected({});
    try {
      const res = await base44.functions.invoke("sourcePartsForJob", { jobId: job.id });
      const parts = (res.data?.parts || []).map((p, i) => ({ ...p, _id: i, qty: 1 }));
      setResults(parts);
      if (parts.length === 0) setError("No parts found for this make/model and service.");
    } catch (e) {
      setError(e?.response?.data?.error || "Could not research parts. Please try again.");
    }
    setLoading(false);
  };

  const toggle = (p) =>
    setSelected((s) => {
      const next = { ...s };
      if (next[p._id]) delete next[p._id];
      else next[p._id] = p;
      return next;
    });

  const setQty = (p, qty) =>
    setSelected((s) => (s[p._id] ? { ...s, [p._id]: { ...s[p._id], qty: Math.max(1, Number(qty) || 1) } } : s));

  const chosen = Object.values(selected);
  const addToQuote = async () => {
    if (chosen.length === 0) return;
    setAdding(true);
    const { addPartsToQuote } = await import("@/services/quoteService");
    await addPartsToQuote(job, chosen, actor);
    setAdding(false);
    setSelected({});
    onAdded?.();
  };

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="font-heading text-sm font-bold flex items-center gap-1.5">
            <Search className="h-4 w-4 text-accent" /> Source parts online
          </p>
          <p className="text-xs text-muted-foreground">
            Finds real parts & prices for <strong>{job.asset_label || job.scooter_label || "this scooter"}</strong>.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={research} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {results ? "Research again" : "Find parts"}
        </Button>
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {results && results.length > 0 && (
        <div className="space-y-2">
          {results.map((p) => {
            const isSel = !!selected[p._id];
            return (
              <div
                key={p._id}
                className={cn(
                  "rounded-lg border p-2.5 text-sm transition-colors",
                  isSel ? "border-accent bg-accent/5" : "border-border"
                )}
              >
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => toggle(p)}
                    className={cn(
                      "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border",
                      isSel ? "border-accent bg-accent text-accent-foreground" : "border-input"
                    )}
                  >
                    {isSel && <Check className="h-3.5 w-3.5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{p.name}</span>
                      <span className="font-heading font-bold tabular-nums">${(Number(p.typical_price) || 0).toFixed(2)}</span>
                    </div>
                    {p.note && <p className="text-xs text-muted-foreground">{p.note}</p>}
                    <div className="mt-1 flex items-center gap-2">
                      {p.retailer && (
                        p.source === "estore" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                            <Store className="h-3 w-3" /> {p.retailer}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <ExternalLink className="h-3 w-3" /> {p.retailer}
                          </span>
                        )
                      )}
                      {isSel && (
                        <span className="inline-flex items-center gap-1 text-[11px]">
                          Qty
                          <Input
                            type="number"
                            min={1}
                            value={selected[p._id].qty}
                            onChange={(e) => setQty(p, e.target.value)}
                            className="h-6 w-14 px-1.5 py-0 text-xs"
                          />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <Button size="sm" onClick={addToQuote} disabled={chosen.length === 0 || adding} className="gap-1.5 w-full">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add {chosen.length > 0 ? `${chosen.length} part${chosen.length !== 1 ? "s" : ""}` : "parts"} to quote
          </Button>
        </div>
      )}
    </div>
  );
}