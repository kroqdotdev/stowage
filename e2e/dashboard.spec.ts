import { expect, test, type Page } from "@playwright/test";
import {
  ensureSchedulingEnabled,
  fillRequiredFields,
  getLanding,
  signIn,
} from "./helpers";

function getStatusLabel(status: "active" | "retired") {
  return status === "retired" ? "Retired" : "Active";
}

async function createAsset(
  page: Page,
  options: {
    name: string;
    status?: "active" | "retired";
    nextServiceDate?: string;
  },
) {
  await page.goto("/assets/new");
  await page.getByLabel(/Name/i).fill(options.name);
  await fillRequiredFields(page);

  if (options.status && options.status !== "active") {
    await page.getByLabel("Status").click();
    await page
      .getByRole("option", { name: getStatusLabel(options.status) })
      .click();
  }

  if (options.nextServiceDate) {
    await expect(page.getByLabel("Next service date")).toBeVisible();
    await page.getByLabel("Next service date").fill(options.nextServiceDate);
    await page.locator("#service-interval-value").fill("1");
    await page.locator("#service-reminder-value").fill("1");
  }

  await page.getByRole("button", { name: "Create asset" }).click();
  await expect(
    page.getByRole("heading", { name: `${options.name} created` }),
  ).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "View asset" }).click();
  await page.waitForURL(/\/assets\/(?!new$)[^/]+$/, { timeout: 20_000 });
}

test.describe.serial("phase 10 dashboard", () => {
  test("root redirects to login when unauthenticated and dashboard when authenticated", async ({
    page,
  }) => {
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run dashboard e2e",
    );

    const landing = await getLanding(page, "/");
    expect(["login", "setup"]).toContain(landing);
    test.skip(
      landing !== "login",
      "Dashboard e2e requires setup to be complete",
    );

    await signIn(page, email!, password!);
    await page.goto("/");
    await page.waitForURL(/\/dashboard$/, { timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: /Welcome back|Dashboard/ }),
    ).toBeVisible();
  });

  test("dashboard reflects new assets in counts, recent items, and the service queue", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run dashboard e2e",
    );

    const landing = await getLanding(page, "/dashboard");
    test.skip(
      landing !== "login",
      "Dashboard e2e requires setup to be complete",
    );

    await signIn(page, email!, password!);
    await ensureSchedulingEnabled(page);

    const stamp = Date.now();
    const activeAssetName = `PW Dash Active ${stamp}`;
    const retiredAssetName = `PW Dash Retired ${stamp}`;
    const scheduledAssetName = `PW Dash Service ${stamp}`;

    await createAsset(page, { name: activeAssetName });
    await createAsset(page, { name: retiredAssetName, status: "retired" });
    await createAsset(page, {
      name: scheduledAssetName,
      nextServiceDate: "2000-01-01",
    });

    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /Welcome back|Dashboard/ }),
    ).toBeVisible();
    await expect(
      page.locator('[data-dashboard-stat="total"] [data-dashboard-stat-value]'),
    ).toHaveText(/\d+/);
    await expect(
      page.locator(
        '[data-dashboard-stat="active"] [data-dashboard-stat-value]',
      ),
    ).toHaveText(/\d+/);
    await expect(
      page.locator(
        '[data-dashboard-stat="retired"] [data-dashboard-stat-value]',
      ),
    ).toHaveText(/\d+/);

    const recentAssetsSection = page
      .locator("section")
      .filter({ hasText: "Recent assets" })
      .first();
    await expect(
      recentAssetsSection.getByText(scheduledAssetName),
    ).toBeVisible();
    await expect(recentAssetsSection.getByText(retiredAssetName)).toBeVisible();

    const serviceQueueSection = page
      .locator("section")
      .filter({ hasText: "Service queue" })
      .first();
    await expect(serviceQueueSection).toBeVisible();
    await expect(
      serviceQueueSection.getByText(scheduledAssetName),
    ).toBeVisible();
  });
});
