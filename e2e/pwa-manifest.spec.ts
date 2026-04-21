import { expect, test } from "@playwright/test";

test.describe("web app manifest", () => {
  test("links a manifest from every served HTML page", async ({ page }) => {
    await page.goto("/");

    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute(
      "href",
      /\/manifest\.webmanifest/,
    );
  });

  test("serves the manifest JSON with PWA fields", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.name).toBe("Stowage");
    expect(manifest.short_name).toBe("Stowage");
    expect(manifest.start_url).toBe("/dashboard");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#c2410c");
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);

    const hasMaskable = manifest.icons.some(
      (icon: { purpose?: string }) => icon.purpose === "maskable",
    );
    expect(hasMaskable).toBe(true);
  });

  test("declares a theme-color meta tag", async ({ page }) => {
    await page.goto("/");
    const themeColor = page.locator('meta[name="theme-color"]').first();
    await expect(themeColor).toHaveCount(1);
    const content = await themeColor.getAttribute("content");
    expect(content).toMatch(/#[0-9a-fA-F]{6}/);
  });
});
