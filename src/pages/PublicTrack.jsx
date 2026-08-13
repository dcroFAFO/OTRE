import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FileText, Loader2, MessageSquare, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import SEO from "@/components/SEO";
import CustomerInvoiceCard from "@/components/portal/CustomerInvoiceCard";
import { CardSkeleton, EmptyState } from "@/components/shared";
import StatusPill from "@/components/shared/StatusPill";
import PaymentResultAlert from "@/components/store/PaymentResultAlert";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { businessContactLinks } from "@/config/platformConfig";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { getErrorStatus, getSafeErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);
const INVALID_LINK_MESSAGE = "This tracking link is not valid. Please check the link or contact On The Run Electrics for help.";

function PortalSection({ title, icon: Icon, children }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm" aria-labelledby={`tracking-${title.toLowerCase()}-title`}>
      <h2 id={`tracking-${title.toLowerCase()}-title`} className="mb-4 flex items-center gap-2 font-heading text-lg font-extrabold">
        <Icon className="h-5 w-5 text-accent" aria-hidden="true" /> {title}
      </h2>
      {children}
    </section>
  );
}

export default function PublicTrack() {
  const { jobId: trackingToken = "" } = useParams();
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const { data: { business } } = usePlatformConfig();
  const contactLinks = businessContactLinks(business);
  const dataRef = useRef(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(null);
  const [paymentResult, setPaymentResult] = useState(/** @type {"" | "verifying" | "success" | "cancelled" | "pending" | "error"} */ (""));
  const params = new URLSearchParams(window.location.search);
  const returnedPayment = params.get("payment") || "";
  const returnedSessionId = params.get("session_id") || "";
  const returnedInvoiceId = params.get("invoice") || "";
  const returnedAttemptId = params.get("attempt") || "";

  const invoke = useCallback(async (payload) => {
    const response = await base44.functions.invoke("publicJobAccessActions", { trackingToken, token, ...payload });
    return response.data;
  }, [trackingToken, token]);

  const load = useCallback(async () => {
    setError(null);
    setActionError("");
    setBusy("load");
    try {
      if (returnedPayment === "success" && returnedSessionId && returnedInvoiceId && returnedAttemptId) {
        setPaymentResult("verifying");
        const result = await invoke({ action: "verify_payment", sessionId: returnedSessionId, invoiceId: returnedInvoiceId, checkoutAttemptId: returnedAttemptId });
        setPaymentResult(result.payment_result?.status === "paid" ? "success" : "pending");
        dataRef.current = result;
        setData(result);
      } else {
        const result = await invoke({ action: "get" });
        dataRef.current = result;
        setData(result);
        if (returnedPayment === "cancelled") setPaymentResult("cancelled");
        if (returnedPayment === "success") setPaymentResult("error");
      }
    } catch (caught) {
      if (returnedPayment === "success") {
        setPaymentResult("error");
        try {
          const result = await invoke({ action: "get" });
          dataRef.current = result;
          setData(result);
          setActionError("The payment result could not be verified. No paid status has been applied.");
        } catch (loadError) {
          setError({ status: getErrorStatus(loadError), message: INVALID_LINK_MESSAGE });
        }
      } else if (dataRef.current) {
        setActionError(getSafeErrorMessage(caught, "The latest tracking information could not be loaded. Try again."));
      } else {
        setError({ status: getErrorStatus(caught), message: INVALID_LINK_MESSAGE });
      }
    } finally {
      setBusy(null);
    }
  }, [invoke, returnedAttemptId, returnedInvoiceId, returnedPayment, returnedSessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const can = (permission) => data?.permissions?.includes(permission);

  const addNote = async () => {
    if (!note.trim() || busy) return;
    setBusy("note");
    setActionError("");
    try {
      const result = await invoke({ action: "add_note", note: note.trim() });
      dataRef.current = result;
      setData(result);
      setNote("");
    } catch (caught) {
      setActionError(getSafeErrorMessage(caught, "Your message could not be sent. Please try again."));
    } finally {
      setBusy(null);
    }
  };

  const uploadFile = async (event) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || busy) return;
    setActionError("");
    if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
      setActionError("Choose a JPG, PNG, WebP, HEIC, or PDF file.");
      input.value = "";
      return;
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      setActionError("Choose a file smaller than 10 MB.");
      input.value = "";
      return;
    }

    setBusy("file");
    try {
      const upload = await base44.integrations.Core.UploadFile({ file });
      if (!upload?.file_url) throw new Error("Upload did not return a file.");
      const result = await invoke({
        action: "upload_file",
        file_url: upload.file_url,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        kind: file.type.startsWith("image/") ? "photo" : "document",
      });
      dataRef.current = result;
      setData(result);
    } catch (caught) {
      setActionError(getSafeErrorMessage(caught, "Your file could not be uploaded. Please try again."));
    } finally {
      input.value = "";
      setBusy(null);
    }
  };

  const payInvoice = async () => {
    if (!data?.invoice?.id || busy) return;
    if (window.self !== window.top) {
      setPaymentResult("error");
      return;
    }
    setBusy("pay");
    setActionError("");
    try {
      const checkoutAttemptId = globalThis.crypto?.randomUUID?.() || `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      const result = await invoke({ action: "start_payment", invoiceId: data.invoice.id, checkoutAttemptId });
      if (result?.url) window.location.href = result.url;
      else setActionError("Secure checkout could not be started. Please try again.");
    } catch (caught) {
      setPaymentResult("error");
      setActionError(getSafeErrorMessage(caught, "Secure checkout could not be started. Please try again."));
    } finally {
      setBusy(null);
    }
  };

  const dismissPaymentResult = () => {
    const nextParams = new URLSearchParams(window.location.search);
    ["payment", "session_id", "invoice", "attempt"].forEach((key) => nextParams.delete(key));
    const nextSearch = nextParams.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`);
    setPaymentResult("");
  };

  return (
    <>
      <SEO title="Track Repair Job | On The Run Electrics" description="Secure public repair job tracking." canonical={`/track/${trackingToken}`} noindex />
      <main className="min-h-screen bg-background text-foreground">
        <section className="mx-auto max-w-4xl px-5 py-10 sm:py-16">
          <Link to="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-muted-foreground hover:text-foreground">Back to home</Link>

          {paymentResult ? (
            <div className="mt-6">
              <PaymentResultAlert
                status={paymentResult}
                description={{
                  success: "Invoice payment has been confirmed and the repair job is now complete.",
                  cancelled: "Checkout was cancelled. The invoice remains outstanding.",
                  pending: "Stripe has not confirmed this invoice payment yet. Check again in a moment.",
                  error: "The invoice payment could not be verified. No paid status has been applied.",
                }[paymentResult]}
                onRetry={["pending", "error"].includes(paymentResult) && returnedSessionId ? load : undefined}
                onDismiss={paymentResult !== "verifying" ? dismissPaymentResult : undefined}
              />
            </div>
          ) : null}

          {busy === "load" && !data ? <CardSkeleton count={3} className="mt-8" label="Loading secure tracking information" /> : null}

          {error ? (
            <section className="mt-8 rounded-lg border border-destructive/20 bg-card p-6 text-center shadow-sm" aria-labelledby="tracking-unavailable-title">
              <h1 id="tracking-unavailable-title" className="font-heading text-2xl font-extrabold">Tracking link unavailable</h1>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{error.message}</p>
              <div className="mt-5 flex flex-col items-center justify-center gap-2 text-sm sm:flex-row">
                <a className="font-semibold text-primary underline" href={contactLinks.email}>{business.email}</a>
                <span className="hidden text-muted-foreground sm:inline" aria-hidden="true">·</span>
                <a className="font-semibold text-primary underline" href={contactLinks.phone}>{business.phone}</a>
              </div>
              {![403, 404].includes(error.status) ? <Button type="button" variant="outline" className="mt-5" onClick={() => void load()}>Try again</Button> : null}
            </section>
          ) : null}

          {data ? (
            <div className="mt-8 space-y-5">
              <section className="rounded-lg border border-border bg-card p-6 shadow-sm" aria-labelledby="tracking-job-title">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Repair job {data.job.reference || data.job.id}</p>
                    <h1 id="tracking-job-title" className="mt-2 break-words font-heading text-3xl font-extrabold">{data.job.asset_label || "Scooter repair"}</h1>
                    <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{data.job.issueDescription || data.job.issue_description || "Repair details will be added by the workshop."}</p>
                  </div>
                  <StatusPill value={data.job.status} />
                </div>
                {busy === "load" ? <p className="mt-4 text-sm text-muted-foreground" role="status">Refreshing tracking information...</p> : null}
              </section>

              {actionError ? <Alert variant="destructive"><AlertDescription>{actionError}</AlertDescription></Alert> : null}

              {data.invoice ? (
                <CustomerInvoiceCard invoice={data.invoice} onPay={can("pay_invoice") ? payInvoice : undefined} paymentPending={busy === "pay"} showRewards={false} />
              ) : (
                <section className="rounded-lg border border-border bg-card shadow-sm">
                  <EmptyState compact icon={FileText} title="No invoice available" description="An invoice will appear here when the workshop issues one for this repair." />
                </section>
              )}

              <PortalSection title="Messages" icon={MessageSquare}>
                <div className="space-y-3">
                  {data.notes?.length ? data.notes.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
                      <p className="whitespace-pre-wrap">{item.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.author_name || business.name}</p>
                    </div>
                  )) : <EmptyState compact icon={MessageSquare} title="No messages yet" description="Public updates from the workshop will appear here." />}
                  {can("add_note") ? (
                    <div className="space-y-2 border-t border-border pt-4">
                      <Label htmlFor="tracking-message">Message the workshop</Label>
                      <Textarea id="tracking-message" value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} placeholder="Write a message" disabled={!!busy} />
                      <Button type="button" size="touch" onClick={() => void addNote()} disabled={!note.trim() || !!busy}>
                        {busy === "note" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <MessageSquare className="h-4 w-4" aria-hidden="true" />}
                        {busy === "note" ? "Sending..." : "Send message"}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </PortalSection>

              <PortalSection title="Files" icon={Upload}>
                <div className="space-y-3">
                  {data.attachments?.length ? data.attachments.map((attachment) => (
                    <a key={attachment.id} href={attachment.file_url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center rounded-lg border border-border px-3 py-2 text-sm font-medium hover:border-accent">
                      {attachment.file_name || "File"}
                    </a>
                  )) : <EmptyState compact icon={Upload} title="No files yet" description="Photos and documents shared for this repair will appear here." />}
                  {can("upload_file") ? (
                    <div className="border-t border-border pt-4">
                      <label className={cn(buttonVariants({ variant: "outline", size: "touch" }), "cursor-pointer", busy && "pointer-events-none opacity-50")} aria-disabled={!!busy}>
                        {busy === "file" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                        {busy === "file" ? "Uploading..." : "Upload file"}
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                          onChange={uploadFile}
                          disabled={!!busy}
                        />
                      </label>
                      <p className="mt-2 text-xs text-muted-foreground">JPG, PNG, WebP, HEIC, or PDF. Maximum 10 MB.</p>
                    </div>
                  ) : null}
                </div>
              </PortalSection>
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
