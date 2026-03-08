import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { ServiceGroupEditor } from "@/components/services/service-group-editor";

describe("ServiceGroupEditor", () => {
  it("does not render when closed", () => {
    render(
      <ServiceGroupEditor
        open={false}
        mode="create"
        initialGroup={null}
        submitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("heading", { name: "Create service group" }),
    ).not.toBeInTheDocument();
  });

  it("renders create form with empty fields when open", () => {
    render(
      <ServiceGroupEditor
        open
        mode="create"
        initialGroup={null}
        submitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Create service group" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Description")).toHaveValue("");
    expect(
      screen.getByRole("button", { name: "Create group" }),
    ).toBeInTheDocument();
  });

  it("renders edit form with pre-filled values and submits", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <ServiceGroupEditor
        open
        mode="edit"
        initialGroup={{
          _id: "group1",
          name: "Engine checks",
          description: "Quarterly",
        }}
        submitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Edit service group" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Name")).toHaveValue("Engine checks");
    expect(screen.getByLabelText("Description")).toHaveValue("Quarterly");

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Engine checks",
      description: "Quarterly",
    });
  });
});
