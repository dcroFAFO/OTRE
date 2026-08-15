import React from "react";
import { Receipt } from "lucide-react";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/shared";
import CustomerInvoiceCard from "@/components/portal/CustomerInvoiceCard";

export default function MyInvoicesCard({ invoices = [], userId, isLoading = false, error, onRetry, onChanged }) {
  const visible = invoices.filter((i) => i.invoiceVisibility === "customer_visible" && i.status && i.status !== "draft");

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
          <ErrorState title="Invoices could not be loaded" error={error} onRetry={onRetry} />
        ) : visible.length === 0 ? (
          <EmptyState compact className="rounded-xl border border-dashed border-border" icon={Receipt} title="No invoices yet" description="Invoices will appear here after staff issue them for your repair." />
        ) : (
          visible.map((invoice) => (
            <CustomerInvoiceCard
              key={invoice.id}
              invoice={invoice}
              userId={userId}
              onChanged={onChanged}
            />
          ))
        )}
      </div>
    </section>
  );
}
