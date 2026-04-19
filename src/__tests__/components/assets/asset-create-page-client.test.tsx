import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { AssetCreatePageClient } from "@/components/assets/asset-create-page-client";

const mockUseQuery = vi.fn<(...args: unknown[]) => unknown>();
const mockUseMutation = vi.fn<(...args: unknown[]) => unknown>(() => vi.fn());
const mockPush = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
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

const filterOptions = {
  categories: [],
  locations: [],
  tags: [],
  serviceGroups: [],
};

describe("AssetCreatePageClient", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseMutation.mockReset();
    mockUseMutation.mockReturnValue(vi.fn());
    mockPush.mockReset();
  });

  it("shows loading state when queries are pending", () => {
    mockUseQuery.mockReturnValue(undefined);

    render(<AssetCreatePageClient />);

    expect(screen.getByText("Loading form...")).toBeInTheDocument();
  });

  it("renders form when data is loaded", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "assets:getAssetFilterOptions")
        return filterOptions;
      if (functionName === "customFields:listFieldDefinitions") return [];
      if (functionName === "appSettings:getAppSettings")
        return { serviceSchedulingEnabled: true };
      return undefined;
    });

    render(<AssetCreatePageClient />);

    expect(screen.getByText("form-mode:create")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create asset" }),
    ).toBeInTheDocument();
  });

  it("shows loading when only some queries have resolved", () => {
    mockUseQuery.mockImplementation((reference: unknown) => {
      const functionName = getFunctionName(reference as never);
      if (functionName === "assets:getAssetFilterOptions")
        return filterOptions;
      // fieldDefinitions and appSettings still undefined
      return undefined;
    });

    render(<AssetCreatePageClient />);

    expect(screen.getByText("Loading form...")).toBeInTheDocument();
  });
});
