import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/CartContext";
import { startStorePayment } from "@/services/paymentService";
import { FieldShell } from "@/components/shared";
import { usePlatformConfig } from "@/hooks/usePlatformConfig";
import { getSafeErrorMessage } from "@/lib/errors";

/** @param {{ open: boolean, onOpenChange: (open: boolean) => void }} props */
export default function CheckoutDialog({ open, onOpenChange }) {
  const { items, subtotal, beginCheckoutAttempt, releaseCheckoutAttempt } = useCart();
  const { data: { business } } = usePlatformConfig();
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting || items.length === 0 || subtotal <= 0) return;
    setError("");
    setSubmitting(true);
    const checkoutAttemptId = beginCheckoutAttempt();
    try {
      const result = await startStorePayment({
        customer: {
          customer_name: form.customer_name.trim(),
          customer_email: form.customer_email.trim(),
          customer_phone: form.customer_phone.trim(),
        },
        items: items.map((item) => ({ product_id: item.product.id, qty: item.qty })),
        notes: form.notes.trim(),
        checkoutAttemptId,
      });
      if (result?.blocked) {
        releaseCheckoutAttempt(checkoutAttemptId);
        setError(result.reason);
      } else if (!result?.url) {
        setError("Checkout could not be started. Please try again.");
      }
    } catch (caught) {
      const message = getSafeErrorMessage(caught, "Could not start checkout. Please try again.");
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Click and collect checkout</DialogTitle>
        </DialogHeader>

        <Alert>
          <MapPin className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Workshop pickup</AlertTitle>
          <AlertDescription>
            Collect from {business.address}. We will contact you when your order is ready.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldShell id="checkout-name" label="Full name" required>
              <Input required autoComplete="name" value={form.customer_name} onChange={(event) => set("customer_name", event.target.value)} />
            </FieldShell>
            <FieldShell id="checkout-phone" label="Phone" required>
              <Input required type="tel" autoComplete="tel" value={form.customer_phone} onChange={(event) => set("customer_phone", event.target.value)} />
            </FieldShell>
          </div>
          <FieldShell id="checkout-email" label="Email" required>
            <Input required type="email" autoComplete="email" value={form.customer_email} onChange={(event) => set("customer_email", event.target.value)} />
          </FieldShell>
          <FieldShell id="checkout-notes" label="Pickup notes" hint="Optional">
            <Textarea value={form.notes} onChange={(event) => set("notes", event.target.value)} placeholder="Anything the workshop should know about this order" />
          </FieldShell>

          {error && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Checkout could not start</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-heading font-semibold">Total: ${subtotal.toFixed(2)} AUD</span>
            <Button type="submit" disabled={submitting || items.length === 0 || subtotal <= 0} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {submitting ? "Opening secure checkout…" : "Pay with Stripe"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
