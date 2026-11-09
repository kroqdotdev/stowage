import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const listAttachmentsMock = vi.fn();

vi.mock("@/lib/api/attachments", () => ({
  listAttachments: (assetId: string) => listAttachmentsMock(assetId),
  uploadAttachment: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AssetPhotoSlot } from "@/components/assets/asset-photo-slot";

function image(status: string, url: string | null = null) {
  return { id: `att-${status}`, fileKind: "image", status, url };
}

function renderSlot() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AssetPhotoSlot assetId="asset1" assetName="Drill #47" />
    </QueryClientProvider>,
  );
}

describe("AssetPhotoSlot", () => {
  beforeEach(() => {
    listAttachmentsMock.mockReset();
  });

  it("offers Add photo… when the asset has no image", async () => {
    listAttachmentsMock.mockResolvedValue([]);
    renderSlot();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Add photo…" })).toBeEnabled(),
    );
  });

  it("shows the first ready image", async () => {
    listAttachmentsMock.mockResolvedValue([
      image("ready", "https://pb/img.jpg"),
    ]);
    renderSlot();
    const img = await screen.findByRole("img", { name: "Drill #47" });
    expect(img).toHaveAttribute("src", "https://pb/img.jpg");
  });

  it("says Processing photo… while an upload is optimised, then shows it once ready", async () => {
    listAttachmentsMock
      .mockResolvedValueOnce([image("pending")])
      .mockResolvedValue([image("ready", "https://pb/img.jpg")]);
    renderSlot();

    const button = await screen.findByRole("button", {
      name: "Processing photo…",
    });
    expect(button).toBeDisabled();

    // The slot polls on its own while the image is pending.
    expect(
      await screen.findByRole("img", { name: "Drill #47" }, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(listAttachmentsMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
