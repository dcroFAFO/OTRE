import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PaymentResultAlert from "@/components/store/PaymentResultAlert";
import { verifyCheckoutStatus } from "@/services/paymentService";
import { getSafeErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";

/** @param {{ className?: string }} props */
export default function InvoicePaymentReturnAlert({ className }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = new URLSearchParams(location.search);
  const result = params.get("checkout_result") || "";
  const sessionId = params.get("session_id") || "";
  const invoiceId = params.get("invoice") || "";
  const checkoutAttemptId = params.get("attempt") || "";

  const verification = useQuery({
    queryKey: ["invoiceCheckoutStatus", sessionId, invoiceId, checkoutAttemptId],
    queryFn: () => verifyCheckoutStatus({ flow: "invoice", sessionId, invoiceId, checkoutAttemptId }),
    enabled: result === "success" && !!sessionId && !!invoiceId && !!checkoutAttemptId,
    staleTime: 0,
  });

  useEffect(() => {
    if (verification.data?.status !== "paid") return;
    queryClient.invalidateQueries({ queryKey: ["portalAccountInvoices"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardInvoices"] });
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
  }, [verification.data?.status, queryClient]);

  if (!result) return null;

  const dismiss = () => {
    const nextParams = new URLSearchParams(location.search);
    ["checkout_result", "session_id", "invoice", "attempt"].forEach((key) => nextParams.delete(key));
    navigate({
      pathname: location.pathname,
      search: nextParams.toString() ? `?${nextParams.toString()}` : "",
      hash: location.hash,
    }, { replace: true });
  };

  /** @type {"verifying" | "success" | "cancelled" | "pending" | "error"} */
  let status = "cancelled";
  if (result === "success") {
    if (!sessionId || !invoiceId || !checkoutAttemptId) status = "error";
    else if (verification.isLoading) status = "verifying";
    else if (verification.error) status = "error";
    else if (verification.data?.status === "paid") status = "success";
    else status = "pending";
  }

  const descriptions = {
    success: "Invoice payment has been confirmed and the job status has been updated.",
    cancelled: "Checkout was cancelled. The invoice remains outstanding.",
    pending: "Stripe has not confirmed this invoice payment yet. Check again before starting another payment.",
    error: verification.error
      ? getSafeErrorMessage(verification.error, "Invoice payment could not be verified.")
      : "Invoice payment could not be verified. No paid status has been applied.",
  };

  return (
    <div className={cn("mb-5", className)}>
      <PaymentResultAlert
        status={status}
        description={descriptions[status]}
        reference={verification.data?.reference}
        onRetry={["pending", "error"].includes(status) && sessionId ? () => verification.refetch() : undefined}
        onDismiss={status !== "verifying" ? dismiss : undefined}
      />
    </div>
  );
}
