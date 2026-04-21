import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const listScheduledAssetsMock = vi.fn();

vi.mock("@/lib/api/service-schedules", () => ({
  listScheduledAssets: () => listScheduledAssetsMock(),
}));

vi.mock("@/lib/use-app-date-format", () => ({
  useAppDateFormat: () => "DD-MM-YYYY",
}));

vi.mock("@/components/services/log-service-dialog", () => ({
  LogServiceDialog: () => null,
}));

vi.mock("@/lib/use-today-iso-date", () => ({
  useTodayIsoDate: () => "2026-03-01",
}));

import { ServicesScheduledList } from "@/components/services/services-scheduled-list";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ServicesScheduledList", () => {
  beforeEach(() => {
    listScheduledAssetsMock.mockReset();
  });

  it("renders schedule rows inside a bucketed group with the relative due date", async () => {
    listScheduledAssetsMock.mockResolvedValue([
      {
        scheduleId: "schedule1",
        assetId: "asset1",
        assetName: "Main Engine",
        assetTag: "ENG-0001",
        assetStatus: "active",
        nextServiceDate: "2026-03-06",
        intervalValue: 1,
        intervalUnit: "months",
        reminderLeadValue: 5,
        reminderLeadUnit: "days",
        reminderStartDate: "2026-03-01",
        lastServiceDate: "2026-02-01",
        lastServiceDescription: "Previous inspection",
        lastServiceProviderName: "Dockside Repair",
      },
    ]);

    renderWithClient(<ServicesScheduledList />);

    await waitFor(() => {
      expect(screen.getByText("Main Engine")).toBeInTheDocument();
    });
    expect(screen.getByText("ENG-0001")).toBeInTheDocument();
    // 2026-03-06 is 5 days from mocked today 2026-03-01 → "Due in 5 days"
    expect(screen.getByText("Due in 5 days")).toBeInTheDocument();
    // Group header for "Due this week" is shown with a count of 1
    expect(screen.getByTestId("services-group-thisWeek")).toBeInTheDocument();
    expect(
      screen.getByText("Last service 01-02-2026 • Dockside Repair"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("log-service-schedule1")).toBeInTheDocument();
  });

  it("groups overdue, this-week, this-month and upcoming buckets", async () => {
    listScheduledAssetsMock.mockResolvedValue([
      {
        scheduleId: "overdue1",
        assetId: "a1",
        assetName: "Late",
        assetTag: "A-1",
        assetStatus: "active",
        nextServiceDate: "2026-02-10", // 19 days before today
        intervalValue: 1,
        intervalUnit: "months",
        reminderLeadValue: 5,
        reminderLeadUnit: "days",
        reminderStartDate: "2026-02-05",
        lastServiceDate: null,
        lastServiceDescription: null,
        lastServiceProviderName: null,
      },
      {
        scheduleId: "week1",
        assetId: "a2",
        assetName: "Soon",
        assetTag: "A-2",
        assetStatus: "active",
        nextServiceDate: "2026-03-05", // 4 days
        intervalValue: 1,
        intervalUnit: "months",
        reminderLeadValue: 5,
        reminderLeadUnit: "days",
        reminderStartDate: "2026-03-01",
        lastServiceDate: null,
        lastServiceDescription: null,
        lastServiceProviderName: null,
      },
      {
        scheduleId: "month1",
        assetId: "a3",
        assetName: "Monthly",
        assetTag: "A-3",
        assetStatus: "active",
        nextServiceDate: "2026-03-20", // 19 days
        intervalValue: 1,
        intervalUnit: "months",
        reminderLeadValue: 5,
        reminderLeadUnit: "days",
        reminderStartDate: "2026-03-15",
        lastServiceDate: null,
        lastServiceDescription: null,
        lastServiceProviderName: null,
      },
      {
        scheduleId: "upcoming1",
        assetId: "a4",
        assetName: "Far",
        assetTag: "A-4",
        assetStatus: "active",
        nextServiceDate: "2026-06-01", // ~3 months
        intervalValue: 1,
        intervalUnit: "months",
        reminderLeadValue: 5,
        reminderLeadUnit: "days",
        reminderStartDate: "2026-05-26",
        lastServiceDate: null,
        lastServiceDescription: null,
        lastServiceProviderName: null,
      },
    ]);

    renderWithClient(<ServicesScheduledList />);

    await waitFor(() => {
      expect(screen.getByText("Late")).toBeInTheDocument();
    });

    expect(screen.getByTestId("services-group-overdue")).toBeInTheDocument();
    expect(screen.getByTestId("services-group-thisWeek")).toBeInTheDocument();
    expect(screen.getByTestId("services-group-thisMonth")).toBeInTheDocument();
    expect(screen.getByTestId("services-group-upcoming")).toBeInTheDocument();
    expect(screen.getAllByText(/days overdue/i).length).toBeGreaterThan(0);
  });

  it("renders empty state when no schedules exist", async () => {
    listScheduledAssetsMock.mockResolvedValue([]);

    renderWithClient(<ServicesScheduledList />);

    await waitFor(() => {
      expect(screen.getByText("No scheduled assets yet.")).toBeInTheDocument();
    });
  });
});
