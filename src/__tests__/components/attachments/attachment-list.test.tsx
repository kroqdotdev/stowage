import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const listAttachmentsMock = vi.fn();

vi.mock("@/lib/api/attachments", () => ({
  listAttachments: (assetId: string) => listAttachmentsMock(assetId),
  deleteAttachment: vi.fn(),
  retryAttachment: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/use-app-date-format", () => ({
  useAppDateFormat: () => "DD-MM-YYYY",
}));

import { AttachmentList } from "@/components/attachments/attachment-list";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("AttachmentList", () => {
  beforeEach(() => {
    listAttachmentsMock.mockReset();
  });

  it("shows loading state when attachments are pending", () => {
    listAttachmentsMock.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<AttachmentList assetId="asset1" />);

    expect(screen.getByText("Loading attachments...")).toBeInTheDocument();
  });

  it("shows empty state when no attachments", async () => {
    listAttachmentsMock.mockResolvedValue([]);

    renderWithClient(<AttachmentList assetId="asset1" />);

    await waitFor(() => {
      expect(screen.getByText("No attachments yet.")).toBeInTheDocument();
    });
  });

  it("renders attachment cards when items exist", async () => {
    listAttachmentsMock.mockResolvedValue([
      {
        id: "att1",
        assetId: "asset1",
        fileName: "photo.webp",
        fileType: "image/webp",
        fileExtension: "webp",
        fileKind: "image",
        fileSizeOriginal: 1024,
        fileSizeOptimized: 800,
        status: "ready",
        optimizationAttempts: 1,
        optimizationError: null,
        uploadedBy: "user1",
        uploadedAt: 1,
        updatedAt: 1,
        url: "https://example.com/photo.webp",
      },
    ]);

    renderWithClient(<AttachmentList assetId="asset1" />);

    await waitFor(() => {
      expect(screen.getByText("photo.webp")).toBeInTheDocument();
    });
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });
});
