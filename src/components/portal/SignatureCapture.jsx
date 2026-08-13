import { useEffect, useId, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardSkeleton, ErrorState } from "@/components/shared";
import { CheckCircle2, Keyboard, Loader2, PenLine, RotateCcw } from "lucide-react";
import { getSafeErrorMessage } from "@/lib/errors";

const CONSENT_TEXT = "I confirm this signature is mine and acknowledge the completed repair work described above.";
const CONSENT_VERSION = "completed-work-v1";

/** @param {{ job: any, signatureKey: string, title: string, description: string, fileName: string, onSigned?: (fileUrl: string) => void }} props */
export default function SignatureCapture({ job, signatureKey, title, description, fileName, onSigned }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const instructionsId = useId();
  const nameId = useId();
  const consentId = useId();
  const [mode, setMode] = useState("draw");
  const [typedName, setTypedName] = useState("");
  const [consented, setConsented] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [hasInk, setHasInk] = useState(false);
  const queryClient = useQueryClient();

  const signaturesQuery = useQuery({
    queryKey: ["jobSignatures", job.id, signatureKey],
    queryFn: () => base44.entities.Attachment.filter({ job_id: job.id }, "-created_date", 50),
    enabled: !!job?.id,
  });
  const signatures = signaturesQuery.data || [];
  const existing = signatures.find((item) => item.signature_key === signatureKey || item.file_name === fileName);

  useEffect(() => {
    if (existing?.file_url) onSigned?.(existing.file_url);
  }, [existing?.file_url, onSigned]);

  const getPoint = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (event) => {
    if (existing || saving) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const context = canvasRef.current.getContext("2d");
    const point = getPoint(event);
    drawingRef.current = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const draw = (event) => {
    if (!drawingRef.current || existing || saving) return;
    event.preventDefault();
    const context = canvasRef.current.getContext("2d");
    const point = getPoint(event);
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.strokeStyle = "#0f172a";
    context.lineTo(point.x, point.y);
    context.stroke();
    hasInkRef.current = true;
    setHasInk(true);
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    hasInkRef.current = false;
    setHasInk(false);
    setSaveError("");
  };

  const createSignatureFile = async (signedAt) => {
    if (mode === "typed") {
      const baseName = fileName.replace(/\.[^.]+$/, "");
      const contents = [`Typed signature: ${typedName.trim()}`, `Signed at: ${signedAt}`, `Consent: ${CONSENT_TEXT}`].join("\n");
      return new File([contents], `${baseName}-typed.txt`, { type: "text/plain" });
    }

    const blob = await new Promise((resolve, reject) => {
      canvasRef.current?.toBlob((result) => result ? resolve(result) : reject(new Error("Signature image could not be prepared.")), "image/png");
    });
    return new File([blob], fileName, { type: "image/png" });
  };

  const save = async () => {
    if (saving || existing) return;
    const signedName = typedName.trim();
    if (signedName.length < 2) {
      setSaveError("Enter your full name before saving the signature.");
      document.getElementById(nameId)?.focus();
      return;
    }
    if (mode === "draw" && !hasInkRef.current) {
      setSaveError("Draw your signature, or choose Type to enter it with a keyboard.");
      return;
    }
    if (!consented) {
      setSaveError("Confirm the acknowledgement before saving your signature.");
      document.getElementById(consentId)?.focus();
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const current = await base44.entities.Attachment.filter({ job_id: job.id }, "-created_date", 50);
      const duplicate = current.find((item) => item.signature_key === signatureKey || item.file_name === fileName);
      if (duplicate) {
        await queryClient.invalidateQueries({ queryKey: ["jobSignatures", job.id, signatureKey] });
        onSigned?.(duplicate.file_url);
        return;
      }

      const signedAt = new Date().toISOString();
      const file = await createSignatureFile(signedAt);
      const upload = await base44.integrations.Core.UploadFile({ file });
      if (!upload?.file_url) throw new Error("Signature upload did not return a file.");
      await base44.entities.Attachment.create({
        job_id: job.id,
        customer_id: job.customer_id || "",
        file_url: upload.file_url,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        kind: "signature",
        visibility: "customer",
        uploaded_by_name: signedName,
        description: title,
        signature_key: signatureKey,
        signature_idempotency_key: `${job.id}:${signatureKey}`,
        signature_method: mode,
        signed_name: signedName,
        consent_text: CONSENT_TEXT,
        consent_version: CONSENT_VERSION,
        signed_at: signedAt,
      });
      await queryClient.invalidateQueries({ queryKey: ["jobSignatures", job.id, signatureKey] });
      onSigned?.(upload.file_url);
    } catch (caught) {
      setSaveError(getSafeErrorMessage(caught, "Your signature could not be saved. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border border-border bg-secondary/30 p-4" aria-labelledby={`${nameId}-title`}>
      <div className="flex items-start gap-2">
        <PenLine className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
        <div>
          <h3 id={`${nameId}-title`} className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      {signaturesQuery.isLoading ? <CardSkeleton compact label="Loading saved signature" /> : null}
      {signaturesQuery.error ? <ErrorState title="Signature status could not be loaded" error={signaturesQuery.error} onRetry={signaturesQuery.refetch} /> : null}

      {!signaturesQuery.isLoading && !signaturesQuery.error && existing ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{existing.signature_method === "typed" ? "Typed signature" : "Signature"} saved{existing.signed_name ? ` by ${existing.signed_name}` : ""}.</span>
            <a href={existing.file_url} target="_blank" rel="noreferrer" className="text-sm font-semibold underline">View record</a>
          </AlertDescription>
        </Alert>
      ) : null}

      {!signaturesQuery.isLoading && !signaturesQuery.error && !existing ? (
        <>
          <Tabs value={mode} onValueChange={(value) => { setMode(value); setSaveError(""); }}>
            <TabsList className="grid w-full grid-cols-2" aria-label="Signature method">
              <TabsTrigger value="draw"><PenLine className="h-4 w-4" aria-hidden="true" /> Draw</TabsTrigger>
              <TabsTrigger value="typed"><Keyboard className="h-4 w-4" aria-hidden="true" /> Type</TabsTrigger>
            </TabsList>
            <TabsContent value="draw" className="space-y-2">
              <p id={instructionsId} className="text-xs text-muted-foreground">Use a mouse, pen, or finger inside the signature box. Keyboard users can select Type.</p>
              <canvas
                ref={canvasRef}
                width={840}
                height={300}
                role="img"
                aria-label="Drawn signature area"
                aria-describedby={instructionsId}
                className="h-36 w-full touch-none rounded-lg border border-border bg-white"
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerCancel={stopDrawing}
                onPointerLeave={stopDrawing}
              />
              <Button type="button" size="sm" variant="outline" onClick={clear} disabled={!hasInk || saving}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> Clear drawing
              </Button>
            </TabsContent>
            <TabsContent value="typed" className="rounded-lg border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">Your typed full name will be stored as the signature record.</p>
              <p className="mt-4 break-words font-heading text-2xl font-semibold">{typedName.trim() || "Your name"}</p>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor={nameId}>Full legal name</Label>
            <Input id={nameId} name="signed_name" autoComplete="name" value={typedName} onChange={(event) => setTypedName(event.target.value)} disabled={saving} />
          </div>

          <div className="flex min-h-11 items-start gap-3 rounded-lg border border-border bg-background p-3">
            <Checkbox id={consentId} checked={consented} onCheckedChange={(checked) => setConsented(checked === true)} disabled={saving} className="mt-0.5" />
            <Label htmlFor={consentId} className="cursor-pointer text-sm font-normal leading-5">{CONSENT_TEXT}</Label>
          </div>

          {saveError ? <Alert variant="destructive"><AlertDescription>{saveError}</AlertDescription></Alert> : null}

          <div className="flex justify-end">
            <Button type="button" size="touch" onClick={() => void save()} disabled={saving || !typedName.trim() || !consented || (mode === "draw" && !hasInk)}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              {saving ? "Uploading signature..." : "Save signature"}
            </Button>
          </div>
          <span className="sr-only" role="status" aria-live="polite">{saving ? "Uploading signature" : ""}</span>
        </>
      ) : null}
    </section>
  );
}
