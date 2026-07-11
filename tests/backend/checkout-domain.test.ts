// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateInvoiceCheckout } from "../../base44/functions/createInvoiceCheckout/domain";
import {
  buildOrderItems,
  MAX_CART_QUANTITY,
  normalizeCartQuantity,
} from "../../base44/functions/createStoreCheckout/domain";

const product = (overrides = {}) => ({
  id: "product-1",
  name: "Brake pads",
  sku: "BP-1",
  price: 10,
  currency: "AUD",
  active: true,
  in_stock: true,
  ...overrides,
});

describe("invoice checkout rules", () => {
  it.each(["paid", "refunded", "cancelled", "void", "PAID"])("blocks %s invoices", (status) => {
    expect(validateInvoiceCheckout({ status, amount: 10 })).toMatchObject({
      ok: false,
      error: "This invoice cannot be paid online.",
    });
  });

  it("converts a payable invoice to integer minor units", () => {
    expect(validateInvoiceCheckout({ status: "outstanding", amount: 104.125 })).toEqual({ ok: true, amount: 10413 });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid amount %s", (amount) => {
    expect(validateInvoiceCheckout({ status: "outstanding", amount })).toMatchObject({
      ok: false,
      error: "Invoice amount must be greater than zero.",
    });
  });
});

describe("store checkout rules", () => {
  it("rejects an empty cart", () => {
    expect(buildOrderItems([], [])).toMatchObject({ ok: false, error: "Your cart is empty." });
  });

  it("uses server product data and combines duplicate cart rows", () => {
    const result = buildOrderItems([
      { product_id: "product-1", qty: 2, price: 0.01 },
      { product_id: "product-1", qty: 3, price: 0.01 },
    ], [product()]);
    expect(result).toEqual({
      ok: true,
      items: [{ product_id: "product-1", name: "Brake pads", sku: "BP-1", qty: 5, price: 10 }],
      total: 50,
      amount: 5000,
    });
  });

  it.each([
    product({ active: false }),
    product({ in_stock: false }),
    product({ price: 0 }),
    product({ currency: "USD" }),
  ])("rejects unavailable product state %#", (unavailableProduct) => {
    expect(buildOrderItems([{ product_id: "product-1", qty: 1 }], [unavailableProduct])).toMatchObject({
      ok: false,
      error: "One or more products in your cart are unavailable. Please refresh the store and try again.",
    });
  });

  it("rejects product ids that are not in the server result", () => {
    expect(buildOrderItems([{ product_id: "missing", qty: 1 }], [product()]).ok).toBe(false);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, MAX_CART_QUANTITY + 1])("rejects invalid quantity %s", (qty) => {
    expect(normalizeCartQuantity(qty)).toBeNull();
  });

  it("rejects duplicate rows whose combined quantity exceeds the maximum", () => {
    expect(buildOrderItems([
      { product_id: "product-1", qty: MAX_CART_QUANTITY },
      { product_id: "product-1", qty: 1 },
    ], [product()])).toMatchObject({
      ok: false,
      error: `A maximum of ${MAX_CART_QUANTITY} units can be purchased per product.`,
    });
  });

  it("rounds server prices consistently for the order and Stripe amount", () => {
    expect(buildOrderItems([{ product_id: "product-1", qty: 3 }], [product({ price: 10.126 })])).toMatchObject({
      ok: true,
      total: 30.39,
      amount: 3039,
      items: [{ price: 10.13, qty: 3 }],
    });
  });
});
