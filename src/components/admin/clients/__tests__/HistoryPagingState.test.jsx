import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import HistoryPagingState from "@/components/admin/clients/HistoryPagingState";

describe("HistoryPagingState", () => {
  it("discloses non-job truncation without offering a broken older-jobs action", () => {
    render(
      <HistoryPagingState
        history={{
          pagination: { has_more: false, next_page: null },
          truncation: { jobs: false, invoices: true },
          query_failures: ["notes"],
        }}
        error={null}
        loading={false}
        onLoadMore={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText(/invoices, notes records could not be fully loaded/i)).toBeInTheDocument();
    expect(screen.getByText(/no additional job-history page is available/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /load older history/i })).not.toBeInTheDocument();
  });

  it("offers load older history only when the backend reports another job page", async () => {
    const onLoadMore = vi.fn();
    render(
      <HistoryPagingState
        history={{ pagination: { has_more: true, next_page: 2 }, linked: { jobs: [{ id: "job-1" }] } }}
        error={null}
        loading={false}
        onLoadMore={onLoadMore}
        onRetry={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /load older history/i }));
    expect(onLoadMore).toHaveBeenCalledOnce();
  });
});
