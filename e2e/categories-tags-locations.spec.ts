import { expect, test } from "@playwright/test";
import { getLeafPathSegment, getLanding, signIn } from "./helpers";

test.describe.serial("phase 3 pages", () => {
  test("protected category/tag/location pages redirect when unauthenticated", async ({
    page,
  }) => {
    const landing = await getLanding(page);

    for (const route of ["/categories", "/tags", "/locations"]) {
      await page.goto(route);
      await expect.poll(() => getLeafPathSegment(page.url())).toBe(landing);
    }
  });

  test("admin can create category, tag, and nested locations", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Desktop flow: phones replace the location tree with a picker",
    );
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the Phase 3 CRUD e2e test",
    );

    const landing = await getLanding(page);
    test.skip(
      landing !== "login",
      "Phase 3 CRUD e2e requires setup to be complete",
    );

    await signIn(page, email!, password!);

    const stamp = Date.now();
    const categoryName = `PW Category ${stamp}`;
    const tagName = `PW Tag ${stamp}`;
    const rootName = `PW Root ${stamp}`;
    const childName = `PW Child ${stamp}`;
    const grandchildName = `PW Bin ${stamp}`;

    // /categories and /tags redirect to the taxonomy tabs.
    await page.goto("/categories");
    await page.waitForURL(/\/taxonomy\?tab=categories/);
    await page.getByRole("button", { name: "New category…" }).first().click();
    const categoryDialog = page.getByRole("dialog", { name: "New category" });
    await categoryDialog.getByLabel("Name").fill(categoryName);
    await categoryDialog.getByLabel("Prefix").fill("PW");
    await categoryDialog.getByLabel("Description").fill("Playwright category");
    await categoryDialog
      .getByRole("button", { name: "Create category" })
      .click();
    await expect(page.getByRole("link", { name: categoryName })).toBeVisible();

    await page.goto("/tags");
    await page.waitForURL(/\/taxonomy\?tab=tags/);
    await page.getByRole("button", { name: "New keyword…" }).first().click();
    const tagDialog = page.getByRole("dialog", { name: "New keyword" });
    await tagDialog.getByLabel("Name").fill(tagName);
    await tagDialog.getByRole("button", { name: "Create keyword" }).click();
    await expect(
      page.getByRole("link", { name: `Assets with keyword ${tagName}` }),
    ).toBeVisible();

    // Locations: a site, a location inside it, and one inside that. Each new
    // location becomes the selection and its row is revealed in the tree.
    const tree = page.getByRole("list", { name: "Location tree" });
    // A row's select button reads as its name followed by its asset count.
    const treeRow = (name: string) =>
      tree.getByRole("button", { name: new RegExp(`^${name}\\s*\\d+$`) });
    const detail = page.getByTestId("location-detail");

    await page.goto("/locations");
    await page.getByRole("button", { name: "New location…" }).first().click();
    let locationDialog = page.getByRole("dialog", { name: "New location" });
    await locationDialog.getByLabel("Name").fill(rootName);
    await locationDialog
      .getByRole("button", { name: "Create location" })
      .click();
    await expect(
      detail.getByRole("heading", { level: 2, name: rootName }),
    ).toBeVisible();
    await expect(treeRow(rootName)).toHaveAttribute("aria-current", "true");

    for (const [parentName, name] of [
      [rootName, childName],
      [childName, grandchildName],
    ]) {
      await page.getByRole("button", { name: "Location actions" }).click();
      await page
        .getByRole("menuitem", { name: "New location inside…" })
        .click();
      locationDialog = page.getByRole("dialog", { name: "New location" });
      await locationDialog.getByLabel("Name").fill(name);
      await locationDialog
        .getByRole("button", { name: "Create location" })
        .click();
      await expect(
        detail.getByRole("heading", {
          level: 2,
          name: `${name} in ${parentName}`,
        }),
      ).toBeVisible();
      await expect(treeRow(name)).toHaveAttribute("aria-current", "true");
    }

    // A location with something inside it cannot be deleted.
    await treeRow(rootName).click();
    await page.getByRole("button", { name: "Location actions" }).click();
    await expect(
      page.getByRole("menuitem", { name: /Delete…/ }),
    ).toHaveAttribute("aria-disabled", "true");
  });
});
