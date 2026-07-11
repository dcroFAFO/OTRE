import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StatusPill from "./StatusPill";

describe("StatusPill", () => {
  it("renders a canonical job status label", () => {
    render(<StatusPill value="repair_in_progress" />);

    expect(screen.getByText("Repair In Progress")).toBeInTheDocument();
  });

  it("uses the requested status resolver", () => {
    render(<StatusPill kind="payment" value="paid" />);

    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("supports an explicit presentation label", () => {
    render(<StatusPill value="booked" label="Appointment confirmed" />);

    expect(screen.getByText("Appointment confirmed")).toBeInTheDocument();
    expect(screen.queryByText("Job Scheduled")).not.toBeInTheDocument();
  });
});
