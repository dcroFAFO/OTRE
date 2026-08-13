import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Receipt } from "lucide-react";
import { startInvoicePayment } from "@/services/paymentService";
import { toast } from "sonner";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/shared";
import CustomerInvoiceCard from "@/components/portal/CustomerInvoiceCard";
import { getSafeErrorMessage } from "@/lib/errors";

// Reuses the Invoice entity directly — RLS already restricts results to
// this customer's own customer-visible invoices (see CustomerJobModal's
// InvoiceTab for the same pattern).
export default function MyInvoicesCard({ userEmail, userId }) {
  const [paying, setPaying] = useState(null);

  const { data: invoices = [], isLoading, error, refetch } = useQuery({
    queryKey: ["portalAccountInvoices", userEmail],
    queryFn: () => base44.entities.Invoice.list("-created_date", 50),
    enabled: !!userEmail,
  });

  const visible = invoices.filter((i) => i.invoiceVisibility === "customer_visible" && i.status && i.status !== "draft");

  const pay = async (invoice) => {
    if (paying) return;
    setPaying(invoice.id);
    try {
      const result = await startInvoicePayment(invoice);
      if (result?.blocked) {
        toast.error(result.reason);
        setPaying(null);
      } else if (!result?.url) {
        toast.error("Secure checkout could not be started. Please try again.");
        setPaying(null);
      }
    } catch (error) {
      toast.error(getSafeErrorMessage(error, "Could not start payment. Please try again."));
      setPaying(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent"><Receipt className="h-4.5 w-4.5" /></span>
        <div>
          <h2 className="font-heading text-lg font-extrabold">My Invoices</h2>
          <p className="text-xs text-muted-foreground">Invoices issued for your repairs.</p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {isLoading ? (
          <CardSkeleton compact />
        ) : error ? (
          <ErrorState title="Invoices could not be loaded" error={error} onRetry={refetch} />
        ) : visible.length === 0 ? (
          <EmptyState compact className="rounded-xl border border-dashed border-border" icon={Receipt} title="No invoices yet" description="Invoices will appear here after staff issue them for your repair." />
        ) : (
          visible.map((invoice) => (
            <CustomerInvoiceCard
              key={invoice.id}
              invoice={invoice}
              userId={userId}
              onChanged={() => void refetch()}
              onPay={() => pay(invoice)}
              paymentPending={paying === invoice.id}
            />
          ))
        )}
      </div>
    </section>
  );
}
