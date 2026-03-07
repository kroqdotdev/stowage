import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTodayIsoDate } from "@/lib/use-today-iso-date";

function TodayHarness() {
  const today = useTodayIsoDate();
  return <div>{today}</div>;
}

describe("useTodayIsoDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-07T23:59:59.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates after UTC midnight passes", () => {
    render(<TodayHarness />);

    expect(screen.getByText("2026-03-07")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2_500);
    });

    expect(screen.getByText("2026-03-08")).toBeInTheDocument();
  });
});
