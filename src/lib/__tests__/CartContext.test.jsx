import { useState } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CART_STORAGE_KEY, CartProvider, useCart } from "@/lib/CartContext";

const product = { id: "product-1", name: "Brake pads", price: 25, image_url: "", sku: "BP-1", active: true };

function CartHarness({ products = [product] }) {
  const cart = useCart();
  const [attemptId, setAttemptId] = useState("");
  return (
    <div>
      <p>Count {cart.count}</p>
      <p>Subtotal {cart.subtotal}</p>
      <p>Attempt {attemptId}</p>
      <button onClick={() => cart.addItem(product, 2)}>Add</button>
      <button onClick={() => cart.reconcile(products)}>Reconcile</button>
      <button onClick={() => setAttemptId(cart.beginCheckoutAttempt())}>Begin</button>
      <button onClick={() => cart.releaseCheckoutAttempt(attemptId)}>Cancel attempt</button>
      <button onClick={() => cart.clearAfterVerifiedCheckout("wrong-attempt")}>Clear wrong</button>
      <button onClick={() => cart.clearAfterVerifiedCheckout(attemptId)}>Clear verified</button>
    </div>
  );
}

describe("CartProvider", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("persists a versioned cart and restores it after remount", async () => {
    const user = userEvent.setup();
    const first = render(<CartProvider><CartHarness /></CartProvider>);
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByText("Count 2")).toBeInTheDocument();

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY));
      expect(stored.version).toBe(1);
      expect(stored.items).toHaveLength(1);
    });

    first.unmount();
    render(<CartProvider><CartHarness /></CartProvider>);
    expect(screen.getByText("Count 2")).toBeInTheDocument();
    expect(screen.getByText("Subtotal 50")).toBeInTheDocument();
  });

  it("reconciles stored products against the current active catalogue", async () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
      version: 1,
      items: [
        { product: { ...product, price: 5 }, qty: 2 },
        { product: { id: "inactive", name: "Inactive item", price: 10, active: true }, qty: 1 },
      ],
      checkoutAttemptId: "",
      checkoutFingerprint: "",
    }));
    const user = userEvent.setup();
    render(<CartProvider><CartHarness products={[{ ...product, price: 30 }]} /></CartProvider>);

    expect(screen.getByText("Count 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reconcile" }));
    expect(screen.getByText("Count 2")).toBeInTheDocument();
    expect(screen.getByText("Subtotal 60")).toBeInTheDocument();
  });

  it("keeps items on cancellation and clears only a matching verified attempt", async () => {
    const user = userEvent.setup();
    render(<CartProvider><CartHarness /></CartProvider>);
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Begin" }));
    expect(screen.getByText(/Attempt (?!$).+/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear wrong" }));
    expect(screen.getByText("Count 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel attempt" }));
    expect(screen.getByText("Count 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Begin" }));
    await user.click(screen.getByRole("button", { name: "Clear verified" }));
    expect(screen.getByText("Count 0")).toBeInTheDocument();
  });
});
