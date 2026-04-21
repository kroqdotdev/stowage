import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const listAttachmentsMock = vi.fn();
const getStorageUsageMock = vi.fn();

vi.mock("@/lib/api/attachments", () => ({
  listAttachments: (assetId: string) => listAttachmentsMock(assetId),
  getStorageUsage: () => getStorageUsageMock(),
  deleteAttachment: vi.fn(),
  retryAttachment: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/use-app-date-format", () => ({
  useAppDateFormat: () => "DD-MM-YYYY",
}));

vi.mock("@/components/attachments/file-upload-zone", () => ({
  FileUploadZone: () => <div data-testid="file-upload-zone">Upload zone</div>,
}));

import { AttachmentsPanel } from "@/components/attachments/attachments-panel";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("AttachmentsPanel", () => {
  it("renders upload zone and empty attachment list", async () => {
    listAttachmentsMock.mockResolvedValue([]);
    getStorageUsageMock.mockResolvedValue({
      usedBytes: 0,
      limitBytes: null,
    });

    renderWithClient(<AttachmentsPanel assetId="asset1" />);

    expect(screen.getByTestId("file-upload-zone")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("No attachments yet.")).toBeInTheDocument();
    });
  });
});
