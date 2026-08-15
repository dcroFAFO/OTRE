import { describe, expect, it } from "vitest";
import { INDEXABLE_STATIC_PATHS, ROUTE_ACCESS, ROUTE_MANIFEST } from "@/config/routeManifest";
import { lazyPages } from "@/routes/lazyPages";

describe("route manifest", () => {
  it("has unique ids and paths", () => {
    expect(new Set(ROUTE_MANIFEST.map((route) => route.id)).size).toBe(ROUTE_MANIFEST.length);
    expect(new Set(ROUTE_MANIFEST.map((route) => route.path)).size).toBe(ROUTE_MANIFEST.length);
  });

  it("never marks authenticated or staff routes as indexable", () => {
    const privateIndexable = ROUTE_MANIFEST.filter(
      (route) => route.access !== ROUTE_ACCESS.PUBLIC && route.indexable,
    );
    expect(privateIndexable).toEqual([]);
  });

  it("maps every non-redirect route to a lazy page", () => {
    const missing = ROUTE_MANIFEST.filter((route) => !route.redirectTo && !lazyPages[route.page]);
    expect(missing).toEqual([]);
  });

  it("keeps private and sensitive public flows out of static indexable paths", () => {
    expect(INDEXABLE_STATIC_PATHS).not.toContain("/portal");
    expect(INDEXABLE_STATIC_PATHS).not.toContain("/dashboard");
    expect(INDEXABLE_STATIC_PATHS).not.toContain("/book/guest");
    expect(INDEXABLE_STATIC_PATHS).not.toContain("/track/:jobId");
  });
});
