import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const pushMock = vi.fn();
const searchAssetsMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/api/search", () => ({
  searchAssets: (term: string) => searchAssetsMock(term),
}));

import { GlobalSearch } from "@/components/search/global-search";

function createResult(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "asset-1",
    name: "Bridge server",
    assetTag: "IT-0001",
    status: "active",
    categoryName: "IT",
    locationPath: "Bridge",
    ...overrides,
  };
}

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("GlobalSearch", () => {
  beforeEach(() => {
    pushMock.mockReset();
    searchAssetsMock.mockReset();
  });

  it("opens, debounces input, and navigates when a result is selected", async () => {
    searchAssetsMock.mockImplementation((term: string) =>
      Promise.resolve(term === "bridge" ? [createResult()] : []),
    );

    const user = userEvent.setup();

    renderWithClient(<GlobalSearch />);

    await user.click(
      screen.getByRole("button", { name: "Open global search" }),
    );
    expect(screen.getByRole("dialog")).toBeVisible();

    await user.type(
      screen.getByPlaceholderText("Search assets by name, tag, or notes..."),
      "bridge",
    );

    await waitFor(
      () => {
        expect(screen.getByText("Bridge server")).toBeVisible();
      },
      { timeout: 2000 },
    );

    await user.click(screen.getByText("Bridge server"));

    expect(pushMock).toHaveBeenCalledWith("/assets/asset-1");
  });

  it("opens from the keyboard shortcut and shows an empty state for no matches", async () => {
    searchAssetsMock.mockResolvedValue([]);

    const user = userEvent.setup();

    renderWithClient(<GlobalSearch />);

    await act(async () => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "k",
          ctrlKey: true,
        }),
      );
    });

    expect(screen.getByRole("dialog")).toBeVisible();

    await user.type(
      screen.getByPlaceholderText("Search assets by name, tag, or notes..."),
      "zz",
    );

    await waitFor(
      () => {
        expect(screen.getByText("No assets found.")).toBeVisible();
      },
      { timeout: 2000 },
    );
  });
});
