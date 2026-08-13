import { describe, expect, it, vi } from "vitest";

vi.mock("@/api/base44Client", () => ({ base44: {} }));
import { DEFAULT_APP_SETTINGS, DEFAULT_BUSINESS } from "@/config/platformConfig";
import { toAppSettings, toBusiness } from "@/hooks/usePlatformConfig";

describe("platform configuration normalization", () => {
  it("uses the production business fallback when no profile is published", () => {
    expect(toBusiness(null)).toMatchObject({
      email: "info@ontherunelectrics.com.au",
      phone: "0415 505 908",
      address: "11 Lucinda Street, Woolloongabba QLD 4102",
      timezone: "Australia/Brisbane",
    });
  });

  it("maps additive BusinessProfile fields without losing fallback values", () => {
    expect(toBusiness({ business_name: "Workshop Test", phone_e164: "+61400000000", locality: "Test Suburb" })).toMatchObject({
      business_name: "Workshop Test",
      phoneE164: "+61400000000",
      locality: "Test Suburb",
      email: DEFAULT_BUSINESS.email,
    });
  });

  it("replaces incomplete legacy public navigation with the persistent route set", () => {
    const app = toAppSettings({ app: { landing: { navLinks: [{ label: "Services", href: "#services" }] } } });
    expect(app.landing.navLinks).toEqual(DEFAULT_APP_SETTINGS.landing.navLinks);
  });

  it("preserves a complete configured public navigation set", () => {
    const navLinks = DEFAULT_APP_SETTINGS.landing.navLinks.map((link) => ({ ...link, label: `${link.label}!` }));
    expect(toAppSettings({ app: { landing: { navLinks } } }).landing.navLinks).toEqual(navLinks);
  });
});
