import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ClientTable from "@/components/admin/clients/ClientTable";

const client = {
  id: "customer-1",
  full_name: "Jamie Rider",
  email: "jamie@example.com",
  phone: "0412 345 678",
  status: "active",
  scooter_count: 2,
  job_count: 4,
  tags: ["vip"],
  created_date: "2026-08-01T00:00:00.000Z",
};

describe("ClientTable", () => {
  it("provides labelled selection and native view actions in mobile and desktop layouts", async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    const onToggleSelect = vi.fn();
    render(
      <ClientTable
        clients={[client]}
        onView={onView}
        selected={new Set()}
        onToggleSelect={onToggleSelect}
        onToggleSelectAll={vi.fn()}
      />,
    );

    expect(screen.getAllByRole("checkbox", { name: "Select Jamie Rider" })).not.toHaveLength(0);
    const actions = screen.getAllByRole("button", { name: /view jamie rider|view customer/i });
    await user.click(actions[0]);
    expect(onView).toHaveBeenCalledWith(client);
  });
});
