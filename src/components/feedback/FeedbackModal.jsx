import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Paperclip, CheckCircle2, X } from "lucide-react";
import { logError, addBreadcrumb } from "@/lib/logger";
import { getSafeErrorMessage } from "@/lib/errors";

const TYPES = ["Bug Report", "Feature Request", "General Feedback", "UI / UX Issue", "Performance Issue", "Other"];
const PRIORITIES = ["Low", "Medium", "High"];

const EMPTY = { subject: "", feedback_type: "General Feedback", priority: "Medium", message: "" };

function deviceContext() {
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  return `${isMobile ? "Mobile" : "Desktop"} · ${window.innerWidth}x${window.innerHeight}`;
}

export default function FeedbackModal({ open, onClose, user }) {
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const reset = () => { setForm(EMPTY); setFile(null); setErrors({}); setDone(false); setSubmitError(""); };
  const close = () => {
    if (submitting) return;
    onClose();
    setTimeout(reset, 300);
  };

  const selectFile = (selectedFile) => {
    if (!selectedFile) return;
    const supported = selectedFile.type.startsWith("image/") || selectedFile.type === "application/pdf";
    if (!supported) {
      setSubmitError("Attach an image or PDF file.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setSubmitError("Attachments must be 10 MB or smaller.");
      return;
    }
    setSubmitError("");
    setFile(selectedFile);
  };

  const submit = async () => {
    if (submitting) return;
    const errs = {};
    if (!form.subject.trim()) errs.subject = "Subject is required";
    if (!form.message.trim()) errs.message = "Message is required";
    setErrors(errs);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => document.getElementById(errs.subject ? "feedback-subject" : "feedback-message")?.focus());
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      let attachment = "";
      if (file) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        attachment = file_url;
      }
      addBreadcrumb("feedback:submit", { type: form.feedback_type });
      await base44.functions.invoke("submitFeedback", {
        ...form,
        attachment,
        page_context: window.location.href,
        device_context: deviceContext(),
        app_context: navigator.userAgent,
      });
      setDone(true);
    } catch (err) {
      logError("Feedback submission failed", err, { action: "submitFeedback" });
      setSubmitError(getSafeErrorMessage(err, "Your feedback could not be sent. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !submitting && close()}>
      <DialogContent className="sm:max-w-lg">
        {done ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h3 className="font-heading text-lg font-bold">Thanks for your feedback!</h3>
            <p className="text-sm text-muted-foreground">We've received it and will take a look soon.</p>
            <Button onClick={close} className="mt-2">Close</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading">Send Feedback</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="feedback-subject">Subject *</Label>
                <Input id="feedback-subject" value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Brief summary" aria-invalid={!!errors.subject} aria-describedby={errors.subject ? "feedback-subject-error" : undefined} />
                {errors.subject && <p id="feedback-subject-error" className="text-xs text-destructive">{errors.subject}</p>}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="feedback-type">Type</Label>
                  <Select value={form.feedback_type} onValueChange={(v) => set("feedback_type", v)}>
                    <SelectTrigger id="feedback-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="feedback-priority">Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                    <SelectTrigger id="feedback-priority"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="feedback-message">Message *</Label>
                <Textarea id="feedback-message" value={form.message} onChange={(e) => set("message", e.target.value)}
                  placeholder="Tell us what's on your mind..." className="h-28" aria-invalid={!!errors.message} aria-describedby={errors.message ? "feedback-message-error" : undefined} />
                {errors.message && <p id="feedback-message-error" className="text-xs text-destructive">{errors.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="feedback-attachment">Screenshot / file (optional)</Label>
                {file ? (
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="truncate">{file.name}</span>
                    <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFile(null)} className="grid min-h-11 min-w-11 place-items-center text-muted-foreground hover:text-foreground shrink-0 ml-2">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="feedback-attachment" className="flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground cursor-pointer hover:bg-secondary/50">
                    <Paperclip className="h-4 w-4" /> Attach a file
                    <input id="feedback-attachment" type="file" className="sr-only" accept="image/*,.pdf,application/pdf" onChange={(e) => selectFile(e.target.files?.[0])} />
                  </label>
                )}
              </div>

              {submitError && (
                <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{submitError}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={close} disabled={submitting} className="min-h-11">Cancel</Button>
                <Button onClick={submit} disabled={submitting} className="min-h-11 gap-2" aria-busy={submitting || undefined}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Sending..." : "Send Feedback"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Sent as {user?.full_name || user?.email} — your current page and device info are included to help us debug.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
