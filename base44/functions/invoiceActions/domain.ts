export const PREFIX = "INV";
export const CURRENCY = "AUD";
export const DEFAULT_STATUS = "outstanding";
export const INTERNAL_VISIBILITY = "internal";
export const CUSTOMER_VISIBILITY = "customer_visible";
export const PARTS_MARKUP_PERCENT = 20;
export const PARTS_MARKUP_MULTIPLIER = 1 + PARTS_MARKUP_PERCENT / 100;

export type InvoiceLineItem = {
  description: string;
  qty: number;
  unit_price: number;
  customer_unit_price: number;
  customer_line_total: number;
  is_custom_misc_part: boolean;
  tax_rate: number;
  discount_amount: number;
  kind: string;
  category: string;
  sku: string;
  source_usage_id: string;
};

export function finiteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function roundMoney(value: unknown): number {
  return Math.round(finiteNumber(value) * 100) / 100;
}

export function nonNegativeMoney(value: unknown): number {
  return roundMoney(Math.max(0, finiteNumber(value)));
}

export function positiveQuantity(value: unknown): number {
  const parsed = finiteNumber(value, 1);
  return Math.max(0.01, parsed > 0 ? parsed : 1);
}

export function customerPriceFromCost(cost: unknown): number {
  return roundMoney(nonNegativeMoney(cost) * PARTS_MARKUP_MULTIPLIER);
}

export function normalizeInvoiceLineItems(items: unknown): InvoiceLineItem[] {
  return (Array.isArray(items) ? items : []).map((item) => {
    const input = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const qty = positiveQuantity(input.qty ?? input.quantity);
    const unitPrice = nonNegativeMoney(input.unit_price ?? input.customer_unit_price);
    const taxRate = nonNegativeMoney(input.tax_rate);
    const gross = unitPrice * qty * (1 + taxRate / 100);
    const discountAmount = Math.min(nonNegativeMoney(input.discount_amount), roundMoney(gross));
    const customerUnitPrice = nonNegativeMoney(input.customer_unit_price ?? unitPrice);

    return {
      description: String(input.description || "Line item").trim() || "Line item",
      qty,
      unit_price: unitPrice,
      customer_unit_price: customerUnitPrice,
      customer_line_total: roundMoney(unitPrice * qty),
      is_custom_misc_part: !!input.is_custom_misc_part,
      tax_rate: taxRate,
      discount_amount: discountAmount,
      kind: String(input.kind || "item"),
      category: String(input.category || input.kind || "item"),
      sku: String(input.sku || ""),
      source_usage_id: String(input.source_usage_id || ""),
    };
  });
}

export function invoiceLineTotal(item: Record<string, unknown>): number {
  const qty = positiveQuantity(item.qty);
  const unitPrice = nonNegativeMoney(item.unit_price);
  const base = qty * unitPrice;
  const tax = base * (nonNegativeMoney(item.tax_rate) / 100);
  const discount = nonNegativeMoney(item.discount_amount);
  return roundMoney(Math.max(0, base + tax - discount));
}

export function invoiceTotal(items: unknown): number {
  return roundMoney(normalizeInvoiceLineItems(items)
    .reduce((sum, item) => sum + invoiceLineTotal(item), 0));
}

export function resolveInvoiceAmount(items: unknown, fallbackAmount: unknown): number {
  const calculated = invoiceTotal(items);
  return calculated > 0 ? calculated : nonNegativeMoney(fallbackAmount);
}

export function usageToInvoiceLineItem(usage: Record<string, unknown>): InvoiceLineItem {
  const qty = positiveQuantity(usage.qty_used);
  const suppliedSell = finiteNumber(usage.unit_sell, Number.NaN);
  const customerUnitPrice = Number.isFinite(suppliedSell) && suppliedSell > 0
    ? roundMoney(suppliedSell)
    : customerPriceFromCost(usage.unit_cost);
  return {
    description: String(usage.item_name || "Part"),
    qty,
    unit_price: customerUnitPrice,
    customer_unit_price: customerUnitPrice,
    customer_line_total: roundMoney(customerUnitPrice * qty),
    is_custom_misc_part: !!usage.is_custom_misc_part,
    tax_rate: 0,
    discount_amount: 0,
    kind: "part",
    category: "part",
    sku: String(usage.product_sku || usage.item_id || ""),
    source_usage_id: String(usage.id || ""),
  };
}
