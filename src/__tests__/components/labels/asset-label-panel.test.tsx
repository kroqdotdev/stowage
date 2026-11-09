import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

const getDefaultLabelTemplateMock = vi.fn();
const getLabelUrlBaseMock = vi.fn();
const ensureDefaultLabelTemplatesMock = vi.fn();

vi.mock("@/lib/api/label-templates", () => ({
  getDefaultLabelTemplate: () => getDefaultLabelTemplateMock(),
  getLabelUrlBase: () => getLabelUrlBaseMock(),
  ensureDefaultLabelTemplates: () => ensureDefaultLabelTemplatesMock(),
}));

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => ({ data: { role: "admin" } }),
}));

vi.mock("@/components/labels/label-preview", () => ({
  LabelPreview: () => <div>label-preview</div>,
}));

import { AssetLabelPanel } from "@/components/labels/asset-label-panel";

const asset = {
  id: "asset1",
  name: "Drill #47",
  assetTag: "AST-0047",
} as never;

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AssetLabelPanel asset={asset} fieldDefinitions={[]} />
    </QueryClientProvider>,
  );
}

describe("AssetLabelPanel", () => {
  beforeEach(() => {
    getDefaultLabelTemplateMock.mockReset();
    getLabelUrlBaseMock.mockReset().mockResolvedValue(null);
    ensureDefaultLabelTemplatesMock.mockReset();
  });

  it("points to the Labels page without re-creating templates when none exist", async () => {
    getDefaultLabelTemplateMock.mockResolvedValue(null);
    renderPanel();

    expect(
      await screen.findByText(/No label template yet\./),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Set one up…" })).toHaveAttribute(
      "href",
      "/labels",
    );
    expect(ensureDefaultLabelTemplatesMock).not.toHaveBeenCalled();
  });

  it("links Print label to the print page for this asset", async () => {
    getDefaultLabelTemplateMock.mockResolvedValue(null);
    renderPanel();

    expect(screen.getByRole("link", { name: /Print label/ })).toHaveAttribute(
      "href",
      "/labels/print?assetId=asset1",
    );
    await screen.findByText(/No label template yet\./);
  });
});
