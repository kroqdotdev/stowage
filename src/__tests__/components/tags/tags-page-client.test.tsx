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

import { TagsPageClient } from "@/components/tags/tags-page-client";

describe("TagsPageClient", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseMutation.mockReset();
    mockUseMutation.mockReturnValue(vi.fn());
  });

  it("shows loading state when data is undefined", () => {
    mockUseQuery.mockReturnValue(undefined);

    render(<TagsPageClient />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders tag list when data is loaded", () => {
    let callIndex = 0;
    mockUseQuery.mockImplementation(() => {
      callIndex++;
      if (callIndex % 2 === 1) {
        return { _id: "user1" as never, role: "admin" };
      }
      return [
        {
          _id: "tag1" as never,
          name: "Fragile",
          color: "#DC2626",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];
    });

    render(<TagsPageClient />);

    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByText("Fragile")).toBeInTheDocument();
  });

  it("shows empty state when no tags exist", () => {
    let callIndex = 0;
    mockUseQuery.mockImplementation(() => {
      callIndex++;
      if (callIndex % 2 === 1) {
        return { _id: "user1" as never, role: "admin" };
      }
      return [];
    });

    render(<TagsPageClient />);

    expect(screen.getByText("No tags yet.")).toBeInTheDocument();
  });
});
