import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ replace: vi.fn() }),
}));

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock use-mobile hook
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useQuery: () => ({
    name: "Alex Admin",
    email: "alex@example.com",
  }),
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signOut: vi.fn(), signIn: vi.fn() }),
}));

vi.mock("@/components/search/global-search", () => ({
  GlobalSearch: () => (
    <button type="button" aria-label="Open global search">
      Search assets...
    </button>
  ),
}));

import { AppShell } from "@/components/layout/app-shell";

describe("AppShell", () => {
  it("renders children content", () => {
    render(
      <AppShell>
        <div data-testid="child-content">Hello Stowage</div>
      </AppShell>,
    );
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Hello Stowage")).toBeInTheDocument();
  });

  it("renders sidebar and topbar together", () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );
    // Sidebar brand (may appear multiple times due to desktop + mobile)
    const brands = screen.getAllByText("Stowage");
    expect(brands.length).toBeGreaterThanOrEqual(1);
    // Topbar search trigger
    const triggers = screen.getAllByRole("button", {
      name: "Open global search",
    });
    expect(triggers.length).toBeGreaterThanOrEqual(1);
    // Child content
    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});
