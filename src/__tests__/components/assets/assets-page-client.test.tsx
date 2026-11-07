import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const listAssetsMock = vi.fn();
const getFilterOptionsMock = vi.fn();
const getOverviewMock = vi.fn();
const mockPush = vi.fn();
const isPhoneMock = vi.fn(() => false);
const tableProps = vi.fn();
const cardListProps = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("@/lib/api/assets", () => ({
  listAssets: (params: unknown) => listAssetsMock(params),
  getAssetFilterOptions: () => getFilterOptionsMock(),
}));

vi.mock("@/lib/api/dashboard", () => ({
  getDashboardOverview: () => getOverviewMock(),
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => isPhoneMock(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => currentSearchParams,
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

vi.mock("@/components/assets/asset-filters", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/components/assets/asset-filters")>();
  return {
    ...actual,
    AssetFilters: () => <div>desktop-filters</div>,
  };
});

vi.mock("@/components/assets/asset-filters-mobile", () => ({
  AssetFiltersMobile: () => <div>mobile-filters</div>,
}));

vi.mock("@/components/assets/asset-table", () => ({
  AssetTable: (props: { rows: { id: string }[] }) => {
    tableProps(props);
    return <div>table:{props.rows.length}</div>;
  },
}));

vi.mock("@/components/assets/asset-card-list", () => ({
  AssetCardList: (props: { rows: { id: string }[] }) => {
    cardListProps(props);
    return <div>cards:{props.rows.length}</div>;
  },
}));

import { AssetsPageClient } from "@/components/assets/assets-page-client";

const overview = {
  dateFormat: "DD-MM-YYYY",
  totalAssets: 21,
  statusCounts: {
    active: 10,
    in_storage: 5,
    under_repair: 3,
    retired: 2,
    disposed: 1,
  },
  recentAssets: [],
  categoryBreakdown: [],
  locationBreakdown: [],
  serviceSchedulingEnabled: true,
  overdueServiceCount: 2,
  scheduledServiceCount: 4,
  upcomingServices: [],
};

function makeRow(id: string) {
  return {
    id,
    name: `Asset ${id}`,
    assetTag: `AS-${id}`,
    status: "active",
    categoryId: null,
    categoryName: null,
    categoryColor: null,
    locationId: null,
    locationPath: null,
    serviceGroupId: null,
    notes: null,
    tagIds: [],
    tagNames: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={qc}>{ui}</QueryClientProvider>,
  );
  return {
    ...result,
    rerender: (next: React.ReactElement) =>
      result.rerender(
        <QueryClientProvider client={qc}>{next}</QueryClientProvider>,
      ),
  };
}

describe("AssetsPageClient", () => {
  beforeEach(() => {
    listAssetsMock.mockReset();
    getFilterOptionsMock.mockReset();
    getOverviewMock.mockReset();
    mockPush.mockReset();
    tableProps.mockReset();
    cardListProps.mockReset();
    isPhoneMock.mockReturnValue(false);
    window.localStorage.clear();
    currentSearchParams = new URLSearchParams("category=cat1");

    listAssetsMock.mockResolvedValue([]);
    getOverviewMock.mockResolvedValue(overview);
    getFilterOptionsMock.mockResolvedValue({
      categories: [],
      locations: [],
      tags: [],
      serviceGroups: [],
    });
  });

  it("re-applies URL-driven filters when search params change", async () => {
    const { rerender } = renderWithClient(<AssetsPageClient />);

    await waitFor(() => {
      expect(listAssetsMock).toHaveBeenCalled();
    });
    expect(listAssetsMock.mock.calls.at(-1)?.[0]).toMatchObject({
      categoryId: "cat1",
      locationId: undefined,
      tagIds: [],
    });

    currentSearchParams = new URLSearchParams("location=loc1&tag=tag1");
    rerender(<AssetsPageClient />);

    await waitFor(() => {
      expect(listAssetsMock.mock.calls.at(-1)?.[0]).toMatchObject({
        categoryId: undefined,
        locationId: "loc1",
        tagIds: ["tag1"],
      });
    });
  });

  it("sorts by most recently updated by default", async () => {
    renderWithClient(<AssetsPageClient />);

    await waitFor(() => expect(listAssetsMock).toHaveBeenCalled());
    expect(listAssetsMock.mock.calls[0]?.[0]).toMatchObject({
      sortBy: "updatedAt",
      sortDirection: "desc",
    });
  });

  it("shows the total and a status subline from the dashboard overview", async () => {
    renderWithClient(<AssetsPageClient />);

    expect(
      await screen.findByRole("heading", { level: 1, name: /^Assets\s*21$/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("10 active · 3 under repair · 2 overdue"),
    ).toBeInTheDocument();
    expect(getOverviewMock).toHaveBeenCalled();
  });

  it("renders status tabs with counts and filters by the chosen tab", async () => {
    currentSearchParams = new URLSearchParams();
    renderWithClient(<AssetsPageClient />);

    const tabs = screen.getByRole("navigation", { name: "Status" });
    const all = within(tabs).getByRole("button", { name: "All" });
    expect(all).toHaveAttribute("aria-current", "page");

    const repair = await within(tabs).findByRole("button", {
      name: /^Under repair\s*3$/,
    });
    for (const name of [/^Active\s*10$/, /^In storage\s*5$/, /^Retired\s*2$/, /^Disposed\s*1$/]) {
      expect(within(tabs).getByRole("button", { name })).toBeInTheDocument();
    }

    fireEvent.click(repair);

    await waitFor(() => {
      expect(listAssetsMock.mock.calls.at(-1)?.[0]).toMatchObject({
        status: "under_repair",
      });
    });
    expect(repair).toHaveAttribute("aria-current", "page");
    expect(all.getAttribute("aria-current")).toBeNull();
  });

  it("selects the status tab from the URL", async () => {
    currentSearchParams = new URLSearchParams("status=retired");
    renderWithClient(<AssetsPageClient />);

    const tabs = screen.getByRole("navigation", { name: "Status" });
    expect(
      within(tabs).getByRole("button", { name: /^Retired/ }),
    ).toHaveAttribute("aria-current", "page");
    await waitFor(() => expect(listAssetsMock).toHaveBeenCalled());
    expect(listAssetsMock.mock.calls[0]?.[0]).toMatchObject({
      status: "retired",
    });
  });

  it("ignores an unknown status in the URL", async () => {
    currentSearchParams = new URLSearchParams("status=bogus");
    renderWithClient(<AssetsPageClient />);

    await waitFor(() => expect(listAssetsMock).toHaveBeenCalled());
    expect(listAssetsMock.mock.calls[0]?.[0]).toMatchObject({
      status: undefined,
    });
  });

  it("offers New asset… and Print labels… in the header", () => {
    renderWithClient(<AssetsPageClient />);

    expect(screen.getByRole("link", { name: "New asset…" })).toHaveAttribute(
      "href",
      "/assets/new",
    );
    expect(screen.getByRole("link", { name: "Print labels…" })).toHaveAttribute(
      "href",
      "/labels/print",
    );
  });

  it("shows the first-run empty state when there are no assets and no filters", async () => {
    currentSearchParams = new URLSearchParams();
    renderWithClient(<AssetsPageClient />);

    expect(await screen.findByText("No assets yet.")).toBeInTheDocument();
    expect(screen.queryByText(/^table:/)).toBeNull();
  });

  it("renders the table with desktop filters on wider screens", async () => {
    listAssetsMock.mockResolvedValue([makeRow("a1"), makeRow("a2")]);
    renderWithClient(<AssetsPageClient />);

    expect(screen.getByText("desktop-filters")).toBeInTheDocument();
    expect(await screen.findByText("table:2")).toBeInTheDocument();
    expect(screen.getByText("1 to 2 of 2")).toBeInTheDocument();
    expect(screen.queryByText("mobile-filters")).toBeNull();
  });

  it("renders cards, mobile filters and the long-press hint on phones", async () => {
    isPhoneMock.mockReturnValue(true);
    listAssetsMock.mockResolvedValue([makeRow("a1"), makeRow("a2")]);
    renderWithClient(<AssetsPageClient />);

    expect(screen.getByText("mobile-filters")).toBeInTheDocument();
    expect(await screen.findByText("cards:2")).toBeInTheDocument();
    expect(screen.queryByText("desktop-filters")).toBeNull();

    expect(
      screen.getByText("Press and hold an asset for quick actions."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(
      screen.queryByText("Press and hold an asset for quick actions."),
    ).toBeNull();
    expect(window.localStorage.getItem("stowage:hint-long-press")).toBe("1");
  });

  it("pages phone results with Show more", async () => {
    isPhoneMock.mockReturnValue(true);
    listAssetsMock.mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => makeRow(`a${i}`)),
    );
    renderWithClient(<AssetsPageClient />);

    expect(await screen.findByText("cards:15")).toBeInTheDocument();
    expect(screen.getByText("1 to 15 of 20")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show 5 more" }));
    expect(await screen.findByText("cards:20")).toBeInTheDocument();
  });
});
