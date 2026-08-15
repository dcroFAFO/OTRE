import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BoundedDataNotice from "@/components/shared/BoundedDataNotice";

describe("BoundedDataNotice", () => {
  it("renders only while more records exist and exposes an accessible load action", () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(<BoundedDataNotice noun="jobs" loadedCount={100} hasMore onLoadMore={onLoadMore} />);

    expect(screen.getByRole("status")).toHaveTextContent("Showing 100 loaded jobs");
    fireEvent.click(screen.getByRole("button", { name: "Load more jobs" }));
    expect(onLoadMore).toHaveBeenCalledOnce();

    rerender(<BoundedDataNotice noun="jobs" loadedCount={101} hasMore={false} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
