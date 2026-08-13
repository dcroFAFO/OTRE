import { describe, expect, it } from "vitest";
import { DEFAULT_BUSINESS } from "@/config/platformConfig";
import { getLocalBusinessSchema, getStoreSchema } from "@/lib/structuredData";

describe("public structured data", () => {
  it("uses authoritative Brisbane business details", () => {
    const schema = getLocalBusinessSchema(DEFAULT_BUSINESS, []);
    expect(schema).toMatchObject({
      "@type": "AutoRepair",
      email: "info@ontherunelectrics.com.au",
      telephone: "+61415505908",
      address: {
        streetAddress: "11 Lucinda Street",
        addressLocality: "Woolloongabba",
        addressRegion: "QLD",
        postalCode: "4102",
      },
    });
    expect(schema.openingHoursSpecification[0]).toMatchObject({ opens: "11:00", closes: "23:59" });
  });

  it("keeps the store schema type after merging business data", () => {
    expect(getStoreSchema(DEFAULT_BUSINESS)["@type"]).toBe("Store");
  });
});
