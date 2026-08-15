import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  isAuthenticated: vi.fn(),
  me: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  setToken: vi.fn(),
  loginWithProvider: vi.fn(),
}));

vi.mock("@/api/base44Client", () => ({
  base44: {
    auth: {
      isAuthenticated: mocks.isAuthenticated,
      me: mocks.me,
      logout: mocks.logout,
      register: mocks.register,
      setToken: mocks.setToken,
      loginWithProvider: mocks.loginWithProvider,
    },
    functions: { invoke: mocks.invoke },
  },
}));
vi.mock("@/components/SEO", () => ({ default: () => null }));
vi.mock("@/components/ui/input-otp", () => ({
  InputOTP: ({ children }) => <div>{children}</div>,
  InputOTPGroup: ({ children }) => <div>{children}</div>,
  InputOTPSlot: ({ index }) => <span data-testid={`otp-slot-${index}`} />,
}));

import Register from "@/pages/Register";

describe("Register OAuth mobile onboarding", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/register?oauthComplete=1&next=%2Fportal");
    window.sessionStorage.clear();
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.isAuthenticated.mockResolvedValue(true);
    mocks.me.mockResolvedValue({ id: "user-1", email: "rider@example.com", role: "customer" });
    mocks.invoke.mockImplementation((name) => {
      if (name === "claimCustomerJobs") {
        return Promise.resolve({
          status: 403,
          data: {
            error: "Verify your mobile number before creating a customer account.",
            code: "PHONE_VERIFICATION_REQUIRED",
          },
        });
      }
      if (name === "sendSignupPhoneOtp") {
        return Promise.resolve({ data: { masked_phone: "•••• ••• 123" } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it("collects only a mobile number and allows editing it after an SMS is sent", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Register /></MemoryRouter>);

    expect(await screen.findByText(/new customer accounts require a verified mobile number/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    const mobile = screen.getByLabelText("Mobile number");
    await user.type(mobile, "0412 345 678");
    await user.click(screen.getByRole("button", { name: "Send mobile security code" }));

    expect(await screen.findByText(/we sent a security code to •••• ••• 123/i)).toBeInTheDocument();
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("sendSignupPhoneOtp", {
      phone: "0412 345 678",
      email: "rider@example.com",
    }));

    await user.click(screen.getByRole("button", { name: "Edit mobile number" }));
    expect(screen.getByLabelText("Mobile number")).toHaveValue("0412 345 678");
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });
});
