import { expect, test } from "@playwright/test";
import { getLanding, signIn } from "./helpers";

test.describe("mobile shell", () => {
  test("bottom nav is only visible on mobile viewports", async ({
    page,
  }, testInfo) => {
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;
    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the mobile shell e2e",
    );

    const landing = await getLanding(page);
    test.skip(landing !== "login", "Mobile shell e2e requires setup complete");

    await signIn(page, email!, password!);
    await page.goto("/dashboard");

    const bottomNav = page.getByTestId("bottom-nav");
    if (testInfo.project.name === "mobile-chromium") {
      await expect(bottomNav).toBeVisible();
      await expect(page.getByTestId("bottom-nav-scan")).toHaveAttribute(
        "href",
        "/scan",
      );
    } else {
      await expect(bottomNav).toBeHidden();
    }
  });

  test("mobile bottom nav routes each slot correctly", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile-chromium",
      "Runs only on mobile-chromium",
    );

    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;
    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the mobile shell e2e",
    );

    const landing = await getLanding(page);
    test.skip(landing !== "login", "Mobile shell e2e requires setup complete");

    await signIn(page, email!, password!);

    await page.getByTestId("bottom-nav-assets").click();
    await page.waitForURL(/\/assets$/, { timeout: 10_000 });

    await page.getByTestId("bottom-nav-services").click();
    await page.waitForURL(/\/services$/, { timeout: 10_000 });

    await page.getByTestId("bottom-nav-home").click();
    await page.waitForURL(/\/dashboard$/, { timeout: 10_000 });

    await page.getByTestId("bottom-nav-scan").click();
    await page.waitForURL(/\/scan$/, { timeout: 10_000 });
  });

  test("more sheet opens and contains admin entries", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile-chromium",
      "Runs only on mobile-chromium",
    );

    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;
    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the mobile shell e2e",
    );

    const landing = await getLanding(page);
    test.skip(landing !== "login", "Mobile shell e2e requires setup complete");

    await signIn(page, email!, password!);
    await page.goto("/dashboard");

    await page.getByTestId("bottom-nav-more").click();

    const grid = page.getByTestId("more-sheet-grid");
    await expect(grid).toBeVisible();
    await expect(page.getByTestId("more-item-locations")).toBeVisible();
    await expect(page.getByTestId("more-item-taxonomy")).toBeVisible();
    await expect(page.getByTestId("more-item-labels")).toBeVisible();
    await expect(page.getByTestId("more-item-settings")).toBeVisible();
    await expect(page.getByTestId("more-sheet-signout")).toBeVisible();

    await page.getByTestId("more-item-locations").click();
    await page.waitForURL(/\/locations$/, { timeout: 10_000 });
  });

  test("sidebar is visible on desktop viewports", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Runs only on desktop chromium",
    );

    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;
    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the mobile shell e2e",
    );

    const landing = await getLanding(page);
    test.skip(landing !== "login", "Mobile shell e2e requires setup complete");

    await signIn(page, email!, password!);
    await page.goto("/dashboard");

    await expect(page.getByTestId("bottom-nav")).toBeHidden();
    await expect(
      page.locator('[data-slot="sidebar-container"]'),
    ).toBeVisible();
  });
});
