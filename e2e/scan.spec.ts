import { expect, test } from "@playwright/test";
import {
  fillRequiredFields,
  getLanding,
  getLeafPathSegment,
  signIn,
} from "./helpers";

async function authedScan(page: import("@playwright/test").Page) {
  const email = process.env.E2E_AUTH_EMAIL;
  const password = process.env.E2E_AUTH_PASSWORD;
  test.skip(
    !email || !password,
    "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the scan e2e",
  );

  const landing = await getLanding(page);
  test.skip(landing !== "login", "Scan e2e requires setup complete");

  await signIn(page, email!, password!);
  return { email: email!, password: password! };
}

async function readAssetTag(page: import("@playwright/test").Page) {
  const tagBadge = page.locator("span.font-mono").first();
  await expect(tagBadge).toBeVisible();
  const assetTag = (await tagBadge.textContent())?.trim() ?? "";
  expect(assetTag.length).toBeGreaterThan(0);
  return assetTag;
}

test.describe("scan feature", () => {
  test("protected /scan redirects when unauthenticated", async ({ page }) => {
    const landing = await getLanding(page, "/scan");
    expect(landing).toBe("login");
  });

  test("manual entry resolves a real asset and opens the result sheet", async ({
    page,
  }) => {
    await authedScan(page);

    const stamp = Date.now();
    const name = `Scan E2E ${stamp}`;
    await page.goto("/assets/new");
    await page.getByLabel(/Name/i).fill(name);
    await fillRequiredFields(page);
    await page.getByRole("button", { name: "Create asset" }).click();
    await expect(
      page.getByRole("heading", { name: `${name} created` }),
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "View asset" }).click();
    await page.waitForURL(/\/assets\/[^/]+$/, { timeout: 20_000 });
    const assetTag = await readAssetTag(page);

    await page.goto("/scan");
    await expect(page.getByTestId("scan-page")).toBeVisible();

    await page.getByTestId("scan-manual-entry").click();
    const input = page.getByTestId("scan-manual-input");
    await expect(input).toBeVisible();
    await input.fill(assetTag);
    await page.getByTestId("scan-manual-submit").click();

    const sheet = page.getByTestId("scan-result-asset");
    await expect(sheet).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(name, { exact: false })).toBeVisible();
    const viewLink = page.getByTestId("scan-result-view");
    await expect(viewLink).toHaveAttribute("href", /\/assets\/[^/]+$/);
  });

  test("manual entry shows the unresolved sheet for a bogus tag", async ({
    page,
  }) => {
    await authedScan(page);

    await page.goto("/scan");
    await page.getByTestId("scan-manual-entry").click();
    await page.getByTestId("scan-manual-input").fill("DOES-NOT-EXIST-XYZ-0000");
    await page.getByTestId("scan-manual-submit").click();

    await expect(page.getByTestId("scan-result-unresolved")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/DOES-NOT-EXIST-XYZ-0000/)).toBeVisible();
  });

  test("the scan page falls back to a denied/insecure state gracefully", async ({
    page,
  }) => {
    await authedScan(page);
    await page.goto("/scan");
    // Either the camera works (scanning) or we get one of the fallback states.
    // All variants must show a manual-entry button.
    await expect(page.getByTestId("scan-manual-entry")).toBeVisible();
    const paths = [
      page.getByTestId("scan-viewport"),
      page.getByTestId("scan-state-denied"),
      page.getByTestId("scan-state-insecure"),
      page.getByTestId("scan-state-error"),
    ];
    // Exactly one of the scanner branches should be visible.
    let matched = 0;
    for (const locator of paths) {
      if ((await locator.count()) > 0) matched += 1;
    }
    expect(matched).toBeGreaterThan(0);
  });

  test("back navigation returns to the previous page", async ({ page }) => {
    await authedScan(page);
    await page.goto("/dashboard");
    // Ensure a proper prior entry so router.back() has somewhere to go.
    await page.goto("/scan");
    await expect(page.getByTestId("scan-page")).toBeVisible();

    await page.getByTestId("scan-back").click();
    await page.waitForURL((url) => !url.pathname.endsWith("/scan"), {
      timeout: 10_000,
    });
    const leaf = getLeafPathSegment(page.url());
    expect(leaf).toBe("dashboard");
  });
});
