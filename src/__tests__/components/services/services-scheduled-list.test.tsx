import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { ServicesScheduledList } from "@/components/services/services-scheduled-list";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

describe("ServicesScheduledList", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it("renders schedule rows", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "serviceSchedules:listScheduledAssets") {
        return [
          {
            scheduleId: "schedule1",
            assetId: "asset1",
            assetName: "Main Engine",
            assetTag: "ENG-0001",
            assetStatus: "active",
            nextServiceDate: "2026-03-06",
            reminderStartDate: "2026-03-01",
          },
        ];
      }
      return undefined;
    });

    render(<ServicesScheduledList />);

    expect(screen.getByText("Main Engine")).toBeInTheDocument();
    expect(screen.getByText("ENG-0001")).toBeInTheDocument();
    expect(screen.getByText("2026-03-06")).toBeInTheDocument();
  });

  it("renders empty state when no schedules exist", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "serviceSchedules:listScheduledAssets") {
        return [];
      }
      return undefined;
    });

    render(<ServicesScheduledList />);
    expect(screen.getByText("No scheduled assets yet.")).toBeInTheDocument();
  });
});
