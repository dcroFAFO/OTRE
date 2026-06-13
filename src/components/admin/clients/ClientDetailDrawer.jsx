import React, { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, CalendarDays, Loader2, User, Receipt, Wrench, MessageSquare } from "lucide-react";
import { ClientStatusBadge } from "./ClientStatusBadge";
import ClientTagEditor from "./ClientTagEditor";
import ClientHistoryTimeline from "./ClientHistoryTimeline";
import { CLIENT_STATUSES } from "@/config/clientConfig";
import { updateClient, listClientNotes, addClientNote, fetchClientHistory } from "@/services/clientService";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { logError } from "@/lib/logger";

export default function ClientDetailDrawer({ client, open, onClose, actor, onChange }) {
  const { toast } = useToast();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState([]);
  const [noteBody, setNoteBody] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [history, setHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (client && open) {
      setForm({ ...client, tags: client.tags || [], status: client.status || "active" });
      loadNotes();
      loadHistory();
    }
  }, [client, open]);

  const loadNotes = async () => {
    try { setNotes(await listClientNotes(client.id)); } catch (e) { logError("Load client notes failed", e); }
  };
  const loadHistory = async () => {
    setLoadingHistory(true);
    try { const d = await fetchClientHistory(client.id); setHistory(d); }
    catch (e) { logError("Load client history failed", e); setHistory(null); }
    finally { setLoadingHistory(false); }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await updateClient(client, {
        full_name: form.full_name, email: form.email, phone: form.phone,
        status: form.status, tags: form.tags,
      }, actor);
      toast({ title: "Client updated" });
      onChange?.();
      loadHistory();
    } catch (e) {
      logError("Save client failed", e, { recordId: client.id });
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const submitNote = async () => {
    if (!noteBody.trim()) return;
    setAddingNote(true);
    try {
      await addClientNote(client, noteBody.trim(), actor);
      setNoteBody("");
      await loadNotes();
      loadHistory();
      onChange?.();
    } catch (e) {
      logError("Add client note failed", e, { recordId: client.id });
      toast({ title: "Couldn't add note", variant: "destructive" });
    } finally { setAddingNote(false); }
  };

  if (!client) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        {!form ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="flex flex-col">
            {/* Header */}
            <div className="bg-primary text-primary-foreground p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-heading text-xl font-extrabold flex items-center gap-2"><User className="h-5 w-5 text-primary-foreground/70" /> {client.full_name}</h2>
                </div>
                <ClientStatusBadge value={client.status || "active"} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-primary-foreground/70">
                {client.email && <a href={`mailto:${client.email}`} className="flex items-center gap-1 hover:text-primary-foreground"><Mail className="h-3 w-3" /> {client.email}</a>}
                {client.phone && <a href={`tel:${client.phone}`} className="flex items-center gap-1 hover:text-primary-foreground"><Phone className="h-3 w-3" /> {client.phone}</a>}
                <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Signed up {client.created_date ? format(new Date(client.created_date), "d MMM yyyy") : "—"}</span>
              </div>
              {history?.counts && (
                <div className="mt-4 flex gap-4 text-xs">
                  <Stat icon={Wrench} label="Jobs" value={history.counts.jobs} />
                  <Stat icon={Receipt} label="Invoices" value={history.counts.invoices} />
                  <Stat icon={MessageSquare} label="Feedback" value={history.counts.feedback} />
                </div>
              )}
            </div>

            <Tabs defaultValue="profile" className="p-5">
              <TabsList className="w-full">
                <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
                <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
                <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
              </TabsList>

              {/* Profile / edit */}
              <TabsContent value="profile" className="space-y-4 mt-4">
                <Field label="Full name"><Input value={form.full_name || ""} onChange={(e) => set("full_name", e.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email"><Input value={form.email || ""} onChange={(e) => set("email", e.target.value)} /></Field>
                  <Field label="Phone"><Input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} /></Field>
                </div>
                <Field label="Status">
                  <Select value={form.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CLIENT_STATUSES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Tags / segments"><ClientTagEditor value={form.tags} onChange={(v) => set("tags", v)} /></Field>
                <Button className="w-full gap-2" disabled={saving} onClick={save}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}{saving ? "Saving..." : "Save changes"}
                </Button>
              </TabsContent>

              {/* Internal notes */}
              <TabsContent value="notes" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Add an internal note (admin only)..." className="h-20" />
                  <Button size="sm" disabled={addingNote || !noteBody.trim()} onClick={submitNote} className="gap-2">
                    {addingNote && <Loader2 className="h-4 w-4 animate-spin" />} Add note
                  </Button>
                </div>
                <div className="space-y-3">
                  {notes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No internal notes yet.</p>}
                  {notes.map((n) => (
                    <div key={n.id} className="rounded-xl border border-border bg-secondary/30 p-3">
                      <p className="text-sm whitespace-pre-wrap">{n.body}</p>
                      <p className="text-[11px] text-muted-foreground mt-1.5">{n.author_name} · {n.created_date ? format(new Date(n.created_date), "d MMM yyyy, h:mm a") : ""}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Unified history */}
              <TabsContent value="history" className="mt-4">
                <ClientHistoryTimeline timeline={history?.timeline} loading={loadingHistory} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function Stat({ icon: Icon, label, value }) {
  return <span className="flex items-center gap-1 text-primary-foreground/80"><Icon className="h-3.5 w-3.5" /> {value} {label}</span>;
}