import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const getScheduleByAssetIdMock = vi.fn();
const listAssetServiceRecordsMock = vi.fn();
const getCurrentUserMock = vi.fn();

vi.mock("@/lib/api/service-schedules", () => ({
  getScheduleByAssetId: (assetId: string) => getScheduleByAssetIdMock(assetId),
}));

vi.mock("@/lib/api/service-records", () => ({
  listAssetServiceRecords: (assetId: string) =>
    listAssetServiceRecordsMock(assetId),
  deleteServiceRecord: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/api/auth", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

vi.mock("@/components/services/service-record-form", () => ({
  ServiceRecordForm: () => <div>Service record form</div>,
}));

vi.mock("@/components/services/service-record-attachments", () => ({
  ServiceRecordAttachments: () => <div>Record attachments</div>,
}));

vi.mock("@/lib/use-app-date-format", () => ({
  useAppDateFormat: () => "DD-MM-YYYY",
}));

import { ServiceHistory } from "@/components/services/service-history";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ServiceHistory", () => {
  beforeEach(() => {
    getScheduleByAssetIdMock.mockReset();
    listAssetServiceRecordsMock.mockReset();
    getCurrentUserMock.mockReset();
    getCurrentUserMock.mockResolvedValue({
      id: "user1",
      email: "a@x.com",
      name: "Admin User",
      role: "admin",
    });
  });

  it("renders schedule summary and service records", async () => {
    const user = userEvent.setup();
    getScheduleByAssetIdMock.mockResolvedValue({
      id: "schedule1",
      assetId: "asset1",
      nextServiceDate: "2026-03-10",
      intervalValue: 6,
      intervalUnit: "months",
      reminderLeadValue: 14,
      reminderLeadUnit: "days",
      reminderStartDate: "2026-02-24",
      createdAt: 1,
      updatedAt: 1,
      createdBy: "user1",
      updatedBy: "user1",
    });
    listAssetServiceRecordsMock.mockResolvedValue([
      {
        id: "record1",
        assetId: "asset1",
        serviceGroupId: "group1",
        serviceGroupName: "Engine checks",
        values: { field1: "Checked belts" },
        valueEntries: [
          {
            fieldId: "field1",
            label: "Technician note",
            value: "Checked belts",
          },
        ],
        scheduleId: "schedule1",
        scheduledForDate: "2026-03-10",
        serviceDate: "2026-03-04",
        description: "Completed service",
        cost: 125,
        providerId: "provider1",
        providerName: "Dockside Repair",
        completedAt: 1,
        completedBy: "user1",
        completedByName: "Admin User",
        createdAt: 1,
        updatedAt: 1,
      },
    ]);

    renderWithClient(<ServiceHistory assetId="asset1" />);

    await waitFor(() => {
      expect(screen.getByText("Next due 10-03-2026")).toBeInTheDocument();
    });
    expect(screen.getByText("Completed service")).toBeInTheDocument();

    await user.click(screen.getByText("Completed service"));
    expect(screen.getByText("Technician note")).toBeInTheDocument();
    expect(screen.getByText("Record attachments")).toBeInTheDocument();
  });

  it("renders empty state when no records exist", async () => {
    getScheduleByAssetIdMock.mockResolvedValue(null);
    listAssetServiceRecordsMock.mockResolvedValue([]);

    renderWithClient(<ServiceHistory assetId="asset1" />);

    await waitFor(() => {
      expect(screen.getByText("No service records yet.")).toBeInTheDocument();
    });
  });
});
