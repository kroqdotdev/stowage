import { expect, test, type Locator, type Page } from "@playwright/test";

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

function getUtcTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getUtcIsoDateWithOffset(daysFromNow: number) {
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + daysFromNow);
  return base.toISOString().slice(0, 10);
}

function addIntervalToIsoDate({
  date,
  value,
  unit,
}: {
  date: string;
  value: number;
  unit: "days" | "weeks" | "months" | "years";
}) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));

  if (unit === "days") {
    next.setUTCDate(next.getUTCDate() + value);
  } else if (unit === "weeks") {
    next.setUTCDate(next.getUTCDate() + value * 7);
  } else if (unit === "months") {
    next.setUTCMonth(next.getUTCMonth() + value);
  } else {
    next.setUTCFullYear(next.getUTCFullYear() + value);
  }

  return next.toISOString().slice(0, 10);
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

async function createScheduledAsset(
  page: Page,
  assetName: string,
  dueDate: string,
) {
  await page.goto("/assets/new");
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

  const assetId = page.url().split("/").filter(Boolean).at(-1);
  expect(assetId).toBeTruthy();
  return assetId!;
}

async function createProvider(page: Page, name: string) {
  const normalizedEmailSeed = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  await page.goto("/services/providers");
  await page.getByRole("button", { name: "Add provider" }).click();
  const dialog = page.getByRole("dialog", { name: "Add provider" });
  await dialog.getByLabel("Name").fill(name);
  await dialog
    .getByLabel("Contact email")
    .fill(`${normalizedEmailSeed}@example.com`);
  await dialog.getByLabel("Contact phone").fill("+45 70 70 70 70");
  await dialog.getByLabel("Notes").fill("Playwright provider");
  await dialog.getByRole("button", { name: "Create provider" }).click();
  await expect(page.getByText("Service provider created")).toBeVisible();
  await expect(
    page.locator("article").filter({ hasText: name }).first(),
  ).toBeVisible();
}

async function editProvider(page: Page, name: string, nextName: string) {
  const providerCard = page
    .locator("article")
    .filter({ hasText: name })
    .first();
  await providerCard.getByRole("button", { name: "Edit" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit provider" });
  await dialog.getByLabel("Name").fill(nextName);
  await dialog.getByLabel("Notes").fill("Edited by Playwright");
  await dialog.getByRole("button", { name: "Save provider" }).click();
  await expect(page.getByText("Service provider updated")).toBeVisible();
  await expect(
    page.locator("article").filter({ hasText: nextName }).first(),
  ).toBeVisible();
}

async function deleteProvider(page: Page, name: string) {
  const providerCard = page
    .locator("article")
    .filter({ hasText: name })
    .first();
  await providerCard.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete provider" }).click();
  await expect(page.getByText("Service provider deleted")).toBeVisible();
  await expect(page.locator("article").filter({ hasText: name })).toHaveCount(
    0,
  );
}

async function completeScheduledService({
  page,
  row,
  assetName,
  description,
  providerName,
  cost,
}: {
  page: Page;
  row: Locator;
  assetName: string;
  description: string;
  providerName?: string;
  cost?: string;
}) {
  await row.getByRole("button", { name: "Log service" }).click();
  const dialog = page.getByRole("dialog", {
    name: new RegExp(`Log service: ${escapeRegex(assetName)}`),
  });
  await dialog.getByLabel(/^Description/i).fill(description);
  if (providerName) {
    await dialog.getByLabel(/^Provider$/i).click();
    await page.getByRole("option", { name: providerName }).click();
  }
  if (cost) {
    await dialog.getByLabel(/^Cost$/i).fill(cost);
  }
  await dialog.getByRole("button", { name: "Complete service" }).click();
  await expect(page.getByText("Service completed")).toBeVisible();
  await dialog.click({ position: { x: 8, y: 8 } });
  await expect(dialog).toBeHidden();
}

async function logManualService({
  page,
  description,
  providerName,
  cost,
}: {
  page: Page;
  description: string;
  providerName?: string;
  cost?: string;
}) {
  const serviceHistorySection = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "Service history", exact: true }),
    })
    .first();

  await serviceHistorySection
    .getByRole("button", { name: "Log manual service" })
    .click();

  const dialog = page.getByRole("dialog", { name: "Log manual service" });
  await dialog.getByLabel(/^Description/i).fill(description);
  if (providerName) {
    await dialog.getByLabel(/^Provider$/i).click();
    await page.getByRole("option", { name: providerName }).click();
  }
  if (cost) {
    await dialog.getByLabel(/^Cost$/i).fill(cost);
  }
  await dialog.getByRole("button", { name: "Log service" }).click();
  await expect(page.getByText("Service record logged")).toBeVisible();
  await dialog.click({ position: { x: 8, y: 8 } });
  await expect(dialog).toBeHidden();

  await expect(serviceHistorySection.getByText(description)).toBeVisible();
}

test.describe.serial("phase 8 service lifecycle", () => {
  test("admin can manage providers and complete scheduled service from services list", async ({
    page,
  }) => {
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the service lifecycle e2e test",
    );

    const landing = await getLanding(page);
    test.skip(
      landing !== "login",
      "Service lifecycle e2e requires setup to be complete",
    );

    await signIn(page, email!, password!);

    const stamp = Date.now();
    const providerName = `PW Lifecycle Provider ${stamp}`;
    const disposableProviderName = `PW Disposable Provider ${stamp}`;
    const renamedDisposableProvider = `${disposableProviderName} Updated`;
    const assetName = `PW Lifecycle Asset ${stamp}`;
    const dueDate = getUtcIsoDateWithOffset(1);
    const expectedNextDue = addIntervalToIsoDate({
      date: getUtcTodayIsoDate(),
      value: 1,
      unit: "months",
    });
    const description = `Completed scheduled service ${stamp}`;

    await createProvider(page, providerName);
    await createProvider(page, disposableProviderName);
    await editProvider(page, disposableProviderName, renamedDisposableProvider);
    await deleteProvider(page, renamedDisposableProvider);

    const assetId = await createScheduledAsset(page, assetName, dueDate);

    await page.goto("/services");
    const scheduleRow = page
      .locator("article")
      .filter({ hasText: assetName })
      .first();
    await expect(scheduleRow).toBeVisible({ timeout: 20_000 });
    await expect(scheduleRow).toContainText(getDisplayDatePattern(dueDate));

    await completeScheduledService({
      page,
      row: scheduleRow,
      assetName,
      description,
      providerName,
      cost: "125.50",
    });

    await expect(scheduleRow).toContainText(
      getDisplayDatePattern(expectedNextDue),
    );
    await expect(scheduleRow).toContainText(description);
    await expect(scheduleRow).toContainText(providerName);
    await expect(scheduleRow.getByText(/^Overdue$/)).toHaveCount(0);

    await page.goto(`/assets/${assetId}`);
    const serviceHistorySection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", {
          name: "Service history",
          exact: true,
        }),
      })
      .first();
    await expect(serviceHistorySection).toBeVisible();
    await expect(serviceHistorySection.getByText(description)).toBeVisible();
    await expect(serviceHistorySection.getByText(providerName)).toBeVisible();
  });

  test("admin can add manual service records from asset detail", async ({
    page,
  }) => {
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the service lifecycle e2e test",
    );

    const landing = await getLanding(page);
    test.skip(
      landing !== "login",
      "Service lifecycle e2e requires setup to be complete",
    );

    await signIn(page, email!, password!);

    const stamp = Date.now();
    const assetName = `PW Manual Service Asset ${stamp}`;
    const providerName = `PW Manual Provider ${stamp}`;
    const description = `Manual service entry ${stamp}`;
    const dueDate = getUtcIsoDateWithOffset(3);
    const expectedNextDue = addIntervalToIsoDate({
      date: getUtcTodayIsoDate(),
      value: 1,
      unit: "months",
    });

    await createProvider(page, providerName);
    await createScheduledAsset(page, assetName, dueDate);
    await logManualService({
      page,
      description,
      providerName,
      cost: "88.00",
    });

    const serviceHistorySection = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", {
          name: "Service history",
          exact: true,
        }),
      })
      .first();
    await expect(serviceHistorySection).toContainText(
      getDisplayDatePattern(expectedNextDue),
    );
    await expect(serviceHistorySection.getByText(providerName)).toBeVisible();
    await expect(
      serviceHistorySection.getByText(/Cost 88([.,]00)?/),
    ).toBeVisible();
  });

  test("completing an overdue scheduled item clears its overdue state", async ({
    page,
  }) => {
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the service lifecycle e2e test",
    );

    const landing = await getLanding(page);
    test.skip(
      landing !== "login",
      "Service lifecycle e2e requires setup to be complete",
    );

    await signIn(page, email!, password!);

    const stamp = Date.now();
    const assetName = `PW Overdue Asset ${stamp}`;
    const dueDate = getUtcIsoDateWithOffset(-3);
    const expectedNextDue = addIntervalToIsoDate({
      date: getUtcTodayIsoDate(),
      value: 1,
      unit: "months",
    });
    const description = `Cleared overdue service ${stamp}`;

    await createScheduledAsset(page, assetName, dueDate);

    await page.goto("/services");
    const scheduleRow = page
      .locator("article")
      .filter({ hasText: assetName })
      .first();
    await expect(scheduleRow).toBeVisible({ timeout: 20_000 });
    await expect(scheduleRow).toContainText("Overdue");

    await completeScheduledService({
      page,
      row: scheduleRow,
      assetName,
      description,
    });

    await expect(scheduleRow).toContainText(
      getDisplayDatePattern(expectedNextDue),
    );
    await expect(scheduleRow.getByText(/^Overdue$/)).toHaveCount(0);
    await expect(scheduleRow.getByText(/day[s]? overdue/i)).toHaveCount(0);
    await expect(scheduleRow).toContainText(description);
  });
});
