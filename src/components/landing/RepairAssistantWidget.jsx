import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { base44 } from "@/api/base44Client";

const QUICK_REPLIES = ["Won’t turn on", "Won’t charge", "Flat tyre or puncture", "Brake issue", "Error code", "Reduced range", "Strange noise", "General service"];
const OPENING = "Hi, I’m the On The Run Electrics repair assistant. Tell me what’s happening with your scooter and I’ll point you in the right direction.";
const SAFETY_TERMS = /brake|cut.?out|cuts out|exposed wiring|swelling|burning|smoke|unstable|wobble|sparking|fire/i;

function categoryFrom(text = "") {
  const value = text.toLowerCase();
  if (/tyre|tire|puncture|flat/.test(value)) return "Tyres / puncture";
  if (/brake/.test(value)) return "Brakes";
  if (/charge|charger|charging/.test(value)) return "Charging system";
  if (/battery|range/.test(value)) return "Battery";
  if (/turn on|power|cut.?out|controller|wire|error|code|electrical/.test(value)) return "Electrical / power fault";
  if (/noise|service|maintenance/.test(value)) return "Service / inspection";
  return "General diagnostic inspection";
}

function nextLocalReply(context) {
  if (!context.issue) return OPENING;
  if (!context.makeModel) return "Got it. What scooter make and model is it, if you know?";
  if (!context.rideable) return "Is it currently rideable, or should it be left off the road until inspected?";
  if (!context.safety) return "Is it urgent or safety-related — for example brakes, power cut-outs, exposed wiring, smoke, burning smells, or instability?";

  const safetyWarning = SAFETY_TERMS.test(`${context.issue} ${context.safety}`)
    ? "Because this may be safety-related, please don’t ride it until it has been inspected. "
    : "";
  return `${safetyWarning}Thanks — this sounds like a ${context.category.toLowerCase()} job. The safest next step is to book it in so On The Run Electrics can inspect and test it properly. You can include these details in the booking form so the technician has context before inspection.`;
}

function updateContext(context, text, step) {
  const next = { ...context };
  if (step === 0) {
    next.issue = text;
    next.category = categoryFrom(text);
    if (SAFETY_TERMS.test(text)) next.safety = "Potential safety concern mentioned";
  } else if (step === 1) {
    next.makeModel = text;
  } else if (step === 2) {
    next.rideable = text;
    if (SAFETY_TERMS.test(text)) next.safety = "Potential safety concern mentioned";
  } else {
    next.safety = text;
  }
  return next;
}

export default function RepairAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", text: OPENING }]);
  const [input, setInput] = useState("");
  const [context, setContext] = useState({ issue: "", makeModel: "", rideable: "", safety: "", category: "" });
  const [loading, setLoading] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (hasRevealed) return;
    const hero = document.getElementById("top");
    if (!hero) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && entry.boundingClientRect.bottom <= 0) {
        setHasRevealed(true);
        observer.disconnect();
      }
    }, { threshold: 0 });

    observer.observe(hero);
    return () => observer.disconnect();
  }, [hasRevealed]);

  const step = useMemo(() => {
    if (!context.issue) return 0;
    if (!context.makeModel) return 1;
    if (!context.rideable) return 2;
    if (!context.safety) return 3;
    return 4;
  }, [context]);

  const bookUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("scooter_issue_summary", context.issue || "Customer started from repair assistant");
    if (context.makeModel) params.set("scooter_make_model", context.makeModel);
    if (context.rideable) params.set("rideable_status", context.rideable);
    if (context.safety) params.set("urgency_or_safety_notes", context.safety);
    if (context.category) params.set("suspected_service_category", context.category);
    return `/book?${params.toString()}`;
  }, [context]);

  const askAssistant = async (nextContext) => {
    const localReply = nextLocalReply(nextContext);
    if (!nextContext.issue || !nextContext.makeModel || !nextContext.rideable || !nextContext.safety) return localReply;

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the On The Run Electrics repair assistant. Reply in 1-2 concise sentences. Do not diagnose, quote exact costs, or promise turnaround times. If safety terms are present, advise not riding and booking an inspection. Context: ${JSON.stringify(nextContext)}`,
        response_json_schema: { type: "object", properties: { reply: { type: "string" } } },
      });
      return response?.reply || localReply;
    } catch {
      return localReply;
    }
  };

  const send = async (text) => {
    const clean = text.trim();
    if (!clean || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: clean }]);
    const nextContext = updateContext(context, clean, step);
    setContext(nextContext);
    setLoading(true);
    const reply = await askAssistant(nextContext);
    setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  if (!hasRevealed) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-bottom-3 duration-500 items-center gap-2 rounded-full border border-accent/30 bg-card px-4 py-3 text-sm font-bold text-foreground shadow-xl shadow-slate-900/10 transition hover:border-accent hover:bg-accent/10 sm:bottom-5 sm:right-5"
        aria-label="Open scooter repair assistant"
      >
        <MessageCircle className="h-5 w-5 text-accent" />
        <span>Need help with your scooter?</span>
      </button>
    );
  }

  return (
    <section className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm animate-in fade-in slide-in-from-bottom-3 duration-300 overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-slate-900/15 sm:bottom-5 sm:right-5" aria-label="Scooter repair assistant">
      <div className="flex items-center justify-between border-b border-border bg-accent/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-accent-foreground"><Bot className="h-5 w-5" /></span>
          <div>
            <p className="text-sm font-extrabold">Repair assistant</p>
            <p className="text-xs text-muted-foreground">On The Run Electrics</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="rounded-full p-2 text-muted-foreground hover:bg-card hover:text-foreground" aria-label="Minimise chat">
          <X className="h-4 w-4" />
        </button>
      </div>

      <ScrollArea className="h-80 px-4 py-4">
        <div className="space-y-3">
          {messages.map((message, index) => (
            <div key={index} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={message.role === "user" ? "max-w-[84%] rounded-2xl bg-accent px-3 py-2 text-sm text-accent-foreground" : "max-w-[88%] rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground"}>
                {message.text}
              </div>
            </div>
          ))}
          {loading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…</div>}
        </div>
      </ScrollArea>

      {step === 0 && (
        <div className="border-t border-border px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_REPLIES.map((reply) => (
              <button key={reply} onClick={() => send(reply)} className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-accent hover:text-accent">
                {reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {step >= 4 && (
        <div className="border-t border-border px-4 pt-3">
          <Button asChild className="w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to={bookUrl}>Book a Repair</Link>
          </Button>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 p-4">
        <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your answer…" className="h-10" />
        <Button type="submit" size="icon" disabled={loading || !input.trim()} className="h-10 w-10 shrink-0 rounded-xl bg-accent hover:bg-accent/90">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </section>
  );
}