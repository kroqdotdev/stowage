import { useState } from "react";
import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import {
  LocationPicker,
  type LocationPickerOption,
} from "@/components/locations/location-picker";

const options: LocationPickerOption[] = [
  {
    _id: "root" as never,
    name: "Warehouse",
    parentId: null,
    path: "Warehouse",
  },
  {
    _id: "child" as never,
    name: "Shelf 1",
    parentId: "root" as never,
    path: "Warehouse / Shelf 1",
  },
  {
    _id: "grandchild" as never,
    name: "Bin A",
    parentId: "child" as never,
    path: "Warehouse / Shelf 1 / Bin A",
  },
];

function LocationPickerHarness() {
  const [value, setValue] = useState<LocationPickerOption["_id"] | null>(null);

  return (
    <LocationPicker
      id="asset-location"
      value={value}
      options={options}
      onChange={(next) => setValue(next)}
    />
  );
}

describe("LocationPicker", () => {
  it("renders nested submenus for location hierarchy", async () => {
    const user = userEvent.setup();

    render(<LocationPickerHarness />);

    await user.click(screen.getByRole("button", { name: "No location" }));
    const warehouseTrigger = await screen.findByRole("menuitem", {
      name: "Warehouse",
    });

    warehouseTrigger.focus();
    await user.keyboard("{ArrowRight}");

    const shelfTrigger = await screen.findByRole("menuitem", {
      name: "Shelf 1",
    });
    shelfTrigger.focus();
    await user.keyboard("{ArrowRight}");

    await user.click(await screen.findByRole("menuitem", { name: "Bin A" }));
    expect(
      screen.getByText("Selected: Warehouse / Shelf 1 / Bin A"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Warehouse / Shelf 1 / Bin A" }),
    ).toBeInTheDocument();
  });

  it("allows clearing location selection", async () => {
    const user = userEvent.setup();

    render(<LocationPickerHarness />);

    await user.click(screen.getByRole("button", { name: "No location" }));
    const warehouseTrigger = await screen.findByRole("menuitem", {
      name: "Warehouse",
    });
    warehouseTrigger.focus();
    await user.keyboard("{ArrowRight}");
    await user.click(
      await screen.findByRole("menuitem", { name: "Select Warehouse" }),
    );
    expect(screen.getByText("Selected: Warehouse")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Warehouse" }));
    await user.click(
      await screen.findByRole("menuitem", { name: "No location" }),
    );
    expect(screen.queryByText(/^Selected:/)).toBeNull();
    expect(
      screen.getByRole("button", { name: "No location" }),
    ).toBeInTheDocument();
  });
});
