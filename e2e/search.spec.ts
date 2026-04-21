import { expect, test, type Page } from "@playwright/test";
import { fillRequiredFields, getLanding, signIn } from "./helpers";

async function createAssetForSearch(page: Page, name: string, notes: string) {
  await page.goto("/assets/new");
  await page.getByLabel(/Name/i).fill(name);
  await fillRequiredFields(page);
  await page.getByLabel("Notes").fill(notes);
  await page.getByRole("button", { name: "Create asset" }).click();
  await expect(
    page.getByRole("heading", { name: `${name} created` }),
  ).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "View asset" }).click();
  await page.waitForURL(/\/assets\/(?!new$)[^/]+$/, { timeout: 20_000 });

  const assetTag = (
    await page
      .locator("section")
      .first()
      .locator(".font-mono")
      .first()
      .textContent()
  )?.trim();
  expect(assetTag).toMatch(/[A-Z]{2,4}-\d{4}/);

  return {
    assetTag: assetTag!,
  };
}

test.describe.serial("phase 10 global search", () => {
  test("keyboard search finds assets by name and asset tag", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run global search e2e",
    );

    const landing = await getLanding(page);
    test.skip(
      landing !== "login",
      "Global search e2e requires setup to be complete",
    );

    await signIn(page, email!, password!);

    const stamp = Date.now();
    const assetName = `PW Search ${stamp}`;
    const notes = `Search note ${stamp}`;
    const { assetTag } = await createAssetForSearch(page, assetName, notes);

    await page.keyboard.press("Control+K");
    await expect(page.getByRole("dialog")).toBeVisible();

    const searchInput = page.getByPlaceholder(
      "Search assets by name, tag, or notes...",
    );
    await searchInput.fill(`Search ${stamp}`);
    const firstResult = page
      .locator("[data-search-result]")
      .filter({ hasText: assetName })
      .first();
    await expect(firstResult).toBeVisible({ timeout: 20_000 });
    await firstResult.click();
    await page.waitForURL(/\/assets\/[^/]+$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: assetName })).toBeVisible();

    await page.keyboard.press("Control+K");
    await expect(page.getByRole("dialog")).toBeVisible();
    await searchInput.fill(assetTag);
    const tagResult = page
      .locator("[data-search-result]")
      .filter({ hasText: assetName })
      .first();
    await expect(tagResult).toBeVisible({ timeout: 20_000 });
    await tagResult.click();
    await page.waitForURL(/\/assets\/[^/]+$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: assetName })).toBeVisible();
  });
});
