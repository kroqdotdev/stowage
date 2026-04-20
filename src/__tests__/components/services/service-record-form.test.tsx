import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const getServiceRecordFormMock = vi.fn();
const listServiceProviderOptionsMock = vi.fn();
const createServiceRecordMock = vi
  .fn()
  .mockResolvedValue({ recordId: "record1" });

vi.mock("@/lib/api/service-records", () => ({
  getServiceRecordForm: (assetId: string, recordId?: string) =>
    getServiceRecordFormMock(assetId, recordId),
  createServiceRecord: (input: unknown) => createServiceRecordMock(input),
  updateServiceRecord: vi.fn().mockResolvedValue(null),
  completeScheduledService: vi
    .fn()
    .mockResolvedValue({ recordId: "record1", nextServiceDate: "2026-09-04" }),
}));

vi.mock("@/lib/api/service-providers", () => ({
  listServiceProviderOptions: () => listServiceProviderOptionsMock(),
}));

vi.mock("@/components/services/service-record-attachments", () => ({
  ServiceRecordAttachments: ({
    serviceRecordId,
  }: {
    serviceRecordId: string;
  }) => <div>Attachments for {serviceRecordId}</div>,
}));

vi.mock("@/lib/use-today-iso-date", () => ({
  useTodayIsoDate: () => "2026-03-04",
}));

import { ServiceRecordForm } from "@/components/services/service-record-form";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ServiceRecordForm", () => {
  beforeEach(() => {
    getServiceRecordFormMock.mockReset();
    listServiceProviderOptionsMock.mockReset();
    createServiceRecordMock.mockClear();
  });

  it("requires standard fields and submits manual records with dynamic values", async () => {
    const user = userEvent.setup();
    getServiceRecordFormMock.mockResolvedValue({
      assetId: "asset1",
      assetName: "Generator",
      assetTag: "AST-0001",
      serviceGroupId: "group1",
      serviceGroupName: "Engine checks",
      scheduleId: "schedule1",
      nextServiceDate: "2026-03-10",
      fields: [
        {
          id: "field1",
          label: "Technician note",
          fieldType: "text",
          required: true,
          options: [],
          sortOrder: 0,
        },
      ],
    });
    listServiceProviderOptionsMock.mockResolvedValue([
      { id: "provider1", name: "Dockside Repair" },
    ]);

    renderWithClient(<ServiceRecordForm assetId="asset1" />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Log service" }),
      ).toBeInTheDocument();
    });
    const submitButton = screen.getByRole("button", { name: "Log service" });
    expect(submitButton).toBeDisabled();

    await user.type(
      screen.getByLabelText(/^Description/i),
      "Completed manual service",
    );
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText(/Technician note/i), "Checked belts");
    expect(submitButton).toBeEnabled();

    await user.click(screen.getByRole("combobox", { name: /Provider/i }));
    await user.click(
      await screen.findByRole("option", { name: "Dockside Repair" }),
    );
    await user.type(screen.getByLabelText(/^Cost/i), "125.50");

    await user.click(submitButton);

    await waitFor(() => {
      expect(createServiceRecordMock).toHaveBeenCalledWith({
        assetId: "asset1",
        serviceDate: "2026-03-04",
        description: "Completed manual service",
        cost: 125.5,
        providerId: "provider1",
        values: {
          field1: "Checked belts",
        },
      });
    });
    expect(screen.getByText("Attachments for record1")).toBeInTheDocument();
  });
});
