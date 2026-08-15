import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RewardStatusBadge from "@/components/portal/rewards/RewardStatusBadge";

describe("RewardStatusBadge", () => {
  it("uses customer-facing status labels", () => {
    const { rerender } = render(<RewardStatusBadge status="locked" />);
    expect(screen.getByText("Locked for processing")).toBeInTheDocument();
    rerender(<RewardStatusBadge status="redeemed" />);
    expect(screen.getByText("Used")).toBeInTheDocument();
  });
});
