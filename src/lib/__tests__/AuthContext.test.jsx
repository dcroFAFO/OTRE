import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearStoredBase44Token: vi.fn(),
  getCurrentUserWithToken: vi.fn(),
  getPublicAppSettings: vi.fn(),
  setToken: vi.fn(),
}));

vi.mock("@/api/base44Client", () => ({
  base44: {
    setToken: mocks.setToken,
    auth: {
      logout: vi.fn(),
      redirectToLogin: vi.fn(),
    },
  },
  clearStoredBase44Token: mocks.clearStoredBase44Token,
  getCurrentUserWithToken: mocks.getCurrentUserWithToken,
  getPublicAppSettings: mocks.getPublicAppSettings,
}));

vi.mock("@/lib/app-params", () => ({
  appParams: {
    appId: "test-app",
    token: "stored-token",
  },
}));

import { AuthProvider, useAuth } from "@/lib/AuthContext";

function AuthProbe() {
  const auth = useAuth();
  if (auth.isLoadingAuth || auth.isLoadingPublicSettings) return <p>loading</p>;

  return (
    <div>
      <p>{auth.isAuthenticated ? "authenticated" : "signed-out"}</p>
      <p>{auth.authChecked ? "checked" : "unchecked"}</p>
      <p>{auth.authError?.type || "no-error"}</p>
      <p>{auth.user?.email || "no-user"}</p>
    </div>
  );
}

describe("AuthProvider stored-token handling", () => {
  beforeEach(() => {
    mocks.getPublicAppSettings.mockResolvedValue({ id: "test-app", public_settings: "public_without_login" });
  });

  it("treats an expired stored token as signed out without an app-wide error", async () => {
    mocks.getCurrentUserWithToken.mockRejectedValue({ status: 401 });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText("signed-out")).toBeInTheDocument();
    expect(screen.getByText("checked")).toBeInTheDocument();
    expect(screen.getByText("no-error")).toBeInTheDocument();
    expect(mocks.clearStoredBase44Token).toHaveBeenCalledOnce();
    expect(mocks.setToken).not.toHaveBeenCalled();
  });

  it("applies a verified stored token before rendering authenticated routes", async () => {
    mocks.getCurrentUserWithToken.mockResolvedValue({ id: "user-1", email: "rider@example.com" });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText("authenticated")).toBeInTheDocument();
    expect(screen.getByText("rider@example.com")).toBeInTheDocument();
    await waitFor(() => expect(mocks.setToken).toHaveBeenCalledWith("stored-token"));
    expect(mocks.clearStoredBase44Token).not.toHaveBeenCalled();
  });
});
