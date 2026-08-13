import { describe, expect, it, vi } from "vitest";
import { calculateRewardDiscount, issueReward } from "../../../base44/shared/rewardLifecycle.ts";

describe("reward lifecycle", () => {
  it("caps a referred customer's fixed first-invoice credit at the amount due", () => {
    expect(calculateRewardDiscount({ discount_type: "fixed", value: 10, max_discount: 10, applies_to: "first_invoice" }, { amount: 7.5 }))
      .toEqual({ baseAmount: 7.5, eligibleAmount: 7.5, discount: 7.5 });
  });

  it("applies loyalty discounts only to labour and caps them at $50", () => {
    const invoice = {
      amount: 900,
      line_items: [
        { description: "Workshop labour", qty: 10, unit_price: 80 },
        { description: "Brake pads", qty: 1, unit_price: 100 },
      ],
    };
    expect(calculateRewardDiscount({ discount_type: "percentage", value: 10, max_discount: 50, applies_to: "labour" }, invoice))
      .toEqual({ baseAmount: 900, eligibleAmount: 800, discount: 50 });
  });

  it("does not apply a labour reward to a parts-only invoice", () => {
    const invoice = { amount: 100, line_items: [{ description: "Tyre", qty: 1, unit_price: 100, kind: "part" }] };
    expect(calculateRewardDiscount({ discount_type: "percentage", value: 10, max_discount: 50, applies_to: "labour" }, invoice).discount).toBe(0);
  });

  it("uses the issuance key to return an existing reward instead of creating a duplicate", async () => {
    const existing = { id: "reward-1", idempotency_key: "loyalty:customer-1:1" };
    const db = {
      CustomerReward: {
        filter: vi.fn().mockResolvedValue([existing]),
        create: vi.fn(),
      },
    };
    const result = await issueReward(db, {
      customer: { id: "customer-1" },
      kind: "loyalty_labour_discount",
      idempotency_key: "loyalty:customer-1:1",
    });
    expect(result).toEqual({ reward: existing, created: false });
    expect(db.CustomerReward.create).not.toHaveBeenCalled();
  });
});
