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

  it("renders schedule rows", async () => {
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
    expect(screen.getByText("Due: 06-03-2026")).toBeInTheDocument();
    expect(
      screen.getByText("Last service 01-02-2026 • Dockside Repair"),
    ).toBeInTheDocument();
  });

  it("renders empty state when no schedules exist", async () => {
    listScheduledAssetsMock.mockResolvedValue([]);

    renderWithClient(<ServicesScheduledList />);

    await waitFor(() => {
      expect(screen.getByText("No scheduled assets yet.")).toBeInTheDocument();
    });
  });
});
