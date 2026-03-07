import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { ServiceHistory } from "@/components/services/service-history";

const mockUseQuery = vi.fn();
const deleteRecordMock = vi.fn().mockResolvedValue(null);

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (reference: unknown) => {
    const functionName = getFunctionName(reference as never);
    if (functionName === "serviceRecords:deleteRecord") {
      return deleteRecordMock;
    }
    return vi.fn();
  },
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

describe("ServiceHistory", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    deleteRecordMock.mockClear();
  });

  it("renders schedule summary and service records", async () => {
    const user = userEvent.setup();
    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "users:getCurrentUser") {
        return { _id: "user1", role: "admin" };
      }
      if (functionName === "serviceSchedules:getScheduleByAssetId") {
        return {
          nextServiceDate: "2026-03-10",
          intervalValue: 6,
          intervalUnit: "months",
          reminderStartDate: "2026-02-24",
        };
      }
      if (functionName === "serviceRecords:listAssetRecords") {
        return [
          {
            _id: "record1",
            _creationTime: 1,
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
        ];
      }
      return undefined;
    });

    render(<ServiceHistory assetId={"asset1" as never} />);

    expect(screen.getByText("Next due 10-03-2026")).toBeInTheDocument();
    expect(screen.getByText("Completed service")).toBeInTheDocument();

    await user.click(screen.getByText("Completed service"));
    expect(screen.getByText("Technician note")).toBeInTheDocument();
    expect(screen.getByText("Record attachments")).toBeInTheDocument();
  });

  it("renders empty state when no records exist", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "users:getCurrentUser") {
        return { _id: "user1", role: "admin" };
      }
      if (functionName === "serviceSchedules:getScheduleByAssetId") {
        return null;
      }
      if (functionName === "serviceRecords:listAssetRecords") {
        return [];
      }
      return undefined;
    });

    render(<ServiceHistory assetId={"asset1" as never} />);

    expect(screen.getByText("No service records yet.")).toBeInTheDocument();
  });
});
