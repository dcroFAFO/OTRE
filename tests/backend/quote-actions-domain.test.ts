// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildLabourLineItem,
  buildQuotePartItems,
  customerPriceFromCost,
  labourChargeFromHours,
  normalizeLabourHours,
  positiveQuantity,
  prepareQuoteData,
  roundMoney,
  summarizeQuoteLineItems,
} from "../../base44/functions/quoteActions/domain";

describe("quote action domain rules", () => {
  it("rounds finite money and neutralizes invalid values", () => {
    expect(roundMoney(10.126)).toBe(10.13);
    expect(roundMoney("4.2")).toBe(4.2);
    expect(roundMoney(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("applies the configured parts markup", () => {
    expect(customerPriceFromCost(10)).toBe(12);
    expect(customerPriceFromCost(10.01)).toBe(12.01);
    expect(customerPriceFromCost(-5)).toBe(0);
  });

  it("normalizes quote quantities to positive values", () => {
    expect(positiveQuantity(2.5)).toBe(2.5);
    expect(positiveQuantity(0)).toBe(1);
    expect(positiveQuantity(-2)).toBe(1);
  });

  it("builds safe part line items from submitted parts", () => {
    const [item] = buildQuotePartItems([{ name: "Brake pad", qty: 2, cost_price: 10, sku: "BP-1" }]);
    expect(item).toMatchObject({
      description: "Brake pad",
      qty: 2,
      unit_price: 12,
      customer_line_total: 24,
      kind: "part",
      sku: "BP-1",
    });
    expect(item).not.toHaveProperty("internal_cost_price");
    expect(item).not.toHaveProperty("markup_percentage");
  });

  it("honors an explicit non-negative customer price", () => {
    const [freeItem] = buildQuotePartItems([{ name: "Warranty part", cost_price: 50, customer_price: 0 }]);
    expect(freeItem.unit_price).toBe(0);
    expect(freeItem.customer_line_total).toBe(0);
  });

  it("enforces recorded and billable labour minimums", () => {
    expect(normalizeLabourHours(0)).toBe(0.25);
    expect(labourChargeFromHours(0.25)).toBe(80);
    expect(labourChargeFromHours(1.5)).toBe(120);
    expect(buildLabourLineItem(0.25)).toMatchObject({ qty: 1, unit_price: 80, kind: "labour" });
    expect(buildLabourLineItem(0.25).description).toContain("1hr minimum");
  });

  it("summarizes parts and labour with currency rounding", () => {
    expect(summarizeQuoteLineItems([
      { kind: "part", qty: 2, unit_price: 12.345 },
      { kind: "labour", qty: 1, unit_price: 80 },
      { kind: "note", qty: 100, unit_price: 100 },
    ])).toEqual({
      parts_estimate: 24.7,
      labour_estimate: 80,
      total: 104.7,
    });
  });

  it("prepares quote totals without mutating input", () => {
    const input = { labour_hours: 0.5, parts_estimate: 24.125, diagnosis_notes: "Worn pads" };
    const prepared = prepareQuoteData(input);
    expect(prepared).toMatchObject({ labour_estimate: 80, parts_estimate: 24.13, total: 104.13 });
    expect(input).toEqual({ labour_hours: 0.5, parts_estimate: 24.125, diagnosis_notes: "Worn pads" });
  });

  it("clamps negative estimate inputs", () => {
    expect(prepareQuoteData({ labour_estimate: -20, parts_estimate: -5 })).toMatchObject({
      labour_estimate: 0,
      parts_estimate: 0,
      total: 0,
    });
  });
});
