import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServiceGroupAssetsPanel } from "@/components/services/service-group-assets-panel";

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@/components/assets/status-badge", () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

describe("ServiceGroupAssetsPanel", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it("shows loading state when assets data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);

    render(
      <ServiceGroupAssetsPanel groupId={"group1" as never} />,
    );

    expect(screen.getByText("Loading assets...")).toBeInTheDocument();
  });

  it("shows empty state when no assets are assigned", () => {
    mockUseQuery.mockReturnValue([]);

    render(
      <ServiceGroupAssetsPanel groupId={"group1" as never} />,
    );

    expect(
      screen.getByText("No assets are currently assigned to this group."),
    ).toBeInTheDocument();
  });

  it("renders asset list with links", () => {
    mockUseQuery.mockReturnValue([
      {
        _id: "asset1" as never,
        name: "Generator",
        assetTag: "AST-0001",
        status: "active",
      },
    ]);

    render(
      <ServiceGroupAssetsPanel groupId={"group1" as never} />,
    );

    expect(screen.getByText("Generator")).toBeInTheDocument();
    expect(screen.getByText("AST-0001")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open asset" })).toHaveAttribute(
      "href",
      "/assets/asset1",
    );
  });
});
