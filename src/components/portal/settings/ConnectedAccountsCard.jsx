import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Share2, Pencil, Trash2, Loader2 } from "lucide-react";

const PLATFORMS = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "x_twitter", label: "X / Twitter" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "website", label: "Website" },
];

export default function ConnectedAccountsCard({ connections, onChanged }) {
  const [editing, setEditing] = useState(null); // { platform, label, connection }
  const [form, setForm] = useState({ handle: "", profile_url: "" });
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const byPlatform = Object.fromEntries(connections.map((c) => [c.platform, c]));

  const openEditor = (platform, label) => {
    const existing = byPlatform[platform];
    setForm({ handle: existing?.handle || "", profile_url: existing?.profile_url || "" });
    setEditing({ platform, label, connection: existing || null });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke("customerSettings", { action: "saveConnection", platform: editing.platform, handle: form.handle.trim(), profile_url: form.profile_url.trim() });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Profile saved");
      setEditing(null);
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || "Couldn't save this profile.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (connection) => {
    setRemovingId(connection.id);
    try {
      const res = await base44.functions.invoke("customerSettings", { action: "deleteConnection", connection_id: connection.id });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("Profile removed");
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || "Couldn't remove this profile.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-muted-foreground"><Share2 className="h-4.5 w-4.5" /></span>
        <div>
          <h2 className="font-heading text-lg font-extrabold">Connected accounts</h2>
          <p className="text-xs text-muted-foreground">Connect or save your social profiles for future referral, loyalty, and brand-awareness features.</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Direct account connections aren't available yet — for now you can save your handles and profile links, which may be used in future for referral campaigns, testimonials, and social features.
      </p>

      <div className="mt-4 space-y-2">
        {PLATFORMS.map(({ key, label }) => {
          const c = byPlatform[key];
          return (
            <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{label}</p>
                {c ? (
                  <p className="truncate text-xs text-muted-foreground">{[c.handle, c.profile_url].filter(Boolean).join(" · ")}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Not added</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {c && <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground">Manually added</span>}
                {c ? (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => openEditor(key, label)} aria-label={`Edit ${label} profile`}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(c)} disabled={removingId === c.id} aria-label={`Remove ${label} profile`} className="text-destructive hover:text-destructive">
                      {removingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => openEditor(key, label)} className="rounded-lg">Add profile</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing?.connection ? `Edit ${editing?.label} profile` : `Add ${editing?.label} profile`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Handle / username</Label>
              <Input value={form.handle} onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value }))} placeholder="@myhandle" />
            </div>
            <div className="space-y-1.5">
              <Label>Profile link</Label>
              <Input value={form.profile_url} onChange={(e) => setForm((f) => ({ ...f, profile_url: e.target.value }))} placeholder="https://…" />
            </div>
            <p className="text-[11px] text-muted-foreground">We'll never ask for your social media passwords.</p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
              <Button onClick={save} disabled={saving || (!form.handle.trim() && !form.profile_url.trim())} className="rounded-xl">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}