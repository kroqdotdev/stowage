import { expect, test } from "@playwright/test";
import { fillRequiredFields, getLanding, signIn } from "./helpers";

test.describe.serial("phase 9 label system", () => {
  test("admin can design a template and print single + batch labels", async ({
    page,
  }) => {
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run label system e2e",
    );

    const landing = await getLanding(page);
    test.skip(landing !== "login", "Label e2e requires setup to be complete");

    await signIn(page, email!, password!);

    const assetName = `PW Label Asset ${Date.now()}`;
    await page.goto("/assets/new");
    await page.getByLabel(/Name/i).fill(assetName);
    await fillRequiredFields(page);
    await page.getByRole("button", { name: "Create asset" }).click();

    await expect(
      page.getByRole("heading", { name: `${assetName} created` }),
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "View asset" }).click();
    await page.waitForURL(/\/assets\/(?!new$)[^/]+$/, { timeout: 20_000 });
    const detailUrl = page.url();

    await page.goto("/labels");
    await expect(page.getByRole("heading", { name: "Labels" })).toBeVisible();
    await expect(page.getByText("Thermal 57x32 mm")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Compact 35x12 mm")).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: /^New$/ }).click();
    const templateName = `Playwright Label ${Date.now()}`;
    await page.getByLabel("Name").fill(templateName);
    await page.locator('[data-label-element="staticText"]').click();
    await page.locator("#label-element-text").fill("Deck A");
    await page.locator('[data-label-element="dataMatrix"]').click();
    await page.locator("[data-label-template-save]").click();
    await expect(page.getByText("Label template created")).toBeVisible();
    await expect(
      page.getByRole("button", { name: new RegExp(templateName) }),
    ).toBeVisible();

    await page.goto(detailUrl);
    await page.getByRole("link", { name: "Print label" }).click();
    await page.waitForURL(/\/labels\/print\?assetId=/, { timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: "Print labels" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: assetName })).toBeVisible();

    await page.getByRole("combobox", { name: "Template" }).click();
    await page.getByRole("option", { name: "Thermal 57x32 mm" }).click();
    await expect(page.getByText("57 x 32 mm").first()).toBeVisible();

    await page.getByRole("combobox", { name: "Template" }).click();
    await page.getByRole("option", { name: "Compact 35x12 mm" }).click();
    await expect(page.getByText("35 x 12 mm").first()).toBeVisible();

    await page.goto("/assets", { waitUntil: "domcontentloaded" });
    await page.getByRole("checkbox", { name: `Select ${assetName}` }).check();
    const batchPrintLink = page.getByRole("link", { name: "Print labels" });
    await expect(batchPrintLink).toHaveAttribute("href", /\/labels\/print\?/);
    await batchPrintLink.click();
    await expect(page).toHaveURL(/\/labels\/print\?assetIds=/, {
      timeout: 20_000,
    });
    await expect(page.getByText("1 asset")).toBeVisible();
    await expect(page.getByRole("heading", { name: assetName })).toBeVisible();
  });
});
