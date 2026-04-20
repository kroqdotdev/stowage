import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const listTagsMock = vi.fn();
const getCurrentUserMock = vi.fn();

vi.mock("@/lib/api/tags", () => ({
  listTags: () => listTagsMock(),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
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

import { TagsPageClient } from "@/components/tags/tags-page-client";

function renderWithClient() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <TagsPageClient />
    </QueryClientProvider>,
  );
}

describe("TagsPageClient", () => {
  beforeEach(() => {
    listTagsMock.mockReset();
    getCurrentUserMock.mockReset();
    getCurrentUserMock.mockResolvedValue({
      id: "u1",
      email: "a@x.com",
      name: "Admin",
      role: "admin",
    });
  });

  it("shows loading state while queries are in flight", () => {
    listTagsMock.mockImplementation(() => new Promise(() => {}));
    renderWithClient();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders tag list when data is loaded", async () => {
    listTagsMock.mockResolvedValue([
      {
        id: "tag1",
        name: "Fragile",
        color: "#DC2626",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);
    renderWithClient();
    expect(await screen.findByText("Fragile")).toBeInTheDocument();
    expect(screen.getByText("Tags")).toBeInTheDocument();
  });

  it("shows empty state when no tags exist", async () => {
    listTagsMock.mockResolvedValue([]);
    renderWithClient();
    expect(await screen.findByText("No tags yet.")).toBeInTheDocument();
  });
});
