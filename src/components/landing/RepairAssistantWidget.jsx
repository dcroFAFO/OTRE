import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { createBookingRequest } from "@/services/bookingService";
import { BRAND_NAMES, SCOOTER_BRANDS } from "@/config/scooterBrands";
import { normalizePhoneToE164 } from "@/lib/phone";

const QUICK_REPLIES = ["Won’t turn on", "Won’t charge", "Flat tyre or puncture", "Brake issue", "Error code", "Reduced range", "Strange noise", "General service"];
const OPENING = "Hi, I’m the On The Run Electrics repair assistant. Tell me what’s happening with your scooter and I’ll get a repair booking started for you.";
const SAFETY_YES = "Yes, please note details below";
const SAFETY_NO = "No urgent safety concerns";
const OTHER_MODEL = "Other model";
const SAFETY_TERMS = /brake|cut.?out|cuts out|exposed wiring|swelling|burning|smoke|unstable|wobble|sparking|fire/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function computeStage(c) {
  if (!c.issue) return "issue";
  if (!c.make) return "make";
  if (c.make === "Other" && !c.model) return "model_custom";
  if (c.make !== "Other" && !c.model) return c.customModelPending ? "model_custom" : "model";
  if (c.safetyPending) return "safety_details";
  if (c.safety === undefined) return "safety";
  if (!c.name) return "name";
  if (!c.email) return "email";
  if (!c.phone) return "phone";
  return "submit";
}

function promptFor(stage, context) {
  switch (stage) {
    case "make": return "Thanks. What make is your scooter?";
    case "model": return `Got it — and which ${context.make} model?`;
    case "model_custom": return "No worries — what's the make and model?";
    case "safety": return "Is there anything urgent or safety-related here — e.g. brakes, power cutting out, exposed wiring, smoke, or instability?";
    case "safety_details": return "Please briefly describe the safety concern.";
    case "name": return "Thanks! Can I get your name for the booking?";
    case "email": return "And your email address?";
    case "phone": return "Lastly, your mobile number?";
    default: return "";
  }
}

export default function RepairAssistantWidget() {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState([{ role: "assistant", text: OPENING }]);
  const [input, setInput] = useState("");
  const [context, setContext] = useState({ issue: "", category: "", make: "", model: "", customModelPending: false, safety: undefined, safetyPending: false, name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const stage = useMemo(() => computeStage(context), [context]);

  const makeModelLabel = useMemo(() => {
    if (!context.make) return "";
    if (context.make === "Other") return context.model || "";
    return [context.make, context.model].filter(Boolean).join(" ");
  }, [context.make, context.model]);

  const submitBooking = async (finalContext) => {
    setLoading(true);
    try {
      const normalized = normalizePhoneToE164(finalContext.phone);
      const label = finalContext.make === "Other" ? finalContext.model : [finalContext.make, finalContext.model].filter(Boolean).join(" ");
      const res = await createBookingRequest({
        customer_name: finalContext.name,
        customer_email: finalContext.email.trim().toLowerCase(),
        phone: normalized.phone_e164,
        phone_e164: normalized.phone_e164,
        customer_phone_e164: normalized.phone_e164,
        asset_label: label,
        asset_make: finalContext.make,
        asset_model: finalContext.model,
        issue_description: finalContext.issue,
        scooter_issue_summary: finalContext.issue,
        scooter_make_model: label,
        urgency_or_safety_notes: finalContext.safety || "",
        suspected_service_category: finalContext.category,
      });
      setResult(res);
      setMessages((prev) => [...prev, { role: "assistant", text: `Thanks ${finalContext.name}! Your repair request has been submitted${res?.reference ? ` — reference ${res.reference}` : ""}. Our team will be in touch shortly.` }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Sorry, something went wrong submitting your booking. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  const askAssistant = async (currentStage, nextContext) => {
    if (currentStage !== "issue" || !nextContext.issue) return null;
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are the On The Run Electrics repair assistant. Reply in 1 short concise sentence acknowledging this scooter issue. Do not diagnose, quote exact costs, or promise turnaround times. Issue: ${nextContext.issue}`,
        response_json_schema: { type: "object", properties: { reply: { type: "string" } } },
      });
      return response?.reply || null;
    } catch {
      return null;
    }
  };

  const send = async (rawText) => {
    const clean = String(rawText || "").trim();
    if (!clean || busyRef.current || result) return;
    busyRef.current = true;
    try {

    if (stage === "email" && !EMAIL_PATTERN.test(clean)) {
      setMessages((prev) => [...prev, { role: "user", text: clean }, { role: "assistant", text: "That email doesn't look quite right — could you double check it?" }]);
      setInput("");
      return;
    }
    if (stage === "phone") {
      const normalized = normalizePhoneToE164(clean);
      if (!normalized.is_valid) {
        setMessages((prev) => [...prev, { role: "user", text: clean }, { role: "assistant", text: "That doesn't look like a valid Australian mobile number — could you try again?" }]);
        setInput("");
        return;
      }
    }

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: clean }]);

    const next = { ...context };
    if (stage === "issue") {
      next.issue = clean;
      next.category = categoryFrom(clean);
    } else if (stage === "make") {
      next.make = clean;
    } else if (stage === "model") {
      if (clean === OTHER_MODEL) next.customModelPending = true;
      else next.model = clean;
    } else if (stage === "model_custom") {
      next.model = clean;
      next.customModelPending = false;
    } else if (stage === "safety") {
      if (clean === SAFETY_YES) next.safetyPending = true;
      else { next.safety = SAFETY_TERMS.test(clean) ? clean : "No safety concerns"; }
    } else if (stage === "safety_details") {
      next.safety = clean;
      next.safetyPending = false;
    } else if (stage === "name") {
      next.name = clean;
    } else if (stage === "email") {
      next.email = clean;
    } else if (stage === "phone") {
      next.phone = clean;
    }
    setContext(next);

    const nextStage = computeStage(next);
    if (nextStage === "submit") {
      await submitBooking(next);
      return;
    }

    if (stage === "issue") {
      setLoading(true);
      const aiReply = await askAssistant(stage, next);
      setLoading(false);
      if (aiReply) setMessages((prev) => [...prev, { role: "assistant", text: aiReply }]);
    }
    setMessages((prev) => [...prev, { role: "assistant", text: promptFor(nextStage, next) }]);
    setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      busyRef.current = false;
    }
  };

  const quickReplies = useMemo(() => {
    if (stage === "issue") return QUICK_REPLIES;
    if (stage === "make") return BRAND_NAMES;
    if (stage === "model") return SCOOTER_BRANDS[context.make] || [];
    if (stage === "safety") return [SAFETY_NO, SAFETY_YES];
    return [];
  }, [stage, context.make]);

  const showTextInput = !["make", "model", "safety"].includes(stage) && !result;

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

      <div className="h-80 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {messages.map((message, index) => (
            <div key={index} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={message.role === "user" ? "max-w-[84%] rounded-2xl bg-accent px-3 py-2 text-sm text-accent-foreground" : "max-w-[88%] rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground"}>
                {message.text}
              </div>
            </div>
          ))}
          {loading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…</div>}
          <div ref={bottomRef} />
        </div>
      </div>

      {quickReplies.length > 0 && !loading && (
        <div className="border-t border-border px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((reply) => (
              <button key={reply} onClick={() => send(reply)} className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-accent hover:text-accent">
                {reply}
              </button>
            ))}
          </div>
        </div>
      )}

      {showTextInput && (
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 p-4">
          <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your answer…" className="h-10" disabled={loading} />
          <Button type="submit" size="icon" disabled={loading || !input.trim()} className="h-10 w-10 shrink-0 rounded-xl bg-accent hover:bg-accent/90">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      )}
    </section>
  );
}