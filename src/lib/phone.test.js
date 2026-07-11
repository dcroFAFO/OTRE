import { describe, expect, it } from "vitest";
import { AU_MOBILE_E164_PATTERN, normalizePhoneToE164 } from "./phone";

describe("normalizePhoneToE164", () => {
  it.each([
    ["0412 345 678", "+61412345678"],
    ["+61 412 345 678", "+61412345678"],
    ["61 412 345 678", "+61412345678"],
    ["(04) 1234 5678", "+61412345678"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhoneToE164(input)).toEqual({
      phone_e164: expected,
      phone_display: expected,
      is_valid: true,
    });
  });

  it.each(["", "07 1234 5678", "0412 345 67", "0412 345 6789"])("rejects %s", (input) => {
    expect(normalizePhoneToE164(input).is_valid).toBe(false);
  });

  it("exports the same validation rule used by normalization", () => {
    expect(AU_MOBILE_E164_PATTERN.test("+61412345678")).toBe(true);
    expect(AU_MOBILE_E164_PATTERN.test("+61712345678")).toBe(false);
  });
});
