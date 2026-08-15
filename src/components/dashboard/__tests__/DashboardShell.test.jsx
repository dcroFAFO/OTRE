import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/usePlatformConfig", () => ({
  usePlatformConfig: () => ({
    data: {
      business: { name: "On The Run Electrics" },
      app: { terminology: { platformLabel: "Workshop" }, dashboard: { nav: { overview: "Overview", jobs: "Jobs", calendar: "Calendar" } } },
    },
  }),
}));

vi.mock("@/api/base44Client", () => ({ base44: { auth: { logout: vi.fn() }, entities: { Product: { filter: vi.fn().mockResolvedValue([]) } } } }));

import DashboardShell from "@/components/dashboard/DashboardShell";

function renderShell(path, user, child) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <DashboardShell user={user}>{child}</DashboardShell>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DashboardShell", () => {
  it("exposes the main landmark, skip link, and admin pricing route", () => {
    renderShell("/settings/service-pricing", { role: "admin", full_name: "Admin User" }, <h1>Pricing workspace</h1>);

    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("link", { name: "Service pricing" })).toHaveAttribute("href", "/settings/service-pricing");
  });

  it("does not expose privileged navigation to a legacy technician role", () => {
    renderShell("/dashboard", { role: "technician", full_name: "Tech User" }, <h1>Dashboard</h1>);

    expect(screen.queryByRole("button", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "News and events" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Customers" })).not.toBeInTheDocument();
  });
});
