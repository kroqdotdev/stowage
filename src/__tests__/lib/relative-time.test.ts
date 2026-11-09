import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "@/lib/relative-time";

// Local-time construction keeps the day maths independent of the TZ.
const NOW = new Date(2026, 10, 7, 15, 30, 0);
const at = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m, d, h, min, 0).getTime();

describe("formatRelativeTime", () => {
  it("shows today's clock time", () => {
    expect(formatRelativeTime(at(2026, 10, 7, 9, 4), NOW)).toEqual({
      long: "Today 09:04",
      short: "09:04",
    });
  });

  it("treats a future timestamp as today", () => {
    expect(formatRelativeTime(at(2026, 10, 9, 8, 0), NOW).long).toBe(
      "Today 08:00",
    );
  });

  it("counts calendar days, not 24-hour spans", () => {
    // 23:59 yesterday is under a day ago but still "Yesterday".
    expect(formatRelativeTime(at(2026, 10, 6, 23, 59), NOW)).toEqual({
      long: "Yesterday",
      short: "1d",
    });
  });

  it("uses days below a week", () => {
    expect(formatRelativeTime(at(2026, 10, 1), NOW)).toEqual({
      long: "6 days ago",
      short: "6d",
    });
  });

  it("uses weeks below 30 days, singular for one", () => {
    expect(formatRelativeTime(at(2026, 9, 31), NOW)).toEqual({
      long: "1 week ago",
      short: "1w",
    });
    expect(formatRelativeTime(at(2026, 9, 15), NOW)).toEqual({
      long: "3 weeks ago",
      short: "3w",
    });
  });

  it("uses months below a year", () => {
    expect(formatRelativeTime(at(2026, 9, 7), NOW)).toEqual({
      long: "1 month ago",
      short: "1mo",
    });
    expect(formatRelativeTime(at(2026, 4, 7), NOW).long).toBe("6 months ago");
  });

  it("uses years from 365 days", () => {
    expect(formatRelativeTime(at(2025, 10, 7), NOW)).toEqual({
      long: "1 year ago",
      short: "1y",
    });
    expect(formatRelativeTime(at(2023, 10, 1), NOW).short).toBe("3y");
  });

  it("returns a dash for an invalid timestamp", () => {
    expect(formatRelativeTime(Number.NaN, NOW)).toEqual({
      long: "—",
      short: "—",
    });
  });
});
