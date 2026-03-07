import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { ServiceRecordForm } from "@/components/services/service-record-form";

const mockUseQuery = vi.fn();
const createRecordMock = vi.fn().mockResolvedValue({ recordId: "record1" });
const updateRecordMock = vi.fn().mockResolvedValue(null);
const completeScheduledServiceMock = vi
  .fn()
  .mockResolvedValue({ recordId: "record1", nextServiceDate: "2026-09-04" });

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (reference: unknown) => {
    const functionName = getFunctionName(reference as never);
    if (functionName === "serviceRecords:createRecord") {
      return createRecordMock;
    }
    if (functionName === "serviceRecords:updateRecord") {
      return updateRecordMock;
    }
    if (functionName === "serviceRecords:completeScheduledService") {
      return completeScheduledServiceMock;
    }
    return vi.fn();
  },
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

describe("ServiceRecordForm", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    createRecordMock.mockClear();
    updateRecordMock.mockClear();
    completeScheduledServiceMock.mockClear();
  });

  it("requires standard fields and submits manual records with dynamic values", async () => {
    const user = userEvent.setup();
    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "serviceRecords:getRecordFormDefinition") {
        return {
          assetId: "asset1",
          assetName: "Generator",
          assetTag: "AST-0001",
          serviceGroupId: "group1",
          serviceGroupName: "Engine checks",
          scheduleId: "schedule1",
          nextServiceDate: "2026-03-10",
          fields: [
            {
              _id: "field1",
              label: "Technician note",
              fieldType: "text",
              required: true,
              options: [],
              sortOrder: 0,
            },
          ],
        };
      }
      if (functionName === "serviceProviders:listProviderOptions") {
        return [
          {
            _id: "provider1",
            name: "Dockside Repair",
          },
        ];
      }
      return undefined;
    });

    render(<ServiceRecordForm assetId={"asset1" as never} />);

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

    expect(createRecordMock).toHaveBeenCalledWith({
      assetId: "asset1",
      serviceDate: "2026-03-04",
      description: "Completed manual service",
      cost: 125.5,
      providerId: "provider1",
      values: {
        field1: "Checked belts",
      },
    });
    expect(screen.getByText("Attachments for record1")).toBeInTheDocument();
  });
});
