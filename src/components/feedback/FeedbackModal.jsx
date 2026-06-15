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
  const close = () => { onClose(); setTimeout(reset, 300); };

  const submit = async () => {
    const errs = {};
    if (!form.subject.trim()) errs.subject = "Subject is required";
    if (!form.message.trim()) errs.message = "Message is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;

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
      setSubmitError(err?.response?.data?.error || "Couldn't send your feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
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
                <Label>Subject *</Label>
                <Input value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Brief summary" />
                {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.feedback_type} onValueChange={(v) => set("feedback_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Message *</Label>
                <Textarea value={form.message} onChange={(e) => set("message", e.target.value)}
                  placeholder="Tell us what's on your mind..." className="h-28" />
                {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Screenshot / file (optional)</Label>
                {file ? (
                  <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="truncate">{file.name}</span>
                    <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground shrink-0 ml-2">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground cursor-pointer hover:bg-secondary/50">
                    <Paperclip className="h-4 w-4" /> Attach a file
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setSubmitError("");
                      if (f && f.size > 10 * 1024 * 1024) { setSubmitError("File must be under 10MB."); return; }
                      setFile(f);
                    }} />
                  </label>
                )}
              </div>

              {submitError && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{submitError}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={close} disabled={submitting}>Cancel</Button>
                <Button onClick={submit} disabled={submitting} className="gap-2">
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