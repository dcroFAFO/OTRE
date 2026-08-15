import { describe, expect, it, vi } from "vitest";

vi.mock("@/api/base44Client", () => ({ base44: {} }));
import {
  businessContactLinks,
  DEFAULT_APP_SETTINGS,
  DEFAULT_BUSINESS,
  safeNavigationHref,
} from "@/config/platformConfig";
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

  it("rejects unsafe public business URLs", () => {
    expect(toBusiness({
      website_url: "javascript:alert(1)",
      maps_url: "data:text/html,unsafe",
    })).toMatchObject({
      websiteUrl: DEFAULT_BUSINESS.websiteUrl,
      mapsUrl: "",
    });
    expect(businessContactLinks({
      email: "person@example.com?subject=Injected",
      phoneE164: "not-a-phone",
      mapsUrl: "javascript:alert(1)",
      address: "Safe address",
    })).toEqual({
      email: `mailto:${DEFAULT_BUSINESS.email}`,
      phone: `tel:${DEFAULT_BUSINESS.phoneE164}`,
      maps: "https://www.google.com/maps/search/?api=1&query=Safe%20address",
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

  it("drops unsafe navigation values while preserving allowlisted links", () => {
    const navLinks = [
      ...DEFAULT_APP_SETTINGS.landing.navLinks,
      { label: "Unsafe script", href: "javascript:alert(1)" },
      { label: "Unsafe data", href: "data:text/html,unsafe" },
      { label: "Unsafe host", href: "//evil.example/path" },
      { label: "Supplier", href: "https://escootnow.com.au/parts" },
    ];
    const links = toAppSettings({ app: { landing: { navLinks } } }).landing.navLinks;
    expect(links).toContainEqual({ label: "Supplier", href: "https://escootnow.com.au/parts" });
    expect(links.map((link) => link.label)).not.toContain("Unsafe script");
    expect(links.map((link) => link.label)).not.toContain("Unsafe data");
    expect(links.map((link) => link.label)).not.toContain("Unsafe host");
  });

  it.each([
    ["/about?from=nav#team", "/about?from=nav#team"],
    ["#services", "#services"],
    ["https://example.com/path", "https://example.com/path"],
    ["http://example.com/path", ""],
    ["javascript:alert(1)", ""],
    ["data:text/html,unsafe", ""],
    ["//evil.example/path", ""],
    ["/\\evil.example", ""],
  ])("normalizes public navigation href %s", (input, expected) => {
    expect(safeNavigationHref(input)).toBe(expected);
  });
});
