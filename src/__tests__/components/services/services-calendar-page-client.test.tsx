import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { ServicesCalendarPageClient } from "@/components/services/services-calendar-page-client";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@/components/services/services-nav-tabs", () => ({
  ServicesNavTabs: () => <div>NavTabs</div>,
}));

vi.mock("@/components/services/services-calendar-month", () => ({
  ServicesCalendarMonth: () => <div>CalendarMonth</div>,
}));

describe("ServicesCalendarPageClient", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it("shows loading state when appSettings is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);

    render(<ServicesCalendarPageClient />);

    expect(screen.getByText("Loading service calendar...")).toBeInTheDocument();
  });

  it("renders calendar view when service scheduling is enabled", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "appSettings:getAppSettings") {
        return { serviceSchedulingEnabled: true };
      }
      return undefined;
    });

    render(<ServicesCalendarPageClient />);

    expect(screen.getByText("NavTabs")).toBeInTheDocument();
    expect(screen.getByText("CalendarMonth")).toBeInTheDocument();
  });

  it("shows disabled message when service scheduling is off", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "appSettings:getAppSettings") {
        return { serviceSchedulingEnabled: false };
      }
      return undefined;
    });

    render(<ServicesCalendarPageClient />);

    expect(
      screen.getByText(/Service scheduling is disabled/),
    ).toBeInTheDocument();
  });
});
