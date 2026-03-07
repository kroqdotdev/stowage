import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuickActions } from "@/components/dashboard/quick-actions";

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

describe("QuickActions", () => {
  it("renders New Asset and View All Assets links", () => {
    render(<QuickActions />);

    expect(screen.getByText("New Asset")).toBeVisible();
    expect(screen.getByText("View All Assets")).toBeVisible();
  });

  it("links to correct hrefs", () => {
    render(<QuickActions />);

    expect(screen.getByText("New Asset").closest("a")).toHaveAttribute(
      "href",
      "/assets/new",
    );
    expect(
      screen.getByText("View All Assets").closest("a"),
    ).toHaveAttribute("href", "/assets");
  });
});
