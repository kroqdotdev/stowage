import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/lib/use-app-date-format", () => ({
  useAppDateFormat: () => "DD-MM-YYYY",
}));

import { AttachmentList } from "@/components/attachments/attachment-list";

describe("AttachmentList", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseMutation.mockReset();
    mockUseMutation.mockReturnValue(vi.fn());
  });

  it("shows loading state when attachments are undefined", () => {
    mockUseQuery.mockReturnValue(undefined);

    render(<AttachmentList assetId={"asset1" as never} />);

    expect(screen.getByText("Loading attachments...")).toBeInTheDocument();
  });

  it("shows empty state when no attachments", () => {
    mockUseQuery.mockReturnValue([]);

    render(<AttachmentList assetId={"asset1" as never} />);

    expect(screen.getByText("No attachments yet.")).toBeInTheDocument();
  });

  it("renders attachment cards when items exist", () => {
    mockUseQuery.mockReturnValue([
      {
        _id: "att1" as never,
        _creationTime: 1,
        assetId: "asset1" as never,
        fileName: "photo.webp",
        fileType: "image/webp",
        fileExtension: "webp",
        fileKind: "image",
        fileSizeOriginal: 1024,
        fileSizeOptimized: 800,
        status: "ready",
        optimizationAttempts: 1,
        optimizationError: null,
        uploadedBy: "user1" as never,
        uploadedAt: 1,
        updatedAt: 1,
        url: "https://example.com/photo.webp",
      },
    ]);

    render(<AttachmentList assetId={"asset1" as never} />);

    expect(screen.getByText("photo.webp")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });
});
