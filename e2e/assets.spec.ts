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

test.describe.serial("phase 5 assets", () => {
  test("protected asset routes redirect when unauthenticated", async ({
    page,
  }) => {
    const landing = await getLanding(page);

    for (const route of ["/assets", "/assets/new", "/assets/abc"]) {
      await page.goto(route);
      await expect.poll(() => getLeafPathSegment(page.url())).toBe(landing);
    }
  });

  test("can create, edit, and update status for an asset", async ({ page }) => {
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the assets e2e test",
    );

    const landing = await getLanding(page);
    test.skip(landing !== "login", "Assets e2e requires setup to be complete");

    await signIn(page, email!, password!);

    const stamp = Date.now();
    const baseName = `PW Asset ${stamp}`;
    const updatedName = `${baseName} Updated`;

    await page.goto("/assets/new");
    await page.getByLabel(/Name/i).fill(baseName);
    await fillRequiredFields(page);
    await page.getByRole("button", { name: "Create asset" }).click();
    await expect(
      page.getByRole("heading", { name: `${baseName} created` }),
    ).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: "View asset" }).click();
    await page.waitForURL(/\/assets\/[^/]+$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: baseName })).toBeVisible();

    await page.getByRole("link", { name: "Edit" }).click();
    await page.waitForURL(/\/assets\/.+\/edit/, { timeout: 15_000 });

    const nameInput = page.getByLabel(/Name/i);
    await nameInput.fill(updatedName);
    await page.getByRole("button", { name: "Save changes" }).click();

    await page.waitForURL(/\/assets\/.+$/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: updatedName }),
    ).toBeVisible();

    await page.getByLabel("Change status").click();
    await page.getByRole("option", { name: "Retired" }).click();
    await expect(
      page
        .locator("[data-slot='badge']")
        .filter({ hasText: "Retired" })
        .first(),
    ).toBeVisible();

    await page.goto("/assets");
    await page.getByLabel("Search assets").fill(updatedName);
    await expect(
      page.locator("tbody tr").filter({ hasText: updatedName }),
    ).toBeVisible();

    await page.getByLabel("Filter by status").click();
    await page.getByRole("option", { name: "Retired" }).click();
    await expect(
      page.locator("tbody tr").filter({ hasText: updatedName }),
    ).toBeVisible();

    await page
      .locator("tbody tr")
      .filter({ hasText: updatedName })
      .first()
      .click();
    await page.waitForURL(/\/assets\/.+$/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: updatedName }),
    ).toBeVisible();
    await expect(
      page
        .locator("[data-slot='badge']")
        .filter({ hasText: "Retired" })
        .first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "Delete" }).click();
    await expect(
      page.getByRole("heading", { name: "Delete asset" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Delete asset" }).click();
    await page.waitForURL(
      (url) => getLeafPathSegment(url.toString()) === "assets",
      {
        timeout: 20_000,
      },
    );

    await page.getByLabel("Search assets").fill(updatedName);
    await expect(
      page.locator("tbody tr").filter({ hasText: updatedName }),
    ).toHaveCount(0);
  });
});
