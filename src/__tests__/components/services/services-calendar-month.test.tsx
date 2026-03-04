import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { ServicesCalendarMonth } from "@/components/services/services-calendar-month";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

describe("ServicesCalendarMonth", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it("renders scheduled items for the current month", () => {
    const now = new Date();
    const dateKey = `${String(now.getUTCFullYear()).padStart(4, "0")}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;

    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "serviceSchedules:listCalendarMonth") {
        return [
          {
            scheduleId: "schedule1",
            assetId: "asset1",
            assetName: "Winch",
            assetTag: "WIN-0001",
            nextServiceDate: dateKey,
          },
        ];
      }
      return undefined;
    });

    render(<ServicesCalendarMonth />);

    expect(screen.getByText("WIN-0001")).toBeInTheDocument();
  });

  it("shows loading state while query is unresolved", () => {
    mockUseQuery.mockImplementation(() => undefined);

    render(<ServicesCalendarMonth />);
    expect(screen.getByText("Loading calendar...")).toBeInTheDocument();
  });
});
