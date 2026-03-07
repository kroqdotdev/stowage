import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecentAssetsCard } from "@/components/dashboard/recent-assets-card";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/assets/status-badge", () => ({
  StatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}));

const items = [
  {
    _id: "asset1" as never,
    name: "Forklift A",
    assetTag: "FK-001",
    status: "active" as const,
    updatedAt: 1709251200000,
  },
  {
    _id: "asset2" as never,
    name: "Generator B",
    assetTag: "GN-002",
    status: "in_storage" as const,
    updatedAt: 1709164800000,
  },
];

describe("RecentAssetsCard", () => {
  it("renders items with name, tag, and status", () => {
    render(<RecentAssetsCard items={items} dateFormat="DD-MM-YYYY" />);

    expect(screen.getByText("Forklift A")).toBeVisible();
    expect(screen.getByText("FK-001")).toBeVisible();
    expect(screen.getByText("Generator B")).toBeVisible();
    expect(screen.getByText("GN-002")).toBeVisible();
    expect(screen.getAllByTestId("status-badge")).toHaveLength(2);
  });

  it("shows empty state when items is empty", () => {
    render(<RecentAssetsCard items={[]} dateFormat="DD-MM-YYYY" />);

    expect(
      screen.getByText("No assets have been added yet."),
    ).toBeVisible();
  });

  it("renders 'View all' link pointing to /assets", () => {
    render(<RecentAssetsCard items={items} dateFormat="DD-MM-YYYY" />);

    const link = screen.getByText("View all");
    expect(link).toBeVisible();
    expect(link.closest("a")).toHaveAttribute("href", "/assets");
  });

  it("renders per-asset 'View' links", () => {
    render(<RecentAssetsCard items={items} dateFormat="DD-MM-YYYY" />);

    const viewLinks = screen.getAllByText("View");
    expect(viewLinks).toHaveLength(2);
    expect(viewLinks[0].closest("a")).toHaveAttribute(
      "href",
      "/assets/asset1",
    );
  });
});
