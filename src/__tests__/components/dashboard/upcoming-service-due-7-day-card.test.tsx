import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const getAppSettingsMock = vi.fn();
const listUpcomingServicesMock = vi.fn();

vi.mock("@/lib/api/app-settings", () => ({
  getAppSettings: () => getAppSettingsMock(),
}));

vi.mock("@/lib/api/service-schedules", () => ({
  listUpcomingServices: (days: number) => listUpcomingServicesMock(days),
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

import { UpcomingServiceDue7DayCard } from "@/components/dashboard/upcoming-service-due-7-day-card";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("UpcomingServiceDue7DayCard", () => {
  beforeEach(() => {
    getAppSettingsMock.mockReset();
    listUpcomingServicesMock.mockReset();
  });

  it("shows loading state when queries are pending", () => {
    getAppSettingsMock.mockImplementation(() => new Promise(() => {}));
    listUpcomingServicesMock.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<UpcomingServiceDue7DayCard />);

    expect(screen.getByText("Loading...")).toBeVisible();
    expect(screen.getByText("Upcoming services (7 days)")).toBeVisible();
  });

  it("shows disabled message when service scheduling is off", async () => {
    getAppSettingsMock.mockResolvedValue({
      dateFormat: "DD-MM-YYYY",
      serviceSchedulingEnabled: false,
      updatedAt: null,
    });
    listUpcomingServicesMock.mockResolvedValue([]);

    renderWithClient(<UpcomingServiceDue7DayCard />);

    await waitFor(() => {
      expect(
        screen.getByText("Service scheduling is disabled."),
      ).toBeVisible();
    });
  });

  it("shows empty state when enabled but no upcoming services", async () => {
    getAppSettingsMock.mockResolvedValue({
      dateFormat: "DD-MM-YYYY",
      serviceSchedulingEnabled: true,
      updatedAt: null,
    });
    listUpcomingServicesMock.mockResolvedValue([]);

    renderWithClient(<UpcomingServiceDue7DayCard />);

    await waitFor(() => {
      expect(
        screen.getByText("No assets due in the next 7 days."),
      ).toBeVisible();
    });
  });

  it("renders service items with name, tag, and date", async () => {
    getAppSettingsMock.mockResolvedValue({
      dateFormat: "DD-MM-YYYY",
      serviceSchedulingEnabled: true,
      updatedAt: null,
    });
    listUpcomingServicesMock.mockResolvedValue([
      {
        scheduleId: "sched1",
        assetId: "asset1",
        assetName: "Forklift A",
        assetTag: "FK-001",
        nextServiceDate: "2026-03-09",
      },
    ]);

    renderWithClient(<UpcomingServiceDue7DayCard />);

    await waitFor(() => {
      expect(screen.getByText("Forklift A")).toBeVisible();
    });
    expect(screen.getByText("FK-001")).toBeVisible();
    expect(screen.getByText("2026-03-09")).toBeVisible();
    expect(screen.getByText("Open planner")).toBeVisible();
  });
});
