import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), logout: vi.fn() }));

vi.mock("@/api/base44Client", () => ({
  base44: { functions: { invoke: mocks.invoke }, auth: { logout: mocks.logout, redirectToLogin: vi.fn() } },
}));
vi.mock("@/hooks/useCurrentUser", () => ({ useCurrentUser: () => ({ user: { id: "user-1", role: "customer" }, isLoading: false }) }));
vi.mock("@/hooks/usePlatformConfig", () => ({ usePlatformConfig: () => ({ data: { business: { name: "On The Run Electrics" } } }) }));
vi.mock("@/components/SEO", () => ({ default: () => null }));
vi.mock("@/components/portal/settings/AccountDetailsCard", () => ({ default: () => <div>Account details</div> }));
vi.mock("@/components/portal/settings/ScootersCard", () => ({ default: () => <div>Scooters</div> }));
vi.mock("@/components/portal/settings/SocialProfilesCard", () => ({ default: () => <div>Social profiles</div> }));

import PortalSettings from "@/pages/PortalSettings";

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><PortalSettings /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PortalSettings feedback invitation consent", () => {
  beforeEach(() => {
    mocks.invoke.mockReset().mockImplementation((name, payload) => {
      if (name === "customerSettings") return Promise.resolve({ data: { profile: {}, scooters: [], connections: [] } });
      if (name === "notificationPreferenceActions" && payload.action === "get") {
        return Promise.resolve({ data: { ok: true, data: { preferences: [] } } });
      }
      if (name === "notificationPreferenceActions" && payload.action === "set") {
        return Promise.resolve({ data: { ok: true, data: { channel: payload.channel, enabled: payload.enabled } } });
      }
      return Promise.reject(new Error(`Unexpected function: ${name}`));
    });
  });

  it("defaults optional channels off and records explicit versioned consent", async () => {
    const user = userEvent.setup();
    renderPage();

    const email = await screen.findByRole("switch", { name: "Email invitations" });
    const sms = screen.getByRole("switch", { name: "SMS invitations" });
    expect(email).not.toBeChecked();
    expect(sms).not.toBeChecked();
    expect(screen.getByText(/Transactional messages about bookings, repair progress/i)).toBeInTheDocument();

    await user.click(email);

    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("notificationPreferenceActions", {
      action: "set",
      channel: "email",
      enabled: true,
      consent_version: "2026-08-13",
    }));
    expect(email).toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent("Email feedback invitations enabled");
  });

  it("announces a failed save and retries the same explicit choice", async () => {
    let saveAttempts = 0;
    mocks.invoke.mockImplementation((name, payload) => {
      if (name === "customerSettings") return Promise.resolve({ data: { profile: {}, scooters: [], connections: [] } });
      if (name === "notificationPreferenceActions" && payload.action === "get") {
        return Promise.resolve({ data: { ok: true, data: { preferences: { email: false, sms: false } } } });
      }
      if (name === "notificationPreferenceActions" && payload.action === "set") {
        saveAttempts += 1;
        if (saveAttempts === 1) {
          return Promise.resolve({ status: 503, data: { ok: false, error: { code: "unavailable", message: "Please try again." } } });
        }
        return Promise.resolve({ data: { ok: true, data: { channel: payload.channel, enabled: payload.enabled } } });
      }
      return Promise.reject(new Error(`Unexpected function: ${name}`));
    });
    const user = userEvent.setup();
    renderPage();

    const sms = await screen.findByRole("switch", { name: "SMS invitations" });
    await user.click(sms);

    expect(await screen.findByText("Your feedback invitation choice was not saved")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("SMS feedback invitation choice was not saved");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(sms).toBeChecked());
    expect(saveAttempts).toBe(2);
    expect(screen.getByRole("status")).toHaveTextContent("SMS feedback invitations enabled");
  });
});
