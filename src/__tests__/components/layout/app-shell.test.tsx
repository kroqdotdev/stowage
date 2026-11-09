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

vi.mock("@/hooks/use-overdue-count", () => ({
  useOverdueCount: () => 0,
}));

vi.mock("@/components/search/global-search", () => ({
  GlobalSearch: () => (
    <button type="button" aria-label="Open global search">
      Search assets...
    </button>
  ),
  GlobalSearchDialog: () => null,
}));

import { AppShell } from "@/components/layout/app-shell";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("AppShell", () => {
  it("renders children content", () => {
    renderWithClient(
      <AppShell>
        <div data-testid="child-content">Hello Stowage</div>
      </AppShell>,
    );
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Hello Stowage")).toBeInTheDocument();
  });

  it("renders the sidebar, tablet rail, phone top bar and bottom nav around main", () => {
    renderWithClient(
      <AppShell>
        <div>Content</div>
      </AppShell>,
    );
    // Desktop sidebar and tablet rail are both "Main" complementary landmarks;
    // CSS decides which one shows.
    expect(screen.getAllByRole("complementary", { name: "Main" })).toHaveLength(
      2,
    );
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Content");
    // Sidebar, rail and phone top bar each carry a search trigger.
    expect(
      screen.getAllByRole("button", { name: "Open global search" }),
    ).toHaveLength(3);
  });
});
