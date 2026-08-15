import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/api/base44Client", () => ({
  base44: { functions: { invoke: mocks.invoke }, auth: { isAuthenticated: vi.fn().mockResolvedValue(false) } },
}));
vi.mock("@/components/SEO", () => ({ default: () => null }));

import FeedbackRating from "@/pages/FeedbackRating";

function renderPage(path) {
  window.history.replaceState({}, "", path);
  return render(<MemoryRouter><FeedbackRating /></MemoryRouter>);
}

describe("FeedbackRating invitation flow", () => {
  beforeEach(() => mocks.invoke.mockReset());

  it("submits the one-time token without leaking it through context or job id", async () => {
    mocks.invoke.mockResolvedValue({ data: { ok: true, data: { accepted: true, duplicate: false }, request_id: "req-1" } });
    const user = userEvent.setup();
    renderPage("/feedback?token=one-time-secret&job=untrusted-job&rating=4");

    await user.click(screen.getByRole("button", { name: "Submit feedback" }));

    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("submitCustomerFeedback", expect.objectContaining({
      token: "one-time-secret",
      rating: 4,
      page_context: "/feedback",
    })));
    const payload = mocks.invoke.mock.calls[0][1];
    expect(payload).not.toHaveProperty("job_id");
    expect(payload.page_context).not.toContain("one-time-secret");
    expect(await screen.findByRole("heading", { name: "Thanks for your feedback" })).toBeInTheDocument();
  });

  it("shows a non-submittable state when the link has no invitation or owner fallback", () => {
    renderPage("/feedback");
    expect(screen.getByRole("heading", { name: "Feedback link unavailable" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit feedback" })).not.toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("turns an expired invitation envelope into a clear terminal state", async () => {
    mocks.invoke.mockResolvedValue({
      status: 410,
      data: { ok: false, error: { code: "feedback_invitation_expired", message: "This feedback invitation has expired." }, request_id: "req-2" },
    });
    const user = userEvent.setup();
    renderPage("/feedback?token=expired-secret");

    await user.click(screen.getByRole("button", { name: "Submit feedback" }));

    expect(await screen.findByRole("heading", { name: "Feedback link unavailable" })).toBeInTheDocument();
    expect(screen.getByText(/expired, has already been used, or is no longer valid/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit feedback" })).not.toBeInTheDocument();
  });
});
