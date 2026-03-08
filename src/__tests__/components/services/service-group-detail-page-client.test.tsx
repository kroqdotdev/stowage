import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { ServiceGroupDetailPageClient } from "@/components/services/service-group-detail-page-client";

const mockUseQuery = vi.fn();
const updateGroupMock = vi.fn().mockResolvedValue(null);

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (reference: unknown) => {
    const functionName = getFunctionName(reference as never);
    if (functionName === "serviceGroups:updateGroup") {
      return updateGroupMock;
    }
    return vi.fn();
  },
}));

vi.mock("@/components/services/services-nav-tabs", () => ({
  ServicesNavTabs: () => <div>NavTabs</div>,
}));

vi.mock("@/components/services/service-group-fields-panel", () => ({
  ServiceGroupFieldsPanel: () => <div>FieldsPanel</div>,
}));

vi.mock("@/components/services/service-group-assets-panel", () => ({
  ServiceGroupAssetsPanel: () => <div>AssetsPanel</div>,
}));

vi.mock("@/components/services/service-group-editor", () => ({
  ServiceGroupEditor: () => <div>GroupEditor</div>,
}));

describe("ServiceGroupDetailPageClient", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    updateGroupMock.mockClear();
  });

  it("shows loading state when data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);

    render(
      <ServiceGroupDetailPageClient groupId={"group1" as never} />,
    );

    expect(screen.getByText("Loading group...")).toBeInTheDocument();
  });

  it("shows not-found state when group is null", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "users:getCurrentUser") {
        return { _id: "user1", role: "admin" };
      }
      if (functionName === "serviceGroups:getGroup") {
        return null;
      }
      return undefined;
    });

    render(
      <ServiceGroupDetailPageClient groupId={"group1" as never} />,
    );

    expect(screen.getByText("Group not found")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to groups" }),
    ).toHaveAttribute("href", "/services/groups");
  });

  it("renders group details with sub-panels for admin users", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "users:getCurrentUser") {
        return { _id: "user1", role: "admin" };
      }
      if (functionName === "serviceGroups:getGroup") {
        return {
          _id: "group1",
          name: "Engine checks",
          description: "Quarterly maintenance",
        };
      }
      return undefined;
    });

    render(
      <ServiceGroupDetailPageClient groupId={"group1" as never} />,
    );

    expect(screen.getByText("Engine checks")).toBeInTheDocument();
    expect(screen.getByText("Quarterly maintenance")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit group" }),
    ).toBeInTheDocument();
    expect(screen.getByText("FieldsPanel")).toBeInTheDocument();
    expect(screen.getByText("AssetsPanel")).toBeInTheDocument();
  });
});
