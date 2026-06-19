import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Download, Loader2, Mail, RefreshCw } from "lucide-react";

export default function InvoicePdfPreviewDialog({
  open,
  document,
  generating,
  emailing,
  onClose,
  onDownload,
  onEmail,
  onRegenerate,
}) {
  const previewUrl = document?.pdfBase64 ? `data:application/pdf;base64,${document.pdfBase64}` : "";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose?.()}>
      <DialogContent className="max-w-5xl h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review tax invoice</DialogTitle>
          <DialogDescription>
            Preview the generated invoice, then download it, email the customer, or regenerate it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 rounded-xl border border-border bg-muted/30 overflow-hidden min-h-0">
          {generating ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Generating official tax invoice…</p>
            </div>
          ) : previewUrl ? (
            <iframe title="Tax invoice preview" src={previewUrl} className="w-full h-full bg-white" />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No invoice preview generated yet.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={onRegenerate} disabled={generating || emailing} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Regenerate
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onDownload} disabled={!document?.pdfBase64 || generating} className="gap-2">
              <Download className="h-4 w-4" />
              Download copy
            </Button>
            <Button onClick={onEmail} disabled={!document?.pdfBase64 || generating || emailing || !document?.customerEmail} className="gap-2">
              {emailing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Email customer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}