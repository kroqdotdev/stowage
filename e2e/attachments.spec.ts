import { expect, test } from "@playwright/test";
import { fillRequiredFields, getLanding, signIn } from "./helpers";

test.describe.serial("phase 6 attachments", () => {
  test("uploads from create flow, then lists, downloads, and deletes attachments", async ({
    page,
  }) => {
    const email = process.env.E2E_AUTH_EMAIL;
    const password = process.env.E2E_AUTH_PASSWORD;

    test.skip(
      !email || !password,
      "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the attachments e2e test",
    );

    const landing = await getLanding(page);
    test.skip(
      landing !== "login",
      "Attachments e2e requires setup to be complete",
    );

    await signIn(page, email!, password!);

    const stamp = Date.now();
    const assetName = `PW Attachments ${stamp}`;

    await page.goto("/assets/new");
    await page.getByLabel(/Name/i).fill(assetName);
    await fillRequiredFields(page);
    await page.getByRole("button", { name: "Create asset" }).click();

    await expect(
      page.getByRole("heading", { name: `${assetName} created` }),
    ).toBeVisible({
      timeout: 20_000,
    });
    await expect(page).toHaveURL(/\/assets\/new$/);

    const imagePayload = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5kL5EAAAAASUVORK5CYII=",
      "base64",
    );
    const pdfPayload = Buffer.from(
      "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 11 >>\nstream\nBT ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000204 00000 n \ntrailer\n<< /Root 1 0 R /Size 5 >>\nstartxref\n255\n%%EOF",
      "utf8",
    );

    await page.getByTestId("attachment-file-input").setInputFiles([
      { name: "photo.png", mimeType: "image/png", buffer: imagePayload },
      { name: "manual.pdf", mimeType: "application/pdf", buffer: pdfPayload },
    ]);

    await expect(page.getByText("manual.pdf")).toBeVisible({ timeout: 30_000 });
    await expect(
      page
        .locator("article")
        .filter({
          hasText: /photo\.(png|webp|jpg|jpeg)/,
        })
        .first(),
    ).toBeVisible({ timeout: 30_000 });

    await expect(page.getByText("Ready").first()).toBeVisible({
      timeout: 30_000,
    });

    const pdfCard = page
      .locator("article")
      .filter({ hasText: "manual.pdf" })
      .first();
    const downloadHref = await pdfCard
      .getByRole("link", { name: "Download" })
      .getAttribute("href");
    expect(downloadHref).toBeTruthy();
    const downloadResponse = await page.request.get(downloadHref!);
    expect(downloadResponse.ok()).toBe(true);

    await pdfCard.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete attachment" }).click();
    await expect(
      page.locator("article").filter({ hasText: "manual.pdf" }),
    ).toHaveCount(0, {
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "View asset" }).click();
    await page.waitForURL(/\/assets\/.+$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: assetName })).toBeVisible();
  });
});
