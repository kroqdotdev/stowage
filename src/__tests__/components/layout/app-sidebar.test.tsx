import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

const pathnameSpy = vi.fn(() => "/dashboard");
const overdueSpy = vi.fn(() => 0);

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameSpy(),
}));

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

vi.mock("@/hooks/use-overdue-count", () => ({
  useOverdueCount: () => overdueSpy(),
}));

vi.mock("@/components/search/global-search", () => ({
  GlobalSearch: ({ variant }: { variant?: string }) => (
    <button type="button" data-variant={variant}>
      Search assets
    </button>
  ),
}));

vi.mock("@/components/layout/user-menu", () => ({
  UserMenu: () => (
    <button type="button" aria-label="Open user menu">
      User
    </button>
  ),
}));

import { AppRail, AppSidebar } from "@/components/layout/app-sidebar";

const NAV_LINKS: Record<string, string> = {
  Home: "/dashboard",
  Services: "/services",
  Assets: "/assets",
  Locations: "/locations",
  Taxonomy: "/taxonomy",
  Labels: "/labels",
  Settings: "/settings",
};

describe("AppSidebar", () => {
  beforeEach(() => {
    pathnameSpy.mockReturnValue("/dashboard");
    overdueSpy.mockReturnValue(0);
  });

  it("renders the Stowage brand linking home", () => {
    render(<AppSidebar />);
    expect(screen.getByRole("link", { name: "Stowage" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("renders search, Scan a label and the user menu", () => {
    render(<AppSidebar />);
    const sidebar = screen.getByRole("complementary", { name: "Main" });
    expect(
      within(sidebar).getByRole("button", { name: "Search assets" }),
    ).toHaveAttribute("data-variant", "sidebar");
    expect(
      within(sidebar).getByRole("link", { name: "Scan a label" }),
    ).toHaveAttribute("href", "/scan");
    expect(
      within(sidebar).getByRole("button", { name: "Open user menu" }),
    ).toBeInTheDocument();
  });

  it("renders every nav item with its href", () => {
    render(<AppSidebar />);
    for (const [name, href] of Object.entries(NAV_LINKS)) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
    expect(screen.queryByRole("link", { name: "Dashboard" })).toBeNull();
    expect(screen.getByText("Inventory")).toBeInTheDocument();
  });

  it("marks the current item with aria-current", () => {
    pathnameSpy.mockReturnValue("/categories");
    render(<AppSidebar />);
    expect(screen.getByRole("link", { name: "Taxonomy" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Home" }).getAttribute("aria-current"),
    ).toBeNull();
  });

  it("shows the overdue badge on Services only when there are overdue services", () => {
    overdueSpy.mockReturnValue(3);
    const { unmount } = render(<AppSidebar />);
    const services = screen.getByRole("link", { name: /Services/ });
    expect(within(services).getByLabelText("3 overdue")).toHaveTextContent("3");
    unmount();

    overdueSpy.mockReturnValue(0);
    render(<AppSidebar />);
    expect(screen.queryByLabelText(/overdue/)).toBeNull();
  });
});

describe("AppRail", () => {
  beforeEach(() => {
    pathnameSpy.mockReturnValue("/assets/abc");
    overdueSpy.mockReturnValue(0);
  });

  it("renders labelled icon links for every nav item plus home, search and scan", () => {
    render(<AppRail />);
    expect(screen.getByRole("link", { name: "Stowage home" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    for (const [name, href] of Object.entries(NAV_LINKS)) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
    expect(screen.getByRole("link", { name: "Scan" })).toHaveAttribute(
      "href",
      "/scan",
    );
    expect(
      screen.getByRole("button", { name: "Search assets" }),
    ).toHaveAttribute("data-variant", "rail");
  });

  it("announces the overdue count in the Services link name", () => {
    overdueSpy.mockReturnValue(4);
    render(<AppRail />);
    expect(
      screen.getByRole("link", { name: "Services, 4 overdue" }),
    ).toHaveAttribute("href", "/services");
  });

  it("marks the current item with aria-current", () => {
    render(<AppRail />);
    expect(screen.getByRole("link", { name: "Assets" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
