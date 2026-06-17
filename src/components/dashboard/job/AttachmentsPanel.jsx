import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Upload, FileText, ImageIcon, Lock, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AttachmentsPanel({ job, actor, canUpload }) {
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [visibility, setVisibility] = useState("internal");

  const load = () => base44.entities.Attachment.filter({ job_id: job.id }, "-created_date", 50).then(setItems);
  useEffect(() => { load(); }, [job.id]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Attachment.create({
      job_id: job.id, file_url, file_name: file.name,
      kind: file.type.startsWith("image") ? "photo" : "document",
      visibility,
      uploaded_by_name: actor?.full_name || actor?.short_name,
    });
    setUploading(false);
    e.target.value = "";
    load();
  };

  return (
    <div className="space-y-4">
      <h3 className="font-heading font-bold">Files & Documents</h3>

      {canUpload && (
        <div className="space-y-2">
          {/* Visibility toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Upload as:</span>
            <button
              onClick={() => setVisibility("internal")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                visibility === "internal"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              <Lock className="h-3 w-3" /> Private
            </button>
            <button
              onClick={() => setVisibility("customer")}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                visibility === "customer"
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-transparent text-muted-foreground border-border hover:border-accent/50"
              )}
            >
              <Globe className="h-3 w-3" /> Visible to customer
            </button>
          </div>

          {/* Upload dropzone */}
          <label className="flex items-center gap-2 cursor-pointer rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-accent transition-colors">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : `Upload file (${visibility === "customer" ? "visible to customer" : "private / internal"})`}
            <input type="file" className="hidden" onChange={handleFile} disabled={uploading} />
          </label>
        </div>
      )}

      {/* File list */}
      <div className="grid grid-cols-1 gap-2">
        {items.map((a) => (
          <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer"
            className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-sm hover:border-accent transition-colors">
            {a.kind === "photo"
              ? <ImageIcon className="h-4 w-4 text-accent shrink-0" />
              : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
            <span className="truncate flex-1 text-sm">{a.file_name || "File"}</span>
            <span className={cn(
              "flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 shrink-0",
              a.visibility === "customer"
                ? "bg-accent/10 text-accent border border-accent/20"
                : "bg-slate-100 text-slate-500 border border-slate-200"
            )}>
              {a.visibility === "customer" ? <Globe className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
              {a.visibility === "customer" ? "Customer" : "Private"}
            </span>
          </a>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">No files uploaded yet.</p>}
      </div>
    </div>
  );
}