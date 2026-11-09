import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const pathnameSpy = vi.fn(() => "/dashboard");
const replaceSpy = vi.fn();
const logoutSpy = vi.fn();
const overdueSpy = vi.fn(() => 0);

vi.mock("@/hooks/use-overdue-count", () => ({
  useOverdueCount: () => overdueSpy(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameSpy(),
  useRouter: () => ({ replace: replaceSpy }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/lib/api/auth", () => ({
  logout: () => logoutSpy(),
}));

import { BottomNav } from "@/components/layout/bottom-nav";

function renderNav() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <BottomNav />
    </QueryClientProvider>,
  );
}

describe("BottomNav", () => {
  beforeEach(() => {
    pathnameSpy.mockReturnValue("/dashboard");
    replaceSpy.mockReset();
    logoutSpy.mockReset();
    overdueSpy.mockReturnValue(0);
  });

  it("renders all five slots with the scan button in the center", () => {
    renderNav();
    expect(screen.getByTestId("bottom-nav-home")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-nav-assets")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-nav-scan")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-nav-services")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-nav-more")).toBeInTheDocument();

    const scan = screen.getByTestId("bottom-nav-scan");
    expect(scan).toHaveAttribute("href", "/scan");
    expect(scan).toHaveAccessibleName("Scan a label");
    // The amber slab is the inner span; it is the only use of --scan.
    expect(scan.querySelector("span")?.className).toMatch(/var\(--scan\)/);

    const order = Array.from(
      screen.getByTestId("bottom-nav").querySelectorAll("[data-testid]"),
    ).map((el) => el.getAttribute("data-testid"));
    expect(order).toEqual([
      "bottom-nav-home",
      "bottom-nav-assets",
      "bottom-nav-scan",
      "bottom-nav-services",
      "bottom-nav-more",
    ]);
  });

  it("links the tabs to their pages", () => {
    renderNav();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: "Assets" })).toHaveAttribute(
      "href",
      "/assets",
    );
    expect(screen.getByRole("link", { name: "Services" })).toHaveAttribute(
      "href",
      "/services",
    );
    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
  });

  it("hides itself from tablet width up", () => {
    renderNav();
    const nav = screen.getByTestId("bottom-nav");
    expect(nav.className).toMatch(/(^|\s)md:hidden(\s|$)/);
  });

  it("marks Home active on /dashboard", () => {
    pathnameSpy.mockReturnValue("/dashboard");
    renderNav();
    expect(screen.getByTestId("bottom-nav-home")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByTestId("bottom-nav-assets").getAttribute("aria-current"),
    ).toBeNull();
  });

  it("marks Assets active on /assets and nested routes", () => {
    pathnameSpy.mockReturnValue("/assets/abc123");
    renderNav();
    expect(screen.getByTestId("bottom-nav-assets")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByTestId("bottom-nav-home").getAttribute("aria-current"),
    ).toBeNull();
  });

  it("marks Services active on /services", () => {
    pathnameSpy.mockReturnValue("/services");
    renderNav();
    expect(screen.getByTestId("bottom-nav-services")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("shows the overdue count on Services", () => {
    overdueSpy.mockReturnValue(2);
    renderNav();
    expect(screen.getByTestId("bottom-nav-services")).toHaveTextContent(
      "Services2",
    );
    expect(
      screen.getByRole("link", { name: "Services, 2 overdue" }),
    ).toBe(screen.getByTestId("bottom-nav-services"));
  });

  it("marks More active on pages that live in the More sheet", () => {
    pathnameSpy.mockReturnValue("/locations");
    renderNav();
    expect(screen.getByTestId("bottom-nav-more")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marks SCAN active on /scan", () => {
    pathnameSpy.mockReturnValue("/scan");
    renderNav();
    expect(screen.getByTestId("bottom-nav-scan")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("opens the More sheet when tapped and shows the expected entries", () => {
    renderNav();
    expect(screen.queryByTestId("more-sheet-grid")).toBeNull();

    fireEvent.click(screen.getByTestId("bottom-nav-more"));

    const grid = screen.getByTestId("more-sheet-grid");
    expect(grid).toBeInTheDocument();
    expect(screen.getByTestId("more-item-locations")).toHaveAttribute(
      "href",
      "/locations",
    );
    expect(screen.getByTestId("more-item-taxonomy")).toHaveAttribute(
      "href",
      "/taxonomy",
    );
    expect(screen.getByTestId("more-item-labels")).toHaveAttribute(
      "href",
      "/labels",
    );
    expect(screen.getByTestId("more-item-settings")).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(screen.getByTestId("more-sheet-signout")).toBeInTheDocument();
  });

  it("triggers logout and redirects on sign-out", async () => {
    logoutSpy.mockResolvedValue(undefined);
    renderNav();
    fireEvent.click(screen.getByTestId("bottom-nav-more"));
    fireEvent.click(screen.getByTestId("more-sheet-signout"));

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalledOnce();
      expect(replaceSpy).toHaveBeenCalledWith("/login");
    });
  });
});
