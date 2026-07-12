import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, PenLine, RotateCcw } from "lucide-react";

export default function SignatureCapture({ job, signatureKey, title, description, fileName, onSigned = undefined }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const queryClient = useQueryClient();

  const { data: signatures = [] } = useQuery({
    queryKey: ["jobSignatures", job.id, signatureKey],
    queryFn: () => base44.entities.Attachment.filter({ job_id: job.id }, "-created_date", 50),
    enabled: !!job?.id,
  });

  const existing = signatures.find((item) => item.file_name === fileName);

  useEffect(() => {
    if (existing?.file_url) onSigned?.(existing.file_url);
  }, [existing?.file_url]);

  const getPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches?.[0];
    return {
      x: ((touch?.clientX ?? event.clientX) - rect.left) * (canvas.width / rect.width),
      y: ((touch?.clientY ?? event.clientY) - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (event) => {
    if (existing || saving) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const point = getPoint(event);
    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (event) => {
    if (!drawingRef.current || existing || saving) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const point = getPoint(event);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    hasInkRef.current = true;
    setHasInk(true);
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    hasInkRef.current = false;
    setHasInk(false);
  };

  const save = async () => {
    if (!hasInkRef.current || existing) return;
    setSaving(true);
    const canvas = canvasRef.current;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    const file = new File([blob], fileName, { type: "image/png" });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Attachment.create({
      job_id: job.id,
      customer_id: job.customer_id || "",
      file_url,
      file_name: fileName,
      kind: "signature",
      visibility: "customer",
      uploaded_by_name: job.customer_name || "Customer",
    });
    await queryClient.invalidateQueries({ queryKey: ["jobSignatures", job.id, signatureKey] });
    onSigned?.(file_url);
    setSaving(false);
  };

  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <PenLine className="h-4 w-4 text-primary mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      {existing ? (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Signature saved to job file</span>
          <a href={existing.file_url} target="_blank" rel="noreferrer" className="text-xs font-semibold underline">View</a>
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            width={420}
            height={150}
            className="h-36 w-full rounded-lg border border-border bg-white touch-none"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={clear} disabled={!hasInk || saving} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Clear
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={!hasInk || saving} className="gap-1.5 ml-auto">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Save signature
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
