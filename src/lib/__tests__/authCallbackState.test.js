import { describe, expect, it, vi } from "vitest";
import { AUTH_CALLBACK_STATE_KEY, createAuthCallbackTarget } from "@/lib/authCallbackState";

describe("createAuthCallbackTarget", () => {
  it("binds provider login to a same-tab nonce and sanitized local return target", () => {
    const sessionStorage = { setItem: vi.fn() };
    const target = new URL(createAuthCallbackTarget("/portal?tab=jobs", {
      origin: "https://ontherunelectrics.com.au",
      sessionStorage,
      randomUUID: () => "nonce-123",
    }));

    expect(sessionStorage.setItem).toHaveBeenCalledWith(AUTH_CALLBACK_STATE_KEY, "nonce-123");
    expect(target.origin).toBe("https://ontherunelectrics.com.au");
    expect(target.pathname).toBe("/login");
    expect(target.searchParams.get("auth_state")).toBe("nonce-123");
    expect(target.searchParams.get("next")).toBe("/portal?tab=jobs");
  });

  it("does not carry an external return target into the callback", () => {
    const target = new URL(createAuthCallbackTarget("//evil.example/collect", {
      origin: "https://ontherunelectrics.com.au",
      sessionStorage: { setItem: vi.fn() },
      randomUUID: () => "nonce-456",
    }));
    expect(target.searchParams.get("next")).toBe("/");
  });
});
