import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertCircle, CheckCircle2, Download, Loader2, Printer, Send } from "lucide-react";

export default function InvoicePdfPreviewDialog({
  open,
  document,
  generating,
  sending,
  sendStatus,
  sendError,
  onClose,
  onDownload,
  onPrint,
  onConfirmSend,
}) {
  const previewUrl = document?.pdfBase64 ? `data:application/pdf;base64,${document.pdfBase64}` : "";
  const sent = sendStatus === "sent";
  const failed = sendStatus === "send_failed";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose?.()}>
      <DialogContent className="max-w-5xl h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Invoice preview</DialogTitle>
          <DialogDescription>
            Review the generated invoice before sending it to the customer.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-secondary/30 p-3 text-sm">
          {sent ? (
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Invoice sent to customer. You can now print or download a copy.
            </div>
          ) : failed ? (
            <div className="space-y-1 text-rose-700">
              <div className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" /> Send failed</div>
              <p className="text-xs">{sendError || "The invoice was not sent. You can retry or return to billing."}</p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium text-foreground">Send invoice to customer?</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={generating || sending}>No, return to billing</Button>
                <Button onClick={onConfirmSend} disabled={!document?.pdfBase64 || generating || sending} className="gap-2">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Yes, send to customer
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 rounded-xl border border-border bg-muted/30 overflow-hidden min-h-0">
          {generating ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Generating invoice preview…</p>
            </div>
          ) : previewUrl ? (
            <iframe title="Invoice preview" src={previewUrl} className="w-full h-full bg-white" />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No invoice preview generated yet.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          {(sent || failed) && (
            <Button variant="outline" onClick={onClose}>Return to billing</Button>
          )}
          {sent && (
            <>
              <Button variant="outline" onClick={onPrint} disabled={!document?.pdfBase64 || generating} className="gap-2">
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button onClick={onDownload} disabled={!document?.pdfBase64 || generating} className="gap-2">
                <Download className="h-4 w-4" /> Download
              </Button>
            </>
          )}
          {failed && (
            <Button onClick={onConfirmSend} disabled={!document?.pdfBase64 || sending} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Retry sending
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}