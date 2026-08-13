import { getSafeErrorMessage, shouldRetryQuery } from "@/lib/errors";

describe("safe query errors", () => {
  it.each([401, 403, 404])("does not retry status %s", (status) => {
    expect(shouldRetryQuery(0, { response: { status } })).toBe(false);
  });

  it("retries transient failures at most twice", () => {
    expect(shouldRetryQuery(0, { response: { status: 503 } })).toBe(true);
    expect(shouldRetryQuery(1, { response: { status: 503 } })).toBe(true);
    expect(shouldRetryQuery(2, { response: { status: 503 } })).toBe(false);
  });

  it("does not expose server details", () => {
    const error = { response: { status: 500, data: { error: "Database password leaked" } } };
    expect(getSafeErrorMessage(error)).toBe("Something went wrong. Please try again.");
  });
});

