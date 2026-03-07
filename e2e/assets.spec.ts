import { expect, test } from "@playwright/test";
import {
  getLeafPathSegment,
  getLanding,
  signIn,
  fillRequiredFields,
} from "./helpers";

test.describe.serial("phase 5 assets", () => {
  test("protected asset routes redirect when unauthenticated", async ({
    page,
  }) => {
    const landing = await getLanding(page);

    for (const route of ["/assets", "/assets/new", "/assets/abc"]) {
      await page.goto(route);
      await expect.poll(() => getLeafPathSegment(page.url())).toBe(landing);
    }
  });

  test("can create, edit, and update status for an asset", async ({ page }) => {
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the assets e2e test",
    );

    const landing = await getLanding(page);
    test.skip(landing !== "login", "Assets e2e requires setup to be complete");

    await signIn(page, email!, password!);

    const stamp = Date.now();
    const baseName = `PW Asset ${stamp}`;
    const updatedName = `${baseName} Updated`;

    await page.goto("/assets/new");
    await page.getByLabel(/Name/i).fill(baseName);
    await fillRequiredFields(page);
    await page.getByRole("button", { name: "Create asset" }).click();
    await expect(
      page.getByRole("heading", { name: `${baseName} created` }),
    ).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: "View asset" }).click();
    await page.waitForURL(/\/assets\/[^/]+$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: baseName })).toBeVisible();

    await page.getByRole("link", { name: "Edit" }).click();
    await page.waitForURL(/\/assets\/.+\/edit/, { timeout: 15_000 });

    const nameInput = page.getByLabel(/Name/i);
    await nameInput.fill(updatedName);
    await page.getByRole("button", { name: "Save changes" }).click();

    await page.waitForURL(/\/assets\/.+$/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: updatedName }),
    ).toBeVisible();

    await page.getByLabel("Change status").click();
    await page.getByRole("option", { name: "Retired" }).click();
    await expect(
      page
        .locator("[data-slot='badge']")
        .filter({ hasText: "Retired" })
        .first(),
    ).toBeVisible();

    await page.goto("/assets");
    await page.getByLabel("Search assets").fill(updatedName);
    await expect(
      page.locator("tbody tr").filter({ hasText: updatedName }),
    ).toBeVisible();

    await page.getByLabel("Filter by status").click();
    await page.getByRole("option", { name: "Retired" }).click();
    await expect(
      page.locator("tbody tr").filter({ hasText: updatedName }),
    ).toBeVisible();

    await page
      .locator("tbody tr")
      .filter({ hasText: updatedName })
      .first()
      .click();
    await page.waitForURL(/\/assets\/.+$/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: updatedName }),
    ).toBeVisible();
    await expect(
      page
        .locator("[data-slot='badge']")
        .filter({ hasText: "Retired" })
        .first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "Delete" }).click();
    await expect(
      page.getByRole("heading", { name: "Delete asset" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete asset" }).click();
    await page.waitForURL(
      (url) => getLeafPathSegment(url.toString()) === "assets",
      {
        timeout: 20_000,
      },
    );

    await page.getByLabel("Search assets").fill(updatedName);
    await expect(
      page.locator("tbody tr").filter({ hasText: updatedName }),
    ).toHaveCount(0);
  });
});
