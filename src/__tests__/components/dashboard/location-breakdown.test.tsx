import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocationBreakdown } from "@/components/dashboard/location-breakdown";

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

const items = [
  { id: "loc1", name: "Warehouse A", count: 20 },
  { id: "loc2", name: "Office B", count: 5 },
];

describe("LocationBreakdown", () => {
  it("renders location names and counts", () => {
    render(<LocationBreakdown items={items} />);

    expect(screen.getByText("By Location")).toBeVisible();
    expect(screen.getByText("Warehouse A")).toBeVisible();
    expect(screen.getByText("20")).toBeVisible();
    expect(screen.getByText("Office B")).toBeVisible();
    expect(screen.getByText("5")).toBeVisible();
  });

  it("links each location to filtered assets page", () => {
    render(<LocationBreakdown items={items} />);

    expect(screen.getByText("Warehouse A").closest("a")).toHaveAttribute(
      "href",
      "/assets?location=loc1",
    );
    expect(screen.getByText("Office B").closest("a")).toHaveAttribute(
      "href",
      "/assets?location=loc2",
    );
  });

  it("shows empty state when no locations", () => {
    render(<LocationBreakdown items={[]} />);

    expect(screen.getByText("No locations with assets yet.")).toBeVisible();
  });
});
