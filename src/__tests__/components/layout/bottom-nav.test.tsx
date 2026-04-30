import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const pathnameSpy = vi.fn(() => "/dashboard");
const replaceSpy = vi.fn();
const logoutSpy = vi.fn();
const toastErrorSpy = vi.fn();

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

vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastErrorSpy(...args) },
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
    toastErrorSpy.mockReset();
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
    expect(scan.className).toMatch(/var\(--scan\)/);
  });

  it("hides itself on large viewports", () => {
    renderNav();
    const nav = screen.getByTestId("bottom-nav");
    expect(nav.className).toMatch(/lg:hidden/);
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

  it("keeps the user signed in when logout rejects", async () => {
    logoutSpy.mockRejectedValue(new Error("network"));
    renderNav();
    fireEvent.click(screen.getByTestId("bottom-nav-more"));
    fireEvent.click(screen.getByTestId("more-sheet-signout"));

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalledOnce();
      expect(toastErrorSpy).toHaveBeenCalledWith(
        "Could not sign out. Please try again.",
      );
    });
    expect(replaceSpy).not.toHaveBeenCalled();
  });
});
