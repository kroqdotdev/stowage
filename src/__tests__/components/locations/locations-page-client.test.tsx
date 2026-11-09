import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const listLocationsMock = vi.fn();
const listAssetsMock = vi.fn();
const deleteLocationMock = vi.fn();
const currentUserMock = vi.fn();
const mockReplace = vi.fn();
const mockPush = vi.fn();
const toastInfo = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("@/lib/api/locations", () => ({
  listLocations: () => listLocationsMock(),
  createLocation: vi.fn(),
  updateLocation: vi.fn(),
  deleteLocation: (id: string) => deleteLocationMock(id),
}));

vi.mock("@/lib/api/assets", () => ({
  listAssets: () => listAssetsMock(),
}));

vi.mock("@/lib/api/app-settings", () => ({
  getAppSettings: () => Promise.resolve({ serviceSchedulingEnabled: false }),
}));

vi.mock("@/lib/api/service-schedules", () => ({
  listScheduledAssets: () => Promise.resolve([]),
}));

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => ({ data: currentUserMock() }),
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => false,
}));

vi.mock("@/components/layout/mobile-top-bar", () => ({
  MobileTitleCount: () => null,
}));

vi.mock("sonner", () => ({
  toast: {
    info: (message: string) => toastInfo(message),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
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

import { LocationsPageClient } from "@/components/locations/locations-page-client";

function location(
  id: string,
  name: string,
  parentId: string | null,
  path: string,
) {
  return {
    id,
    name,
    parentId,
    description: null,
    path,
    createdAt: 0,
    updatedAt: 0,
  };
}

const LOCATIONS = [
  location("w", "Workshop", null, "Workshop"),
  location("b", "Bench 2", "w", "Workshop / Bench 2"),
  location("d", "Drawer", "b", "Workshop / Bench 2 / Drawer"),
  location("s", "Store", null, "Store"),
  location("e", "Shelf", "s", "Store / Shelf"),
];

function asset(
  id: string,
  locationId: string | null,
  locationPath: string | null,
) {
  return {
    id,
    name: `Asset ${id}`,
    assetTag: `AS-${id}`,
    status: "active",
    categoryId: null,
    categoryName: null,
    categoryColor: null,
    locationId,
    locationPath,
    serviceGroupId: null,
    notes: null,
    tagIds: [],
    tagNames: [],
    createdAt: 0,
    updatedAt: 0,
  };
}

const ASSETS = [
  asset("1", "b", "Workshop / Bench 2"),
  asset("2", "d", "Workshop / Bench 2 / Drawer"),
  asset("3", "w", "Workshop"),
  asset("4", null, null),
];

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ui = () => (
    <QueryClientProvider client={qc}>
      <LocationsPageClient />
    </QueryClientProvider>
  );
  const result = render(ui());
  return { ...result, rerenderPage: () => result.rerender(ui()) };
}

function treeRow(name: string) {
  const tree = screen.getByRole("list", { name: "Location tree" });
  return within(tree).queryByRole("button", {
    name: new RegExp(`^${name}\\d+$`),
  });
}

describe("LocationsPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearchParams = new URLSearchParams();
    listLocationsMock.mockResolvedValue(LOCATIONS);
    listAssetsMock.mockResolvedValue(ASSETS);
    currentUserMock.mockReturnValue({ id: "u1", role: "admin" });
  });

  it("rolls asset counts up the tree and leaves unplaced assets out of the subline", async () => {
    currentSearchParams = new URLSearchParams("location=d");
    renderPage();

    await screen.findByRole("list", { name: "Location tree" });
    expect(treeRow("Workshop")).toHaveTextContent("Workshop3");
    expect(treeRow("Bench 2")).toHaveTextContent("Bench 22");
    expect(treeRow("Drawer")).toHaveTextContent("Drawer1");
    expect(treeRow("Store")).toHaveTextContent("Store0");
    expect(screen.getByText("3 assets across 2 sites")).toBeInTheDocument();
  });

  it("selects the location named in ?location= and opens the path to it", async () => {
    currentSearchParams = new URLSearchParams("location=d");
    renderPage();

    const drawer = await waitFor(() => {
      const row = treeRow("Drawer");
      expect(row).not.toBeNull();
      return row!;
    });
    expect(drawer).toHaveAttribute("aria-current", "true");
    expect(
      within(screen.getByTestId("location-detail")).getByRole("heading", {
        level: 2,
      }),
    ).toHaveTextContent("Drawer");
  });

  it("reveals a newly selected location even after rows were collapsed", async () => {
    const user = userEvent.setup();
    currentSearchParams = new URLSearchParams("location=w");
    const { rerenderPage } = renderPage();

    await waitFor(() => expect(treeRow("Bench 2")).not.toBeNull());
    await user.click(screen.getByRole("button", { name: "Collapse Workshop" }));
    expect(treeRow("Bench 2")).toBeNull();

    currentSearchParams = new URLSearchParams("location=d");
    rerenderPage();

    expect(treeRow("Bench 2")).not.toBeNull();
    expect(treeRow("Drawer")).toHaveAttribute("aria-current", "true");

    // Once revealed, the user can still close the path again.
    await user.click(screen.getByRole("button", { name: "Collapse Workshop" }));
    expect(treeRow("Drawer")).toBeNull();
  });

  it("opens New location for admins on ?new=1", async () => {
    currentSearchParams = new URLSearchParams("new=1");
    renderPage();

    expect(
      await screen.findByRole("dialog", { name: "New location" }),
    ).toBeInTheDocument();
  });

  it("drops ?new=1 for non-admins and says why", async () => {
    currentUserMock.mockReturnValue({ id: "u2", role: "user" });
    currentSearchParams = new URLSearchParams("new=1&location=s");
    renderPage();

    await waitFor(() =>
      expect(toastInfo).toHaveBeenCalledWith("Only admins can add locations."),
    );
    expect(mockReplace).toHaveBeenCalledWith("/locations?location=s", {
      scroll: false,
    });
    expect(
      screen.queryByRole("dialog", { name: "New location" }),
    ).not.toBeInTheDocument();
  });

  it("blocks deleting a location that still holds assets or sub-locations", async () => {
    const user = userEvent.setup();
    currentSearchParams = new URLSearchParams("location=w");
    renderPage();

    await screen.findByTestId("location-detail");
    await user.click(screen.getByRole("button", { name: "Location actions" }));
    const item = await screen.findByRole("menuitem", { name: /Delete…/ });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).toHaveTextContent(
      "Move out its 1 asset and 1 sub-location first",
    );
  });

  it("deletes an empty location", async () => {
    const user = userEvent.setup();
    deleteLocationMock.mockResolvedValue(undefined);
    currentSearchParams = new URLSearchParams("location=e");
    renderPage();

    await screen.findByTestId("location-detail");
    await user.click(screen.getByRole("button", { name: "Location actions" }));
    const item = await screen.findByRole("menuitem", { name: "Delete…" });
    expect(item).not.toHaveAttribute("aria-disabled");
    await user.click(item);

    const dialog = await screen.findByRole("dialog", {
      name: "Delete location?",
    });
    expect(dialog).toHaveTextContent(
      "Store / Shelf is deleted. It holds no assets or sub-locations",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Delete location" }),
    );
    await waitFor(() => expect(deleteLocationMock).toHaveBeenCalledWith("e"));
  });
});
