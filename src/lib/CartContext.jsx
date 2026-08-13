import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const CART_STORAGE_KEY = "otre-cart:v1";
const CART_VERSION = 1;
const CartContext = createContext(null);

const emptyCart = () => ({
  version: CART_VERSION,
  items: [],
  checkoutAttemptId: "",
  checkoutFingerprint: "",
});

function normaliseQuantity(value) {
  return Math.min(99, Math.max(1, Math.floor(Number(value) || 1)));
}

function productSnapshot(product) {
  return {
    id: product.id,
    name: product.name || "Product",
    price: Number(product.price) || 0,
    image_url: product.image_url || "",
    sku: product.sku || "",
    category_key: product.category_key || "",
    active: product.active !== false,
  };
}

function cartFingerprint(items) {
  return items
    .map((item) => `${item.product.id}:${normaliseQuantity(item.qty)}`)
    .sort()
    .join("|");
}

function readStoredCart() {
  if (typeof window === "undefined") return emptyCart();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || "null");
    if (parsed?.version !== CART_VERSION || !Array.isArray(parsed.items)) return emptyCart();
    const items = parsed.items
      .filter((item) => item?.product?.id && item?.product?.name)
      .map((item) => ({ product: productSnapshot(item.product), qty: normaliseQuantity(item.qty) }));
    const fingerprint = cartFingerprint(items);
    return {
      version: CART_VERSION,
      items,
      checkoutAttemptId: parsed.checkoutFingerprint === fingerprint ? String(parsed.checkoutAttemptId || "") : "",
      checkoutFingerprint: parsed.checkoutFingerprint === fingerprint ? fingerprint : "",
    };
  } catch {
    return emptyCart();
  }
}

function newAttemptId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/** @param {{ children: React.ReactNode }} props */
export function CartProvider({ children }) {
  const [cart, setCart] = useState(readStoredCart);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Storage can be disabled; the in-memory cart remains usable.
    }
  }, [cart]);

  const updateItems = useCallback((updater) => {
    setCart((current) => ({
      ...current,
      items: updater(current.items),
      checkoutAttemptId: "",
      checkoutFingerprint: "",
    }));
  }, []);

  const addItem = useCallback((product, qty = 1) => {
    if (!product?.id || product.active === false) return;
    updateItems((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (existing) {
        return items.map((item) => item.product.id === product.id
          ? { product: productSnapshot(product), qty: normaliseQuantity(item.qty + qty) }
          : item);
      }
      return [...items, { product: productSnapshot(product), qty: normaliseQuantity(qty) }];
    });
  }, [updateItems]);

  const updateQty = useCallback((productId, qty) => {
    updateItems((items) => qty <= 0
      ? items.filter((item) => item.product.id !== productId)
      : items.map((item) => item.product.id === productId ? { ...item, qty: normaliseQuantity(qty) } : item));
  }, [updateItems]);

  const removeItem = useCallback((productId) => {
    updateItems((items) => items.filter((item) => item.product.id !== productId));
  }, [updateItems]);

  const clear = useCallback(() => setCart(emptyCart()), []);

  const reconcile = useCallback((products) => {
    const currentById = new Map((products || []).filter((product) => product?.id && product.active !== false).map((product) => [product.id, product]));
    setCart((current) => {
      const items = current.items
        .filter((item) => currentById.has(item.product.id))
        .map((item) => ({ product: productSnapshot(currentById.get(item.product.id)), qty: normaliseQuantity(item.qty) }));
      const previousFingerprint = cartFingerprint(current.items);
      const nextFingerprint = cartFingerprint(items);
      const productsChanged = JSON.stringify(items) !== JSON.stringify(current.items);
      if (!productsChanged) return current;
      return {
        ...current,
        items,
        checkoutAttemptId: previousFingerprint === nextFingerprint ? current.checkoutAttemptId : "",
        checkoutFingerprint: previousFingerprint === nextFingerprint ? current.checkoutFingerprint : "",
      };
    });
  }, []);

  const beginCheckoutAttempt = useCallback(() => {
    const fingerprint = cartFingerprint(cart.items);
    if (cart.checkoutAttemptId && cart.checkoutFingerprint === fingerprint) return cart.checkoutAttemptId;
    const checkoutAttemptId = newAttemptId();
    setCart((current) => ({ ...current, checkoutAttemptId, checkoutFingerprint: fingerprint }));
    return checkoutAttemptId;
  }, [cart]);

  const releaseCheckoutAttempt = useCallback((attemptId) => {
    setCart((current) => current.checkoutAttemptId && current.checkoutAttemptId === attemptId
      ? { ...current, checkoutAttemptId: "", checkoutFingerprint: "" }
      : current);
  }, []);

  const clearAfterVerifiedCheckout = useCallback((attemptId) => {
    setCart((current) => current.checkoutAttemptId && current.checkoutAttemptId === attemptId ? emptyCart() : current);
  }, []);

  const count = useMemo(() => cart.items.reduce((sum, item) => sum + item.qty, 0), [cart.items]);
  const subtotal = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.qty * (Number(item.product.price) || 0), 0),
    [cart.items]
  );

  const value = useMemo(() => ({
    items: cart.items,
    checkoutAttemptId: cart.checkoutAttemptId,
    addItem,
    updateQty,
    removeItem,
    clear,
    reconcile,
    beginCheckoutAttempt,
    releaseCheckoutAttempt,
    clearAfterVerifiedCheckout,
    count,
    subtotal,
  }), [cart.items, cart.checkoutAttemptId, addItem, updateQty, removeItem, clear, reconcile, beginCheckoutAttempt, releaseCheckoutAttempt, clearAfterVerifiedCheckout, count, subtotal]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
