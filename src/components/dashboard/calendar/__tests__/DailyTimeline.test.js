import { describe, expect, it } from "vitest";
import { canonicalTimeWindow } from "@/components/dashboard/calendar/DailyTimeline";

describe("DailyTimeline time-window grouping", () => {
  it.each([
    ["morning", "morning"],
    ["MORNING", "morning"],
    ["Morning (9–12)", "morning"],
    ["Midday (12–3)", "afternoon"],
    ["Afternoon (3–5:30)", "evening"],
    ["Anytime", "asap"],
  ])("maps %s to %s", (stored, expected) => {
    expect(canonicalTimeWindow(stored)).toBe(expected);
  });

  it("returns null so unknown and blank values stay visible as unscheduled", () => {
    expect(canonicalTimeWindow("Customer will call")).toBeNull();
    expect(canonicalTimeWindow("")).toBeNull();
  });
});
