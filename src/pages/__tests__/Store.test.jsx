import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/api/base44Client", () => ({
  base44: { functions: { invoke: mocks.invoke } },
}));
vi.mock("@/hooks/usePlatformConfig", () => ({
  usePlatformConfig: () => ({ data: { business: { name: "On The Run Electrics" } } }),
}));
vi.mock("@/components/SEO", () => ({ default: () => null }));

import Store from "@/pages/Store";

function renderStore() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><Store /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Store browse-only catalogue", () => {
  beforeEach(() => {
    mocks.invoke.mockReset().mockImplementation((_name, payload) => Promise.resolve({
      data: {
        ok: true,
        data: {
          items: payload.page === 1
            ? [{ id: "product-1", name: "Road Tyre", price: 45, currency: "AUD", in_stock: true }]
            : [{ id: "product-2", name: "Brake Pads", price: 20, currency: "AUD", in_stock: true }],
          page: payload.page,
          page_size: payload.page_size,
          has_more: payload.page === 1,
          potentially_truncated: false,
        },
      },
    }));
  });

  it("loads safe catalogue pages and sends product enquiries to Contact", async () => {
    const user = userEvent.setup();
    renderStore();

    expect(await screen.findByText("Road Tyre")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enquire about Road Tyre" })).toHaveAttribute("href", "/contact?product=product-1");
    expect(screen.queryByRole("button", { name: /add to cart|checkout|pay/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Load more products" }));
    expect(await screen.findByRole("heading", { level: 3, name: "Brake Pads" })).toBeInTheDocument();
    expect(mocks.invoke).toHaveBeenLastCalledWith("publicCatalog", expect.objectContaining({ page: 2, page_size: 48 }));
  });
});
