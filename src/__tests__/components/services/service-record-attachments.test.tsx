import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const listServiceRecordAttachmentsMock = vi.fn();

vi.mock("@/lib/api/attachments", () => ({
  listServiceRecordAttachments: (serviceRecordId: string) =>
    listServiceRecordAttachmentsMock(serviceRecordId),
  uploadServiceRecordAttachment: vi.fn().mockResolvedValue(null),
  deleteServiceRecordAttachment: vi.fn().mockResolvedValue(null),
}));

import { ServiceRecordAttachments } from "@/components/services/service-record-attachments";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ServiceRecordAttachments", () => {
  beforeEach(() => {
    listServiceRecordAttachmentsMock.mockReset();
  });

  it("shows loading state when attachments are pending", () => {
    listServiceRecordAttachmentsMock.mockImplementation(
      () => new Promise(() => {}),
    );

    renderWithClient(<ServiceRecordAttachments serviceRecordId="record1" />);

    expect(screen.getByText("Loading attachments...")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Add attachment/ }),
    ).toBeInTheDocument();
  });

  it("shows empty state when no attachments exist", async () => {
    listServiceRecordAttachmentsMock.mockResolvedValue([]);

    renderWithClient(<ServiceRecordAttachments serviceRecordId="record1" />);

    await waitFor(() => {
      expect(
        screen.getByText("No record attachments yet."),
      ).toBeInTheDocument();
    });
  });

  it("renders attachment list with file info", async () => {
    listServiceRecordAttachmentsMock.mockResolvedValue([
      {
        id: "att1",
        serviceRecordId: "record1",
        fileName: "report.pdf",
        fileType: "application/pdf",
        fileExtension: "pdf",
        fileKind: "pdf",
        fileSize: 1048576,
        uploadedBy: "user1",
        uploadedAt: 1,
        updatedAt: 1,
        url: "https://files.example.com/report.pdf",
      },
    ]);

    renderWithClient(<ServiceRecordAttachments serviceRecordId="record1" />);

    await waitFor(() => {
      expect(screen.getByText("report.pdf")).toBeInTheDocument();
    });
    expect(screen.getByText("1.0 MB")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      "https://files.example.com/report.pdf",
    );
  });
});
