import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getFunctionName } from "convex/server";
import { FileUploadZone } from "@/components/attachments/file-upload-zone";

const mockGenerateUploadUrl = vi.fn();
const mockCreateAttachment = vi.fn();
let listAttachmentsValue: Array<{
  _id: string;
  status: "pending" | "processing" | "ready" | "failed";
  optimizationError: string | null;
}> = [];

vi.mock("convex/react", () => ({
  useMutation: (reference: unknown) => {
    const functionName = getFunctionName(reference as never);
    if (functionName === "attachments:generateUploadUrl") {
      return mockGenerateUploadUrl;
    }

    if (functionName === "attachments:createAttachment") {
      return mockCreateAttachment;
    }

    throw new Error("Unexpected mutation reference");
  },
  useQuery: () => listAttachmentsValue,
}));

class MockXMLHttpRequest {
  static instances: MockXMLHttpRequest[] = [];
  status = 0;
  responseType = "";
  response: unknown = null;
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
    this.status = 200;
    this.response = { storageId: "storage1" };
    this.onload?.();
  }
}

describe("FileUploadZone", () => {
  const originalXMLHttpRequest = globalThis.XMLHttpRequest;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.XMLHttpRequest =
      MockXMLHttpRequest as unknown as typeof XMLHttpRequest;
    mockGenerateUploadUrl.mockResolvedValue({
      uploadUrl: "https://upload.test",
    });
    mockCreateAttachment.mockResolvedValue({ attachmentId: "att1" });
    listAttachmentsValue = [];
  });

  afterEach(() => {
    globalThis.XMLHttpRequest = originalXMLHttpRequest;
    vi.useRealTimers();
  });

  it("uploads accepted files and registers attachments", async () => {
    const user = userEvent.setup();

    render(<FileUploadZone assetId={"asset1" as never} />);

    const input = screen.getByTestId("attachment-file-input");
    const file = new File(["pdf"], "manual.pdf", { type: "application/pdf" });
    await user.upload(input, file);

    await waitFor(() => {
      expect(mockGenerateUploadUrl).toHaveBeenCalled();
      expect(mockCreateAttachment).toHaveBeenCalledWith({
        assetId: "asset1",
        storageId: "storage1",
        fileName: "manual.pdf",
        fileType: "application/pdf",
        fileSize: file.size,
      });
    });

    expect(screen.getByText("manual.pdf")).toBeInTheDocument();
    expect(screen.getByText("Queued for optimization")).toBeInTheDocument();
  });

  it("rejects unsupported file extensions", async () => {
    const user = userEvent.setup();

    render(<FileUploadZone assetId={"asset1" as never} />);

    const input = screen.getByTestId("attachment-file-input");
    const file = new File(["bin"], "payload.exe", {
      type: "application/octet-stream",
    });
    await user.upload(input, file);

    await waitFor(() => {
      expect(mockGenerateUploadUrl).not.toHaveBeenCalled();
      expect(mockCreateAttachment).not.toHaveBeenCalled();
    });
  });

  it("updates queued jobs to ready and removes them after 5 seconds", async () => {
    const user = userEvent.setup();
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");

    const view = render(<FileUploadZone assetId={"asset1" as never} />);

    const input = screen.getByTestId("attachment-file-input");
    const file = new File(["pdf"], "manual.pdf", { type: "application/pdf" });
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText("Queued for optimization")).toBeInTheDocument();
    });

    listAttachmentsValue = [
      { _id: "att1", status: "ready", optimizationError: null },
    ];
    view.rerender(<FileUploadZone assetId={"asset1" as never} />);

    await waitFor(() => {
      expect(screen.getByText("Ready")).toBeInTheDocument();
    });

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5_000);
  });

  it("removes queued jobs after 30 seconds when still not ready", async () => {
    const user = userEvent.setup();
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");

    render(<FileUploadZone assetId={"asset1" as never} />);

    const input = screen.getByTestId("attachment-file-input");
    const file = new File(["pdf"], "still-processing.pdf", {
      type: "application/pdf",
    });
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText("Queued for optimization")).toBeInTheDocument();
    });

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 30_000);
  });
});
