// @vitest-environment node
import { describe, expect, it } from "vitest";
import { evaluateDiagnosticBudget } from "../../scripts/lib/diagnostic-budget.mjs";

const budget = {
  maxTotal: 3,
  categories: { existing: 2, second: 1 },
};

describe("diagnostic quality budget", () => {
  it("accepts the recorded baseline", () => {
    expect(evaluateDiagnosticBudget({ existing: 2, second: 1 }, budget)).toMatchObject({
      ok: true,
      currentTotal: 3,
    });
  });

  it("accepts reductions", () => {
    expect(evaluateDiagnosticBudget({ existing: 1 }, budget)).toMatchObject({
      ok: true,
      currentTotal: 1,
    });
  });

  it("rejects an increase within an existing category", () => {
    expect(evaluateDiagnosticBudget({ existing: 3 }, budget)).toMatchObject({
      ok: false,
      issues: expect.arrayContaining(["existing has 3, budget 2"]),
    });
  });

  it("rejects a new diagnostic category", () => {
    expect(evaluateDiagnosticBudget({ existing: 1, new_error: 1 }, budget)).toMatchObject({
      ok: false,
      issues: expect.arrayContaining(["new_error has 1, budget 0"]),
    });
  });

  it("rejects an internally inconsistent budget", () => {
    expect(evaluateDiagnosticBudget({}, { maxTotal: 2, categories: { existing: 1 } })).toMatchObject({
      ok: false,
      issues: expect.arrayContaining(["category budgets total 1, expected 2"]),
    });
  });
});
