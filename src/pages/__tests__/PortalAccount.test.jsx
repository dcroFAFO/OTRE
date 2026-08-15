import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@/api/base44Client", () => ({
  base44: {
    auth: { logout: vi.fn(), updateMe: vi.fn() },
    functions: { invoke: mocks.invoke },
  },
}));

vi.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    user: { id: "user-1", email: "rider@example.com", role: "customer", hasSeenCustomerPortalTutorial: false },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/usePlatformConfig", () => ({
  usePlatformConfig: () => ({
    data: {
      business: { name: "On The Run Electrics", phone: "0415 505 908", phoneE164: "+61415505908", email: "info@ontherunelectrics.com.au", address: "11 Lucinda Street" },
      app: { terminology: { jobPlural: "jobs" } },
    },
  }),
}));

vi.mock("@/lib/AuthContext", () => ({ useAuth: () => ({ checkUserAuth: vi.fn() }) }));
vi.mock("@/components/SEO", () => ({ default: () => null }));

import PortalAccount from "@/pages/PortalAccount";

describe("PortalAccount independent data sections", () => {
  beforeEach(() => {
    mocks.invoke.mockReset().mockImplementation((name) => {
      if (name === "customerSettings") return new Promise(() => {});
      if (name === "customerPortalData") {
        return Promise.resolve({
          data: {
            ok: true,
            data: {
              account: { name: "Jamie Rider" },
              jobs: [
                { id: "job-1", asset_label: "Segway Ninebot", status: "repair_in_progress", service_type: "repair" },
              ],
              scooters: [],
              invoices: [],
              limits: { jobs: 200, scooters: 100, invoices: 200 },
              potentially_truncated: false,
            },
          },
        });
      }
      if (name === "customerRewards") return Promise.resolve({ data: { rewards: [], referral: {}, loyalty: {} } });
      return Promise.resolve({ data: {} });
    });
  });

  it("shows resolved jobs while customer settings are still loading", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><PortalAccount /></MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Jamie Rider")).toBeInTheDocument();
    expect(screen.getByText("Loading your getting started checklist")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Account details" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your scooters" })).not.toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenCalledWith("customerPortalData", { action: "overview" });
  });
});
