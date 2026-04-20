import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const getFilterOptionsMock = vi.fn();
const listCustomFieldsMock = vi.fn();
const getAppSettingsMock = vi.fn();
const mockPush = vi.fn();

vi.mock("@/lib/api/assets", () => ({
  createAsset: vi.fn(),
  getAssetFilterOptions: () => getFilterOptionsMock(),
}));

vi.mock("@/lib/api/custom-fields", () => ({
  listCustomFields: () => listCustomFieldsMock(),
}));

vi.mock("@/lib/api/app-settings", () => ({
  getAppSettings: () => getAppSettingsMock(),
}));

vi.mock("@/lib/api/service-schedules", () => ({
  upsertSchedule: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/components/assets/asset-form", () => ({
  AssetForm: ({ mode, submitLabel }: { mode: string; submitLabel: string }) => (
    <div>
      <span>form-mode:{mode}</span>
      <button>{submitLabel}</button>
    </div>
  ),
}));

vi.mock("@/components/attachments/attachments-panel", () => ({
  AttachmentsPanel: () => <div>attachments-panel</div>,
}));

vi.mock("@/components/assets/error-messages", () => ({
  getAssetUiErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

import { AssetCreatePageClient } from "@/components/assets/asset-create-page-client";

const filterOptions = {
  categories: [],
  locations: [],
  tags: [],
  serviceGroups: [],
};

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("AssetCreatePageClient", () => {
  beforeEach(() => {
    getFilterOptionsMock.mockReset();
    listCustomFieldsMock.mockReset();
    getAppSettingsMock.mockReset();
    mockPush.mockReset();
  });

  it("shows loading state when queries are pending", () => {
    getFilterOptionsMock.mockImplementation(() => new Promise(() => {}));
    listCustomFieldsMock.mockImplementation(() => new Promise(() => {}));
    getAppSettingsMock.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<AssetCreatePageClient />);

    expect(screen.getByText("Loading form...")).toBeInTheDocument();
  });

  it("renders form when data is loaded", async () => {
    getFilterOptionsMock.mockResolvedValue(filterOptions);
    listCustomFieldsMock.mockResolvedValue([]);
    getAppSettingsMock.mockResolvedValue({
      dateFormat: "DD-MM-YYYY",
      serviceSchedulingEnabled: true,
      updatedAt: null,
    });

    renderWithClient(<AssetCreatePageClient />);

    await waitFor(() => {
      expect(screen.getByText("form-mode:create")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Create asset" }),
    ).toBeInTheDocument();
  });

  it("shows loading when only some queries have resolved", async () => {
    getFilterOptionsMock.mockResolvedValue(filterOptions);
    listCustomFieldsMock.mockImplementation(() => new Promise(() => {}));
    getAppSettingsMock.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<AssetCreatePageClient />);

    await waitFor(() => {
      expect(getFilterOptionsMock).toHaveBeenCalled();
    });
    expect(screen.getByText("Loading form...")).toBeInTheDocument();
  });
});
