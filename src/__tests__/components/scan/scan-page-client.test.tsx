import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";

import type { AssetDetail } from "@/lib/api/assets";

const scannerMock: {
  state: "idle" | "requesting" | "scanning" | "denied" | "insecure" | "error";
  error: string | null;
  torchSupported: boolean;
  torchOn: boolean;
  toggle: Mock;
  restart: Mock;
  onResult: ((result: { text: string; format: string }) => void) | null;
} = {
  state: "scanning",
  error: null,
  torchSupported: false,
  torchOn: false,
  toggle: vi.fn(),
  restart: vi.fn(),
  onResult: null,
};

vi.mock("@/hooks/use-barcode-scanner", () => ({
  useBarcodeScanner: (options: {
    onResult: (result: { text: string; format: string }) => void;
    enabled: boolean;
  }) => {
    scannerMock.onResult = options.onResult;
    return {
      state: scannerMock.state,
      error: scannerMock.error,
      torch: {
        supported: scannerMock.torchSupported,
        on: scannerMock.torchOn,
        toggle: scannerMock.toggle,
      },
      restart: scannerMock.restart,
    };
  },
}));

const resolverMock = vi.fn();
vi.mock("@/lib/scan", () => ({
  resolveScanTarget: (...args: unknown[]) => resolverMock(...args),
}));

const routerMock = { back: vi.fn(), push: vi.fn(), replace: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  usePathname: () => "/scan",
}));

import { ScanPageClient } from "@/components/scan/scan-page-client";

function makeAsset(overrides: Partial<AssetDetail> = {}): AssetDetail {
  return {
    id: "a1",
    name: "Drill #47",
    assetTag: "AST-0047",
    status: "active",
    categoryId: null,
    locationId: null,
    serviceGroupId: null,
    notes: null,
    customFieldValues: {},
    createdBy: "u1",
    updatedBy: "u1",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  } as AssetDetail;
}

function renderScanPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <ScanPageClient />
    </QueryClientProvider>,
  );
}

describe("ScanPageClient", () => {
  beforeEach(() => {
    scannerMock.state = "scanning";
    scannerMock.error = null;
    scannerMock.torchSupported = false;
    scannerMock.torchOn = false;
    scannerMock.toggle = vi.fn();
    scannerMock.restart = vi.fn();
    scannerMock.onResult = null;
    resolverMock.mockReset();
    routerMock.back.mockReset();
  });

  it("renders the camera viewport + reticle while scanning", () => {
    renderScanPage();
    expect(screen.getByTestId("scan-page")).toBeInTheDocument();
    expect(screen.getByTestId("scan-viewport")).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(screen.getByTestId("scan-manual-entry")).toBeInTheDocument();
  });

  it("shows the permission-denied state when the scanner reports 'denied'", () => {
    scannerMock.state = "denied";
    renderScanPage();
    expect(screen.getByTestId("scan-state-denied")).toBeInTheDocument();
    expect(screen.queryByTestId("scan-viewport")).toBeNull();
    // manual-entry link stays visible in every state
    expect(screen.getByTestId("scan-manual-entry")).toBeInTheDocument();
  });

  it("shows the insecure-context state when scanner.state is 'insecure'", () => {
    scannerMock.state = "insecure";
    renderScanPage();
    expect(screen.getByTestId("scan-state-insecure")).toBeInTheDocument();
  });

  it("shows the generic error state with message when scanner.state is 'error'", () => {
    scannerMock.state = "error";
    scannerMock.error = "Camera busy";
    renderScanPage();
    expect(screen.getByTestId("scan-state-error")).toBeInTheDocument();
    expect(screen.getByText("Camera busy")).toBeInTheDocument();
  });

  it("hides the torch button when not supported and shows it when supported", () => {
    scannerMock.torchSupported = false;
    const { unmount } = renderScanPage();
    expect(screen.queryByTestId("scan-torch")).toBeNull();
    unmount();

    scannerMock.torchSupported = true;
    renderScanPage();
    const button = screen.getByTestId("scan-torch");
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(scannerMock.toggle).toHaveBeenCalled();
  });

  it("returns via router.back() when tapping Back", () => {
    renderScanPage();
    fireEvent.click(screen.getByTestId("scan-back"));
    expect(routerMock.back).toHaveBeenCalled();
  });

  it("opens the manual-entry sheet and submits to the resolver", async () => {
    const asset = makeAsset();
    resolverMock.mockResolvedValue({ status: "asset", asset });

    renderScanPage();
    fireEvent.click(screen.getByTestId("scan-manual-entry"));
    const input = await screen.findByTestId("scan-manual-input");
    fireEvent.change(input, { target: { value: "AST-0047" } });
    fireEvent.submit(screen.getByTestId("scan-manual-form"));

    await waitFor(() => {
      expect(resolverMock).toHaveBeenCalledWith("AST-0047", expect.any(String));
    });
    const resultSheet = await screen.findByTestId("scan-result-asset");
    expect(resultSheet).toHaveAttribute("data-asset-id", "a1");
    expect(screen.getByTestId("scan-result-view")).toHaveAttribute(
      "href",
      "/assets/a1",
    );
  });

  it("shows the unresolved sheet with raw text on a missing asset", async () => {
    resolverMock.mockResolvedValue({
      status: "unresolved",
      rawText: "AST-9999",
    });

    renderScanPage();
    fireEvent.click(screen.getByTestId("scan-manual-entry"));
    fireEvent.change(await screen.findByTestId("scan-manual-input"), {
      target: { value: "AST-9999" },
    });
    fireEvent.submit(screen.getByTestId("scan-manual-form"));

    await screen.findByTestId("scan-result-unresolved");
    expect(screen.getByText(/AST-9999/)).toBeInTheDocument();
  });

  it("dismisses the result sheet when tapping Scan another", async () => {
    const asset = makeAsset();
    resolverMock.mockResolvedValue({ status: "asset", asset });

    renderScanPage();
    fireEvent.click(screen.getByTestId("scan-manual-entry"));
    fireEvent.change(await screen.findByTestId("scan-manual-input"), {
      target: { value: "AST-0047" },
    });
    fireEvent.submit(screen.getByTestId("scan-manual-form"));

    await screen.findByTestId("scan-result-asset");
    fireEvent.click(screen.getByTestId("scan-result-dismiss"));

    await waitFor(() => {
      expect(screen.queryByTestId("scan-result-asset")).toBeNull();
    });
  });

  it("routes a decoded scanner result through the resolver", async () => {
    const asset = makeAsset({ id: "b2", name: "Lathe" });
    resolverMock.mockResolvedValue({ status: "asset", asset });

    renderScanPage();
    await waitFor(() => expect(scannerMock.onResult).toBeTruthy());
    act(() => {
      scannerMock.onResult?.({
        text: "https://x.test/assets/b2",
        format: "QR_CODE",
      });
    });

    const sheet = await screen.findByTestId("scan-result-asset");
    expect(sheet).toHaveAttribute("data-asset-id", "b2");
    expect(resolverMock).toHaveBeenCalledWith(
      "https://x.test/assets/b2",
      expect.any(String),
    );
  });
});
