import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("keeps the link variant bare at every size", () => {
    for (const size of ["default", "sm", "xs", "lg"] as const) {
      const { unmount } = render(
        <Button variant="link" size={size}>
          Reset
        </Button>,
      );
      const classes = screen.getByRole("button", { name: "Reset" }).className.split(/\s+/);
      expect(classes).toContain("h-auto");
      expect(classes).toContain("px-0");
      expect(classes.some((c) => /^h-(7|8|9|11)$/.test(c))).toBe(false);
      expect(classes.some((c) => /^px-(2|2\.5|3\.5|4)$/.test(c))).toBe(false);
      unmount();
    }
  });

  it("does not drop the focus outline", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" }).className).not.toMatch(
      /\boutline-none\b/,
    );
  });
});
