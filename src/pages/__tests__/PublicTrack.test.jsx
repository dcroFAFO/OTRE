import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/api/base44Client", () => ({
  base44: {
    functions: { invoke: mocks.invoke },
    integrations: { Core: { UploadPrivateFile: vi.fn() } },
  },
}));

vi.mock("@/hooks/usePlatformConfig", () => ({
  usePlatformConfig: () => ({
    data: {
      business: {
        name: "On The Run Electrics",
        email: "info@ontherunelectrics.com.au",
        phone: "0415 505 908",
        phoneE164: "+61415505908",
        address: "11 Lucinda Street, Woolloongabba QLD 4102",
      },
    },
  }),
}));

vi.mock("@/components/SEO", () => ({ default: () => null }));

import PublicTrack from "@/pages/PublicTrack";

const trackingData = {
  job: { id: "job-1", reference: "OTR-1001", status: "repair_in_progress", asset_label: "Segway Ninebot", issueDescription: "Brake service" },
  invoice: null,
  notes: [],
  attachments: [],
  permissions: ["add_note", "upload_file"],
};

function renderRoute(path) {
  window.history.replaceState({}, "", path);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes><Route path="/track/:jobId" element={<PublicTrack />} /></Routes>
      </BrowserRouter>
    </QueryClientProvider>,
  );
}

describe("PublicTrack", () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
  });

  it("shows canonical contact recovery without exposing invalid-link data", async () => {
    mocks.invoke.mockRejectedValue({ response: { status: 403, data: { error: "database record 42" } } });
    renderRoute("/track/invalid-token");

    expect(await screen.findByRole("heading", { name: "Tracking link unavailable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "info@ontherunelectrics.com.au" })).toHaveAttribute("href", "mailto:info@ontherunelectrics.com.au");
    expect(screen.getByRole("link", { name: "0415 505 908" })).toHaveAttribute("href", "tel:+61415505908");
    expect(screen.queryByText("database record 42")).not.toBeInTheDocument();
  });

  it("releases the message loading guard after a safe mutation failure", async () => {
    mocks.invoke
      .mockResolvedValueOnce({ data: trackingData })
      .mockRejectedValueOnce({ response: { status: 500, data: { error: "private stack trace" } } });
    const user = userEvent.setup();
    renderRoute("/track/public-token");

    await user.type(await screen.findByLabelText("Message the workshop"), "Please call me");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Your message could not be sent");
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
    expect(screen.queryByText("private stack trace")).not.toBeInTheDocument();
  });
});
