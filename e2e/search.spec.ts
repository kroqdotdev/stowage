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

  const assetTag = (await page
    .locator("section")
    .first()
    .locator(".font-mono")
    .first()
    .textContent())?.trim();
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
    test.skip(landing !== "login", "Global search e2e requires setup to be complete");

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
