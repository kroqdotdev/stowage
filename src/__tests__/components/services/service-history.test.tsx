import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const listAssetServiceRecordsMock = vi.fn();
const getCurrentUserMock = vi.fn();

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

const record = {
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
};

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ServiceHistory", () => {
  beforeEach(() => {
    listAssetServiceRecordsMock.mockReset();
    getCurrentUserMock.mockReset();
    getCurrentUserMock.mockResolvedValue({
      id: "user1",
      email: "a@x.com",
      name: "Admin User",
      role: "admin",
    });
  });

  it("renders service records as a timeline with details behind a disclosure", async () => {
    const user = userEvent.setup();
    listAssetServiceRecordsMock.mockResolvedValue([record]);

    renderWithClient(<ServiceHistory assetId="asset1" />);

    expect(
      screen.getByRole("heading", { name: /Service history/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Completed service")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Service history\s*1$/ })).toBeInTheDocument();

    // Date (desktop and phone placements), what was done, and by whom.
    expect(screen.getAllByText("04-03-2026")).toHaveLength(2);
    expect(screen.getByText("Engine checks")).toBeInTheDocument();
    expect(screen.getByText("by Admin User")).toBeInTheDocument();
    expect(
      screen.getByText(/Dockside Repair · Cost 125[.,]00 · Due 10-03-2026/),
    ).toBeInTheDocument();

    // Fields, files and actions stay closed until the disclosure is opened.
    expect(screen.getByText("Technician note")).not.toBeVisible();
    expect(screen.getByText("Record attachments")).not.toBeVisible();

    await user.click(screen.getByText("Fields and files"));
    expect(screen.getByText("Technician note")).toBeVisible();
    expect(screen.getByText("Checked belts")).toBeVisible();
    expect(screen.getByText("Record attachments")).toBeVisible();
    expect(screen.getByRole("button", { name: "Edit…" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Delete…" })).toBeVisible();
  });

  it("does not schedule anything itself (the Next service panel owns that)", async () => {
    listAssetServiceRecordsMock.mockResolvedValue([record]);

    renderWithClient(<ServiceHistory assetId="asset1" />);

    await screen.findByText("Completed service");
    expect(screen.queryByText(/Next due/)).not.toBeInTheDocument();
  });

  it("hides record actions from users who neither completed the record nor are admin", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: "user2",
      email: "b@x.com",
      name: "Other User",
      role: "user",
    });
    listAssetServiceRecordsMock.mockResolvedValue([record]);

    renderWithClient(<ServiceHistory assetId="asset1" />);

    await screen.findByText("Completed service");
    expect(screen.queryByRole("button", { name: "Edit…" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete…" })).toBeNull();
  });

  it("offers Log other service… unless the Next service panel owns logging", async () => {
    const user = userEvent.setup();
    listAssetServiceRecordsMock.mockResolvedValue([]);

    const { unmount } = renderWithClient(<ServiceHistory assetId="asset1" />);
    await user.click(
      screen.getByRole("button", { name: "Log other service…" }),
    );
    expect(await screen.findByText("Service record form")).toBeInTheDocument();
    unmount();

    renderWithClient(<ServiceHistory assetId="asset1" showLogAction={false} />);
    expect(
      screen.queryByRole("button", { name: "Log other service…" }),
    ).toBeNull();
  });

  it("renders empty state when no records exist", async () => {
    listAssetServiceRecordsMock.mockResolvedValue([]);

    renderWithClient(<ServiceHistory assetId="asset1" />);

    await waitFor(() => {
      expect(screen.getByText("No service records yet.")).toBeInTheDocument();
    });
  });
});
