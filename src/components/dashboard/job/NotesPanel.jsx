import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Eye, Send } from "lucide-react";
import { addNote } from "@/services/jobService";
import { cn } from "@/lib/utils";

export default function NotesPanel({ job, actor, canCustomer, onChange }) {
  const [notes, setNotes] = useState([]);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState("internal");

  const load = () => base44.entities.JobNote.filter({ job_id: job.id }, "-created_date", 100).then(setNotes);
  useEffect(() => { load(); }, [job.id]);

  const submit = async () => {
    if (!body.trim()) return;
    await addNote(job, { body, visibility }, actor);
    setBody("");
    load();
    onChange?.();
  };

  return (
    <div className="space-y-3">
      <h3 className="font-heading font-bold">Notes</h3>
      <div className="space-y-2">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a note..." className="h-20" />
        <div className="flex items-center justify-between">
          {canCustomer ? (
            <div className="flex gap-1.5">
              <Toggle active={visibility === "internal"} onClick={() => setVisibility("internal")} icon={Lock} label="Internal" />
              <Toggle active={visibility === "customer"} onClick={() => setVisibility("customer")} icon={Eye} label="Customer-visible" />
            </div>
          ) : <span className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Internal only</span>}
          <Button size="sm" onClick={submit} className="gap-1.5"><Send className="h-3.5 w-3.5" /> Post</Button>
        </div>
      </div>
      <div className="space-y-2 max-h-64 overflow-auto">
        {notes.map((n) => (
          <div key={n.id} className={cn("rounded-xl border p-3", n.visibility === "customer" ? "border-accent/30 bg-accent/5" : "border-border bg-secondary/40")}>
            <p className="text-sm text-foreground whitespace-pre-wrap">{n.body}</p>
            <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
              {n.visibility === "customer" ? <Eye className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              {n.author_name} · {new Date(n.created_date).toLocaleString()}
            </p>
          </div>
        ))}
        {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
      </div>
    </div>
  );
}

function Toggle({ active, onClick, icon: Icon, label }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-secondary")}>
      <Icon className="h-3 w-3" /> {label}
    </button>
  );
}