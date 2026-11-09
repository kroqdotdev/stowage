import { expect, test, type Locator, type Page } from "@playwright/test";
import { fillRequiredFields, getLanding, signIn } from "./helpers";

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
    page.getByRole("heading", { name: assetName, exact: true }),
  ).toBeVisible({
    timeout: 20_000,
  });

  await page.getByRole("button", { name: "Open asset" }).click();
  await page.waitForURL(/\/assets\/(?!new$)[^/]+$/, { timeout: 20_000 });

  const assetId = page.url().split("/").filter(Boolean).at(-1);
  expect(assetId).toBeTruthy();
  return assetId!;
}

function providerRow(page: Page, name: string) {
  return page.getByRole("listitem").filter({
    has: page.getByRole("heading", { name, exact: true }),
  });
}

async function createProvider(page: Page, name: string) {
  const normalizedEmailSeed = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  await page.goto("/services/providers");
  await page.getByRole("button", { name: "New provider…" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New provider" });
  await dialog.getByLabel("Name").fill(name);
  await dialog
    .getByLabel("Contact email")
    .fill(`${normalizedEmailSeed}@example.com`);
  await dialog.getByLabel("Contact phone").fill("+45 70 70 70 70");
  await dialog.getByLabel("Notes").fill("Playwright provider");
  await dialog.getByRole("button", { name: "Create provider" }).click();
  await expect(page.getByText("Service provider created")).toBeVisible();
  await expect(providerRow(page, name)).toBeVisible();
}

async function editProvider(page: Page, name: string, nextName: string) {
  await providerRow(page, name).getByRole("button", { name: "Edit…" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit provider" });
  await dialog.getByLabel("Name").fill(nextName);
  await dialog.getByLabel("Notes").fill("Edited by Playwright");
  await dialog.getByRole("button", { name: "Save provider" }).click();
  await expect(page.getByText("Service provider updated")).toBeVisible();
  await expect(providerRow(page, nextName)).toBeVisible();
}

async function deleteProvider(page: Page, name: string) {
  await page
    .getByRole("button", { name: `Delete ${name}`, exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Delete provider?" })
    .getByRole("button", { name: "Delete provider" })
    .click();
  await expect(page.getByText("Service provider deleted")).toBeVisible();
  await expect(providerRow(page, name)).toHaveCount(0);
}

function scheduleRowFor(page: Page, assetName: string) {
  return page
    .getByTestId("services-scheduled-list")
    .getByRole("listitem")
    .filter({ hasText: assetName })
    .first();
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
  await row
    .getByRole("button", { name: `Log service for ${assetName}` })
    .click();
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
  await dialog.getByRole("button", { name: "Close dialog" }).click();
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
  const serviceHistorySection = page.getByTestId("service-history");

  await serviceHistorySection
    .getByRole("button", { name: "Log other service…" })
    .click();

  const dialog = page.getByRole("dialog", { name: "Log other service" });
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
  await dialog.getByRole("button", { name: "Close dialog" }).click();
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
    const scheduleRow = scheduleRowFor(page, assetName);
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
    // The row now reads "Last <date> by <provider>".
    await expect(scheduleRow).toContainText(providerName);
    await expect(scheduleRow.getByText(/^Overdue \d+( days?|d)$/)).toHaveCount(
      0,
    );

    await page.goto(`/assets/${assetId}`);
    const serviceHistorySection = page.getByTestId("service-history");
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

    // Logging a record moves the schedule on; the next service card shows
    // the new date.
    await expect(page.getByTestId("next-service-panel")).toContainText(
      getDisplayDatePattern(expectedNextDue),
    );
    const serviceHistorySection = page.getByTestId("service-history");
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
    const scheduleRow = scheduleRowFor(page, assetName);
    await expect(scheduleRow).toBeVisible({ timeout: 20_000 });
    // The row carries a due tag per layout; one is visible.
    await expect(
      scheduleRow
        .getByText(/^Overdue \d+( days?|d)$/)
        .filter({ visible: true }),
    ).toBeVisible();

    await completeScheduledService({
      page,
      row: scheduleRow,
      assetName,
      description,
    });

    await expect(scheduleRow).toContainText(
      getDisplayDatePattern(expectedNextDue),
    );
    await expect(scheduleRow.getByText(/^Overdue \d+( days?|d)$/)).toHaveCount(
      0,
    );
    await expect(scheduleRow).toContainText(/Last /);
  });
});
