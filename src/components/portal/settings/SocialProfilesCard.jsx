import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Pencil, ShieldCheck, Share2, Trash2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FieldShell from "@/components/shared/FieldShell";
import { getSafeErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

const PLATFORMS = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/your-profile" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/your-profile" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@your-profile" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@your-channel" },
  { key: "x_twitter", label: "X / Twitter", placeholder: "https://x.com/your-profile" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/your-profile" },
];

function StatusBadge({ status }) {
  const verified = status === "verified";
  return (
    <Badge variant="outline" className={verified ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}>
      {verified ? <ShieldCheck className="mr-1 h-3 w-3" aria-hidden="true" /> : null}
      {verified ? "Verified" : "Unverified"}
    </Badge>
  );
}

/** @param {{ connections?: Array<Record<string, any>>, onChanged?: () => void }} props */
export default function SocialProfilesCard({ connections = [], onChanged }) {
  const byPlatform = useMemo(() => Object.fromEntries(connections.map((connection) => [connection.platform, connection])), [connections]);
  const [editing, setEditing] = useState("");
  const [form, setForm] = useState({ handle: "", profile_url: "" });
  const [pending, setPending] = useState("");
  const [copied, setCopied] = useState("");

  const beginEdit = (platform) => {
    const connection = byPlatform[platform];
    setForm({ handle: connection?.handle || "", profile_url: connection?.profile_url || "" });
    setEditing(platform);
  };

  const save = async (platform) => {
    setPending(`save:${platform}`);
    try {
      const response = await base44.functions.invoke("customerSettings", {
        action: "saveConnection",
        platform,
        handle: form.handle.trim(),
        profile_url: form.profile_url.trim(),
      });
      if (response.data?.error) throw Object.assign(new Error(response.data.error), { response });
      setEditing("");
      toast.success("Profile saved", { description: "Add the verification code to the public profile, then check it here." });
      await onChanged?.();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "This profile could not be saved."));
    } finally {
      setPending("");
    }
  };

  const verify = async (connection) => {
    setPending(`verify:${connection.id}`);
    try {
      const response = await base44.functions.invoke("customerSettings", { action: "verifyConnection", connection_id: connection.id });
      if (response.data?.error) throw Object.assign(new Error(response.data.error), { response });
      if (response.data?.verified) toast.success("Profile verified");
      else toast.info(response.data?.message || "The profile remains unverified.");
      await onChanged?.();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "This public profile could not be checked."));
    } finally {
      setPending("");
    }
  };

  const remove = async (connection) => {
    setPending(`remove:${connection.id}`);
    try {
      const response = await base44.functions.invoke("customerSettings", { action: "deleteConnection", connection_id: connection.id });
      if (response.data?.error) throw Object.assign(new Error(response.data.error), { response });
      toast.success("Profile removed");
      await onChanged?.();
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "This profile could not be removed."));
    } finally {
      setPending("");
    }
  };

  const copyCode = async (connection) => {
    await navigator.clipboard.writeText(connection.verification_code || "");
    setCopied(connection.id);
    window.setTimeout(() => setCopied(""), 1500);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="social-profiles-title">
      <div className="flex items-start gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground"><Share2 className="h-4.5 w-4.5" aria-hidden="true" /></span>
        <div>
          <h2 id="social-profiles-title" className="font-heading text-lg font-extrabold">Social profiles</h2>
          <p className="text-xs text-muted-foreground">Verify ownership without sharing a password or connecting an account.</p>
        </div>
      </div>

      {connections.length === 0 ? (
        <Alert className="mt-4">
          <Share2 className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>No social profiles added</AlertTitle>
          <AlertDescription>Add an official public profile below. Profiles remain unverified until its page contains your generated code.</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-background">
        {PLATFORMS.map(({ key, label, placeholder }) => {
          const connection = byPlatform[key];
          const isEditing = editing === key;
          return (
            <div key={key} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{label}</p>
                    {connection ? <StatusBadge status={connection.status} /> : null}
                  </div>
                  {connection ? (
                    <a href={connection.profile_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-primary hover:underline">
                      <span className="truncate">{connection.handle || connection.profile_url}</span><ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                    </a>
                  ) : <p className="mt-1 text-xs text-muted-foreground">Not added</p>}
                </div>
                {!isEditing ? (
                  <div className="flex shrink-0 items-center gap-2">
                    {connection && connection.status !== "verified" ? (
                      <Button type="button" variant="outline" size="sm" disabled={!!pending} onClick={() => verify(connection)}>
                        {pending === `verify:${connection.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                        Check profile
                      </Button>
                    ) : null}
                    <Button type="button" variant="ghost" size="icon" onClick={() => beginEdit(key)} aria-label={`${connection ? "Edit" : "Add"} ${label} profile`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {connection ? (
                      <Button type="button" variant="ghost" size="icon" disabled={!!pending} onClick={() => remove(connection)} className="text-destructive hover:text-destructive" aria-label={`Remove ${label} profile`}>
                        {pending === `remove:${connection.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {connection && connection.status !== "verified" && !isEditing ? (
                <div className="mt-3 rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Add this code to the public profile bio or description:</p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate text-xs font-semibold">{connection.verification_code}</code>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => copyCode(connection)} aria-label={`Copy ${label} verification code`}>
                      {copied === connection.id ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  {connection.verification_result === "blocked" ? <p className="mt-2 text-xs text-amber-900">This host blocked the automatic check. The profile remains unverified.</p> : null}
                  {connection.verification_result === "code_not_found" ? <p className="mt-2 text-xs text-amber-900">The code was not found on the public page yet.</p> : null}
                </div>
              ) : null}

              {isEditing ? (
                <div className="mt-4 space-y-3 rounded-lg bg-muted/50 p-4">
                  <FieldShell id={`social-handle-${key}`} label="Display handle" hint="Optional. This is shown only as a friendly label.">
                    <Input value={form.handle} onChange={(event) => setForm((current) => ({ ...current, handle: event.target.value }))} placeholder="@your-profile" />
                  </FieldShell>
                  <FieldShell id={`social-url-${key}`} label="Official public profile URL" required>
                    <Input type="url" inputMode="url" value={form.profile_url} onChange={(event) => setForm((current) => ({ ...current, profile_url: event.target.value }))} placeholder={placeholder} />
                  </FieldShell>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="outline" disabled={!!pending} onClick={() => setEditing("")}><X className="h-4 w-4" /> Cancel</Button>
                    <Button type="button" disabled={!!pending || !form.profile_url.trim()} onClick={() => save(key)}>
                      {pending === `save:${key}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save profile
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <span className="sr-only" aria-live="polite">{copied ? "Verification code copied" : ""}</span>
    </section>
  );
}
