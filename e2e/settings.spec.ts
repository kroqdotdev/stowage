import { expect, test } from "@playwright/test";
import { getLanding, signIn } from "./helpers";

test.describe.serial("settings page", () => {
  test("protected settings page redirects when unauthenticated", async ({
    page,
  }) => {
    const landing = await getLanding(page, "/settings");
    expect(["login", "setup"]).toContain(landing);
  });

  test("admin sees regional settings, features, user management, and password sections", async ({
    page,
  }) => {
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run settings e2e",
    );

    const landing = await getLanding(page);
    test.skip(
      landing !== "login",
      "Settings e2e requires setup to be complete",
    );

    await signIn(page, email!, password!);

    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: "Settings" }),
    ).toBeVisible();

    // Admin-only sections
    await expect(
      page.getByRole("heading", { name: /Date format|Regional/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Features" }),
    ).toBeVisible();

    // Service scheduling toggle
    await expect(
      page.getByRole("switch", { name: "Toggle service scheduling" }),
    ).toBeVisible();

    // Password change section
    await expect(
      page.getByRole("heading", { name: "Change password" }),
    ).toBeVisible();
    await expect(page.getByLabel("Current password")).toBeVisible();
    await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Confirm new password")).toBeVisible();
  });

  test("service scheduling toggle can be toggled", async ({ page }) => {
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run settings e2e",
    );

    const landing = await getLanding(page);
    test.skip(
      landing !== "login",
      "Settings e2e requires setup to be complete",
    );

    await signIn(page, email!, password!);

    await page.goto("/settings");

    const schedulingSwitch = page.getByRole("switch", {
      name: "Toggle service scheduling",
    });
    await expect(schedulingSwitch).toBeVisible();

    const wasChecked =
      (await schedulingSwitch.getAttribute("aria-checked")) === "true";

    // Toggle off (or on)
    await schedulingSwitch.click();
    const expectedState = !wasChecked;
    await expect(schedulingSwitch).toHaveAttribute(
      "aria-checked",
      String(expectedState),
    );

    // Toggle back to restore original state
    await schedulingSwitch.click();
    await expect(schedulingSwitch).toHaveAttribute(
      "aria-checked",
      String(wasChecked),
    );
  });

  test("password change shows validation error for short password", async ({
    page,
  }) => {
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run settings e2e",
    );

    const landing = await getLanding(page);
    test.skip(
      landing !== "login",
      "Settings e2e requires setup to be complete",
    );

    await signIn(page, email!, password!);

    await page.goto("/settings");

    await page.getByLabel("Current password").fill("anything");
    await page.getByLabel("New password", { exact: true }).fill("short");
    await page.getByLabel("Confirm new password").fill("short");
    await page.getByRole("button", { name: "Update password" }).click();

    await expect(
      page.getByText("New password must be at least 8 characters"),
    ).toBeVisible();
  });

  test("password change shows validation error for mismatched passwords", async ({
    page,
  }) => {
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run settings e2e",
    );

    const landing = await getLanding(page);
    test.skip(
      landing !== "login",
      "Settings e2e requires setup to be complete",
    );

    await signIn(page, email!, password!);

    await page.goto("/settings");

    await page.getByLabel("Current password").fill("anything");
    await page.getByLabel("New password", { exact: true }).fill("validpassword1");
    await page.getByLabel("Confirm new password").fill("differentpassword");
    await page.getByRole("button", { name: "Update password" }).click();

    await expect(
      page.getByText("New passwords do not match"),
    ).toBeVisible();
  });
});
