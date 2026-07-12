import React from "react";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BillingPanel from "./BillingPanel";

const mocks = vi.hoisted(() => ({
  jobParts: vi.fn((/** @type {any} */ _props) => null),
  quote: vi.fn((/** @type {any} */ _props) => null),
}));

vi.mock("./JobPartsPanel", () => ({ default: mocks.jobParts }));
vi.mock("./QuotePanel", () => ({ default: mocks.quote }));

describe("BillingPanel permissions", () => {
  beforeEach(() => {
    mocks.jobParts.mockClear();
    mocks.quote.mockClear();
  });

  it("keeps quote and invoice edit policies independent", () => {
    render(
      <BillingPanel
        job={{ id: "job-1" }}
        canEdit
        quoteReadOnly={false}
        invoiceReadOnly
      />,
    );

    expect(mocks.quote.mock.calls[0][0]).toEqual(
      expect.objectContaining({ canEdit: true, invoiceCanEdit: false }),
    );
  });

  it("allows both controls when neither record is read-only", () => {
    render(
      <BillingPanel
        job={{ id: "job-1" }}
        canEdit
        quoteReadOnly={false}
        invoiceReadOnly={false}
      />,
    );

    expect(mocks.quote.mock.calls[0][0]).toEqual(
      expect.objectContaining({ canEdit: true, invoiceCanEdit: true }),
    );
  });
});
