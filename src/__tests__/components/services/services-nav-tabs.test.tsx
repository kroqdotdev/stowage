import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServicesNavTabs } from "@/components/services/services-nav-tabs";

let mockPathname = "/services";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

describe("ServicesNavTabs", () => {
  it("renders all tab links with correct hrefs", () => {
    mockPathname = "/services";

    render(<ServicesNavTabs />);

    const listLink = screen.getByRole("link", { name: "List" });
    const calendarLink = screen.getByRole("link", { name: "Calendar" });
    const groupsLink = screen.getByRole("link", { name: "Groups" });
    const providersLink = screen.getByRole("link", { name: "Providers" });

    expect(listLink).toHaveAttribute("href", "/services");
    expect(calendarLink).toHaveAttribute("href", "/services/calendar");
    expect(groupsLink).toHaveAttribute("href", "/services/groups");
    expect(providersLink).toHaveAttribute("href", "/services/providers");
  });

  it("applies active styling to the matching tab", () => {
    mockPathname = "/services/groups/group1";

    render(<ServicesNavTabs />);

    const groupsLink = screen.getByRole("link", { name: "Groups" });
    expect(groupsLink.className).toContain("bg-background");

    const listLink = screen.getByRole("link", { name: "List" });
    expect(listLink.className).not.toContain("bg-background");
  });
});
