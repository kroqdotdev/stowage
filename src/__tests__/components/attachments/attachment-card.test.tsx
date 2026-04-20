import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttachmentCard } from "@/components/attachments/attachment-card";
import type { AttachmentItem } from "@/components/attachments/types";

vi.mock("@/lib/use-app-date-format", () => ({
  useAppDateFormat: () => "DD-MM-YYYY",
}));

const baseAttachment: AttachmentItem = {
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
};

describe("AttachmentCard", () => {
  it("renders ready attachments with download action", () => {
    render(
      <AttachmentCard
        attachment={baseAttachment}
        deleting={false}
        retrying={false}
        onDelete={vi.fn().mockResolvedValue(undefined)}
        onRetry={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    expect(screen.getByText("photo.webp")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download" })).toHaveAttribute(
      "href",
      "https://example.com/photo.webp",
    );
  });

  it("renders failed attachments and allows retry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn().mockResolvedValue(undefined);

    render(
      <AttachmentCard
        attachment={{
          ...baseAttachment,
          status: "failed",
          fileKind: "pdf",
          fileName: "manual.pdf",
          optimizationError: "Optimization failed",
        }}
        deleting={false}
        retrying={false}
        onDelete={vi.fn().mockResolvedValue(undefined)}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Optimization failed")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledWith("att1");
  });
});
