import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const listLabelTemplatesMock = vi.fn();
const getLabelUrlBaseMock = vi.fn();
const getLabelPreviewAssetMock = vi.fn();
const listCustomFieldsMock = vi.fn();
const getCurrentUserMock = vi.fn();
const ensureMock = vi.fn();
const useMediaQueryMock = vi.fn();

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: (query: string) => useMediaQueryMock(query),
}));

vi.mock("@/components/labels/label-preview", () => ({
  LabelPreview: () => <div data-testid="mock-label-preview" />,
}));

vi.mock("@/lib/api/label-templates", () => ({
  listLabelTemplates: () => listLabelTemplatesMock(),
  getLabelUrlBase: () => getLabelUrlBaseMock(),
  ensureDefaultLabelTemplates: () => ensureMock(),
}));

vi.mock("@/lib/api/assets", () => ({
  getLabelPreviewAsset: () => getLabelPreviewAssetMock(),
}));

vi.mock("@/lib/api/custom-fields", () => ({
  listCustomFields: () => listCustomFieldsMock(),
}));

vi.mock("@/lib/api/auth", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

vi.mock("@/components/labels/template-designer", () => ({
  TemplateDesigner: (props: {
    templates: Array<{ id: string; name: string }>;
    currentUserRole: string | null;
  }) => (
    <div data-testid="mock-template-designer">
      <span data-testid="template-count">{props.templates.length}</span>
      <span data-testid="user-role">{props.currentUserRole ?? "null"}</span>
      {props.templates.map((t) => (
        <span key={t.id} data-testid={`template-${t.id}`}>
          {t.name}
        </span>
      ))}
    </div>
  ),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { LabelsPageClient } from "@/components/labels/labels-page-client";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("LabelsPageClient", () => {
  beforeEach(() => {
    listLabelTemplatesMock.mockReset();
    getLabelUrlBaseMock.mockReset();
    getLabelPreviewAssetMock.mockReset();
    listCustomFieldsMock.mockReset();
    getCurrentUserMock.mockReset();
    ensureMock.mockReset();
    ensureMock.mockResolvedValue({ seeded: false });
    useMediaQueryMock.mockReset();
    useMediaQueryMock.mockReturnValue(true); // default to desktop
  });

  it("shows loading state while queries are pending", () => {
    listLabelTemplatesMock.mockImplementation(() => new Promise(() => {}));
    getLabelUrlBaseMock.mockImplementation(() => new Promise(() => {}));
    getLabelPreviewAssetMock.mockImplementation(() => new Promise(() => {}));
    listCustomFieldsMock.mockImplementation(() => new Promise(() => {}));
    getCurrentUserMock.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<LabelsPageClient />);

    expect(screen.getByText("Loading label designer...")).toBeInTheDocument();
    expect(
      screen.queryByTestId("mock-template-designer"),
    ).not.toBeInTheDocument();
  });

  it("renders TemplateDesigner once all queries resolve", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "a@x.com",
      name: "Admin",
      role: "admin",
    });
    listLabelTemplatesMock.mockResolvedValue([
      {
        id: "template-1",
        name: "Thermal 57x32 mm",
        widthMm: 57,
        heightMm: 32,
        elements: [],
        isDefault: true,
        createdAt: 1,
        updatedAt: 1,
        createdBy: "user-1",
        updatedBy: "user-1",
      },
    ]);
    getLabelUrlBaseMock.mockResolvedValue("http://localhost:3000");
    getLabelPreviewAssetMock.mockResolvedValue(null);
    listCustomFieldsMock.mockResolvedValue([]);

    renderWithClient(<LabelsPageClient />);

    await waitFor(() => {
      expect(screen.getByTestId("mock-template-designer")).toBeInTheDocument();
    });
    expect(screen.getByTestId("template-count")).toHaveTextContent("1");
    expect(screen.getByTestId("template-template-1")).toHaveTextContent(
      "Thermal 57x32 mm",
    );
  });

  it("passes the current user role to TemplateDesigner", async () => {
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "u@x.com",
      name: "User",
      role: "user",
    });
    listLabelTemplatesMock.mockResolvedValue([]);
    getLabelUrlBaseMock.mockResolvedValue("http://localhost:3000");
    getLabelPreviewAssetMock.mockResolvedValue(null);
    listCustomFieldsMock.mockResolvedValue([]);

    renderWithClient(<LabelsPageClient />);

    await waitFor(() => {
      expect(screen.getByTestId("user-role")).toHaveTextContent("user");
    });
  });

  it("shows a desktop-only banner + read-only previews on mobile viewports", async () => {
    useMediaQueryMock.mockReturnValue(false);
    getCurrentUserMock.mockResolvedValue({
      id: "user-1",
      email: "a@x.com",
      name: "Admin",
      role: "admin",
    });
    listLabelTemplatesMock.mockResolvedValue([
      {
        id: "template-1",
        name: "Thermal 57x32 mm",
        widthMm: 57,
        heightMm: 32,
        elements: [],
        isDefault: true,
        createdAt: 1,
        updatedAt: 1,
        createdBy: "user-1",
        updatedBy: "user-1",
      },
    ]);
    getLabelUrlBaseMock.mockResolvedValue("http://localhost:3000");
    getLabelPreviewAssetMock.mockResolvedValue(null);
    listCustomFieldsMock.mockResolvedValue([]);

    renderWithClient(<LabelsPageClient />);

    await waitFor(() => {
      expect(screen.getByTestId("labels-mobile-view")).toBeInTheDocument();
    });
    expect(screen.getByTestId("labels-desktop-banner")).toHaveTextContent(
      /Open Stowage on desktop to edit/,
    );
    expect(
      screen.getByTestId("labels-mobile-template-template-1"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("mock-label-preview")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-template-designer")).toBeNull();

    const printLink = screen.getByRole("link", { name: /Print labels/ });
    expect(printLink).toHaveAttribute("href", "/labels/print");
  });
});
