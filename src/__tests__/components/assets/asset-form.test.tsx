import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { AssetForm } from "@/components/assets/asset-form";
import type { AssetFormValues } from "@/components/assets/types";

vi.mock("convex/react", () => ({
  useQuery: () => ({ assetTag: "IT-0001", prefix: "IT", nextNumber: 1 }),
}));

const initialValues: AssetFormValues = {
  name: "",
  categoryId: null,
  locationId: null,
  status: "active",
  notes: "",
  customFieldValues: {},
  tagIds: [],
};

describe("AssetForm", () => {
  it("validates required fields before submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <AssetForm
        mode="create"
        categories={[]}
        locations={[]}
        tags={[]}
        fieldDefinitions={[
          {
            _id: "field1" as never,
            _creationTime: 1,
            name: "Serial",
            fieldType: "text",
            options: [],
            required: true,
            sortOrder: 0,
            usageCount: 0,
            createdAt: 1,
            updatedAt: 1,
          },
        ]}
        initialValues={initialValues}
        submitLabel="Create asset"
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Create asset" }));

    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Serial is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits normalized values", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <AssetForm
        mode="create"
        categories={[]}
        locations={[]}
        tags={[]}
        fieldDefinitions={[]}
        initialValues={initialValues}
        submitLabel="Create asset"
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/Name/i), "  Router  ");
    await user.type(screen.getByLabelText(/Notes/i), "Core");
    await user.click(screen.getByRole("button", { name: "Create asset" }));

    expect(onSubmit).toHaveBeenCalledWith({
      ...initialValues,
      name: "Router",
      notes: "Core",
      customFieldValues: {},
    });
  });

  it("preserves in-progress edits when parent data re-renders", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    const { rerender } = render(
      <AssetForm
        mode="edit"
        categories={[]}
        locations={[]}
        tags={[]}
        fieldDefinitions={[]}
        initialValues={{
          ...initialValues,
          name: "Original",
        }}
        submitLabel="Save changes"
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    const nameInput = screen.getByLabelText(/Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Draft");

    rerender(
      <AssetForm
        mode="edit"
        categories={[]}
        locations={[]}
        tags={[]}
        fieldDefinitions={[]}
        initialValues={{
          ...initialValues,
          name: "Fresh from server",
        }}
        submitLabel="Save changes"
        submitting={false}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByLabelText(/Name/i)).toHaveValue("Draft");
  });
});
