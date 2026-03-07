import { expect, test, type Page } from "@playwright/test";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getDisplayDatePattern(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  const variants = [
    `${day}-${month}-${year}`,
    `${month}-${day}-${year}`,
    isoDate,
  ];
  return new RegExp(variants.map(escapeRegex).join("|"));
}

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

function getUtcIsoDateWithOffset(daysFromNow: number) {
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + daysFromNow);
  return base.toISOString().slice(0, 10);
}

function getMonthLabelForIsoDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getUtcDayFromIsoDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  return date.getUTCDate();
}

test.describe.serial("phase 7 service scheduling", () => {
  test("admin can toggle scheduling and scheduled assets appear in planner + dashboard", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run service scheduling e2e",
    );

    const landing = await getLanding(page);
    test.skip(
      landing !== "login",
      "Service scheduling e2e requires setup to be complete",
    );

    await signIn(page, email!, password!);

    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: "Features", exact: true }),
    ).toBeVisible();

    const schedulingSwitch = page.getByRole("switch", {
      name: "Toggle service scheduling",
    });
    await expect(schedulingSwitch).toBeChecked();
    await schedulingSwitch.click();
    await expect(page.getByText("Service scheduling disabled")).toBeVisible();

    await page.goto("/services");
    await expect(
      page.getByText(
        "Service scheduling is disabled by an admin. Enable it in Settings to use the planner views.",
      ),
    ).toBeVisible();

    await page.goto("/assets/new");
    await expect(page.getByText("Preventive schedule")).toHaveCount(0);

    await page.goto("/settings");
    const reenabledSchedulingSwitch = page.getByRole("switch", {
      name: "Toggle service scheduling",
    });
    await expect(reenabledSchedulingSwitch).not.toBeChecked();
    await reenabledSchedulingSwitch.click();
    await expect(page.getByText("Service scheduling enabled")).toBeVisible();

    await page.goto("/assets/new");
    await expect(page.getByText("Preventive schedule")).toBeVisible();

    const assetName = `PW Service Schedule ${Date.now()}`;
    const dueDate = getUtcIsoDateWithOffset(5);
    await page.getByLabel(/Name/i).fill(assetName);
    await fillRequiredFields(page);
    await page.getByLabel("Next service date").fill(dueDate);
    await page.locator("#service-interval-value").fill("1");
    await page.locator("#service-reminder-value").fill("1");
    await page.getByRole("button", { name: "Create asset" }).click();

    await expect(
      page.getByRole("heading", { name: `${assetName} created` }),
    ).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: "View asset" }).click();
    await page.waitForURL(/\/assets\/(?!new$)[^/]+$/, { timeout: 20_000 });
    const detailUrl = page.url();
    const assetId = detailUrl.split("/").filter(Boolean).at(-1);
    expect(assetId).toBeTruthy();
    expect(assetId).not.toBe("new");

    await page.goto("/services");
    const scheduleRow = page
      .locator("article")
      .filter({ hasText: assetName })
      .first();
    await expect(scheduleRow).toBeVisible({ timeout: 20_000 });
    await expect(scheduleRow).toContainText(getDisplayDatePattern(dueDate));

    await page.goto("/dashboard");
    const upcomingServicesSection = page
      .locator("section")
      .filter({ hasText: "Service queue" })
      .first();
    await expect(upcomingServicesSection).toBeVisible();

    await page.goto("/services/calendar");
    await expect(
      page.getByRole("heading", { name: "Services Calendar" }),
    ).toBeVisible();
    await expect(page.getByText("Loading service calendar...")).not.toBeVisible(
      {
        timeout: 20_000,
      },
    );
    await expect(page.locator('a[href="/services"]').first()).toBeVisible();
    await expect(
      page.locator('a[href="/services/calendar"]').first(),
    ).toBeVisible();
    const targetMonthLabel = getMonthLabelForIsoDate(dueDate);
    const monthHeading = page.locator(
      "h2.text-base.font-semibold.tracking-tight",
    );
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const currentMonth =
        (await monthHeading.first().textContent())?.trim() ?? "";
      if (currentMonth === targetMonthLabel) {
        break;
      }
      await page.getByRole("button", { name: /^Next$/ }).click();
    }
    await expect(monthHeading.first()).toHaveText(targetMonthLabel);

    const dayValue = getUtcDayFromIsoDate(dueDate);
    const dayCell = page
      .locator("div.min-h-28.rounded-lg.border")
      .filter({
        has: page.getByText(new RegExp(`^${dayValue}$`)),
      })
      .first();
    await expect(dayCell).toBeVisible();
    await expect(dayCell.getByRole("button").first()).toBeVisible();
  });
});
