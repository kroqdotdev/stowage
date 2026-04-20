import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listCategoriesMock = vi.fn();
const getCurrentUserMock = vi.fn();

vi.mock("@/lib/api/categories", () => ({
  listCategories: () => listCategoriesMock(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => ({
  getCurrentUser: () => getCurrentUserMock(),
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

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { CategoriesPageClient } from "@/components/categories/categories-page-client";

function renderWithClient() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <CategoriesPageClient />
    </QueryClientProvider>,
  );
}

describe("CategoriesPageClient", () => {
  beforeEach(() => {
    listCategoriesMock.mockReset();
    getCurrentUserMock.mockReset();
    getCurrentUserMock.mockResolvedValue({
      id: "u1",
      email: "a@x.com",
      name: "Admin",
      role: "admin",
    });
  });

  it("shows loading state while queries are in flight", () => {
    listCategoriesMock.mockImplementation(() => new Promise(() => {}));
    renderWithClient();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders category list when data is loaded", async () => {
    listCategoriesMock.mockResolvedValue([
      {
        id: "cat1",
        name: "Laptops",
        color: "#EA580C",
        prefix: "LAP",
        description: "Portable computers",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);
    renderWithClient();
    expect(await screen.findByText("Laptops")).toBeInTheDocument();
    expect(screen.getByText("Categories")).toBeInTheDocument();
  });

  it("shows empty state when no categories exist", async () => {
    listCategoriesMock.mockResolvedValue([]);
    renderWithClient();
    expect(await screen.findByText("No categories yet.")).toBeInTheDocument();
  });
});
