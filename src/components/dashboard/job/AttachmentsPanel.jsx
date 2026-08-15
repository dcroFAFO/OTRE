import { useCallback, useEffect, useState } from "react";
import { FileText, Globe, ImageIcon, Loader2, Lock, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DOCUMENT_TYPES = new Set([...IMAGE_TYPES, "application/pdf"]);

export default function AttachmentsPanel({ job, canUpload }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [visibility, setVisibility] = useState("internal");

  const invoke = useCallback(async (payload) => {
    const response = await base44.functions.invoke("attachmentActions", payload);
    return response.data?.data || response.data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await invoke({ action: "list", job_id: job.id });
      setItems(result?.items || []);
    } catch {
      setError("Files could not be loaded. Try again.");
    } finally {
      setLoading(false);
    }
  }, [invoke, job.id]);

  useEffect(() => { void load(); }, [load]);

  const handleFile = async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || busy) return;
    const kind = file.type.startsWith("image/") ? "photo" : "document";
    const allowed = kind === "photo" ? IMAGE_TYPES : DOCUMENT_TYPES;
    const maximum = kind === "photo" ? 10 * 1024 * 1024 : 20 * 1024 * 1024;
    if (!allowed.has(file.type) || file.size <= 0 || file.size > maximum) {
      setError(kind === "photo" ? "Choose a JPG, PNG, or WebP image under 10 MB." : "Choose a PDF under 20 MB.");
      input.value = "";
      return;
    }
    setBusy("upload");
    setError("");
    try {
      const upload = await base44.integrations.Core.UploadPrivateFile({ file });
      if (!upload?.file_uri) throw new Error("Private upload failed.");
      await invoke({
        action: "finalize",
        job_id: job.id,
        file_uri: upload.file_uri,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        kind,
        visibility,
      });
      await load();
    } catch {
      setError("The file could not be uploaded. Try again.");
    } finally {
      input.value = "";
      setBusy("");
    }
  };

  const openFile = async (attachment) => {
    if (busy) return;
    setBusy(attachment.id);
    setError("");
    try {
      const result = await invoke({ action: "download", attachment_id: attachment.id });
      if (!result?.signed_url) throw new Error("Signed link unavailable.");
      window.location.assign(result.signed_url);
    } catch {
      setError("That file could not be opened. Try again.");
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="job-files-title">
      <h3 id="job-files-title" className="font-heading font-bold">Files &amp; Documents</h3>
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}

      {canUpload ? (
        <div className="space-y-2">
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">File visibility</legend>
            <span className="text-xs font-medium text-muted-foreground" aria-hidden="true">Upload as:</span>
            <Button type="button" size="touch" variant={visibility === "internal" ? "default" : "outline"} aria-pressed={visibility === "internal"} onClick={() => setVisibility("internal")}>
              <Lock className="h-4 w-4" aria-hidden="true" /> Private
            </Button>
            <Button type="button" size="touch" variant={visibility === "customer" ? "default" : "outline"} aria-pressed={visibility === "customer"} onClick={() => setVisibility("customer")}>
              <Globe className="h-4 w-4" aria-hidden="true" /> Customer
            </Button>
          </fieldset>
          <label className={cn(buttonVariants({ variant: "outline", size: "touch" }), "w-full cursor-pointer justify-start border-dashed")}>
            {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
            {busy === "upload" ? "Uploading…" : `Upload ${visibility === "customer" ? "customer-visible" : "private"} file`}
            <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFile} disabled={!!busy} />
          </label>
          <p className="text-xs text-muted-foreground">Images up to 10 MB; PDFs up to 20 MB. Downloads use short-lived private links.</p>
        </div>
      ) : null}

      {loading ? <p role="status" className="text-sm text-muted-foreground">Loading files…</p> : null}
      {!loading ? (
        <div className="grid grid-cols-1 gap-2">
          {items.map((attachment) => (
            <Button key={attachment.id} type="button" variant="outline" className="min-h-11 w-full justify-start" disabled={!!busy || !attachment.downloadable} onClick={() => void openFile(attachment)}>
              {busy === attachment.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : attachment.kind === "photo" ? <ImageIcon className="h-4 w-4 text-accent" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
              <span className="min-w-0 flex-1 truncate text-left">{attachment.file_name || "File"}</span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                {attachment.visibility === "customer" ? <Globe className="h-3 w-3" aria-hidden="true" /> : <Lock className="h-3 w-3" aria-hidden="true" />}
                {attachment.visibility === "customer" ? "Customer" : "Private"}
              </span>
            </Button>
          ))}
          {!items.length ? <p className="text-sm text-muted-foreground">No files uploaded yet.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
