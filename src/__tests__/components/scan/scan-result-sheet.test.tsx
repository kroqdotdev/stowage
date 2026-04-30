import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";

import type { AssetDetail } from "@/lib/api/assets";
import type { ResolverResult } from "@/lib/scan";

const updateAssetMock = vi.fn();
const updateAssetStatusMock = vi.fn();
const uploadAttachmentMock = vi.fn();
const createServiceRecordMock = vi.fn();
const listLocationsMock = vi.fn();
const listServiceProviderOptionsMock = vi.fn();

vi.mock("@/lib/api/assets", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api/assets")>(
      "@/lib/api/assets",
    );
  return {
    ...actual,
    updateAsset: (...args: unknown[]) => updateAssetMock(...args),
    updateAssetStatus: (...args: unknown[]) => updateAssetStatusMock(...args),
  };
});

vi.mock("@/lib/api/attachments", () => ({
  uploadAttachment: (...args: unknown[]) => uploadAttachmentMock(...args),
}));

vi.mock("@/lib/api/service-records", () => ({
  createServiceRecord: (...args: unknown[]) => createServiceRecordMock(...args),
}));

vi.mock("@/lib/api/service-providers", () => ({
  listServiceProviderOptions: () => listServiceProviderOptionsMock(),
}));

vi.mock("@/lib/api/locations", () => ({
  listLocations: () => listLocationsMock(),
}));

const currentUserMock: { data: { name?: string } | null } = {
  data: { name: "Mads Sauer" },
};

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => ({ data: currentUserMock.data }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const { toast } = await import("sonner");
const toastSuccess = toast.success as unknown as Mock;
const toastError = toast.error as unknown as Mock;

import { ScanResultSheet } from "@/components/scan/scan-result-sheet";

function makeAsset(overrides: Partial<AssetDetail> = {}): AssetDetail {
  return {
    id: "a1",
    name: "Drill #47",
    assetTag: "AST-0047",
    status: "active",
    categoryId: null,
    locationId: "loc-1",
    serviceGroupId: null,
    notes: null,
    customFieldValues: {},
    createdBy: "u1",
    updatedBy: "u1",
    createdAt: 0,
    updatedAt: 0,
    category: null,
    location: null,
    serviceGroup: null,
    tags: [],
    ...overrides,
  } as AssetDetail;
}

function renderSheet(target: ResolverResult) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const handlers = {
    onAssetUpdated: vi.fn(),
    onDismiss: vi.fn(),
  };
  const utils = render(
    <QueryClientProvider client={qc}>
      <ScanResultSheet
        target={target}
        resolving={false}
        onAssetUpdated={handlers.onAssetUpdated}
        onDismiss={handlers.onDismiss}
      />
    </QueryClientProvider>,
  );
  return { ...utils, handlers };
}

describe("ScanResultSheet", () => {
  beforeEach(() => {
    updateAssetMock.mockReset();
    updateAssetStatusMock.mockReset();
    uploadAttachmentMock.mockReset();
    createServiceRecordMock.mockReset();
    listLocationsMock.mockReset();
    listServiceProviderOptionsMock.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    currentUserMock.data = { name: "Mads Sauer" };
    listLocationsMock.mockResolvedValue([
      {
        id: "loc-1",
        name: "Bench 1",
        parentId: null,
        description: null,
        path: "Workshop / Bench 1",
        createdAt: 0,
        updatedAt: 0,
      },
      {
        id: "loc-2",
        name: "Bench 2",
        parentId: null,
        description: null,
        path: "Workshop / Bench 2",
        createdAt: 0,
        updatedAt: 0,
      },
    ]);
    listServiceProviderOptionsMock.mockResolvedValue([
      { id: "prov-1", name: "Acme Service Co." },
    ]);
  });

  it("renders the 2x3 grid and Scan-another dismiss", () => {
    renderSheet({ status: "asset", asset: makeAsset() });
    expect(screen.getByTestId("scan-result-asset")).toHaveAttribute(
      "data-asset-id",
      "a1",
    );
    expect(screen.getByTestId("scan-result-actions")).toBeInTheDocument();
    const testIds = [
      "scan-action-view",
      "scan-action-status",
      "scan-action-move",
      "scan-action-photo",
      "scan-action-note",
      "scan-action-service",
    ];
    for (const id of testIds) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
    expect(screen.getByTestId("scan-result-view")).toHaveAttribute(
      "href",
      "/assets/a1",
    );
    expect(screen.getByTestId("scan-result-dismiss")).toBeInTheDocument();
  });

  it("dismisses on the Scan another button", () => {
    const { handlers } = renderSheet({
      status: "asset",
      asset: makeAsset(),
    });
    fireEvent.click(screen.getByTestId("scan-result-dismiss"));
    expect(handlers.onDismiss).toHaveBeenCalled();
  });

  it("status → selecting a new status calls updateAssetStatus and bubbles the update", async () => {
    updateAssetStatusMock.mockResolvedValue(undefined);
    const { handlers } = renderSheet({
      status: "asset",
      asset: makeAsset(),
    });
    fireEvent.click(screen.getByTestId("scan-action-status"));

    const option = await screen.findByTestId("scan-status-option-under_repair");
    fireEvent.click(option);

    await waitFor(() => {
      expect(updateAssetStatusMock).toHaveBeenCalledWith("a1", "under_repair");
    });
    await waitFor(() => {
      expect(handlers.onAssetUpdated).toHaveBeenCalledWith(
        expect.objectContaining({ id: "a1", status: "under_repair" }),
      );
    });
  });

  it("status → rolls back and toasts on failure", async () => {
    updateAssetStatusMock.mockRejectedValue(new Error("nope"));
    const { handlers } = renderSheet({
      status: "asset",
      asset: makeAsset(),
    });
    fireEvent.click(screen.getByTestId("scan-action-status"));
    fireEvent.click(await screen.findByTestId("scan-status-option-retired"));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
    });
    expect(handlers.onAssetUpdated).not.toHaveBeenCalled();
  });

  it("move → picking a location calls updateAsset({ locationId })", async () => {
    updateAssetMock.mockResolvedValue(undefined);
    const { handlers } = renderSheet({
      status: "asset",
      asset: makeAsset(),
    });
    fireEvent.click(screen.getByTestId("scan-action-move"));

    await screen.findByTestId("scan-move-view");
    const loc2 = await screen.findByTestId("scan-move-option-loc-2");
    fireEvent.click(loc2);

    await waitFor(() => {
      expect(updateAssetMock).toHaveBeenCalledWith("a1", {
        locationId: "loc-2",
      });
    });
    await waitFor(() =>
      expect(handlers.onAssetUpdated).toHaveBeenCalledWith(
        expect.objectContaining({ locationId: "loc-2" }),
      ),
    );
  });

  it("move → clearing location calls updateAsset with null", async () => {
    updateAssetMock.mockResolvedValue(undefined);
    renderSheet({ status: "asset", asset: makeAsset() });
    fireEvent.click(screen.getByTestId("scan-action-move"));
    fireEvent.click(await screen.findByTestId("scan-move-option-none"));

    await waitFor(() => {
      expect(updateAssetMock).toHaveBeenCalledWith("a1", {
        locationId: null,
      });
    });
  });

  it("note → submitting appends a timestamped line to the asset's notes", async () => {
    updateAssetMock.mockResolvedValue(undefined);
    const { handlers } = renderSheet({
      status: "asset",
      asset: makeAsset({ notes: "Existing note" }),
    });
    fireEvent.click(screen.getByTestId("scan-action-note"));

    const textarea = await screen.findByTestId("scan-note-input");
    fireEvent.change(textarea, { target: { value: "Chipped paint" } });
    fireEvent.submit(screen.getByTestId("scan-note-form"));

    await waitFor(() => expect(updateAssetMock).toHaveBeenCalled());
    const [, body] = updateAssetMock.mock.calls[0];
    expect(body).toEqual({
      notes: expect.stringContaining("Existing note"),
    });
    expect(body.notes).toMatch(/Mads Sauer:.*Chipped paint/);
    await waitFor(() => {
      expect(handlers.onAssetUpdated).toHaveBeenCalledWith(
        expect.objectContaining({ notes: body.notes }),
      );
    });
  });

  it("photo → file input is accept=image and selecting a file calls uploadAttachment", async () => {
    uploadAttachmentMock.mockResolvedValue({ attachmentId: "att-1" });
    renderSheet({ status: "asset", asset: makeAsset() });

    const input = screen.getByTestId("scan-photo-input") as HTMLInputElement;
    expect(input.accept).toBe("image/*");
    expect(input.getAttribute("capture")).toBe("environment");

    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    await waitFor(() => expect(uploadAttachmentMock).toHaveBeenCalled());
    const [assetId, uploaded] = uploadAttachmentMock.mock.calls[0];
    expect(assetId).toBe("a1");
    expect(uploaded).toBe(file);
  });

  it("service → submits createServiceRecord with the form values", async () => {
    createServiceRecordMock.mockResolvedValue({
      recordId: "sr-1",
      nextServiceDate: null,
    });
    renderSheet({ status: "asset", asset: makeAsset() });
    fireEvent.click(screen.getByTestId("scan-action-service"));

    fireEvent.change(await screen.findByTestId("scan-service-description"), {
      target: { value: "Lubricated bearings" },
    });
    fireEvent.change(screen.getByTestId("scan-service-cost"), {
      target: { value: "19.50" },
    });
    await screen.findByTestId("scan-service-provider");
    fireEvent.change(screen.getByTestId("scan-service-provider"), {
      target: { value: "prov-1" },
    });

    fireEvent.submit(screen.getByTestId("scan-service-form"));

    await waitFor(() => expect(createServiceRecordMock).toHaveBeenCalled());
    const [payload] = createServiceRecordMock.mock.calls[0];
    expect(payload).toEqual({
      assetId: "a1",
      serviceDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      description: "Lubricated bearings",
      cost: 19.5,
      providerId: "prov-1",
      values: {},
    });
  });

  it("unresolved branch renders the raw text and Try-again button", () => {
    const { handlers } = renderSheet({
      status: "unresolved",
      rawText: "UNKNOWN-TAG",
    });
    expect(screen.getByTestId("scan-result-unresolved")).toBeInTheDocument();
    expect(screen.getByText(/UNKNOWN-TAG/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("scan-result-retry"));
    expect(handlers.onDismiss).toHaveBeenCalled();
  });
});
