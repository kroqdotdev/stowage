import { expect, test, type Page } from "@playwright/test";

function getLeafPathSegment(urlString: string) {
  const segments = new URL(urlString).pathname.split("/").filter(Boolean);
  return segments.at(-1) ?? "";
}

async function getLanding(page: Page): Promise<"login" | "setup"> {
  await page.goto("/dashboard");
  await page.waitForURL(
    (url) => {
      const leaf = url.pathname.split("/").filter(Boolean).at(-1);
      return leaf === "login" || leaf === "setup";
    },
    { timeout: 15_000 },
  );
  return getLeafPathSegment(page.url()) === "setup" ? "setup" : "login";
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(
    (url) => getLeafPathSegment(url.toString()) === "dashboard",
    {
      timeout: 20_000,
    },
  );
}

async function fillRequiredFields(page: Page) {
  const requiredFields = page.locator("form [required]");
  const count = await requiredFields.count();

  for (let index = 0; index < count; index += 1) {
    const field = requiredFields.nth(index);
    const tagName = await field.evaluate((node) => node.tagName.toLowerCase());

    if (tagName === "select") {
      const value = await field.evaluate((node) => {
        const select = node as HTMLSelectElement;
        for (const option of Array.from(select.options)) {
          if (option.value) {
            return option.value;
          }
        }
        return "";
      });
      if (value) {
        await field.selectOption(value);
      }
      continue;
    }

    const type = await field.getAttribute("type");

    if (type === "checkbox") {
      await field.check();
      continue;
    }

    if (type === "date") {
      await field.fill("2026-01-01");
      continue;
    }

    if (type === "number") {
      await field.fill("1");
      continue;
    }

    const id = await field.getAttribute("id");
    if (id === "asset-name") {
      continue;
    }

    await field.fill("Playwright");
  }
}

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
