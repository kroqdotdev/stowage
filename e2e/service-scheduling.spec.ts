import { expect, test } from "@playwright/test";
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
    const monthHeading = page.locator("[data-testid='calendar-month-heading']");
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
      .locator("[data-testid='calendar-day-cell']")
      .filter({
        has: page.getByText(new RegExp(`^${dayValue}$`)),
      })
      .first();
    await expect(dayCell).toBeVisible();
    await expect(dayCell.getByRole("button").first()).toBeVisible();
  });
});
