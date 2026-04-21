import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LabelPreview } from "@/components/labels/label-preview";
import type {
  LabelPreviewAsset,
  LabelTemplate,
} from "@/components/labels/types";

vi.mock("@/components/labels/barcode-renderer", () => ({
  BarcodeRenderer: ({ type, data }: { type: string; data: string }) => (
    <div data-testid={`barcode-${type}`} data-value={data}>
      {type}
    </div>
  ),
}));

const template: Pick<LabelTemplate, "widthMm" | "heightMm" | "elements"> = {
  widthMm: 57,
  heightMm: 32,
  elements: [
    {
      id: "asset-name",
      type: "assetName",
      xMm: 3,
      yMm: 3,
      widthMm: 24,
      heightMm: 6,
      fontSize: 9,
      fontWeight: "bold",
      textAlign: "left",
    },
    {
      id: "asset-tag",
      type: "assetTag",
      xMm: 3,
      yMm: 12,
      widthMm: 20,
      heightMm: 5,
      fontSize: 8,
      fontWeight: "bold",
      textAlign: "left",
      uppercase: true,
    },
    {
      id: "field",
      type: "customField",
      xMm: 3,
      yMm: 18,
      widthMm: 20,
      heightMm: 5,
      fieldId: "field-1" as never,
      fontSize: 7,
      textAlign: "left",
    },
    {
      id: "matrix",
      type: "dataMatrix",
      xMm: 38,
      yMm: 6,
      widthMm: 14,
      heightMm: 14,
    },
  ],
};

const asset: LabelPreviewAsset = {
  id: "asset-1",
  name: "Main winch",
  assetTag: "WIN-001",
  categoryName: "Deck gear",
  locationPath: "Bridge / Port",
  notes: null,
  customFieldValues: {
    "field-1": "A-14",
  },
};

describe("LabelPreview", () => {
  it("renders resolved asset values inside the template", () => {
    render(
      <LabelPreview
        template={template}
        asset={asset}
        origin="https://stowage.test"
        fieldDefinitions={[
          {
            id: "field-1" as never,
            name: "Bin",
            fieldType: "text",
            options: [],
            required: false,
            sortOrder: 0,
            usageCount: 0,
            createdAt: 1,
            updatedAt: 1,
          },
        ]}
        scale={1}
      />,
    );

    expect(screen.getByText("Main winch")).toBeInTheDocument();
    expect(screen.getByText("WIN-001")).toBeInTheDocument();
    expect(screen.getByText("A-14")).toBeInTheDocument();
  });

  it("encodes the asset detail URL for barcode elements", () => {
    render(
      <LabelPreview
        template={template}
        asset={asset}
        origin="https://stowage.test"
        scale={1}
      />,
    );

    expect(screen.getByTestId("barcode-datamatrix")).toHaveAttribute(
      "data-value",
      "https://stowage.test/assets/asset-1",
    );
  });

  it("renders the surface at the template dimensions", () => {
    render(
      <LabelPreview
        template={template}
        asset={asset}
        origin="https://stowage.test"
        scale={1}
      />,
    );

    const surface = screen.getByTestId("label-preview-surface");
    expect(surface).toHaveAttribute("data-label-width", "57");
    expect(surface).toHaveAttribute("data-label-height", "32");
    expect(surface).toHaveStyle({ width: "57mm", height: "32mm" });
  });
});
