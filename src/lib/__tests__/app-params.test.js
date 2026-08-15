import { describe, expect, it, vi } from "vitest";
import { resolveAppParams } from "@/lib/app-params";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, String(value))),
    removeItem: vi.fn((key) => values.delete(key)),
  };
}

describe("resolveAppParams", () => {
  it("uses build configuration and strips URL values that could poison bootstrap", () => {
    const location = {
      href: "https://ontherunelectrics.com.au/login?app_id=attacker&app_base_url=https%3A%2F%2Fevil.example&functions_version=old&access_token=callback-token&auth_state=expected-state&from_url=https%3A%2F%2Fevil.example#resume",
    };
    const history = { replaceState: vi.fn() };
    const storage = createStorage({ base44_functions_version: "stale" });
    const sessionStorage = createStorage({ otre_auth_callback_state: "expected-state" });

    const params = resolveAppParams({
      env: {
        VITE_BASE44_APP_ID: "trusted-app",
        VITE_BASE44_APP_BASE_URL: "https://ontherunelectrics.com.au/path?ignored=1",
        VITE_BASE44_FUNCTIONS_VERSION: "current",
      },
      location,
      history,
      storage,
      sessionStorage,
      title: "OTRE",
    });

    expect(params).toEqual({
      appId: "trusted-app",
      token: "callback-token",
      tokenFromUrl: true,
      fromUrl: "https://ontherunelectrics.com.au/login#resume",
      functionsVersion: "current",
      appBaseUrl: "https://ontherunelectrics.com.au",
    });
    expect(history.replaceState).toHaveBeenCalledWith({}, "OTRE", "/login#resume");
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).toHaveBeenCalledWith("base44_functions_version");
    expect(sessionStorage.removeItem).toHaveBeenCalledWith("otre_auth_callback_state");
  });

  it("rejects an unsolicited valid-looking URL token without a one-time callback state", () => {
    const storage = createStorage({ base44_access_token: "previous-token" });
    const sessionStorage = createStorage();
    const params = resolveAppParams({
      env: { VITE_BASE44_APP_ID: "trusted-app" },
      location: { href: "https://ontherunelectrics.com.au/portal?access_token=attacker-token" },
      history: { replaceState: vi.fn() },
      storage,
      sessionStorage,
    });

    expect(params.token).toBeNull();
    expect(params.tokenFromUrl).toBe(false);
    expect(storage.removeItem).toHaveBeenCalledWith("base44_access_token");
  });

  it("rejects non-HTTPS backend configuration", () => {
    const params = resolveAppParams({
      env: { VITE_BASE44_APP_ID: "trusted-app", VITE_BASE44_APP_BASE_URL: "javascript:alert(1)" },
      location: null,
    });
    expect(params.appBaseUrl).toBeUndefined();
  });

  it("clears both SDK token keys only when explicitly requested", () => {
    const storage = createStorage({ base44_access_token: "old", token: "old" });
    resolveAppParams({
      env: { VITE_BASE44_APP_ID: "trusted-app" },
      location: { href: "https://ontherunelectrics.com.au/?clear_access_token=true" },
      history: { replaceState: vi.fn() },
      storage,
    });
    expect(storage.removeItem).toHaveBeenCalledWith("base44_access_token");
    expect(storage.removeItem).toHaveBeenCalledWith("token");
  });

  it("restores a previously verified SDK token without accepting stored target overrides", () => {
    const storage = createStorage({
      base44_access_token: "verified-token",
      base44_app_id: "attacker-app",
      base44_app_base_url: "https://evil.example",
    });

    const params = resolveAppParams({
      env: {
        VITE_BASE44_APP_ID: "trusted-app",
        VITE_BASE44_APP_BASE_URL: "https://ontherunelectrics.com.au",
      },
      location: { href: "https://ontherunelectrics.com.au/portal" },
      history: { replaceState: vi.fn() },
      storage,
    });

    expect(params.token).toBe("verified-token");
    expect(params.tokenFromUrl).toBe(false);
    expect(params.appId).toBe("trusted-app");
    expect(params.appBaseUrl).toBe("https://ontherunelectrics.com.au");
  });
});
