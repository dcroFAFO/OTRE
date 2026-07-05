import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { createBookingRequest, sendBookingVerificationCode, verifyBookingCode } from "@/services/bookingService";
import { BRAND_NAMES, SCOOTER_BRANDS } from "@/config/scooterBrands";
import { normalizePhoneToE164 } from "@/lib/phone";
import RepairAssistantJobCard from "@/components/landing/RepairAssistantJobCard";

const QUICK_REPLIES = ["Won’t turn on", "Won’t charge", "Flat tyre or puncture", "Brake issue", "Error code", "Reduced range", "Strange noise", "General service"];
const OPENING = "Hi, I’m the On The Run Electrics repair assistant. Are you starting a new job, or following up on an existing one?";
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
  if (!c.intent) return "intent";
  if (c.intent === "existing") {
    if (!c.email) return "existing_email";
    if (!c.phone) return "existing_phone";
    if (!c.otpChannel) return "otp_channel";
    if (!c.otpVerified) return "otp_code";
    if (c.activeJobs.length > 0 && !c.selectedJobId) return "job_cards";
    if (c.selectedJobId) return "job_actions";
    return "existing_done";
  }
  if (!c.issue) return "issue";
  if (!c.make) return "make";
  if (c.make === "Other" && !c.model) return "model_custom";
  if (c.make !== "Other" && !c.model) return c.customModelPending ? "model_custom" : "model";
  if (c.safetyPending) return "safety_details";
  if (c.safety === undefined) return "safety";
  if (!c.name) return "name";
  if (!c.email) return "email";
  if (!c.phone) return "phone";
  if (!c.otpChannel) return "otp_channel";
  if (!c.otpVerified) return "otp_code";
  return "submit";
}

function promptFor(stage, context) {
  switch (stage) {
    case "issue": return "Tell me what's happening with your scooter and I'll get a repair booking started for you.";
    case "make": return "Thanks. What make is your scooter?";
    case "model": return `Got it — and which ${context.make} model?`;
    case "model_custom": return "No worries — what's the make and model?";
    case "safety": return "Is there anything urgent or safety-related here — e.g. brakes, power cutting out, exposed wiring, smoke, or instability?";
    case "safety_details": return "Please briefly describe the safety concern.";
    case "name": return "Thanks! Can I get your name for the booking?";
    case "email": return "And your email address?";
    case "phone": return "Lastly, your mobile number?";
    case "existing_email": return "No problem — what's the email address on your account?";
    case "existing_phone": return "And what's the mobile number on file?";
    case "otp_channel": return "To confirm it's really you, would you like a verification code by text or email?";
    case "otp_code": return context.otpChannel === "email" ? "Enter the 6-digit code we emailed you." : "Enter the 6-digit code we texted you.";
    default: return "";
  }
}

export default function RepairAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", text: OPENING }]);
  const [input, setInput] = useState("");
  const [context, setContext] = useState({ intent: "", issue: "", category: "", make: "", model: "", customModelPending: false, safety: undefined, safetyPending: false, name: "", email: "", phone: "", otpChannel: "", otpVerified: false, activeJobs: [], selectedJobId: "", existingCustomerName: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [unread, setUnread] = useState(0);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const busyRef = useRef(false);
  const readCountRef = useRef(0);
  const autoOpenRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-open on first scroll or after 10 seconds, whichever comes first.
  useEffect(() => {
    const trigger = () => {
      if (autoOpenRef.current) return;
      autoOpenRef.current = true;
      setOpen(true);
    };
    const timer = setTimeout(trigger, 10000);
    const onScroll = () => trigger();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Track unread assistant messages while the widget is minimised.
  useEffect(() => {
    if (open) {
      readCountRef.current = messages.length;
      setUnread(0);
    } else {
      const diff = messages.length - readCountRef.current;
      setUnread(diff > 0 ? diff : 0);
    }
  }, [messages, open]);

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

    if ((stage === "email" || stage === "existing_email") && !EMAIL_PATTERN.test(clean)) {
      setMessages((prev) => [...prev, { role: "user", text: clean }, { role: "assistant", text: "That email doesn't look quite right — could you double check it?" }]);
      setInput("");
      return;
    }
    if (stage === "phone" || stage === "existing_phone") {
      const normalized = normalizePhoneToE164(clean);
      if (!normalized.is_valid) {
        setMessages((prev) => [...prev, { role: "user", text: clean }, { role: "assistant", text: "That doesn't look like a valid Australian mobile number — could you try again?" }]);
        setInput("");
        return;
      }
    }

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: clean }]);

    if (stage === "intent") {
      const wantsExisting = /existing|follow/i.test(clean);
      const nextContext = { ...context, intent: wantsExisting ? "existing" : "new" };
      setContext(nextContext);
      const nextStage = computeStage(nextContext);
      setMessages((prev) => [...prev, { role: "assistant", text: promptFor(nextStage, nextContext) }]);
      setTimeout(() => inputRef.current?.focus(), 50);
      return;
    }

    if (stage === "otp_channel") {
      const channel = /email/i.test(clean) ? "email" : "sms";
      setLoading(true);
      try {
        await sendBookingVerificationCode({ name: context.name, email: context.email, phone: context.phone, channel });
        setContext((prev) => ({ ...prev, otpChannel: channel }));
        setMessages((prev) => [...prev, { role: "assistant", text: channel === "email" ? "We've emailed you a 6-digit code — enter it below." : "We've texted you a 6-digit code — enter it below." }]);
      } catch {
        setMessages((prev) => [...prev, { role: "assistant", text: "Sorry, we couldn't send a verification code just now. Please try again." }]);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (stage === "otp_code") {
      setLoading(true);
      try {
        const res = await verifyBookingCode({ email: context.email, phone: context.phone, code: clean });
        const nextContext = {
          ...context,
          otpVerified: true,
          activeJobs: res.active_jobs || [],
          existingCustomerName: res.existing ? (res.customer_name || "") : "",
        };
        setContext(nextContext);
        if (context.intent === "existing") {
          const firstName = (nextContext.existingCustomerName || "").split(" ")[0];
          const greeting = firstName ? `Thanks, ${firstName} — you're verified!` : "Thanks — you're verified!";
          if (nextContext.activeJobs.length > 0) {
            setMessages((prev) => [...prev, { role: "assistant", text: `${greeting} Here ${nextContext.activeJobs.length === 1 ? "is your active job" : "are your active jobs"} — tap one below to select it.` }]);
          } else {
            setMessages((prev) => [...prev, { role: "assistant", text: `${greeting} We couldn't find an active job on file for these details — if you'd like to start a new job instead, just refresh the chat.` }]);
            setResult({ existingJobOnly: true });
          }
        } else {
          setMessages((prev) => [...prev, { role: "assistant", text: res.existing ? `Thanks — you're verified! We found your details on file${res.customer_name ? ` for ${res.customer_name}` : ""}.` : "Thanks — you're verified!" }]);
          await submitBooking(nextContext);
        }
      } catch {
        setMessages((prev) => [...prev, { role: "assistant", text: "That code wasn't right or has expired. Please try again." }]);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (stage === "job_actions") {
      const job = context.activeJobs.find((j) => j.id === context.selectedJobId);
      if (/status/i.test(clean)) {
        setMessages((prev) => [...prev, { role: "assistant", text: `Your job${job?.reference ? ` (ref ${job.reference})` : ""} for your ${job?.asset_label || "scooter"} is currently: ${(job?.status || "in progress").replace(/_/g, " ")}.` }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", text: "No problem — our team will follow up with you about this job directly." }]);
      }
      setResult({ existingJobOnly: true });
      return;
    }

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
    } else if (stage === "email" || stage === "existing_email") {
      next.email = clean;
    } else if (stage === "phone" || stage === "existing_phone") {
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
    if (stage === "intent") return ["Start a new job", "Follow up on an existing job"];
    if (stage === "issue") return QUICK_REPLIES;
    if (stage === "make") return BRAND_NAMES;
    if (stage === "model") return SCOOTER_BRANDS[context.make] || [];
    if (stage === "safety") return [SAFETY_NO, SAFETY_YES];
    if (stage === "otp_channel") return ["Text me a code", "Email me a code"];
    if (stage === "job_actions") return ["Check job status", "Something else"];
    return [];
  }, [stage, context.make]);

  const selectJob = (job) => {
    if (busyRef.current) return;
    setContext((prev) => ({ ...prev, selectedJobId: job.id }));
    setMessages((prev) => [...prev, { role: "user", text: `Selected job ${job.reference || job.asset_label}` }]);
  };

  const showTextInput = !result;

  const handleOpen = () => {
    autoOpenRef.current = true;
    setOpen(true);
  };

  if (!open) {
    if (unread > 0) {
      return (
        <button
          onClick={handleOpen}
          className="fixed bottom-4 right-4 z-40 grid h-14 w-14 animate-in fade-in slide-in-from-bottom-3 duration-500 place-items-center rounded-full bg-accent text-accent-foreground shadow-xl shadow-slate-900/20 transition hover:bg-accent/90 sm:bottom-5 sm:right-5"
          aria-label={`Open scooter repair assistant — ${unread} unread message${unread === 1 ? "" : "s"}`}
        >
          <Bot className="h-6 w-6" />
          <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground ring-2 ring-card">
            {unread > 9 ? "9+" : unread}
          </span>
        </button>
      );
    }
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-bottom-3 duration-500 items-center gap-2 rounded-full border border-accent/30 bg-card px-4 py-3 text-sm font-bold text-foreground shadow-xl shadow-slate-900/10 transition hover:border-accent hover:bg-accent/10 sm:bottom-5 sm:right-5"
        aria-label="Open scooter repair assistant"
      >
        <MessageCircle className="h-5 w-5 text-accent" />
        <span>Need help with your scooter?</span>
      </button>
    );
  }

  return (
    <section className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-slate-900/15 sm:bottom-5 sm:right-5" aria-label="Scooter repair assistant">
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

      {stage === "job_cards" && !loading && (
        <div className="border-t border-border px-4 py-3">
          <div className="grid grid-cols-2 gap-2">
            {context.activeJobs.map((job) => (
              <RepairAssistantJobCard key={job.id} job={job} onSelect={selectJob} />
            ))}
          </div>
        </div>
      )}

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