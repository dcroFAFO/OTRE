import StatusPill from "@/components/shared/StatusPill";
import RewardPicker from "@/components/portal/rewards/RewardPicker";
import { cn } from "@/lib/utils";

function money(value, currency = "AUD") {
  return `${currency} $${(Number(value) || 0).toFixed(2)}`;
}

function lineTotal(item) {
  const base = (Number(item.unit_price) || 0) * (Number(item.qty) || 1);
  const tax = base * ((Number(item.tax_rate) || 0) / 100);
  return base + tax - (Number(item.discount_amount) || 0);
}

function InvoiceLineItems({ items, currency }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="hidden grid-cols-[minmax(0,1fr)_48px_92px_92px] gap-2 bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid">
        <span>Item</span><span className="text-center">Qty</span><span className="text-right">Unit</span><span className="text-right">Total</span>
      </div>
      <ul className="divide-y divide-border">
        {items.map((item, index) => (
          <li key={`${item.description || "item"}-${index}`} className="grid gap-2 px-3 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_48px_92px_92px] sm:py-2">
            <span className="font-medium sm:font-normal">{item.description || "Line item"}</span>
            <span className="flex justify-between text-muted-foreground sm:block sm:text-center"><span className="sm:hidden">Quantity</span>{Number(item.qty) || 1}</span>
            <span className="flex justify-between text-muted-foreground sm:block sm:text-right"><span className="sm:hidden">Unit price</span>{money(item.unit_price, currency)}</span>
            <span className="flex justify-between font-semibold sm:block sm:text-right"><span className="sm:hidden">Line total</span>{money(lineTotal(item), currency)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * @param {{
 *  invoice: Record<string, any>,
 *  userId?: string,
 *  onChanged?: () => void,
 *  showRewards?: boolean,
 *  className?: string
 * }} props
 */
export default function CustomerInvoiceCard({
  invoice,
  userId,
  onChanged,
  showRewards = true,
  className,
}) {
  const isPaid = invoice.status === "paid";
  const isPayable = !["paid", "refunded", "cancelled", "void"].includes(invoice.status);
  const currency = invoice.currency || "AUD";

  return (
    <article className={cn("space-y-3 rounded-lg border border-border bg-background p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{invoice.number ? `Invoice ${invoice.number}` : "Invoice"}</h3>
          {invoice.paid_date ? <p className="mt-1 text-xs text-muted-foreground">Paid {new Date(invoice.paid_date).toLocaleDateString("en-AU")}</p> : null}
        </div>
        <StatusPill value={["issued", "unpaid"].includes(invoice.status) ? "outstanding" : invoice.status} kind="payment" />
      </div>

      {invoice.line_items?.length ? <InvoiceLineItems items={invoice.line_items} currency={currency} /> : null}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="text-sm font-medium">{isPaid ? "Amount paid" : "Amount due"}</span>
        <strong className="text-base">{money(invoice.amount, currency)}</strong>
      </div>

      {showRewards && userId && isPayable ? <RewardPicker invoice={invoice} userId={userId} onChanged={onChanged} /> : null}

      {isPayable ? <p className="text-xs text-muted-foreground">Due on receipt. Contact the workshop to arrange payment.</p> : null}
    </article>
  );
}
