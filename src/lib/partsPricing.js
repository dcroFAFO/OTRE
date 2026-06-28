export const PARTS_MARKUP_PERCENT = 20;
export const PARTS_MARKUP_MULTIPLIER = 1 + PARTS_MARKUP_PERCENT / 100;

export function moneyNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundMoney(value) {
  return Math.round(moneyNumber(value) * 100) / 100;
}

export function customerUnitPriceFromCost(costPrice) {
  return roundMoney(moneyNumber(costPrice) * PARTS_MARKUP_MULTIPLIER);
}

export function getUsageCustomerUnitPrice(usage = {}) {
  const sell = Number(usage.unit_sell);
  if (Number.isFinite(sell) && sell > 0) return roundMoney(sell);
  return customerUnitPriceFromCost(usage.unit_cost || 0);
}

export function getUsageLineTotal(usage = {}) {
  return roundMoney(getUsageCustomerUnitPrice(usage) * (Number(usage.qty_used) || 1));
}