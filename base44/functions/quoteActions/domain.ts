export const CURRENCY = "AUD";
export const LABOUR_RATE = 80;
export const MIN_BILLABLE_HOURS = 1;
export const MIN_RECORDED_HOURS = 0.25;
export const PARTS_MARKUP_PERCENT = 20;
export const PARTS_MARKUP_MULTIPLIER = 1 + PARTS_MARKUP_PERCENT / 100;

export type QuoteLineItem = {
  description: string;
  qty: number;
  unit_price: number;
  customer_unit_price: number;
  customer_line_total: number;
  kind: "part" | "labour";
  is_custom_misc_part?: boolean;
  sku?: string;
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

export function positiveQuantity(value: unknown, minimum = 0.01): number {
  const parsed = finiteNumber(value, 1);
  return Math.max(minimum, parsed > 0 ? parsed : 1);
}

export function customerPriceFromCost(cost: unknown): number {
  return roundMoney(nonNegativeMoney(cost) * PARTS_MARKUP_MULTIPLIER);
}

export function normalizeLabourHours(hours: unknown): number {
  return Math.max(MIN_RECORDED_HOURS, finiteNumber(hours, 1));
}

export function labourChargeFromHours(hours: unknown): number {
  return roundMoney(Math.max(MIN_BILLABLE_HOURS, finiteNumber(hours)) * LABOUR_RATE);
}

export function buildQuotePartItems(parts: unknown): QuoteLineItem[] {
  return (Array.isArray(parts) ? parts : []).map((part) => {
    const input = part && typeof part === "object" ? part as Record<string, unknown> : {};
    const qty = positiveQuantity(input.qty);
    const costPrice = nonNegativeMoney(input.cost_price ?? input.price);
    const suppliedCustomerPrice = input.customer_price ?? input.typical_price;
    const customerUnitPrice = suppliedCustomerPrice == null
      ? customerPriceFromCost(costPrice)
      : nonNegativeMoney(suppliedCustomerPrice);

    return {
      description: String(input.name || input.description || "Part").trim() || "Part",
      qty,
      unit_price: customerUnitPrice,
      customer_unit_price: customerUnitPrice,
      customer_line_total: roundMoney(customerUnitPrice * qty),
      is_custom_misc_part: !!input.is_custom_misc_part,
      kind: "part",
      sku: String(input.sku || input.product_sku || input.product_code || ""),
    };
  });
}

export function buildLabourLineItem(hours: unknown): QuoteLineItem {
  const recordedHours = normalizeLabourHours(hours);
  const chargedHours = Math.max(MIN_BILLABLE_HOURS, recordedHours);
  const unitPrice = roundMoney(chargedHours * LABOUR_RATE);
  return {
    description: `Labour (${recordedHours}hr${recordedHours === 1 ? "" : "s"} @ $${LABOUR_RATE}/hr${chargedHours > recordedHours ? ", 1hr minimum" : ""})`,
    qty: 1,
    unit_price: unitPrice,
    customer_unit_price: unitPrice,
    customer_line_total: unitPrice,
    kind: "labour",
  };
}

export function summarizeQuoteLineItems(items: unknown): {
  parts_estimate: number;
  labour_estimate: number;
  total: number;
} {
  const lineItems = Array.isArray(items) ? items : [];
  const subtotalFor = (kind: string) => roundMoney(lineItems
    .filter((item) => item && typeof item === "object" && (item as Record<string, unknown>).kind === kind)
    .reduce((sum, item) => {
      const line = item as Record<string, unknown>;
      return sum + nonNegativeMoney(line.unit_price) * positiveQuantity(line.qty);
    }, 0));
  const parts_estimate = subtotalFor("part");
  const labour_estimate = subtotalFor("labour");
  return {
    parts_estimate,
    labour_estimate,
    total: roundMoney(parts_estimate + labour_estimate),
  };
}

export function prepareQuoteData(data: unknown): Record<string, unknown> {
  const input = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const prepared = { ...input };
  if (input.labour_hours != null && input.labour_hours !== "") {
    prepared.labour_estimate = labourChargeFromHours(input.labour_hours);
  } else {
    prepared.labour_estimate = nonNegativeMoney(input.labour_estimate);
  }
  prepared.parts_estimate = nonNegativeMoney(input.parts_estimate);
  prepared.total = roundMoney(
    finiteNumber(prepared.labour_estimate) + finiteNumber(prepared.parts_estimate),
  );
  return prepared;
}
