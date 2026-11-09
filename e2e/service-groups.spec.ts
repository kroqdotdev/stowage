import { expect, test } from "@playwright/test";
import {
  ensureSchedulingEnabled,
  fillRequiredFields,
  getLanding,
  signIn,
} from "./helpers";

function getUtcIsoDateWithOffset(daysFromNow: number) {
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + daysFromNow);
  return base.toISOString().slice(0, 10);
}

test.describe.serial("phase 7.5 service groups and records", () => {
  test("admin can create group, assign asset, log records, and attach report", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the service groups e2e test",
    );

    const landing = await getLanding(page);
    test.skip(
      landing !== "login",
      "Service groups e2e requires setup to be complete",
    );

    await signIn(page, email!, password!);
    await ensureSchedulingEnabled(page);

    const stamp = Date.now();
    const groupName = `PW Service Group ${stamp}`;
    const assetName = `PW Group Asset ${stamp}`;
    const dueDate = getUtcIsoDateWithOffset(-1);

    await page.goto("/services/groups");
    await page
      .getByRole("button", { name: "New service plan…" })
      .first()
      .click();
    const planDialog = page.getByRole("dialog", { name: "New service plan" });
    await planDialog.getByLabel("Name").fill(groupName);
    await planDialog
      .getByLabel(/^Description/)
      .fill("Playwright service group");
    await planDialog.getByRole("button", { name: "Create plan" }).click();
    // Plans render as a table on desktop and a list on phones.
    const planLink = page
      .getByRole("link", { name: groupName })
      .filter({ visible: true });
    await expect(planLink).toBeVisible();

    await planLink.click();
    await page.waitForURL(/\/services\/groups\/[^/]+$/, { timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: groupName, exact: true }),
    ).toBeVisible();

    for (const [label, type] of [
      ["Technician note", null],
      ["Verified", "checkbox"],
    ] as const) {
      await page.getByRole("button", { name: "Add field…" }).first().click();
      const fieldDialog = page.getByRole("dialog", {
        name: "Add required field",
      });
      await fieldDialog.getByLabel("Label").fill(label);
      if (type) await fieldDialog.getByLabel("Type").selectOption(type);
      await fieldDialog.getByRole("button", { name: "Create field" }).click();
      await expect(fieldDialog).toBeHidden();
      await expect(
        page.getByText(label, { exact: true }).filter({ visible: true }),
      ).toBeVisible();
    }

    await page.goto("/assets/new");
    await page.getByLabel(/Name/i).fill(assetName);
    await fillRequiredFields(page);

    await page.locator("#asset-service-group").click();
    await page.getByRole("option", { name: groupName }).click();
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

    await page.goto("/services");
    await expect(page.getByText("Loading schedules...")).toBeHidden({
      timeout: 20_000,
    });
    const assetLink = page.getByRole("link", { name: assetName, exact: true });
    await expect(assetLink).toBeVisible({ timeout: 20_000 });
    await page
      .getByRole("button", { name: `Log service for ${assetName}` })
      .click();

    const plannerDialog = page.getByRole("dialog", {
      name: new RegExp(`Log service: ${assetName}`),
    });
    await plannerDialog
      .getByLabel(/^Description/i)
      .fill("Completed from services list");
    await plannerDialog
      .getByLabel(/Technician note/i)
      .fill("Checked after run");
    await plannerDialog.getByLabel(/Verified/i).check();
    await plannerDialog
      .getByRole("button", { name: "Complete service" })
      .click();
    await expect(page.getByText("Service completed")).toBeVisible();

    const pdfPayload = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 11 >>\nstream\nBT ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000204 00000 n \ntrailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n255\n%%EOF",
      "utf8",
    );

    await page
      .getByTestId("service-record-attachment-file-input")
      .setInputFiles([
        {
          name: "service-report.pdf",
          mimeType: "application/pdf",
          buffer: pdfPayload,
        },
      ]);
    await expect(page.getByText("service-report.pdf")).toBeVisible({
      timeout: 15_000,
    });
    await plannerDialog.getByRole("button", { name: "Close dialog" }).click();
    await expect(plannerDialog).toBeHidden();

    await page.goto(`/assets/${assetId}`);
    const serviceHistorySection = page.getByTestId("service-history");
    await expect(
      serviceHistorySection.getByRole("heading", { name: /^Service history/ }),
    ).toBeVisible();
    // Each record shows its description; fields and files sit behind a
    // disclosure.
    const firstHistoryRecord = serviceHistorySection
      .getByRole("listitem")
      .filter({ hasText: "Completed from services list" });
    await expect(firstHistoryRecord).toBeVisible();
    await firstHistoryRecord
      .getByText("Fields and files", { exact: true })
      .click();
    await expect(
      firstHistoryRecord.getByText("service-report.pdf"),
    ).toBeVisible();

    await serviceHistorySection
      .getByRole("button", { name: "Log other service…" })
      .click();
    const manualDialog = page.getByRole("dialog", {
      name: "Log other service",
    });
    await manualDialog
      .getByLabel(/^Description/i)
      .fill("Completed from asset detail");
    await manualDialog
      .getByLabel(/Technician note/i)
      .fill("Completed from asset detail");
    await manualDialog.getByLabel(/Verified/i).check();
    await manualDialog.getByRole("button", { name: "Log service" }).click();
    await expect(page.getByText("Service record logged")).toBeVisible();
    await manualDialog.getByRole("button", { name: "Close dialog" }).click();
    await expect(manualDialog).toBeHidden();
    await expect(
      serviceHistorySection.getByText("Completed from asset detail").first(),
    ).toBeVisible();
  });
});
