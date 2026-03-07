import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TemplateDesigner } from "@/components/labels/template-designer";
import type {
  LabelPreviewAsset,
  LabelTemplate,
} from "@/components/labels/types";
import type { FieldDefinition } from "@/components/fields/types";

const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
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
  _id: "template-1" as never,
  _creationTime: 1,
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
  createdBy: "user-1" as never,
  updatedBy: "user-1" as never,
};

const sampleAsset: LabelPreviewAsset = {
  _id: "asset-1" as never,
  name: "Main winch",
  assetTag: "WIN-001",
  categoryName: "Deck gear",
  locationPath: "Bridge / Port",
  notes: null,
  customFieldValues: {},
};

const sampleFieldDefs: FieldDefinition[] = [];

describe("TemplateDesigner", () => {
  beforeEach(() => {
    mockUseMutation.mockReset();
    mockUseMutation.mockReturnValue(vi.fn());
  });

  it("renders the template list, canvas, toolbar, and properties panel", () => {
    render(
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

    // Template name appears in both the list and the canvas mock
    expect(screen.getAllByText("Thermal 57x32 mm").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("57 x 32 mm")).toBeInTheDocument();
  });

  it("shows empty state when no templates exist", () => {
    render(
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
    const { rerender } = render(
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
