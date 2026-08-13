import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/shared";

const RESULT_CONTENT = {
  success: {
    title: "Payment confirmed",
    description: "Your order is paid. The workshop will contact you when it is ready for pickup.",
    icon: CheckCircle2,
  },
  cancelled: {
    title: "Checkout cancelled",
    description: "No payment was confirmed and your cart has been kept.",
    icon: XCircle,
  },
  pending: {
    title: "Payment is still processing",
    description: "Stripe has not confirmed payment yet. You can safely check again.",
    icon: Clock3,
  },
  error: {
    title: "Payment could not be verified",
    description: "Your cart has been kept. Try verification again before starting another payment.",
    icon: AlertCircle,
  },
};

/** @param {{ status: "verifying" | "success" | "cancelled" | "pending" | "error", description?: string, reference?: string, onRetry?: () => void, onDismiss?: () => void }} props */
export default function PaymentResultAlert({ status, description, reference, onRetry, onDismiss }) {
  if (status === "verifying") {
    return (
      <Alert role="status" aria-live="polite">
        <LoadingSpinner className="absolute left-4 top-3.5" label="" iconClassName="h-4 w-4" decorative />
        <AlertTitle className="pl-7">Verifying payment</AlertTitle>
        <AlertDescription className="pl-7">Checking the Stripe session before updating your cart.</AlertDescription>
      </Alert>
    );
  }

  const content = RESULT_CONTENT[status] || RESULT_CONTENT.error;
  const Icon = content.icon;
  return (
    <Alert variant={status === "error" ? "destructive" : "default"} aria-live="polite">
      <Icon className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>{content.title}</AlertTitle>
      <AlertDescription>
        <p>{description || content.description}</p>
        {reference && <p className="mt-1 font-medium">Order reference: {reference}</p>}
        {(onRetry || onDismiss) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {onRetry && <Button type="button" size="sm" variant="outline" onClick={onRetry}>Check again</Button>}
            {onDismiss && <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>Dismiss</Button>}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
