import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CrudModal } from "@/components/crud/modal";

describe("CrudModal", () => {
  it("renders title, description, children, and footer when open", () => {
    render(
      <CrudModal
        open={true}
        title="Edit Item"
        description="Update the details below."
        onClose={vi.fn()}
        footer={<button type="button">Save</button>}
      >
        <p>Modal body content</p>
      </CrudModal>,
    );

    expect(screen.getByText("Edit Item")).toBeInTheDocument();
    expect(screen.getByText("Update the details below.")).toBeInTheDocument();
    expect(screen.getByText("Modal body content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("returns null when not open", () => {
    render(
      <CrudModal open={false} title="Hidden" onClose={vi.fn()}>
        <p>Should not appear</p>
      </CrudModal>,
    );

    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
    expect(screen.queryByText("Should not appear")).not.toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <CrudModal open={true} title="Closeable" onClose={onClose}>
        <p>Content</p>
      </CrudModal>,
    );

    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
