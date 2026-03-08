import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

import { TaxonomyManager } from "@/components/catalog/taxonomy-manager";

const categoryRows = [
  {
    _id: "cat1",
    name: "Laptops",
    color: "#EA580C",
    prefix: "LAP",
    description: "Portable computers",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    _id: "cat2",
    name: "Monitors",
    color: "#2563EB",
    prefix: "MON",
    description: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

const tagRows = [
  {
    _id: "tag1",
    name: "Fragile",
    color: "#DC2626",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    _id: "tag2",
    name: "Heavy",
    color: "#0891B2",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

describe("TaxonomyManager (categories)", () => {
  it("renders category heading and rows", () => {
    render(
      <TaxonomyManager
        variant="categories"
        rows={categoryRows as never}
        loading={false}
        canManage={true}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Categories" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Laptops")).toBeInTheDocument();
    expect(screen.getByText("Monitors")).toBeInTheDocument();
    expect(screen.getByText("Prefix: LAP")).toBeInTheDocument();
    expect(screen.getByText("Portable computers")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(
      <TaxonomyManager
        variant="categories"
        rows={[]}
        loading={true}
        canManage={true}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("hides Add button for non-admin users", () => {
    render(
      <TaxonomyManager
        variant="categories"
        rows={categoryRows as never}
        loading={false}
        canManage={false}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /add category/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Only admins can add, edit, or delete categories."),
    ).toBeInTheDocument();
  });

  it("opens create modal on Add Category click", async () => {
    const user = userEvent.setup();

    render(
      <TaxonomyManager
        variant="categories"
        rows={[]}
        loading={false}
        canManage={true}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /add category/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Add Category" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });
});

describe("TaxonomyManager (tags)", () => {
  it("renders tag heading and rows", () => {
    render(
      <TaxonomyManager
        variant="tags"
        rows={tagRows as never}
        loading={false}
        canManage={true}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Tags" })).toBeInTheDocument();
    expect(screen.getByText("Fragile")).toBeInTheDocument();
    expect(screen.getByText("Heavy")).toBeInTheDocument();
  });

  it("shows empty state for tags", () => {
    render(
      <TaxonomyManager
        variant="tags"
        rows={[]}
        loading={false}
        canManage={true}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("No tags yet.")).toBeInTheDocument();
  });
});
