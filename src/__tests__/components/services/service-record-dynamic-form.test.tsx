import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { ServiceRecordDynamicForm } from "@/components/services/service-record-dynamic-form";

const mockUseQuery = vi.fn();
const createRecordMock = vi.fn().mockResolvedValue({ recordId: "record1" });
const uploadUrlMock = vi.fn();
const createAttachmentMock = vi.fn();
const deleteAttachmentMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (reference: unknown) => {
    const functionName = getFunctionName(reference as never);
    if (functionName === "serviceRecords:createRecord") {
      return createRecordMock;
    }
    if (functionName === "serviceRecordAttachments:generateUploadUrl") {
      return uploadUrlMock;
    }
    if (functionName === "serviceRecordAttachments:createAttachment") {
      return createAttachmentMock;
    }
    if (functionName === "serviceRecordAttachments:deleteAttachment") {
      return deleteAttachmentMock;
    }
    return vi.fn();
  },
}));

describe("ServiceRecordDynamicForm", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    createRecordMock.mockClear();
    uploadUrlMock.mockClear();
    createAttachmentMock.mockClear();
    deleteAttachmentMock.mockClear();
  });

  it("disables submit until required fields are valid and submits values", async () => {
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
            {
              _id: "field2",
              label: "Verified",
              fieldType: "checkbox",
              required: true,
              options: [],
              sortOrder: 1,
            },
          ],
        };
      }

      if (functionName === "serviceRecordAttachments:listAttachments") {
        return [];
      }

      return undefined;
    });

    render(<ServiceRecordDynamicForm assetId={"asset1" as never} />);

    const submitButton = screen.getByRole("button", { name: "Log service record" });
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText(/Technician note/i), "Completed");
    expect(submitButton).toBeDisabled();

    await user.click(screen.getByLabelText(/Verified/i));
    expect(submitButton).toBeEnabled();

    await user.click(submitButton);
    expect(createRecordMock).toHaveBeenCalledWith({
      assetId: "asset1",
      values: {
        field1: "Completed",
        field2: true,
      },
      scheduledForDate: "2026-03-10",
    });
  });
});
