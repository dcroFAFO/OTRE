import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Receipt, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusPill from "@/components/shared/StatusPill";
import { startInvoicePayment } from "@/services/paymentService";

// Reuses the Invoice entity directly — RLS already restricts results to
// this customer's own customer-visible invoices (see CustomerJobModal's
// InvoiceTab for the same pattern).
export default function MyInvoicesCard({ userEmail }) {
  const [paying, setPaying] = useState(null);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["portalAccountInvoices", userEmail],
    queryFn: () => base44.entities.Invoice.list("-created_date", 50),
    enabled: !!userEmail,
  });

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
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No invoice has been issued yet.</p>
        ) : (
          visible.map((inv) => {
            const isPaid = inv.status === "paid";
            return (
              <div key={inv.id} className="rounded-xl border border-border bg-background px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold truncate">{inv.number ? `Invoice ${inv.number}` : "Invoice"}</span>
                  <StatusPill value={inv.status} kind="payment" />
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Amount</span>
                  <span className="text-sm font-bold">{inv.currency || "AUD"} ${Number(inv.amount || 0).toFixed(2)}</span>
                </div>
                {!isPaid && (
                  <Button
                    size="sm"
                    className="mt-2.5 w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={paying === inv.id}
                    onClick={async () => {
                      setPaying(inv.id);
                      const result = await startInvoicePayment(inv);
                      if (result?.blocked) setPaying(null);
                    }}
                  >
                    {paying === inv.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                    Pay securely with Stripe
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}