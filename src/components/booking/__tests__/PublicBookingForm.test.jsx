import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createBookingRequest, sendBookingVerificationCode, verifyBookingCode } = vi.hoisted(() => ({
  createBookingRequest: vi.fn(),
  sendBookingVerificationCode: vi.fn(),
  verifyBookingCode: vi.fn(),
}));

vi.mock("@/services/bookingService", () => ({
  createBookingRequest,
  sendBookingVerificationCode,
  verifyBookingCode,
}));

vi.mock("@/hooks/usePlatformConfig", () => ({
  usePlatformConfig: () => ({ data: { services: [{ name: "Brake Repairs" }] } }),
}));

vi.mock("@/components/landing/AssetBrandPicker", () => ({
  default: ({ onChange }) => (
    <button type="button" onClick={() => onChange({ make: "Segway", model: "Ninebot MAX G2", customMake: "", customModel: "", label: "Segway Ninebot MAX G2" })}>
      Choose test scooter
    </button>
  ),
}));

vi.mock("@/components/booking/PreferredDateField", () => ({
  default: ({ id, value, onChange }) => <input id={id} type="date" value={value} onChange={(event) => onChange(event.target.value)} />,
}));

vi.mock("@/components/ui/select", async () => {
  const ReactModule = await import("react");
  const SelectItem = () => null;
  const SelectTrigger = () => null;
  const SelectContent = ({ children }) => children;
  const SelectValue = () => null;
  const collectItems = (children, result = []) => {
    ReactModule.Children.forEach(children, (child) => {
      if (!ReactModule.isValidElement(child)) return;
      if (child.type === SelectItem) result.push({ value: child.props.value, label: child.props.children });
      else collectItems(child.props.children, result);
    });
    return result;
  };
  const Select = ({ children, value, onValueChange }) => (
    <select aria-label="Repair type" value={value} onChange={(event) => onValueChange(event.target.value)}>
      <option value="">Select a service</option>
      {collectItems(children).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
    </select>
  );
  return { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
});

import PublicBookingForm from "@/components/booking/PublicBookingForm";

describe("PublicBookingForm", () => {
  beforeEach(() => {
    createBookingRequest.mockReset();
    sendBookingVerificationCode.mockReset().mockResolvedValue({ sent: true, channel: "sms" });
    verifyBookingCode.mockReset().mockResolvedValue({ verified: true, verification_id: "verification-1" });
    vi.stubGlobal("requestAnimationFrame", (callback) => callback());
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  it("hands the verified server record to booking creation and blocks duplicate submits", async () => {
    const user = userEvent.setup();
    let finishBooking;
    createBookingRequest.mockReturnValue(new Promise((resolve) => { finishBooking = resolve; }));
    render(<MemoryRouter><PublicBookingForm guestOnly /></MemoryRouter>);

    await user.type(screen.getByLabelText(/^Name/), "Jamie Rider");
    await user.type(screen.getByLabelText(/^Email/), "jamie@example.com");
    await user.type(screen.getByLabelText(/^Phone/), "0415 505 908");
    await user.click(screen.getByRole("button", { name: /next/i }));

    await user.click(screen.getByRole("button", { name: "Choose test scooter" }));
    await user.selectOptions(screen.getByLabelText("Repair type"), "Brake Repairs");
    await user.click(screen.getByLabelText(/I agree to be contacted/i));
    await user.click(screen.getByRole("button", { name: /next/i }));

    await user.click(screen.getByRole("button", { name: "Text code" }));
    await waitFor(() => expect(sendBookingVerificationCode).toHaveBeenCalledTimes(1));
    const codeInput = screen.getByLabelText("Verification code");
    fireEvent.change(codeInput, { target: { value: "123456" } });

    const submit = screen.getByRole("button", { name: "Submit repair request" });
    await user.click(submit);
    await user.click(submit);

    await waitFor(() => expect(createBookingRequest).toHaveBeenCalledTimes(1));
    expect(createBookingRequest).toHaveBeenCalledWith(expect.objectContaining({
      customer_email: "jamie@example.com",
      phone_e164: "+61415505908",
      verification_id: "verification-1",
    }));
    expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled();

    finishBooking({ reference: "OTR-1200", accountPath: "/register" });
    expect(await screen.findByText("Your repair request has been submitted")).toBeInTheDocument();
  });
});
