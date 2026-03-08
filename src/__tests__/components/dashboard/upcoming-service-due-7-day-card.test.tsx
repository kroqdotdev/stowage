import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { UpcomingServiceDue7DayCard } from "@/components/dashboard/upcoming-service-due-7-day-card";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/use-today-iso-date", () => ({
  useTodayIsoDate: () => "2026-03-07",
}));

describe("UpcomingServiceDue7DayCard", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it("shows loading state when queries are undefined", () => {
    mockUseQuery.mockReturnValue(undefined);

    render(<UpcomingServiceDue7DayCard />);

    expect(screen.getByText("Loading...")).toBeVisible();
    expect(
      screen.getByText("Upcoming services (7 days)"),
    ).toBeVisible();
  });

  it("shows disabled message when service scheduling is off", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const name = getFunctionName(reference as never);
      if (name === "appSettings:getAppSettings") {
        return { serviceSchedulingEnabled: false };
      }
      return [];
    });

    render(<UpcomingServiceDue7DayCard />);

    expect(
      screen.getByText("Service scheduling is disabled."),
    ).toBeVisible();
  });

  it("shows empty state when enabled but no upcoming services", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const name = getFunctionName(reference as never);
      if (name === "appSettings:getAppSettings") {
        return { serviceSchedulingEnabled: true };
      }
      return [];
    });

    render(<UpcomingServiceDue7DayCard />);

    expect(
      screen.getByText("No assets due in the next 7 days."),
    ).toBeVisible();
  });

  it("renders service items with name, tag, and date", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const name = getFunctionName(reference as never);
      if (name === "appSettings:getAppSettings") {
        return { serviceSchedulingEnabled: true };
      }
      return [
        {
          scheduleId: "sched1",
          assetId: "asset1",
          assetName: "Forklift A",
          assetTag: "FK-001",
          nextServiceDate: "2026-03-09",
        },
      ];
    });

    render(<UpcomingServiceDue7DayCard />);

    expect(screen.getByText("Forklift A")).toBeVisible();
    expect(screen.getByText("FK-001")).toBeVisible();
    expect(screen.getByText("2026-03-09")).toBeVisible();
    expect(screen.getByText("Open planner")).toBeVisible();
  });
});
