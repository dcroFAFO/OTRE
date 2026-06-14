import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Upload, FileText, ImageIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { errorMessage } from "@/lib/errors";

const MAX_FILE_MB = 25;

export default function AttachmentsPanel({ job, actor, canUpload }) {
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const load = () =>
    base44.entities.Attachment.filter({ job_id: job.id }, "-created_date", 50)
      .then(setItems)
      .catch(() => {}); // non-blocking: an empty list with a quiet failure is acceptable here
  useEffect(() => { load(); }, [job.id]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after an error
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: `Please choose a file under ${MAX_FILE_MB}MB.` });
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Attachment.create({
        job_id: job.id, file_url, file_name: file.name,
        kind: file.type.startsWith("image") ? "photo" : "document",
        visibility: "internal", uploaded_by_name: actor?.full_name || actor?.short_name,
      });
      await load();
    } catch (err) {
      toast({ variant: "destructive", title: "Upload failed", description: errorMessage(err) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-heading font-bold">Attachments</h3>
      {canUpload && (
        <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-accent transition-colors">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload file
          <input type="file" className="hidden" onChange={handleFile} />
        </label>
      )}
      <div className="grid grid-cols-2 gap-2">
        {items.map((a) => (
          <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-sm hover:border-accent transition-colors">
            {a.kind === "photo" ? <ImageIcon className="h-4 w-4 text-accent shrink-0" /> : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
            <span className="truncate">{a.file_name}</span>
          </a>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground col-span-2">No attachments.</p>}
      </div>
    </div>
  );
}