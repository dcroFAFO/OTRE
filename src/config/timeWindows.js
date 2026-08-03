// Shared preferred time-window vocabulary. Bookings are stored on
// Job.preferred_time_window (and Job.booking_submission.preferredTimeWindow),
// which may hold free text such as "ASAP" from older submissions.
export const TIME_WINDOWS = [
  { key: "morning", label: "Morning (8am - 12pm)" },
  { key: "afternoon", label: "Afternoon (12pm - 4pm)" },
  { key: "evening", label: "Evening (4pm - 6pm)" },
  { key: "asap", label: "ASAP / any time" },
];

// Maps a stored value onto a known key so it can be pre-selected in a dropdown.
// Returns "" when the value doesn't match a supported window.
export function normalizeTimeWindow(value) {
  if (!value) return "";
  const key = String(value).trim().toLowerCase().replace(/\s+/g, "_");
  return TIME_WINDOWS.some((w) => w.key === key) ? key : "";
}

// Human-readable label, falling back to the raw stored value so nothing is
// hidden from staff when a legacy free-text window was captured.
export function timeWindowLabel(value) {
  if (!value) return "";
  return TIME_WINDOWS.find((w) => w.key === normalizeTimeWindow(value))?.label || String(value);
}