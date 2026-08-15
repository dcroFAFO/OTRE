import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), confirm: vi.fn(), toastSuccess: vi.fn() }));

vi.mock("@/api/base44Client", () => ({ base44: { functions: { invoke: mocks.invoke } } }));
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, error: vi.fn() } }));
vi.mock("@/components/portal/settings/ScooterFormDialog", () => ({ default: () => null }));

import ScootersCard from "@/components/portal/settings/ScootersCard";

describe("ScootersCard history preservation", () => {
  beforeEach(() => {
    mocks.invoke.mockReset().mockResolvedValue({ data: { archived: true } });
    mocks.confirm.mockReset().mockReturnValue(true);
    vi.stubGlobal("confirm", mocks.confirm);
  });

  it("archives a linked scooter and explains that history is retained", async () => {
    const onChanged = vi.fn();
    const user = userEvent.setup();
    render(<ScootersCard scooters={[{ id: "scooter-1", make: "Segway", model: "G30", job_id: "", has_jobs: true }]} onChanged={onChanged} />);

    await user.click(screen.getByRole("button", { name: "Archive scooter and retain service history" }));

    expect(mocks.confirm).toHaveBeenCalledWith(expect.stringMatching(/service history will be retained/i));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("customerSettings", { action: "archiveScooter", scooter_id: "scooter-1" }));
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Scooter archived", { description: "Your service history has been retained." });
    expect(onChanged).toHaveBeenCalled();
  });
});
