// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  customerPriceFromCost,
  invoiceLineTotal,
  invoiceTotal,
  normalizeInvoiceLineItems,
  resolveInvoiceAmount,
  usageToInvoiceLineItem,
} from "../../base44/functions/invoiceActions/domain";

describe("invoice action domain rules", () => {
  it("normalizes line items without persisting internal costing metadata", () => {
    const [item] = normalizeInvoiceLineItems([{
      description: "Brake labour",
      qty: 2,
      unit_price: 10,
      customer_unit_price: 11,
      internal_cost_price: 4,
      markup_percentage: 20,
      staff_notes: "Internal note",
      tax_rate: 10,
      discount_amount: 3,
      kind: "labour",
      sku: "LAB-1",
    }]);
    expect(item).toMatchObject({
      description: "Brake labour",
      qty: 2,
      unit_price: 10,
      customer_unit_price: 11,
      customer_line_total: 20,
      tax_rate: 10,
      discount_amount: 3,
      kind: "labour",
      sku: "LAB-1",
    });
    expect(item).not.toHaveProperty("internal_cost_price");
    expect(item).not.toHaveProperty("markup_percentage");
    expect(item).not.toHaveProperty("staff_notes");
  });

  it("neutralizes negative quantities and prices", () => {
    const [item] = normalizeInvoiceLineItems([{ qty: -2, unit_price: -10 }]);
    expect(item.qty).toBe(1);
    expect(item.unit_price).toBe(0);
    expect(item.customer_line_total).toBe(0);
  });

  it("caps discounts so a line cannot become negative", () => {
    const [item] = normalizeInvoiceLineItems([{ qty: 2, unit_price: 10, tax_rate: 10, discount_amount: 999 }]);
    expect(item.discount_amount).toBe(22);
    expect(invoiceLineTotal(item)).toBe(0);
  });

  it("calculates tax and discount totals", () => {
    expect(invoiceLineTotal({ qty: 2, unit_price: 10, tax_rate: 10, discount_amount: 3 })).toBe(19);
    expect(invoiceTotal([
      { qty: 2, unit_price: 10, tax_rate: 10, discount_amount: 3 },
      { qty: 1, unit_price: 5 },
    ])).toBe(24);
  });

  it("uses a safe fallback only when line items have no value", () => {
    expect(resolveInvoiceAmount([], 12.345)).toBe(12.35);
    expect(resolveInvoiceAmount([{ qty: 1, unit_price: 5 }], 99)).toBe(5);
    expect(resolveInvoiceAmount([], -5)).toBe(0);
  });

  it("applies markup to usage cost when no positive sell price exists", () => {
    expect(customerPriceFromCost(10)).toBe(12);
    expect(usageToInvoiceLineItem({ id: "usage-1", item_name: "Pad", unit_cost: 10, unit_sell: -1, qty_used: 2 })).toMatchObject({
      source_usage_id: "usage-1",
      description: "Pad",
      qty: 2,
      unit_price: 12,
      customer_line_total: 24,
      kind: "part",
    });
  });

  it("uses a supplied positive sell price for usage records", () => {
    expect(usageToInvoiceLineItem({ unit_cost: 10, unit_sell: 15, qty_used: 1 }).unit_price).toBe(15);
  });
});
