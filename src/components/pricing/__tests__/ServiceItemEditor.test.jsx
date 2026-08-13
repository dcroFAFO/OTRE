import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ServiceItemEditor from "@/components/pricing/ServiceItemEditor";

describe("ServiceItemEditor", () => {
  it("validates required service details", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ServiceItemEditor categories={[]} onSave={onSave} onCancel={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Add service" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a service name");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("guards a pending save from duplicate submits", async () => {
    const user = userEvent.setup();
    let finish;
    const onSave = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
    render(<ServiceItemEditor categories={[{ key: "repairs", name: "Repairs" }]} onSave={onSave} onCancel={vi.fn()} />);

    await user.type(screen.getByRole("textbox", { name: /Service name/ }), "Brake adjustment");
    const submit = screen.getByRole("button", { name: "Add service" });
    await user.dblClick(submit);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Saving service..." })).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.getByRole("button", { name: "Add service" })).toBeEnabled());
  });
});
