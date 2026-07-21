import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Package, Wrench, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Mobile-first, iOS-friendly card for a single invoice line item.
// Large tap targets, stacked inputs on small screens, prominent remove button.
export default function InvoiceLineItemCard({ item, index, canEdit, hasInvoice, currency, onUpdate, onRemove, calculateLineTotal }) {
  const editable = canEdit && hasInvoice;
  const Icon = item.kind === "part" ? Package : Wrench;

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-3">
      {/* Header: icon + description + remove */}
      <div className="flex items-start gap-2">
        <span className="mt-2 shrink-0 text-muted-foreground"><Icon className="h-4 w-4" /></span>
        <div className="flex-1 min-w-0">
          {editable ? (
            <Input
              value={item.description}
              onChange={(e) => onUpdate(index, { description: e.target.value })}
              className="h-10 min-w-0"
              aria-label="Item description"
            />
          ) : (
            <p className="text-sm font-medium leading-snug pt-1.5">{item.description}</p>
          )}
        </div>
        {editable && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => onRemove(index)}
            className="shrink-0 h-10 w-10 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 active:bg-rose-100"
            aria-label={`Remove ${item.description}`}
            title="Remove this item"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Editable fields */}
      {editable && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Field label="Qty">
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={item.qty}
              onChange={(e) => onUpdate(index, { qty: e.target.value })}
              className="h-10 text-sm"
              aria-label="Quantity"
            />
          </Field>
          <Field label="Unit price">
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={item.unit_price}
              onChange={(e) => onUpdate(index, { unit_price: e.target.value, customer_unit_price: e.target.value })}
              className="h-10 text-sm"
              aria-label="Unit price"
            />
          </Field>
          <Field label="Tax %">
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={item.tax_rate}
              onChange={(e) => onUpdate(index, { tax_rate: e.target.value })}
              className="h-10 text-sm"
              aria-label="Tax rate"
            />
          </Field>
          <Field label="Discount">
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={item.discount_amount}
              onChange={(e) => onUpdate(index, { discount_amount: e.target.value })}
              className="h-10 text-sm"
              aria-label="Discount amount"
            />
          </Field>
        </div>
      )}

      {/* Cost hint for parts */}
      {canEdit && item.kind === "part" && (
        <p className="text-[11px] text-muted-foreground">
          Cost price {(Number(item.internal_cost_price) || 0).toFixed(2)} · Customer price {(Number(item.unit_price) || 0).toFixed(2)}
        </p>
      )}

      {/* Footer: line total + full-width remove on mobile */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
        <span className="text-xs text-muted-foreground">
          {item.qty} × {currency} {(Number(item.unit_price) || 0).toFixed(2)}
        </span>
        <span className="text-sm font-heading font-bold">
          {currency} {calculateLineTotal(item).toFixed(2)}
        </span>
      </div>

      {editable && (
        <Button
          variant="outline"
          onClick={() => onRemove(index)}
          className="w-full h-10 gap-2 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 active:bg-rose-100 sm:hidden"
          aria-label={`Remove ${item.description}`}
        >
          <Trash2 className="h-4 w-4" /> Remove item
        </Button>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}