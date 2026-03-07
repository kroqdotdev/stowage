import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
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
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { CategoriesPageClient } from "@/components/categories/categories-page-client";

describe("CategoriesPageClient", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseMutation.mockReset();
    mockUseMutation.mockReturnValue(vi.fn());
  });

  it("shows loading state when data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);

    render(<CategoriesPageClient />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders category list when data is loaded", () => {
    let callIndex = 0;
    mockUseQuery.mockImplementation(() => {
      callIndex++;
      // First call: getCurrentUser, second call: listCategories
      if (callIndex % 2 === 1) {
        return { _id: "user1" as never, role: "admin" };
      }
      return [
        {
          _id: "cat1" as never,
          name: "Laptops",
          color: "#EA580C",
          prefix: "LAP",
          description: "Portable computers",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
    });

    render(<CategoriesPageClient />);

    expect(screen.getByText("Categories")).toBeInTheDocument();
    expect(screen.getByText("Laptops")).toBeInTheDocument();
  });

  it("shows empty state when no categories exist", () => {
    let callIndex = 0;
    mockUseQuery.mockImplementation(() => {
      callIndex++;
      if (callIndex % 2 === 1) {
        return { _id: "user1" as never, role: "admin" };
      }
      return [];
    });

    render(<CategoriesPageClient />);

    expect(screen.getByText("No categories yet.")).toBeInTheDocument();
  });
});
