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

    const maskable = manifest.icons.filter(
      (icon: { purpose?: string }) => icon.purpose === "maskable",
    );
    expect(maskable.length).toBeGreaterThanOrEqual(2);
    const maskableSizes = maskable.map(
      (icon: { sizes?: string }) => icon.sizes,
    );
    expect(maskableSizes).toContain("192x192");
    expect(maskableSizes).toContain("512x512");
    for (const icon of maskable) {
      expect(icon.src).toMatch(/-maskable\.png$/);
    }
  });

  test("declares a theme-color meta tag", async ({ page }) => {
    await page.goto("/");
    const themeColor = page.locator('meta[name="theme-color"]').first();
    await expect(themeColor).toHaveCount(1);
    const content = await themeColor.getAttribute("content");
    expect(content).toMatch(/#[0-9a-fA-F]{6}/);
  });

  test("declares apple-touch-icon and web-app meta tags", async ({ page }) => {
    await page.goto("/");
    const apple = page.locator('link[rel="apple-touch-icon"]').first();
    await expect(apple).toHaveAttribute(
      "href",
      /\/apple-touch-icon\.png/,
    );
    await expect(apple).toHaveAttribute("sizes", "180x180");

    // Next 16 emits `mobile-web-app-capable` (the standardised replacement for
    // the deprecated `apple-mobile-web-app-capable`). iOS Safari accepts both.
    const capable = page
      .locator('meta[name="mobile-web-app-capable"]')
      .first();
    await expect(capable).toHaveAttribute("content", "yes");

    const title = page
      .locator('meta[name="apple-mobile-web-app-title"]')
      .first();
    await expect(title).toHaveAttribute("content", "Stowage");

    const maskIcon = page.locator('link[rel="mask-icon"]').first();
    await expect(maskIcon).toHaveAttribute(
      "href",
      /icon-512-maskable\.png$/,
    );
  });

  test("serves all referenced icon files with 200", async ({ request }) => {
    const icons = [
      "/images/web/icon-192.png",
      "/images/web/icon-512.png",
      "/images/web/icon-192-maskable.png",
      "/images/web/icon-512-maskable.png",
      "/images/web/apple-touch-icon.png",
      "/images/web/favicon.ico",
      // iOS also requests these at the server root as a legacy fallback;
      // mirroring the file there silences the 404 we saw in dev logs.
      "/apple-touch-icon.png",
      "/apple-touch-icon-precomposed.png",
    ];
    for (const url of icons) {
      const response = await request.get(url);
      expect(response.status(), `GET ${url}`).toBe(200);
    }
  });
});
