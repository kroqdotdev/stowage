import { expect, test } from "@playwright/test";
import { getLanding, pageTitle, signIn } from "./helpers";

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
    await expect(pageTitle(page, "Taxonomy")).toBeVisible();

    // Default tab is categories
    await expect(page.getByRole("tab", { name: "Categories" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Keywords" })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: "Custom fields" }),
    ).toBeVisible();

    // Categories tab shows content
    await expect(
      page.getByRole("heading", { name: /^Categories/ }),
    ).toBeVisible();

    // Switch to the keywords tab ("tags" in the URL)
    await page.getByRole("tab", { name: "Keywords" }).click();
    await expect(
      page.getByRole("heading", { name: /^Keywords/ }),
    ).toBeVisible();
    await expect(page).toHaveURL(/tab=tags/);

    // Switch to fields tab
    await page.getByRole("tab", { name: "Custom fields" }).click();
    await expect(
      page.getByRole("heading", { name: /^Custom fields/ }),
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
      page.getByRole("heading", { name: /^Custom fields/ }),
    ).toBeVisible();

    // Create field — the header and the empty state can both offer
    // "New field…"; click the first one.
    await page.getByRole("button", { name: "New field…" }).first().click();
    const dialog = page.getByRole("dialog", { name: "New field" });
    await dialog.getByLabel("Name").fill(fieldName);
    await dialog.getByRole("button", { name: "Create field" }).click();
    // The fields render as a table on desktop and a list on phones; only
    // one of them is visible.
    const fieldRow = page
      .getByText(fieldName, { exact: true })
      .filter({ visible: true });
    await expect(fieldRow).toBeVisible({ timeout: 10_000 });

    // Delete field via actions menu
    await page
      .getByRole("button", { name: `Actions for ${fieldName}` })
      .filter({ visible: true })
      .click();
    await page.getByRole("menuitem", { name: "Delete…" }).click();
    const confirmDialog = page.getByRole("dialog", { name: "Delete field?" });
    await confirmDialog.getByRole("button", { name: "Delete field" }).click();
    await expect(fieldRow).toHaveCount(0, { timeout: 10_000 });
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
      page.getByRole("heading", { name: /^Custom fields/ }),
    ).toBeVisible();
  });
});
