import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { ServiceRecordAttachments } from "@/components/services/service-record-attachments";

const mockUseQuery = vi.fn();
const generateUploadUrlMock = vi.fn().mockResolvedValue({ uploadUrl: "https://upload.example.com" });
const createAttachmentMock = vi.fn().mockResolvedValue(null);
const deleteAttachmentMock = vi.fn().mockResolvedValue(null);

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (reference: unknown) => {
    const functionName = getFunctionName(reference as never);
    if (functionName === "serviceRecordAttachments:generateUploadUrl") {
      return generateUploadUrlMock;
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

describe("ServiceRecordAttachments", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    generateUploadUrlMock.mockClear();
    createAttachmentMock.mockClear();
    deleteAttachmentMock.mockClear();
  });

  it("shows loading state when attachments are undefined", () => {
    mockUseQuery.mockReturnValue(undefined);

    render(
      <ServiceRecordAttachments serviceRecordId={"record1" as never} />,
    );

    expect(screen.getByText("Loading attachments...")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Add attachment/ }),
    ).toBeInTheDocument();
  });

  it("shows empty state when no attachments exist", () => {
    mockUseQuery.mockReturnValue([]);

    render(
      <ServiceRecordAttachments serviceRecordId={"record1" as never} />,
    );

    expect(
      screen.getByText("No record attachments yet."),
    ).toBeInTheDocument();
  });

  it("renders attachment list with file info", () => {
    mockUseQuery.mockReturnValue([
      {
        _id: "att1" as never,
        _creationTime: 1,
        serviceRecordId: "record1" as never,
        fileName: "report.pdf",
        fileType: "application/pdf",
        fileExtension: "pdf",
        fileKind: "pdf",
        fileSize: 1048576,
        uploadedBy: "user1" as never,
        uploadedAt: 1,
        updatedAt: 1,
        url: "https://files.example.com/report.pdf",
      },
    ]);

    render(
      <ServiceRecordAttachments serviceRecordId={"record1" as never} />,
    );

    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText("1.0 MB")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      "https://files.example.com/report.pdf",
    );
  });
});
