import { expect, test } from "@playwright/test";
import { getLeafPathSegment, getLanding, signIn } from "./helpers";

test.describe.serial("taxonomy page", () => {
  test("protected taxonomy page redirects when unauthenticated", async ({
    page,
  }) => {
    const landing = await getLanding(page, "/taxonomy");
    expect(["login", "setup"]).toContain(landing);
  });

  test("admin can view taxonomy tabs and switch between categories, tags, and fields", async ({
    page,
  }) => {
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run taxonomy e2e",
    );

    const landing = await getLanding(page);
    test.skip(
      landing !== "login",
      "Taxonomy e2e requires setup to be complete",
    );

    await signIn(page, email!, password!);

    await page.goto("/taxonomy");
    await expect(
      page.getByRole("heading", { name: "Taxonomy" }),
    ).toBeVisible();

    // Default tab is categories
    await expect(page.getByRole("tab", { name: "Categories" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Tags" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Fields" })).toBeVisible();

    // Categories tab shows content
    await expect(
      page.getByRole("heading", { name: "Categories" }),
    ).toBeVisible();

    // Switch to tags tab
    await page.getByRole("tab", { name: "Tags" }).click();
    await expect(page.getByRole("heading", { name: "Tags" })).toBeVisible();
    await expect(page).toHaveURL(/tab=tags/);

    // Switch to fields tab
    await page.getByRole("tab", { name: "Fields" }).click();
    await expect(
      page.getByRole("heading", { name: "Field definitions" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/tab=fields/);
  });

  test("admin can create and delete a custom field from the fields tab", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run taxonomy e2e",
    );

    const landing = await getLanding(page);
    test.skip(
      landing !== "login",
      "Taxonomy e2e requires setup to be complete",
    );

    await signIn(page, email!, password!);

    const stamp = Date.now();
    const fieldName = `PW Field ${stamp}`;

    await page.goto("/taxonomy?tab=fields");
    await expect(
      page.getByRole("heading", { name: "Field definitions" }),
    ).toBeVisible();

    // Create field
    await page.getByRole("button", { name: "Add field" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill(fieldName);
    await dialog.getByRole("button", { name: /Create/i }).click();
    await expect(page.getByText(fieldName)).toBeVisible({ timeout: 10_000 });

    // Delete field via actions menu
    await page
      .getByRole("button", { name: `Actions for ${fieldName}` })
      .click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    const confirmDialog = page.getByRole("alertdialog").or(page.getByRole("dialog").filter({ hasText: "Delete" }));
    await confirmDialog.getByRole("button", { name: /Delete/i }).click();
    await expect(page.getByText(fieldName)).not.toBeVisible({ timeout: 10_000 });
  });

  test("/fields redirects to /taxonomy?tab=fields", async ({ page }) => {
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run taxonomy e2e",
    );

    const landing = await getLanding(page);
    test.skip(
      landing !== "login",
      "Taxonomy e2e requires setup to be complete",
    );

    await signIn(page, email!, password!);

    await page.goto("/fields");
    await page.waitForURL(/\/taxonomy\?tab=fields/, { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: "Field definitions" }),
    ).toBeVisible();
  });
});
