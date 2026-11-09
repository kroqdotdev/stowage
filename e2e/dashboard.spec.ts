import { expect, test, type Page } from "@playwright/test";
import {
  ensureSchedulingEnabled,
  fillRequiredFields,
  getLanding,
  signIn,
} from "./helpers";

// The dashboard title is today's date, e.g. "Saturday 7 November".
const DATE_HEADING =
  /^(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day \d{1,2} [A-Z][a-z]+$/;

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
    page.getByRole("heading", { name: options.name, exact: true }),
  ).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "Open asset" }).click();
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
      page.getByRole("heading", { level: 1, name: DATE_HEADING }),
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
      page.getByRole("heading", { level: 1, name: DATE_HEADING }),
    ).toBeVisible();
    const stats = page.getByTestId("dashboard-stats-bar");
    await expect(stats).toContainText(/\d+\s*Assets/);
    await expect(stats).toContainText(/\d+\s*Retired/);

    const recentAssetsSection = page.getByRole("region", {
      name: "Recently updated",
    });
    await expect(
      recentAssetsSection.getByText(scheduledAssetName),
    ).toBeVisible();
    await expect(recentAssetsSection.getByText(retiredAssetName)).toBeVisible();

    const serviceQueueSection = page.getByRole("region", {
      name: "Service due",
    });
    await expect(serviceQueueSection).toBeVisible();
    await expect(
      serviceQueueSection.getByText(scheduledAssetName),
    ).toBeVisible();
  });
});
