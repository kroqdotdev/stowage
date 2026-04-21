import { describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/lib/api/auth", () => ({
  getCurrentUser: () =>
    Promise.resolve({
      id: "u1",
      email: "alex@example.com",
      name: "Alex Admin",
      role: "admin",
    }),
  logout: vi.fn(),
}));

vi.mock("@/components/search/global-search", () => ({
  GlobalSearch: () => (
    <button type="button" aria-label="Open global search">
      Search assets...
    </button>
  ),
}));

import { SidebarProvider } from "@/components/ui/sidebar";
import { Topbar } from "@/components/layout/topbar";

function renderWithProviders() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <SidebarProvider>
        <Topbar />
      </SidebarProvider>
    </QueryClientProvider>,
  );
}

describe("Topbar", () => {
  it("renders the global search trigger", () => {
    renderWithProviders();
    const triggers = screen.getAllByRole("button", {
      name: "Open global search",
    });
    expect(triggers.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the theme toggle button", () => {
    renderWithProviders();
    const toggles = screen.getAllByText("Toggle theme");
    expect(toggles.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the user menu button", () => {
    renderWithProviders();
    const menus = screen.getAllByLabelText("Open user menu");
    expect(menus.length).toBeGreaterThanOrEqual(1);
  });

  it("search trigger is interactive", () => {
    renderWithProviders();
    expect(
      screen.getAllByRole("button", { name: "Open global search" })[0],
    ).not.toBeDisabled();
  });
});
