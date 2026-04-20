import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileUploadZone } from "@/components/attachments/file-upload-zone";

const listAttachmentsMock = vi.fn();
const getStorageUsageMock = vi.fn();

vi.mock("@/lib/api/attachments", () => ({
  listAttachments: (assetId: string) => listAttachmentsMock(assetId),
  getStorageUsage: () => getStorageUsageMock(),
}));

class MockXMLHttpRequest {
  static instances: MockXMLHttpRequest[] = [];
  status = 0;
  responseType = "";
  response: unknown = null;
  withCredentials = false;
  upload = {
    onprogress: null as ((event: ProgressEvent) => void) | null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  open = vi.fn();
  setRequestHeader = vi.fn();

  constructor() {
    MockXMLHttpRequest.instances.push(this);
  }

  send() {
    this.upload.onprogress?.({
      lengthComputable: true,
      loaded: 1,
      total: 1,
    } as unknown as ProgressEvent);
    this.status = 201;
    this.response = { attachmentId: "att1" };
    this.onload?.();
  }
}

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("FileUploadZone", () => {
  const originalXMLHttpRequest = globalThis.XMLHttpRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.XMLHttpRequest =
      MockXMLHttpRequest as unknown as typeof XMLHttpRequest;
    listAttachmentsMock.mockResolvedValue([]);
    getStorageUsageMock.mockResolvedValue({
      usedBytes: 0,
      limitBytes: null,
    });
    MockXMLHttpRequest.instances = [];
  });

  afterEach(() => {
    globalThis.XMLHttpRequest = originalXMLHttpRequest;
    vi.useRealTimers();
  });

  it("uploads accepted files via multipart POST to /api/attachments", async () => {
    const user = userEvent.setup();

    renderWithClient(<FileUploadZone assetId="asset1" />);

    const input = screen.getByTestId("attachment-file-input");
    const file = new File(["pdf"], "manual.pdf", { type: "application/pdf" });
    await user.upload(input, file);

    await waitFor(() => {
      expect(MockXMLHttpRequest.instances).toHaveLength(1);
    });
    const [xhr] = MockXMLHttpRequest.instances;
    expect(xhr.open).toHaveBeenCalledWith("POST", "/api/attachments", true);
    expect(screen.getByText("manual.pdf")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Queued for optimization")).toBeInTheDocument();
    });
  });

  it("rejects unsupported file extensions", async () => {
    const user = userEvent.setup();

    renderWithClient(<FileUploadZone assetId="asset1" />);

    const input = screen.getByTestId("attachment-file-input");
    const file = new File(["bin"], "payload.exe", {
      type: "application/octet-stream",
    });
    await user.upload(input, file);

    expect(MockXMLHttpRequest.instances).toHaveLength(0);
  });

  it("updates queued jobs to ready when server reports ready status", async () => {
    const user = userEvent.setup();
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");

    listAttachmentsMock.mockImplementation(async () => {
      return MockXMLHttpRequest.instances.length > 0
        ? [
            {
              id: "att1",
              assetId: "asset1",
              fileName: "manual.pdf",
              fileType: "application/pdf",
              fileExtension: "pdf",
              fileKind: "pdf",
              fileSizeOriginal: 10,
              fileSizeOptimized: 10,
              status: "ready",
              optimizationAttempts: 1,
              optimizationError: null,
              uploadedBy: "user1",
              uploadedAt: 1,
              updatedAt: 1,
              url: "https://example.com/manual.pdf",
            },
          ]
        : [];
    });

    renderWithClient(<FileUploadZone assetId="asset1" />);

    const input = screen.getByTestId("attachment-file-input");
    const file = new File(["pdf"], "manual.pdf", { type: "application/pdf" });
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText("Ready")).toBeInTheDocument();
    });

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5_000);
  });

  describe("storage quota UI", () => {
    it("does not show storage bar when no limit is configured", async () => {
      getStorageUsageMock.mockResolvedValue({
        usedBytes: 1024,
        limitBytes: null,
      });

      renderWithClient(<FileUploadZone assetId="asset1" />);

      await waitFor(() => {
        expect(getStorageUsageMock).toHaveBeenCalled();
      });
      expect(screen.queryByText("Storage")).not.toBeInTheDocument();
    });

    it("shows storage usage bar when a limit is configured", async () => {
      const usedBytes = 5 * 1024 * 1024 * 1024;
      const limitBytes = 15 * 1024 * 1024 * 1024;
      getStorageUsageMock.mockResolvedValue({ usedBytes, limitBytes });

      renderWithClient(<FileUploadZone assetId="asset1" />);

      await waitFor(() => {
        expect(screen.getByText("Storage")).toBeInTheDocument();
      });
      expect(screen.getByText("5.0 GB / 15.0 GB")).toBeInTheDocument();
    });

    it("shows MB for usage under 1 GB", async () => {
      const usedBytes = 200 * 1024 * 1024;
      const limitBytes = 15 * 1024 * 1024 * 1024;
      getStorageUsageMock.mockResolvedValue({ usedBytes, limitBytes });

      renderWithClient(<FileUploadZone assetId="asset1" />);

      await waitFor(() => {
        expect(screen.getByText("200 MB / 15.0 GB")).toBeInTheDocument();
      });
    });

    it("blocks uploads when quota is exceeded", async () => {
      const user = userEvent.setup();
      const limitBytes = 15 * 1024 * 1024 * 1024;
      getStorageUsageMock.mockResolvedValue({
        usedBytes: limitBytes,
        limitBytes,
      });

      renderWithClient(<FileUploadZone assetId="asset1" />);

      await waitFor(() => {
        expect(screen.getByText("Storage")).toBeInTheDocument();
      });

      const input = screen.getByTestId("attachment-file-input");
      const file = new File(["pdf"], "manual.pdf", {
        type: "application/pdf",
      });
      await user.upload(input, file);

      expect(MockXMLHttpRequest.instances).toHaveLength(0);
    });
  });
});
