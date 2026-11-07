import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, fireEvent, within } from "@testing-library/react";

const pushSpy = vi.fn();

vi.mock("@/lib/api/assets", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api/assets")>(
      "@/lib/api/assets",
    );
  return { ...actual, getAsset: vi.fn().mockResolvedValue(null) };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushSpy }),
}));

vi.mock("@/components/assets/asset-actions-sheet", () => ({
  AssetActionsSheet: ({
    open,
    asset,
    onOpenChange,
  }: {
    open: boolean;
    asset: { name: string } | null;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div role="dialog" aria-label="Asset actions">
        {asset?.name}
        <button type="button" onClick={() => onOpenChange(false)}>
          Close
        </button>
      </div>
    ) : null,
}));

const NOW = new Date(2026, 10, 6, 12, 0, 0).getTime();
const DAY = 24 * 60 * 60 * 1000;

import { AssetCardList } from "@/components/assets/asset-card-list";
import type { AssetListItem } from "@/components/assets/types";

function makeRow(overrides: Partial<AssetListItem> = {}): AssetListItem {
  return {
    id: "a1",
    name: "Drill #47",
    assetTag: "AST-0047",
    status: "active",
    categoryId: "cat-1",
    categoryName: "Power tools",
    categoryColor: "#c2410c",
    locationId: "loc-1",
    locationPath: "Workshop / Bench 3",
    serviceGroupId: null,
    notes: null,
    tagIds: ["t1", "t2"],
    tagNames: ["electric", "cordless"],
    createdAt: 0,
    updatedAt: NOW - DAY,
    ...overrides,
  };
}

function renderList(rows: AssetListItem[], loading = false) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <AssetCardList rows={rows} loading={loading} />
    </QueryClientProvider>,
  );
}

describe("AssetCardList", () => {
  beforeEach(() => {
    pushSpy.mockReset();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders skeleton rows while loading with no data", () => {
    renderList([], true);
    expect(screen.getByTestId("asset-card-list-loading")).toBeInTheDocument();
  });

  it("renders the empty state when no rows and not loading", () => {
    renderList([], false);
    expect(screen.getByText(/no assets match/i)).toBeInTheDocument();
  });

  it("renders one card link per row with tag and name", () => {
    renderList([
      makeRow(),
      makeRow({
        id: "a2",
        name: "Lathe",
        assetTag: "AST-0048",
        locationPath: "Workshop / Bench 5",
      }),
    ]);

    const drill = screen.getByRole("link", { name: "AST-0047, Drill #47" });
    expect(drill).toHaveAttribute("href", "/assets/a1");
    expect(drill).toHaveAttribute("data-testid", "asset-card-a1");
    expect(screen.getByRole("link", { name: "AST-0048, Lathe" })).toHaveAttribute(
      "href",
      "/assets/a2",
    );
  });

  it("shows the location path and short relative time on line two", () => {
    renderList([makeRow()]);
    expect(screen.getByTestId("asset-card-a1")).toHaveTextContent(
      "Workshop / Bench 3 · 1d",
    );
  });

  it("leads line two with the category when asked", () => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={qc}>
        <AssetCardList rows={[makeRow()]} loading={false} secondary="category" />
      </QueryClientProvider>,
    );
    const card = screen.getByTestId("asset-card-a1");
    expect(card).toHaveTextContent("Power tools · 1d");
    expect(card).not.toHaveTextContent("Bench 3");
  });

  it("says No location when an asset has none", () => {
    renderList([makeRow({ locationPath: null, locationId: null })]);
    expect(
      within(screen.getByTestId("asset-card-a1")).getByText("No location"),
    ).toBeInTheDocument();
  });

  it("does not show keyword chips on cards", () => {
    renderList([makeRow()]);
    expect(screen.queryByText("electric")).toBeNull();
    expect(screen.queryByText("cordless")).toBeNull();
  });

  it("adds a status line only for non-active assets", () => {
    renderList([
      makeRow(),
      makeRow({ id: "a2", name: "Lathe", status: "under_repair" }),
    ]);
    expect(
      within(screen.getByTestId("asset-card-a1")).queryByText("Active"),
    ).toBeNull();
    expect(
      within(screen.getByTestId("asset-card-a2")).getByText("Under repair"),
    ).toBeInTheDocument();
  });

  it("navigates to the asset on a plain tap", () => {
    renderList([makeRow()]);
    fireEvent.click(screen.getByTestId("asset-card-a1"));
    expect(pushSpy).toHaveBeenCalledWith("/assets/a1");
    expect(screen.queryByRole("dialog", { name: "Asset actions" })).toBeNull();
  });

  it("has no kebab button; press and hold opens the actions sheet instead", () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(NOW);
    try {
      renderList([makeRow()]);
      expect(screen.queryByRole("button")).toBeNull();

      const card = screen.getByTestId("asset-card-a1");
      fireEvent.pointerDown(card);
      act(() => {
        vi.advanceTimersByTime(450);
      });
      fireEvent.pointerUp(card);

      const sheet = screen.getByRole("dialog", { name: "Asset actions" });
      expect(sheet).toHaveTextContent("Drill #47");

      // The click that ends the long press must not navigate.
      fireEvent.click(card);
      expect(pushSpy).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("a short press does not open the actions sheet", () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(NOW);
    try {
      renderList([makeRow()]);
      const card = screen.getByTestId("asset-card-a1");
      fireEvent.pointerDown(card);
      act(() => {
        vi.advanceTimersByTime(200);
      });
      fireEvent.pointerUp(card);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.queryByRole("dialog", { name: "Asset actions" })).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens the actions sheet on right-click", () => {
    renderList([makeRow()]);
    fireEvent.contextMenu(screen.getByTestId("asset-card-a1"));
    expect(
      screen.getByRole("dialog", { name: "Asset actions" }),
    ).toHaveTextContent("Drill #47");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Asset actions" })).toBeNull();
  });
});
