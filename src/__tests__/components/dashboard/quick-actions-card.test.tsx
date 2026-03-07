import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card";

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

describe("QuickActionsCard", () => {
  it("renders all 3 quick action links", () => {
    render(<QuickActionsCard />);

    expect(screen.getByText("Add asset")).toBeVisible();
    expect(screen.getByText("Add location")).toBeVisible();
    expect(screen.getByText("View services")).toBeVisible();
  });

  it("links to the correct hrefs", () => {
    render(<QuickActionsCard />);

    expect(screen.getByText("Add asset").closest("a")).toHaveAttribute(
      "href",
      "/assets/new",
    );
    expect(screen.getByText("Add location").closest("a")).toHaveAttribute(
      "href",
      "/locations",
    );
    expect(screen.getByText("View services").closest("a")).toHaveAttribute(
      "href",
      "/services",
    );
  });
});
