import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("convex/react", () => ({
  useQuery: () => [],
  useMutation: () => vi.fn(),
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

vi.mock("@/components/attachments/file-upload-zone", () => ({
  FileUploadZone: () => (
    <div data-testid="file-upload-zone">Upload zone</div>
  ),
}));

import { AttachmentsPanel } from "@/components/attachments/attachments-panel";

describe("AttachmentsPanel", () => {
  it("renders upload zone and attachment list", () => {
    render(<AttachmentsPanel assetId={"asset1" as never} />);

    expect(screen.getByTestId("file-upload-zone")).toBeInTheDocument();
    expect(screen.getByText("No attachments yet.")).toBeInTheDocument();
  });
});
