export const BLOCKING_PAYMENT_STATUSES = new Set(["paid", "refunded", "cancelled", "void"]);

export function toMinorUnits(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

export function validateInvoiceCheckout(invoice: Record<string, unknown> = {}): {
  ok: boolean;
  amount: number;
  error?: string;
} {
  const status = String(invoice.status || "").trim().toLowerCase();
  if (BLOCKING_PAYMENT_STATUSES.has(status)) {
    return { ok: false, amount: 0, error: "This invoice cannot be paid online." };
  }
  const amount = toMinorUnits(invoice.amount);
  if (amount <= 0) {
    return { ok: false, amount, error: "Invoice amount must be greater than zero." };
  }
  return { ok: true, amount };
}
