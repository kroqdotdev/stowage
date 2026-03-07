import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { LabelPrintPageClient } from "@/components/labels/label-print-page-client";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
let currentSearchParams = new URLSearchParams("assetId=asset-1");
let mockBarcodeState: "loading" | "ready" | "error" = "loading";

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
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

describe("LabelPrintPageClient", () => {
  beforeEach(() => {
    mockBarcodeState = "loading";
    currentSearchParams = new URLSearchParams("assetId=asset-1");
    mockUseQuery.mockReset();
    mockUseMutation.mockReset();
    mockUseMutation.mockReturnValue(vi.fn());

    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);

      if (functionName === "users:getCurrentUser") {
        return { _id: "user-1", role: "admin" };
      }
      if (functionName === "labelTemplates:listTemplates") {
        return [
          {
            _id: "template-1",
            _creationTime: 1,
            name: "Thermal 57x32 mm",
            widthMm: 57,
            heightMm: 32,
            elements: [],
            isDefault: true,
            createdAt: 1,
            updatedAt: 1,
            createdBy: "user-1",
            updatedBy: "user-1",
          },
        ];
      }
      if (functionName === "labelTemplates:getDefaultTemplate") {
        return {
          _id: "template-1",
          _creationTime: 1,
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
      }
      if (functionName === "labelTemplates:getLabelUrlBase") {
        return "http://localhost:3000";
      }
      if (functionName === "customFields:listFieldDefinitions") {
        return [];
      }
      if (functionName === "assets:getAssetsForLabels") {
        return [
          {
            _id: "asset-1",
            name: "Main winch",
            assetTag: "WIN-001",
            categoryName: null,
            locationPath: null,
            notes: null,
            customFieldValues: {},
          },
        ];
      }

      return undefined;
    });
  });

  it("disables printing until barcode rendering is ready", async () => {
    const { rerender } = render(<LabelPrintPageClient />);

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
