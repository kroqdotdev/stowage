import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { MobileActionSheet } from "@/components/layout/mobile-action-sheet";

describe("MobileActionSheet", () => {
  it("does not render content when closed", () => {
    render(
      <MobileActionSheet
        open={false}
        onOpenChange={() => {}}
        title="Closed sheet"
      >
        <div data-testid="sheet-body">inside</div>
      </MobileActionSheet>,
    );
    expect(screen.queryByTestId("sheet-body")).toBeNull();
  });

  it("renders children, title and drag handle when open", () => {
    render(
      <MobileActionSheet
        open={true}
        onOpenChange={() => {}}
        title="Sheet title"
        description="Sheet description"
      >
        <div data-testid="sheet-body">inside</div>
      </MobileActionSheet>,
    );
    expect(screen.getByTestId("sheet-body")).toBeInTheDocument();
    expect(screen.getByText("Sheet title")).toBeInTheDocument();
    expect(screen.getByText("Sheet description")).toBeInTheDocument();
    expect(
      screen.getByTestId("mobile-action-sheet-handle"),
    ).toBeInTheDocument();
  });

  it("applies safe-area inset class to the content", () => {
    render(
      <MobileActionSheet open={true} onOpenChange={() => {}} title="T">
        <div>body</div>
      </MobileActionSheet>,
    );
    const content = screen.getByTestId("mobile-action-sheet");
    expect(content.className).toMatch(/safe-area-inset-bottom/);
  });

  it("hides the header in sr-only when hideHeader is true", () => {
    render(
      <MobileActionSheet
        open={true}
        onOpenChange={() => {}}
        title="Secret title"
        hideHeader
      >
        <div>body</div>
      </MobileActionSheet>,
    );
    const title = screen.getByText("Secret title");
    const wrapper = title.closest("div");
    expect(wrapper?.className).toMatch(/sr-only/);
  });

  it("calls onOpenChange when the user presses Escape", () => {
    const onOpenChange = vi.fn();
    render(
      <MobileActionSheet open={true} onOpenChange={onOpenChange} title="T">
        <div>body</div>
      </MobileActionSheet>,
    );
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
