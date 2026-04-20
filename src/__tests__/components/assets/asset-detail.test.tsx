import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AssetDetail } from "@/components/assets/asset-detail";
import type { AssetDetail as AssetDetailType } from "@/components/assets/types";
import type { FieldDefinition } from "@/components/fields/types";

vi.mock("@/lib/use-app-date-format", () => ({
  useAppDateFormat: () => "DD-MM-YYYY",
}));

vi.mock("@/components/fields/dynamic-field-display", () => ({
  DynamicFieldDisplay: ({ definition }: { definition: { name: string } }) => (
    <span>field:{definition.name}</span>
  ),
}));

vi.mock("@/components/attachments/attachments-panel", () => ({
  AttachmentsPanel: () => <div>attachments-panel</div>,
}));

vi.mock("@/components/services/asset-service-records-panel", () => ({
  AssetServiceRecordsPanel: () => <div>service-records-panel</div>,
}));

const baseAsset: AssetDetailType = {
  _id: "asset1" as never,
  _creationTime: 1,
  name: "Core Router",
  assetTag: "IT-0042",
  status: "active",
  categoryId: "cat1" as never,
  locationId: "loc1" as never,
  serviceGroupId: null,
  notes: "Main network router",
  customFieldValues: { field1: "SN-12345" },
  createdBy: "user1" as never,
  updatedBy: "user1" as never,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  category: {
    _id: "cat1" as never,
    name: "Networking",
    prefix: "NET",
    color: "#3b82f6",
  },
  location: {
    _id: "loc1" as never,
    name: "Server Room",
    parentId: null,
    path: "Building A / Server Room",
  },
  serviceGroup: null,
  tags: [
    {
      _id: "tag1" as never,
      _creationTime: 1,
      name: "Critical",
      color: "#ef4444",
      createdAt: 1,
      updatedAt: 1,
    },
    {
      _id: "tag2" as never,
      _creationTime: 2,
      name: "Production",
      color: "#22c55e",
      createdAt: 2,
      updatedAt: 2,
    },
  ],
};

const fieldDefinitions: FieldDefinition[] = [
  {
    id: "field1",
    name: "Serial Number",
    fieldType: "text",
    options: [],
    required: false,
    sortOrder: 0,
    usageCount: 0,
    createdAt: 1,
    updatedAt: 1,
  },
];

const defaultProps = {
  asset: baseAsset,
  fieldDefinitions,
  canDelete: true,
  deleting: false,
  updatingStatus: false,
  onStatusChange: vi.fn(),
  onDelete: vi.fn().mockResolvedValue(undefined),
};

function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("AssetDetail", () => {
  it("renders basic asset information", () => {
    renderWithProviders(<AssetDetail {...defaultProps} />);

    expect(screen.getByText("Core Router")).toBeInTheDocument();
    expect(screen.getByText("IT-0042")).toBeInTheDocument();
    expect(screen.getByText("Networking")).toBeInTheDocument();
    expect(
      screen.getByText("Building A / Server Room"),
    ).toBeInTheDocument();
  });

  it("renders tags when present", () => {
    renderWithProviders(<AssetDetail {...defaultProps} />);

    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getByText("Production")).toBeInTheDocument();
  });

  it("renders notes", () => {
    renderWithProviders(<AssetDetail {...defaultProps} />);

    expect(screen.getByText("Main network router")).toBeInTheDocument();
  });

  it("shows 'No notes' when notes are null", () => {
    renderWithProviders(
      <AssetDetail
        {...defaultProps}
        asset={{ ...baseAsset, notes: null }}
      />,
    );

    expect(screen.getByText("No notes")).toBeInTheDocument();
  });

  it("renders custom fields", () => {
    renderWithProviders(<AssetDetail {...defaultProps} />);

    expect(screen.getByText("Serial Number")).toBeInTheDocument();
    expect(screen.getByText("field:Serial Number")).toBeInTheDocument();
  });

  it("hides delete button when canDelete is false", () => {
    renderWithProviders(<AssetDetail {...defaultProps} canDelete={false} />);

    expect(
      screen.queryByRole("button", { name: /delete/i }),
    ).not.toBeInTheDocument();
  });

  it("shows edit and print label links", () => {
    renderWithProviders(<AssetDetail {...defaultProps} />);

    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Print label")).toBeInTheDocument();
  });
});
