export const STORE_CURRENCY = "AUD";
export const MAX_CART_QUANTITY = 99;

export type OrderItem = {
  product_id: string;
  name: string;
  sku: string;
  qty: number;
  price: number;
};

function finiteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function roundMoney(value: unknown): number {
  return Math.round(finiteNumber(value) * 100) / 100;
}

export function toMinorUnits(value: unknown): number {
  return Math.round(roundMoney(value) * 100);
}

export function normalizeCartQuantity(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed) || parsed > MAX_CART_QUANTITY) {
    return null;
  }
  return parsed;
}

export function buildOrderItems(
  requestedItems: unknown,
  products: unknown,
): {
  ok: boolean;
  items: OrderItem[];
  total: number;
  amount: number;
  error?: string;
} {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    return { ok: false, items: [], total: 0, amount: 0, error: "Your cart is empty." };
  }

  const productById = new Map(
    (Array.isArray(products) ? products : [])
      .filter((product) => product && typeof product === "object")
      .map((product) => [String((product as Record<string, unknown>).id || ""), product as Record<string, unknown>]),
  );
  const quantities = new Map<string, number>();

  for (const requested of requestedItems) {
    const item = requested && typeof requested === "object" ? requested as Record<string, unknown> : {};
    const productId = String(item.product_id || "");
    const quantity = normalizeCartQuantity(item.qty);
    const product = productById.get(productId);
    const price = product ? finiteNumber(product.price) : 0;
    const currency = String(product?.currency || STORE_CURRENCY).toUpperCase();
    const available = !!product && product.active === true && product.in_stock !== false && price > 0 && currency === STORE_CURRENCY;
    if (!productId || quantity == null || !available) {
      return {
        ok: false,
        items: [],
        total: 0,
        amount: 0,
        error: "One or more products in your cart are unavailable. Please refresh the store and try again.",
      };
    }
    const combinedQuantity = (quantities.get(productId) || 0) + quantity;
    if (combinedQuantity > MAX_CART_QUANTITY) {
      return {
        ok: false,
        items: [],
        total: 0,
        amount: 0,
        error: `A maximum of ${MAX_CART_QUANTITY} units can be purchased per product.`,
      };
    }
    quantities.set(productId, combinedQuantity);
  }

  const items = Array.from(quantities, ([productId, qty]) => {
    const product = productById.get(productId)!;
    return {
      product_id: productId,
      name: String(product.name || "Product"),
      sku: String(product.sku || ""),
      qty,
      price: roundMoney(product.price),
    };
  });
  const total = roundMoney(items.reduce((sum, item) => sum + Number(item.qty) * Number(item.price), 0));
  const amount = toMinorUnits(total);
  if (amount <= 0) {
    return { ok: false, items: [], total: 0, amount, error: "Order total must be greater than zero." };
  }
  return { ok: true, items, total, amount };
}
