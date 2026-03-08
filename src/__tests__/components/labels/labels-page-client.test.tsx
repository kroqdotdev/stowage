import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { LabelsPageClient } from "@/components/labels/labels-page-client";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

vi.mock("@/components/labels/template-designer", () => ({
  TemplateDesigner: (props: {
    templates: Array<{ _id: string; name: string }>;
    currentUserRole: string | null;
  }) => (
    <div data-testid="mock-template-designer">
      <span data-testid="template-count">{props.templates.length}</span>
      <span data-testid="user-role">{props.currentUserRole}</span>
      {props.templates.map((t) => (
        <span key={t._id} data-testid={`template-${t._id}`}>
          {t.name}
        </span>
      ))}
    </div>
  ),
}));

describe("LabelsPageClient", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseMutation.mockReset();
    mockUseMutation.mockReturnValue(vi.fn());
  });

  it("shows loading state while queries are pending", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<LabelsPageClient />);

    expect(screen.getByText("Loading label designer...")).toBeInTheDocument();
    expect(
      screen.queryByTestId("mock-template-designer"),
    ).not.toBeInTheDocument();
  });

  it("renders TemplateDesigner once all queries resolve", () => {
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
      if (functionName === "labelTemplates:getLabelUrlBase") {
        return "http://localhost:3000";
      }
      if (functionName === "assets:getLabelPreviewAsset") {
        return null;
      }
      if (functionName === "customFields:listFieldDefinitions") {
        return [];
      }

      return undefined;
    });

    render(<LabelsPageClient />);

    expect(
      screen.queryByText("Loading label designer..."),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("mock-template-designer")).toBeInTheDocument();
    expect(screen.getByTestId("template-count")).toHaveTextContent("1");
    expect(screen.getByTestId("template-template-1")).toHaveTextContent(
      "Thermal 57x32 mm",
    );
  });

  it("passes the current user role to TemplateDesigner", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);

      if (functionName === "users:getCurrentUser") {
        return { _id: "user-1", role: "user" };
      }
      if (functionName === "labelTemplates:listTemplates") {
        return [];
      }
      if (functionName === "labelTemplates:getLabelUrlBase") {
        return "http://localhost:3000";
      }
      if (functionName === "assets:getLabelPreviewAsset") {
        return null;
      }
      if (functionName === "customFields:listFieldDefinitions") {
        return [];
      }

      return undefined;
    });

    render(<LabelsPageClient />);

    expect(screen.getByTestId("user-role")).toHaveTextContent("user");
  });
});
