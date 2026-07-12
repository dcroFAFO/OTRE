import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Eye, Send, MessageSquare, Loader2 } from "lucide-react";
import { addNote } from "@/services/jobService";
import NoteBubble from "@/components/dashboard/job/NoteBubble";
import { cn } from "@/lib/utils";

export default function NotesPanel({ job, canCustomer, onChange }) {
  const [notes, setNotes] = useState([]);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState("internal");
  const [posting, setPosting] = useState(false);

  const load = () => base44.entities.JobNote.filter({ job_id: job.id }, "-created_date", 100).then(setNotes);
  useEffect(() => { load(); }, [job.id]);

  const submit = async () => {
    if (!body.trim() || posting) return;
    setPosting(true);
    await addNote(job, { body, visibility });
    setBody("");
    await load();
    setPosting(false);
    onChange?.();
  };

  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-heading font-bold">Notes</h3>
        {notes.length > 0 && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{notes.length}</span>
        )}
      </div>

      {/* Composer */}
      <div className="rounded-2xl border border-border bg-card p-3 space-y-2.5 shadow-sm">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Add a note…"
          className="min-h-[72px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
          {canCustomer ? (
            <div className="flex gap-1.5">
              <Toggle active={visibility === "internal"} onClick={() => setVisibility("internal")} icon={Lock} label="Internal" />
              <Toggle active={visibility === "customer"} onClick={() => setVisibility("customer")} icon={Eye} label="Customer-visible" />
            </div>
          ) : (
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Internal only</span>
          )}
          <Button size="sm" onClick={submit} disabled={!body.trim() || posting} className="gap-1.5">
            {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Post
          </Button>
        </div>
      </div>

      {/* Thread */}
      <div className="space-y-4 max-h-80 overflow-auto pr-1">
        {notes.map((n) => <NoteBubble key={n.id} note={n} />)}
        {notes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 py-10 text-center">
            <MessageSquare className="h-7 w-7 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notes yet. Start the thread above.</p>
          </div>
        )}
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
