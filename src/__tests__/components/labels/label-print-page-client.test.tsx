import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

let currentSearchParams = new URLSearchParams("assetId=asset-1");
let mockBarcodeState: "loading" | "ready" | "error" = "loading";

const listLabelTemplatesMock = vi.fn();
const getDefaultLabelTemplateMock = vi.fn();
const getLabelUrlBaseMock = vi.fn();
const getAssetsForLabelsMock = vi.fn();
const listCustomFieldsMock = vi.fn();
const getCurrentUserMock = vi.fn();

vi.mock("@/lib/api/label-templates", () => ({
  listLabelTemplates: () => listLabelTemplatesMock(),
  getDefaultLabelTemplate: () => getDefaultLabelTemplateMock(),
  getLabelUrlBase: () => getLabelUrlBaseMock(),
  ensureDefaultLabelTemplates: vi.fn().mockResolvedValue({ seeded: false }),
}));

vi.mock("@/lib/api/assets", () => ({
  getAssetsForLabels: (ids: string[]) => getAssetsForLabelsMock(ids),
}));

vi.mock("@/lib/api/custom-fields", () => ({
  listCustomFields: () => listCustomFieldsMock(),
}));

vi.mock("@/lib/api/auth", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => currentSearchParams,
}));

vi.mock("@/components/labels/label-print", () => ({
  LabelPrint: () => (
    <div data-testid="mock-label-print">
      <div
        data-barcode-type="datamatrix"
        data-barcode-state={mockBarcodeState}
      />
    </div>
  ),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { LabelPrintPageClient } from "@/components/labels/label-print-page-client";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={qc}>{ui}</QueryClientProvider>,
  );
  return {
    ...result,
    rerender: (next: React.ReactElement) =>
      result.rerender(
        <QueryClientProvider client={qc}>{next}</QueryClientProvider>,
      ),
  };
}

const sampleTemplate = {
  id: "template-1",
  name: "Thermal 57x32 mm",
  widthMm: 57,
  heightMm: 32,
  elements: [],
  isDefault: true,
  createdAt: 1,
  updatedAt: 1,
  createdBy: "user-1",
  updatedBy: "user-1",
};

describe("LabelPrintPageClient", () => {
  beforeEach(() => {
    mockBarcodeState = "loading";
    currentSearchParams = new URLSearchParams("assetId=asset-1");

    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "a@x.com",
      name: "Admin",
      role: "admin",
    });
    listLabelTemplatesMock.mockResolvedValue([sampleTemplate]);
    getDefaultLabelTemplateMock.mockResolvedValue(sampleTemplate);
    getLabelUrlBaseMock.mockResolvedValue("http://localhost:3000");
    listCustomFieldsMock.mockResolvedValue([]);
    getAssetsForLabelsMock.mockResolvedValue([
      {
        id: "asset-1",
        name: "Main winch",
        assetTag: "WIN-001",
        categoryName: null,
        locationPath: null,
        notes: null,
        customFieldValues: {},
      },
    ]);
  });

  it("disables printing until barcode rendering is ready", async () => {
    const { rerender } = renderWithClient(<LabelPrintPageClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Print now" })).toBeDisabled();
    });
    expect(
      screen.getByText(/Preparing barcode and Data Matrix output/i),
    ).toBeInTheDocument();

    mockBarcodeState = "ready";
    rerender(<LabelPrintPageClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Print now" })).toBeEnabled();
    });
  });
});
