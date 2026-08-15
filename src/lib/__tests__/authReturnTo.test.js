import { describe, expect, it } from "vitest";
import { sanitizeReturnTarget } from "@/lib/authReturnTo";

const ORIGIN = "https://ontherunelectrics.com.au";

describe("sanitizeReturnTarget", () => {
  it.each([
    ["https://evil.example/phish", "/"],
    ["//evil.example/phish", "/"],
    ["/\\evil.example/phish", "/"],
    ["javascript:alert(1)", "/"],
  ])("rejects unsafe return target %s", (value, expected) => {
    expect(sanitizeReturnTarget(value, ORIGIN)).toBe(expected);
  });

  it("preserves safe same-origin flow state while removing bootstrap parameters", () => {
    const result = sanitizeReturnTarget(
      "/oauth/consent?ctx=opaque&app_id=evil&access_token=evil&from_url=https%3A%2F%2Fevil.example#grant",
      ORIGIN,
    );
    expect(result).toBe("/oauth/consent?ctx=opaque#grant");
  });
});
