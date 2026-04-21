import { beforeEach, describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

const listServiceGroupFieldsMock = vi.fn();

vi.mock("@/lib/api/service-groups", () => ({
  listServiceGroupFields: (groupId: string) =>
    listServiceGroupFieldsMock(groupId),
  createServiceGroupField: vi.fn().mockResolvedValue(null),
  updateServiceGroupField: vi.fn().mockResolvedValue(null),
  deleteServiceGroupField: vi.fn().mockResolvedValue(null),
  reorderServiceGroupFields: vi.fn().mockResolvedValue(null),
}));

import { ServiceGroupFieldsPanel } from "@/components/services/service-group-fields-panel";

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("ServiceGroupFieldsPanel", () => {
  beforeEach(() => {
    listServiceGroupFieldsMock.mockReset();
  });

  it("shows loading state when fields are pending", () => {
    listServiceGroupFieldsMock.mockImplementation(() => new Promise(() => {}));

    renderWithClient(<ServiceGroupFieldsPanel groupId="group1" canManage />);

    // Both mobile card list and desktop table render copies of the text
    expect(
      screen.getAllByText("Loading service fields...").length,
    ).toBeGreaterThan(0);
  });

  it("shows empty state when no fields exist", async () => {
    listServiceGroupFieldsMock.mockResolvedValue([]);

    renderWithClient(<ServiceGroupFieldsPanel groupId="group1" canManage />);

    await waitFor(() => {
      expect(
        screen.getAllByText(
          "No fields yet. Add required service fields for this group.",
        ).length,
      ).toBeGreaterThan(0);
    });
  });

  it("renders field list with add button for admins", async () => {
    const user = userEvent.setup();

    listServiceGroupFieldsMock.mockResolvedValue([
      {
        id: "field1",
        groupId: "group1",
        label: "Technician note",
        fieldType: "text",
        required: true,
        options: [],
        sortOrder: 0,
        createdAt: 1,
        updatedAt: 1,
        createdBy: "user1",
        updatedBy: "user1",
      },
    ]);

    renderWithClient(<ServiceGroupFieldsPanel groupId="group1" canManage />);

    await waitFor(() => {
      expect(screen.getAllByText("Technician note").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("Required").length).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByRole("button", { name: /Add field/ }));
    expect(
      screen.getByRole("heading", { name: "Add required field" }),
    ).toBeVisible();
  });
});
