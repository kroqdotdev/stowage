import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";

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
  { id: "cat1", name: "Electronics", color: "#3b82f6", count: 15 },
  { id: "cat2", name: "Furniture", color: "#f59e0b", count: 8 },
];

describe("CategoryBreakdown", () => {
  it("renders category names and counts", () => {
    render(<CategoryBreakdown items={items} />);

    expect(screen.getByText("By Category")).toBeVisible();
    expect(screen.getByText("Electronics")).toBeVisible();
    expect(screen.getByText("15")).toBeVisible();
    expect(screen.getByText("Furniture")).toBeVisible();
    expect(screen.getByText("8")).toBeVisible();
  });

  it("links each category to filtered assets page", () => {
    render(<CategoryBreakdown items={items} />);

    expect(
      screen.getByText("Electronics").closest("a"),
    ).toHaveAttribute("href", "/assets?category=cat1");
    expect(
      screen.getByText("Furniture").closest("a"),
    ).toHaveAttribute("href", "/assets?category=cat2");
  });

  it("shows empty state when no categories", () => {
    render(<CategoryBreakdown items={[]} />);

    expect(
      screen.getByText("No categories with assets yet."),
    ).toBeVisible();
  });
});
