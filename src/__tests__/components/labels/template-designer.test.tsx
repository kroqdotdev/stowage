import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { TemplateDesigner } from "@/components/labels/template-designer";
import type {
  LabelPreviewAsset,
  LabelTemplate,
} from "@/components/labels/types";
import type { FieldDefinition } from "@/components/fields/types";

vi.mock("@/lib/api/label-templates", () => ({
  createLabelTemplate: vi.fn(),
  updateLabelTemplate: vi.fn(),
  deleteLabelTemplate: vi.fn(),
}));

vi.mock("@/components/labels/template-canvas", () => ({
  TemplateCanvas: (props: {
    template: { name: string; elements: Array<{ id: string }> };
    selectedElementId: string | null;
  }) => (
    <div data-testid="mock-template-canvas">
      <span data-testid="canvas-template-name">{props.template.name}</span>
      <span data-testid="canvas-element-count">
        {props.template.elements.length}
      </span>
      <span data-testid="canvas-selected-element">
        {props.selectedElementId ?? "none"}
      </span>
    </div>
  ),
}));

vi.mock("@/components/labels/element-properties", () => ({
  ElementProperties: (props: {
    template: { name: string };
    canEdit: boolean;
    dirty: boolean;
  }) => (
    <div data-testid="mock-element-properties">
      <span data-testid="props-template-name">{props.template.name}</span>
      <span data-testid="props-can-edit">{String(props.canEdit)}</span>
      <span data-testid="props-dirty">{String(props.dirty)}</span>
    </div>
  ),
}));

vi.mock("@/components/labels/element-toolbar", () => ({
  ElementToolbar: (props: { canEdit: boolean }) => (
    <div data-testid="mock-element-toolbar">
      <span data-testid="toolbar-can-edit">{String(props.canEdit)}</span>
    </div>
  ),
}));

vi.mock("@/components/labels/label-preview", () => ({
  LabelPreview: () => <div data-testid="mock-label-preview" />,
}));

vi.mock("@/components/crud/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

const sampleTemplate: LabelTemplate = {
  id: "template-1",
  name: "Thermal 57x32 mm",
  widthMm: 57,
  heightMm: 32,
  elements: [
    {
      id: "asset-name-1",
      type: "assetName",
      xMm: 3,
      yMm: 3,
      widthMm: 24,
      heightMm: 6,
      fontSize: 9,
      fontWeight: "bold",
      textAlign: "left",
    },
  ],
  isDefault: true,
  createdAt: 1,
  updatedAt: 1,
  createdBy: "user-1",
  updatedBy: "user-1",
};

const sampleAsset: LabelPreviewAsset = {
  id: "asset-1",
  name: "Main winch",
  assetTag: "WIN-001",
  categoryName: "Deck gear",
  locationPath: "Bridge / Port",
  notes: null,
  customFieldValues: {},
};

const sampleFieldDefs: FieldDefinition[] = [];

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

describe("TemplateDesigner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the template list, canvas, toolbar, and properties panel", () => {
    renderWithClient(
      <TemplateDesigner
        currentUserRole="admin"
        templates={[sampleTemplate]}
        labelUrlBase="http://localhost:3000"
        sampleAsset={sampleAsset}
        fieldDefinitions={sampleFieldDefs}
      />,
    );

    expect(screen.getByTestId("mock-template-canvas")).toBeInTheDocument();
    expect(screen.getByTestId("mock-element-properties")).toBeInTheDocument();
    expect(screen.getByTestId("mock-element-toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("mock-label-preview")).toBeInTheDocument();

    expect(screen.getAllByText("Thermal 57x32 mm").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("57 x 32 mm")).toBeInTheDocument();
  });

  it("shows empty state when no templates exist", () => {
    renderWithClient(
      <TemplateDesigner
        currentUserRole="admin"
        templates={[]}
        labelUrlBase="http://localhost:3000"
        sampleAsset={null}
        fieldDefinitions={sampleFieldDefs}
      />,
    );

    expect(screen.getByText("No label templates yet.")).toBeInTheDocument();
  });

  it("shows the New button for admin users and hides it for regular users", () => {
    const { rerender } = renderWithClient(
      <TemplateDesigner
        currentUserRole="admin"
        templates={[sampleTemplate]}
        labelUrlBase="http://localhost:3000"
        sampleAsset={sampleAsset}
        fieldDefinitions={sampleFieldDefs}
      />,
    );

    expect(screen.getByRole("button", { name: /new/i })).toBeInTheDocument();

    rerender(
      <TemplateDesigner
        currentUserRole="user"
        templates={[sampleTemplate]}
        labelUrlBase="http://localhost:3000"
        sampleAsset={sampleAsset}
        fieldDefinitions={sampleFieldDefs}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /new/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("toolbar-can-edit")).toHaveTextContent("false");
    expect(screen.getByTestId("props-can-edit")).toHaveTextContent("false");
  });
});
