import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { ServiceGroupFieldsPanel } from "@/components/services/service-group-fields-panel";

const mockUseQuery = vi.fn();
const createFieldMock = vi.fn().mockResolvedValue(null);
const updateFieldMock = vi.fn().mockResolvedValue(null);
const deleteFieldMock = vi.fn().mockResolvedValue(null);
const reorderFieldsMock = vi.fn().mockResolvedValue(null);

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (reference: unknown) => {
    const functionName = getFunctionName(reference as never);
    if (functionName === "serviceGroupFields:createField") {
      return createFieldMock;
    }
    if (functionName === "serviceGroupFields:updateField") {
      return updateFieldMock;
    }
    if (functionName === "serviceGroupFields:deleteField") {
      return deleteFieldMock;
    }
    if (functionName === "serviceGroupFields:reorderFields") {
      return reorderFieldsMock;
    }
    return vi.fn();
  },
}));

describe("ServiceGroupFieldsPanel", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    createFieldMock.mockClear();
    updateFieldMock.mockClear();
    deleteFieldMock.mockClear();
    reorderFieldsMock.mockClear();
  });

  it("shows loading state when fields are undefined", () => {
    mockUseQuery.mockReturnValue(undefined);

    render(
      <ServiceGroupFieldsPanel
        groupId={"group1" as never}
        canManage
      />,
    );

    expect(screen.getByText("Loading service fields...")).toBeInTheDocument();
  });

  it("shows empty state when no fields exist", () => {
    mockUseQuery.mockReturnValue([]);

    render(
      <ServiceGroupFieldsPanel
        groupId={"group1" as never}
        canManage
      />,
    );

    expect(
      screen.getByText(
        "No fields yet. Add required service fields for this group.",
      ),
    ).toBeInTheDocument();
  });

  it("renders field list with add button for admins", async () => {
    const user = userEvent.setup();

    mockUseQuery.mockReturnValue([
      {
        _id: "field1" as never,
        _creationTime: 1,
        groupId: "group1" as never,
        label: "Technician note",
        fieldType: "text",
        required: true,
        options: [],
        sortOrder: 0,
        createdAt: 1,
        updatedAt: 1,
        createdBy: "user1" as never,
        updatedBy: "user1" as never,
      },
    ]);

    render(
      <ServiceGroupFieldsPanel
        groupId={"group1" as never}
        canManage
      />,
    );

    expect(screen.getByText("Technician note")).toBeInTheDocument();
    // "Required" appears in both the table header and the field badge
    expect(screen.getAllByText("Required").length).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByRole("button", { name: /Add field/ }));
    expect(
      screen.getByRole("heading", { name: "Add required field" }),
    ).toBeVisible();
  });
});
