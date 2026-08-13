import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CardSkeleton from "@/components/shared/CardSkeleton";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import NoResultsState from "@/components/shared/NoResultsState";
import TableSkeleton from "@/components/shared/TableSkeleton";
import UnauthorizedState from "@/components/shared/UnauthorizedState";

describe("shared async states", () => {
  it("announces loading status", () => {
    render(<LoadingSpinner label="Loading jobs" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading jobs");
  });

  it("announces card and table skeletons without prohibited ARIA attributes", () => {
    const { rerender } = render(<CardSkeleton label="Loading dashboard" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading dashboard");

    rerender(<TableSkeleton label="Loading invoices" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading invoices");
  });

  it("renders a genuine empty state", () => {
    render(<EmptyState title="No jobs yet" description="Create the first job." />);
    expect(screen.getByRole("heading", { name: "No jobs yet" })).toBeVisible();
  });

  it("uses unique heading relationships when several empty states share a page", () => {
    render(<><EmptyState title="No jobs" /><EmptyState title="No invoices" /></>);
    const regions = screen.getAllByRole("region");
    expect(regions[0]).toHaveAttribute("aria-labelledby", screen.getByRole("heading", { name: "No jobs" }).id);
    expect(regions[1]).toHaveAttribute("aria-labelledby", screen.getByRole("heading", { name: "No invoices" }).id);
    expect(regions[0].getAttribute("aria-labelledby")).not.toBe(regions[1].getAttribute("aria-labelledby"));
  });

  it("runs retry and clear actions", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const clear = vi.fn();
    const { rerender } = render(<ErrorState onRetry={retry} />);
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();

    rerender(<NoResultsState onClear={clear} />);
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(clear).toHaveBeenCalledOnce();
  });

  it("provides a clear recovery path for unauthorised users", () => {
    render(
      <MemoryRouter>
        <UnauthorizedState actionTo="/portal" actionLabel="Go to My Account" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Go to My Account" })).toHaveAttribute("href", "/portal");
  });
});
