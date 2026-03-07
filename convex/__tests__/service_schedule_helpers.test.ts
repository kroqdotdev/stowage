import { describe, expect, it } from "vitest";
import { ConvexError } from "convex/values";
import {
  requireIsoDate,
  normalizeServiceIntervalUnit,
  ensureReminderWithinInterval,
  getTodayIsoDate,
  addIntervalToIsoDate,
  subtractIntervalFromIsoDate,
  getMonthRange,
  getUpcomingRange,
} from "../service_schedule_helpers";

function expectConvexError(fn: () => unknown, code: string) {
  try {
    fn();
    expect.unreachable("Expected ConvexError");
  } catch (error) {
    expect(error).toBeInstanceOf(ConvexError);
    expect((error as ConvexError<{ code: string }>).data.code).toBe(code);
  }
}

describe("requireIsoDate", () => {
  it("accepts valid dates", () => {
    expect(requireIsoDate("2026-01-15")).toBe("2026-01-15");
    expect(requireIsoDate("2000-02-29")).toBe("2000-02-29");
  });

  it("rejects non-date strings", () => {
    expectConvexError(() => requireIsoDate("not-a-date"), "INVALID_DATE");
  });

  it("rejects dates with wrong format", () => {
    expectConvexError(() => requireIsoDate("01-15-2026"), "INVALID_DATE");
    expectConvexError(() => requireIsoDate("2026/01/15"), "INVALID_DATE");
  });

  it("rejects impossible calendar dates", () => {
    expectConvexError(() => requireIsoDate("2025-02-29"), "INVALID_DATE");
    expectConvexError(() => requireIsoDate("2025-13-01"), "INVALID_DATE");
    expectConvexError(() => requireIsoDate("2025-00-15"), "INVALID_DATE");
  });
});

describe("normalizeServiceIntervalUnit", () => {
  it("accepts valid units", () => {
    expect(normalizeServiceIntervalUnit("days")).toBe("days");
    expect(normalizeServiceIntervalUnit("weeks")).toBe("weeks");
    expect(normalizeServiceIntervalUnit("months")).toBe("months");
    expect(normalizeServiceIntervalUnit("years")).toBe("years");
  });

  it("rejects invalid units", () => {
    expectConvexError(
      () => normalizeServiceIntervalUnit("hours"),
      "INVALID_INTERVAL",
    );
  });
});

describe("ensureReminderWithinInterval", () => {
  it("accepts reminder shorter than interval", () => {
    expect(() =>
      ensureReminderWithinInterval({
        intervalValue: 30,
        intervalUnit: "days",
        reminderLeadValue: 7,
        reminderLeadUnit: "days",
      }),
    ).not.toThrow();
  });

  it("accepts zero reminder lead", () => {
    expect(() =>
      ensureReminderWithinInterval({
        intervalValue: 1,
        intervalUnit: "months",
        reminderLeadValue: 0,
        reminderLeadUnit: "days",
      }),
    ).not.toThrow();
  });

  it("rejects reminder longer than interval", () => {
    expectConvexError(
      () =>
        ensureReminderWithinInterval({
          intervalValue: 7,
          intervalUnit: "days",
          reminderLeadValue: 2,
          reminderLeadUnit: "weeks",
        }),
      "INVALID_INTERVAL",
    );
  });

  it("rejects non-positive interval", () => {
    expectConvexError(
      () =>
        ensureReminderWithinInterval({
          intervalValue: 0,
          intervalUnit: "days",
          reminderLeadValue: 0,
          reminderLeadUnit: "days",
        }),
      "INVALID_INTERVAL",
    );
  });

  it("rejects negative reminder lead", () => {
    expectConvexError(
      () =>
        ensureReminderWithinInterval({
          intervalValue: 30,
          intervalUnit: "days",
          reminderLeadValue: -1,
          reminderLeadUnit: "days",
        }),
      "INVALID_INTERVAL",
    );
  });
});

describe("getTodayIsoDate", () => {
  it("returns today in YYYY-MM-DD format", () => {
    const result = getTodayIsoDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("uses provided timestamp", () => {
    const ms = Date.UTC(2026, 5, 15);
    expect(getTodayIsoDate(ms)).toBe("2026-06-15");
  });
});

describe("addIntervalToIsoDate", () => {
  it("adds days", () => {
    expect(
      addIntervalToIsoDate({ date: "2026-01-01", value: 10, unit: "days" }),
    ).toBe("2026-01-11");
  });

  it("adds weeks", () => {
    expect(
      addIntervalToIsoDate({ date: "2026-01-01", value: 2, unit: "weeks" }),
    ).toBe("2026-01-15");
  });

  it("adds months", () => {
    expect(
      addIntervalToIsoDate({ date: "2026-01-31", value: 1, unit: "months" }),
    ).toBe("2026-03-03");
  });

  it("adds years", () => {
    expect(
      addIntervalToIsoDate({ date: "2026-06-15", value: 1, unit: "years" }),
    ).toBe("2027-06-15");
  });

  it("rejects non-positive value", () => {
    expectConvexError(
      () => addIntervalToIsoDate({ date: "2026-01-01", value: 0, unit: "days" }),
      "INVALID_INTERVAL",
    );
  });
});

describe("subtractIntervalFromIsoDate", () => {
  it("subtracts days", () => {
    expect(
      subtractIntervalFromIsoDate({
        date: "2026-01-11",
        value: 10,
        unit: "days",
      }),
    ).toBe("2026-01-01");
  });

  it("subtracts months", () => {
    expect(
      subtractIntervalFromIsoDate({
        date: "2026-06-15",
        value: 3,
        unit: "months",
      }),
    ).toBe("2026-03-15");
  });

  it("allows zero subtraction", () => {
    expect(
      subtractIntervalFromIsoDate({
        date: "2026-01-15",
        value: 0,
        unit: "days",
      }),
    ).toBe("2026-01-15");
  });
});

describe("getMonthRange", () => {
  it("returns correct range for January", () => {
    const range = getMonthRange({ year: 2026, month: 1 });
    expect(range.monthStart).toBe("2026-01-01");
    expect(range.nextMonthStart).toBe("2026-02-01");
  });

  it("returns correct range for December", () => {
    const range = getMonthRange({ year: 2026, month: 12 });
    expect(range.monthStart).toBe("2026-12-01");
    expect(range.nextMonthStart).toBe("2027-01-01");
  });

  it("rejects invalid month", () => {
    expectConvexError(() => getMonthRange({ year: 2026, month: 0 }), "INVALID_DATE");
    expectConvexError(() => getMonthRange({ year: 2026, month: 13 }), "INVALID_DATE");
  });

  it("rejects invalid year", () => {
    expectConvexError(
      () => getMonthRange({ year: 1969, month: 1 }),
      "INVALID_DATE",
    );
  });
});

describe("getUpcomingRange", () => {
  it("returns a range spanning the given number of days from today", () => {
    const range = getUpcomingRange({ days: 30 });
    expect(range.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.endDate > range.startDate).toBe(true);
  });

  it("rejects non-positive days", () => {
    expectConvexError(() => getUpcomingRange({ days: 0 }), "INVALID_INTERVAL");
  });
});
