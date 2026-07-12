import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Paperclip, ExternalLink } from "lucide-react";
import { StatusBadge, PriorityBadge } from "./FeedbackBadges";
import { STATUSES } from "./FeedbackFilters";
import { format } from "date-fns";

export default function FeedbackDetailDrawer({ item, open, onClose, onSave, saving }) {
  const [status, setStatus] = useState("New");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (item) {
      setStatus(item.status || "New");
      setNotes(item.admin_notes || "");
    }
  }, [item]);

  if (!item) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-heading pr-6">{item.subject}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={item.status} />
            <PriorityBadge value={item.priority} />
            <span className="text-xs text-muted-foreground">{item.feedback_type}</span>
          </div>

          {/* Message */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Message</p>
            <p className="text-sm whitespace-pre-wrap rounded-xl border border-border bg-secondary/30 p-3">{item.message}</p>
          </div>

          {item.attachment && (
            <a href={item.attachment} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-accent hover:underline">
              <Paperclip className="h-4 w-4" /> View attachment <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {/* Context */}
          <div className="rounded-xl border border-border divide-y divide-border text-sm">
            <ContextRow label="Submitted by" value={`${item.submitted_by_name || "—"}${item.submitted_by_email ? ` · ${item.submitted_by_email}` : ""}`} />
            <ContextRow label="Date" value={item.created_date ? format(new Date(item.created_date), "d MMM yyyy, h:mm a") : "—"} />
            <ContextRow label="Page" value={item.page_context || "—"} mono />
            <ContextRow label="Device" value={item.device_context || "—"} />
            <ContextRow label="Browser" value={item.app_context || "—"} mono />
            {item.resolved_date && <ContextRow label="Resolved" value={format(new Date(item.resolved_date), "d MMM yyyy, h:mm a")} />}
          </div>

          {/* Admin controls */}
          <div className="space-y-4 rounded-xl border border-border p-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Admin notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes (not visible to the user)" className="h-24" />
            </div>
            <Button className="w-full gap-2" disabled={saving} onClick={() => onSave(item, { status, admin_notes: notes })}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ContextRow({ label, value, mono = false }) {
  return (
    <div className="px-3 py-2 flex gap-3">
      <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">{label}</span>
      <span className={`min-w-0 break-all ${mono ? "text-xs font-mono text-muted-foreground" : "text-sm"}`}>{value}</span>
    </div>
  );
}
