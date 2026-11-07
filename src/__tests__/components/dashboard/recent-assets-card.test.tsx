import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { RecentAssetsCard } from "@/components/dashboard/recent-assets-card";

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

const NOW = new Date(2026, 10, 6, 12, 0, 0).getTime();
const DAY = 24 * 60 * 60 * 1000;

function makeItem(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `asset${index}`,
    name: `Asset ${index}`,
    assetTag: `AS-00${index}`,
    status: "active" as const,
    updatedAt: NOW - index * DAY,
    ...overrides,
  };
}

const items = [
  makeItem(1, { name: "Forklift A", assetTag: "FK-001" }),
  makeItem(2, {
    name: "Generator B",
    assetTag: "GN-002",
    status: "in_storage" as const,
  }),
];

describe("RecentAssetsCard", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the Recently updated heading", () => {
    render(<RecentAssetsCard items={items} />);

    expect(
      screen.getByRole("region", { name: "Recently updated" }),
    ).toBeInTheDocument();
  });

  it("links each row to the asset with its name, tag and relative time", () => {
    render(<RecentAssetsCard items={items} />);

    const forklift = screen.getByRole("link", { name: /Forklift A/ });
    expect(forklift).toHaveAttribute("href", "/assets/asset1");
    expect(within(forklift).getByText("FK-001")).toBeInTheDocument();
    expect(within(forklift).getByText("Yesterday")).toBeInTheDocument();
    expect(within(forklift).getByText("1d")).toBeInTheDocument();

    const generator = screen.getByRole("link", { name: /Generator B/ });
    expect(generator).toHaveAttribute("href", "/assets/asset2");
    expect(within(generator).getByText("GN-002")).toBeInTheDocument();
    expect(within(generator).getByText("2 days ago")).toBeInTheDocument();
  });

  it("shows status only for exceptions, not for active assets", () => {
    render(<RecentAssetsCard items={items} />);

    const badges = screen.getAllByTestId("status-badge");
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveTextContent("In storage");
    expect(
      within(screen.getByRole("link", { name: /Forklift A/ })).queryByTestId(
        "status-badge",
      ),
    ).not.toBeInTheDocument();
  });

  it("closes the list with an Open in Assets link", () => {
    render(<RecentAssetsCard items={items} />);

    expect(screen.getByRole("link", { name: "Open in Assets" })).toHaveAttribute(
      "href",
      "/assets",
    );
    expect(screen.queryByText(/of the last/)).not.toBeInTheDocument();
  });

  it("shows at most five rows and says how many changes were cut", () => {
    const many = Array.from({ length: 7 }, (_, i) => makeItem(i + 1));
    render(<RecentAssetsCard items={many} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.queryByText("Asset 6")).not.toBeInTheDocument();
    expect(screen.getByText(/5 of the last 7 changes/)).toBeInTheDocument();
  });

  it("shows empty state when items is empty", () => {
    render(<RecentAssetsCard items={[]} />);

    expect(screen.getByText("No assets have been added yet.")).toBeVisible();
    expect(
      screen.queryByRole("link", { name: "Open in Assets" }),
    ).not.toBeInTheDocument();
  });
});
