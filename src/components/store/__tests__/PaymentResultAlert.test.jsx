import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PaymentResultAlert from "@/components/store/PaymentResultAlert";

describe("PaymentResultAlert", () => {
  it("announces server verification without claiming success early", () => {
    render(<PaymentResultAlert status="verifying" />);
    expect(screen.getByRole("status")).toHaveTextContent("Verifying payment");
    expect(screen.queryByText("Payment confirmed")).not.toBeInTheDocument();
  });

  it("explains that cancellation keeps the cart", () => {
    render(<PaymentResultAlert status="cancelled" />);
    expect(screen.getByRole("alert")).toHaveTextContent("your cart has been kept");
  });
});
