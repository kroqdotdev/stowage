import { expect, test, type Page } from "@playwright/test"

type Landing = "login" | "setup"

async function getUnauthenticatedLanding(page: Page): Promise<Landing> {
  await page.goto("/dashboard")
  await page.waitForURL(/\/(login|setup)$/, { timeout: 15_000 })
  const path = new URL(page.url()).pathname
  if (path.endsWith("/setup")) {
    return "setup"
  }
  return "login"
}

async function expectNoLocalAuthProxyRequests(
  page: Page,
  action: () => Promise<void>,
) {
  const localAuthRequests: string[] = []
  const onRequest = (request: { url(): string }) => {
    const url = new URL(request.url())
    if (url.origin === "http://localhost:3000" && url.pathname === "/api/auth") {
      localAuthRequests.push(url.toString())
    }
  }

  page.on("request", onRequest)
  try {
    await action()
  } finally {
    page.off("request", onRequest)
  }

  expect(localAuthRequests, "auth should not use the Next.js /api/auth proxy").toEqual([])
}

test.describe.serial("auth flow", () => {
  test("redirects correctly and handles invalid login safely", async ({ page }) => {
    const landing = await getUnauthenticatedLanding(page)

    await page.goto("/")
    await expect(page).toHaveURL(new RegExp(`/${landing}$`))

    if (landing === "setup") {
      await expect(page.getByRole("heading", { name: "Set up Stowage" })).toBeVisible()

      await page.goto("/login")
      await expect(page).toHaveURL(/\/setup$/)
      return
    }

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()

    await page.goto("/setup")
    await expect(page).toHaveURL(/\/login$/)

    const email = `playwright-invalid-${Date.now()}@example.com`
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Password").fill("not-the-right-password")

    await expectNoLocalAuthProxyRequests(page, async () => {
      await page.getByRole("button", { name: "Sign in" }).click()
      await expect(page.locator("p[role='alert']")).toContainText(
        "Invalid email or password",
      )
    })
  })

  test("can sign in and sign out with configured e2e credentials", async ({ page }) => {
    const email = process.env.E2E_AUTH_EMAIL
    const password = process.env.E2E_AUTH_PASSWORD

    test.skip(!email || !password, "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the positive login flow")

    const landing = await getUnauthenticatedLanding(page)
    test.skip(landing !== "login", "Positive login flow requires setup to be complete")

    await expect(page).toHaveURL(/\/login$/)
    await page.getByLabel("Email").fill(email!)
    await page.getByLabel("Password").fill(password!)

    await expectNoLocalAuthProxyRequests(page, async () => {
      await page.getByRole("button", { name: "Sign in" }).click()
      await page.waitForURL(/\/dashboard$/, { timeout: 20_000 })
    })

    await page.getByLabel("Open user menu").click()
    await page.getByRole("menuitem", { name: "Log out" }).click()
    await page.waitForURL(/\/login$/, { timeout: 15_000 })
  })
})
