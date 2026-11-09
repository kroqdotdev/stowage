import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

const nav = vi.hoisted(() => ({ pathname: "/assets/abc", role: "admin" }));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
}));

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => ({ data: { role: nav.role } }),
}));

vi.mock("@/components/search/global-search", () => ({
  GlobalSearch: () => (
    <button type="button" aria-label="Open global search">
      Search
    </button>
  ),
}));

vi.mock("@/components/layout/user-menu", () => ({
  UserMenu: () => <button type="button">Account</button>,
}));

import { MobileBar, MobileTopBar } from "@/components/layout/mobile-top-bar";

describe("MobileTopBar", () => {
  it("makes its own controls inert while a page bar covers it", async () => {
    const { rerender } = render(<MobileTopBar />);
    const controls = screen.getByTestId("mobile-top-bar-controls");
    expect(controls).not.toHaveAttribute("inert");

    await act(async () => {
      rerender(
        <>
          <MobileTopBar />
          <MobileBar backHref="/assets" backLabel="Back to assets" />
        </>,
      );
    });

    expect(screen.getByRole("link", { name: "Back to assets" })).toBeInTheDocument();
    expect(screen.getByTestId("mobile-top-bar-controls")).toHaveAttribute("inert");

    await act(async () => {
      rerender(<MobileTopBar />);
    });
    expect(screen.getByTestId("mobile-top-bar-controls")).not.toHaveAttribute(
      "inert",
    );
  });

  it("offers New location on Locations only to admins", () => {
    nav.pathname = "/locations";
    nav.role = "admin";
    const { unmount } = render(<MobileTopBar />);
    expect(screen.getByRole("link", { name: "New location" })).toHaveAttribute(
      "href",
      "/locations?new=1",
    );
    unmount();

    nav.role = "user";
    render(<MobileTopBar />);
    expect(screen.queryByRole("link", { name: "New location" })).toBeNull();
    expect(screen.getByRole("link", { name: "New asset" })).toHaveAttribute(
      "href",
      "/assets/new",
    );
    nav.pathname = "/assets/abc";
    nav.role = "admin";
  });
});
