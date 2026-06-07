import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Mail, MessageSquare, Calendar, StickyNote, X } from "lucide-react";
import { logActivity, addNote } from "@/services/crmService";
import { CALL_OUTCOMES } from "@/config/crmConfig";
import { toast } from "sonner";

const ACTIONS = [
  { key: "note", label: "Note", icon: StickyNote },
  { key: "call", label: "Log Call", icon: Phone },
  { key: "email", label: "Log Email", icon: Mail },
  { key: "sms", label: "Log SMS", icon: MessageSquare },
  { key: "meeting", label: "Log Meeting", icon: Calendar },
];

// Quick action buttons + inline composer for any CRM record.
export default function CRMQuickActions({ relatedType, relatedId, actor, onLogged }) {
  const [active, setActive] = useState(null);
  const [body, setBody] = useState("");
  const [outcome, setOutcome] = useState("completed");
  const [saving, setSaving] = useState(false);

  const reset = () => { setActive(null); setBody(""); setOutcome("completed"); };

  const submit = async () => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      if (active === "note") {
        await addNote({ relatedType, relatedId, body, actor });
      } else {
        await logActivity({
          relatedType, relatedId, activityType: active, body, actor,
          outcome: active === "call" ? outcome : undefined,
          direction: "outbound",
          title: `${ACTIONS.find((a) => a.key === active)?.label}`,
        });
      }
      toast.success("Logged");
      reset();
      onLogged?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      {!active ? (
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((a) => (
            <Button key={a.key} size="sm" variant="outline" className="gap-1.5" onClick={() => setActive(a.key)}>
              <a.icon className="h-3.5 w-3.5" /> {a.label}
            </Button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">{ACTIONS.find((a) => a.key === active)?.label}</span>
            <button onClick={reset}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          {active === "call" && (
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CALL_OUTCOMES.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add details..." className="h-20" />
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={saving || !body.trim()}>Save</Button>
            <Button size="sm" variant="ghost" onClick={reset}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}