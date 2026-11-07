import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AssetDetail as AssetDetailType } from "@/components/assets/types";
import type { FieldDefinition } from "@/components/fields/types";

const listAttachmentsMock = vi.fn();
const listLocationsMock = vi.fn();
const nextServiceSpy = vi.fn();
const labelPanelSpy = vi.fn();

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

vi.mock("next/navigation", () => ({
  usePathname: () => "/assets/asset1",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/lib/use-app-date-format", () => ({
  useAppDateFormat: () => "DD-MM-YYYY",
}));

vi.mock("@/lib/api/attachments", () => ({
  listAttachments: (assetId: string) => listAttachmentsMock(assetId),
}));

vi.mock("@/lib/api/locations", () => ({
  listLocations: () => listLocationsMock(),
}));

vi.mock("@/components/fields/dynamic-field-display", () => ({
  DynamicFieldDisplay: ({ definition }: { definition: { name: string } }) => (
    <span>field:{definition.name}</span>
  ),
}));

vi.mock("@/components/attachments/attachments-panel", () => ({
  AttachmentsPanel: () => <div>attachments-panel</div>,
}));

vi.mock("@/components/services/asset-service-records-panel", () => ({
  AssetServiceRecordsPanel: ({ assetId }: { assetId: string }) => (
    <div>service-records-panel:{assetId}</div>
  ),
}));

vi.mock("@/components/services/next-service-panel", () => ({
  NextServicePanel: (props: {
    assetId: string;
    assetName: string;
    serviceGroupName: string | null;
  }) => {
    nextServiceSpy(props);
    return <div>next-service-panel</div>;
  },
}));

vi.mock("@/components/labels/asset-label-panel", () => ({
  AssetLabelPanel: (props: { asset: { assetTag: string } }) => {
    labelPanelSpy(props);
    return <div>asset-label-panel</div>;
  },
}));

vi.mock("@/components/assets/asset-photo-slot", () => ({
  AssetPhotoSlot: ({ assetName }: { assetName: string }) => (
    <div>photo-slot:{assetName}</div>
  ),
}));

import { AssetDetail } from "@/components/assets/asset-detail";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 10, 6, 12, 0, 0).getTime();

const baseAsset: AssetDetailType = {
  id: "asset1",
  name: "Core Router",
  assetTag: "IT-0042",
  status: "active",
  categoryId: "cat1",
  locationId: "loc2",
  serviceGroupId: null,
  notes: "Main network router",
  customFieldValues: { field1: "SN-12345" },
  createdBy: "user1",
  updatedBy: "user1",
  createdAt: new Date(2026, 0, 15, 12).getTime(),
  updatedAt: NOW - 2 * DAY,
  category: {
    id: "cat1",
    name: "Networking",
    prefix: "NET",
    color: "#3b82f6",
  },
  location: {
    id: "loc2",
    name: "Server Room",
    parentId: "loc1",
    path: "Building A / Server Room",
  },
  serviceGroup: null,
  tags: [
    {
      id: "tag1",
      name: "Critical",
      color: "#ef4444",
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: "tag2",
      name: "Production",
      color: "#22c55e",
      createdAt: 2,
      updatedAt: 2,
    },
  ],
};

const fieldDefinitions: FieldDefinition[] = [
  {
    id: "field1",
    name: "Serial Number",
    fieldType: "text",
    options: [],
    required: false,
    sortOrder: 0,
    usageCount: 0,
    createdAt: 1,
    updatedAt: 1,
  },
];

function makeProps(overrides: Partial<React.ComponentProps<typeof AssetDetail>> = {}) {
  return {
    asset: baseAsset,
    fieldDefinitions,
    canDelete: true,
    deleting: false,
    updatingStatus: false,
    onStatusChange: vi.fn(),
    onDelete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderDetail(props = makeProps()) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <AssetDetail {...props} />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

async function openMoreActions() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "More actions" }));
  await screen.findByRole("menu");
  return user;
}

describe("AssetDetail", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    listAttachmentsMock.mockReset();
    listAttachmentsMock.mockResolvedValue([]);
    listLocationsMock.mockReset();
    listLocationsMock.mockResolvedValue([]);
    nextServiceSpy.mockReset();
    labelPanelSpy.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.getElementById("mobile-top-bar-slot")?.remove();
  });

  describe("hero", () => {
    it("shows the tag, name, status, location, category and keywords", () => {
      renderDetail();

      expect(
        screen.getByRole("heading", { level: 1, name: "Core Router" }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("asset-tag")).toHaveTextContent("IT-0042");
      expect(
        screen.getByRole("combobox", { name: "Change status" }),
      ).toHaveTextContent("Active");
      expect(screen.getByText("Building A / Server Room")).toBeInTheDocument();
      // Category sits in the status row on desktop and the keyword row below.
      expect(screen.getAllByText("Networking")).toHaveLength(2);
      expect(screen.getByText("Critical")).toBeInTheDocument();
      expect(screen.getByText("Production")).toBeInTheDocument();
      expect(screen.getByText("photo-slot:Core Router")).toBeInTheDocument();
    });

    it("links back to Assets", () => {
      renderDetail();
      expect(screen.getByRole("link", { name: "Assets" })).toHaveAttribute(
        "href",
        "/assets",
      );
    });

    it("turns the location into a picker run when it can be changed", async () => {
      listLocationsMock.mockResolvedValue([
        { id: "loc1", name: "Building A", parentId: null, path: "Building A" },
        {
          id: "loc2",
          name: "Server Room",
          parentId: "loc1",
          path: "Building A / Server Room",
        },
      ]);
      renderDetail(makeProps({ onLocationChange: vi.fn() }));

      expect(
        await screen.findByRole("button", {
          name: "Location: Building A / Server Room. Change location",
        }),
      ).toBeInTheDocument();
    });

    it("keeps showing the current location while the location list loads", () => {
      listLocationsMock.mockReturnValue(new Promise(() => {}));
      renderDetail(makeProps({ onLocationChange: vi.fn() }));

      expect(screen.queryByText("No locations available.")).toBeNull();
      expect(
        screen.getByRole("button", {
          name: "Location: Building A / Server Room. Change location",
        }),
      ).toBeInTheDocument();
    });

    it("says No location in the picker run when the asset has none", async () => {
      listLocationsMock.mockResolvedValue([
        { id: "loc1", name: "Building A", parentId: null, path: "Building A" },
      ]);
      renderDetail(
        makeProps({
          asset: { ...baseAsset, location: null, locationId: null },
          onLocationChange: vi.fn(),
        }),
      );

      const run = await screen.findByRole("button", {
        name: "Location: none. Change location",
      });
      expect(run).toHaveTextContent("No location");
    });

    it("shows no location run when the location is read-only and unset", () => {
      renderDetail(
        makeProps({ asset: { ...baseAsset, location: null, locationId: null } }),
      );
      expect(screen.queryByText("Building A / Server Room")).toBeNull();
      expect(screen.queryByRole("button", { name: /Change location/ })).toBeNull();
    });
  });

  describe("actions", () => {
    it("shows an Edit link", () => {
      renderDetail();
      expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
        "href",
        "/assets/asset1/edit",
      );
    });

    it("collects Edit, Print label and Delete… in the More actions menu", async () => {
      renderDetail();
      await openMoreActions();

      const menu = screen.getByRole("menu");
      expect(
        within(menu).getByRole("menuitem", { name: "Edit" }),
      ).toHaveAttribute("href", "/assets/asset1/edit");
      expect(
        within(menu).getByRole("menuitem", { name: "Print label" }),
      ).toHaveAttribute("href", "/labels/print?assetId=asset1");
      expect(
        within(menu).getByRole("menuitem", { name: "Delete…" }),
      ).toBeInTheDocument();
    });

    it("leaves Delete… out of the menu when the user cannot delete", async () => {
      renderDetail(makeProps({ canDelete: false }));
      await openMoreActions();

      expect(screen.getByRole("menuitem", { name: "Print label" })).toBeInTheDocument();
      expect(screen.queryByRole("menuitem", { name: /Delete/ })).toBeNull();
      expect(screen.queryByTestId("asset-detail-delete")).toBeNull();
    });

    it("confirms before deleting", async () => {
      const props = makeProps();
      renderDetail(props);
      const user = await openMoreActions();

      await user.click(screen.getByRole("menuitem", { name: "Delete…" }));
      const dialog = await screen.findByRole("dialog", { name: "Delete asset?" });
      expect(
        within(dialog).getByText(
          "IT-0042 Core Router and its service history are deleted.",
        ),
      ).toBeInTheDocument();
      expect(props.onDelete).not.toHaveBeenCalled();

      await user.click(
        within(dialog).getByRole("button", { name: "Delete asset" }),
      );
      expect(props.onDelete).toHaveBeenCalledOnce();
    });

    it("changes status from the status picker run", async () => {
      const user = userEvent.setup();
      const props = makeProps();
      renderDetail(props);

      await user.click(screen.getByRole("combobox", { name: "Change status" }));
      await user.click(await screen.findByRole("option", { name: "Under repair" }));
      expect(props.onStatusChange).toHaveBeenCalledWith("under_repair");
    });
  });

  describe("details card", () => {
    it("renders custom fields", () => {
      renderDetail();
      expect(screen.getByText("Serial Number")).toBeInTheDocument();
      expect(screen.getByText("field:Serial Number")).toBeInTheDocument();
    });

    it("shows the service plan when the asset has one", () => {
      renderDetail(
        makeProps({
          asset: {
            ...baseAsset,
            serviceGroupId: "sg1",
            serviceGroup: { id: "sg1", name: "Quarterly check" } as never,
          },
        }),
      );
      expect(screen.getByText("Service plan")).toBeInTheDocument();
      expect(screen.getByText("Quarterly check")).toBeInTheDocument();
      expect(nextServiceSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ serviceGroupName: "Quarterly check" }),
      );
    });

    it("renders notes", () => {
      renderDetail();
      expect(screen.getByText("Main network router")).toBeInTheDocument();
    });

    it("shows 'No notes' when notes are null", () => {
      renderDetail(makeProps({ asset: { ...baseAsset, notes: null } }));
      expect(screen.getByText("No notes")).toBeInTheDocument();
    });

    it("counts attachments on the tab and shows them when selected", async () => {
      listAttachmentsMock.mockResolvedValue([{ id: "f1" }, { id: "f2" }]);
      const user = userEvent.setup();
      renderDetail();

      const tab = screen.getByRole("tab", { name: /Attachments/ });
      await waitFor(() => expect(tab).toHaveTextContent("Attachments2"));
      expect(listAttachmentsMock).toHaveBeenCalledWith("asset1");

      await user.click(tab);
      expect(await screen.findByText("attachments-panel")).toBeInTheDocument();
    });

    it("shows created and last-changed dates", () => {
      renderDetail();
      expect(screen.getByText(/Created 15-01-2026\./)).toBeInTheDocument();
      expect(screen.getByText("2 days ago")).toBeInTheDocument();
      expect(screen.getByText("2d")).toBeInTheDocument();
    });
  });

  describe("panels", () => {
    it("renders Next service, service history and the label panel for the asset", () => {
      renderDetail();
      expect(screen.getByText("next-service-panel")).toBeInTheDocument();
      expect(screen.getByText("service-records-panel:asset1")).toBeInTheDocument();
      expect(screen.getByText("asset-label-panel")).toBeInTheDocument();

      expect(nextServiceSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          assetId: "asset1",
          assetName: "Core Router",
          serviceGroupName: null,
        }),
      );
      expect(labelPanelSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          asset: expect.objectContaining({
            id: "asset1",
            assetTag: "IT-0042",
            categoryName: "Networking",
            locationPath: "Building A / Server Room",
          }),
        }),
      );
    });
  });

  describe("phone top bar", () => {
    it("renders nothing into the phone bar when the slot is absent", () => {
      renderDetail();
      expect(
        screen.queryByRole("link", { name: "Back to Assets" }),
      ).toBeNull();
      expect(screen.queryByTestId("asset-detail-kebab")).toBeNull();
    });

    it("replaces the phone top bar with back, tag, edit and actions", async () => {
      const slot = document.createElement("div");
      slot.id = "mobile-top-bar-slot";
      document.body.appendChild(slot);

      renderDetail();

      const bar = within(slot);
      expect(
        await bar.findByRole("link", { name: "Back to Assets" }),
      ).toHaveAttribute("href", "/assets");
      expect(bar.getByText("IT-0042")).toBeInTheDocument();
      expect(bar.getByRole("link", { name: "Edit asset" })).toHaveAttribute(
        "href",
        "/assets/asset1/edit",
      );

      const user = userEvent.setup();
      await user.click(bar.getByRole("button", { name: "Asset actions" }));
      expect(
        await screen.findByRole("menuitem", { name: "Print label" }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("asset-detail-delete")).toBeInTheDocument();
    });
  });
});
