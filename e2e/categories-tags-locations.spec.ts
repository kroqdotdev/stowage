import { expect, test, type Page } from "@playwright/test"

function getLeafPathSegment(urlString: string) {
  const segments = new URL(urlString).pathname.split("/").filter(Boolean)
  return segments.at(-1) ?? ""
}

async function getLanding(page: Page): Promise<"login" | "setup"> {
  await page.goto("/dashboard")
  await page.waitForURL(
    (url) => {
      const leaf = url.pathname.split("/").filter(Boolean).at(-1)
      return leaf === "login" || leaf === "setup"
    },
    { timeout: 15_000 },
  )
  return getLeafPathSegment(page.url()) === "setup" ? "setup" : "login"
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL((url) => getLeafPathSegment(url.toString()) === "dashboard", {
    timeout: 20_000,
  })
}

test.describe.serial("phase 3 pages", () => {
  test("protected category/tag/location pages redirect when unauthenticated", async ({ page }) => {
    const landing = await getLanding(page)

    for (const route of ["/categories", "/tags", "/locations"]) {
      await page.goto(route)
      await expect.poll(() => getLeafPathSegment(page.url())).toBe(landing)
    }
  })

  test("admin can create category, tag, and nested locations", async ({ page }) => {
    const email = process.env.E2E_AUTH_EMAIL
    const password = process.env.E2E_AUTH_PASSWORD

    test.skip(!email || !password, "Set E2E_AUTH_EMAIL and E2E_AUTH_PASSWORD to run the Phase 3 CRUD e2e test")

    const landing = await getLanding(page)
    test.skip(landing !== "login", "Phase 3 CRUD e2e requires setup to be complete")

    await signIn(page, email!, password!)

    const stamp = Date.now()
    const categoryName = `PW Category ${stamp}`
    const tagName = `PW Tag ${stamp}`
    const rootName = `PW Root ${stamp}`
    const childName = `PW Child ${stamp}`
    const grandchildName = `PW Bin ${stamp}`

    await page.goto("/categories")
    await page.getByRole("button", { name: "Add Category" }).click()
    const categoryDialog = page.getByRole("dialog")
    await categoryDialog.getByLabel("Name").fill(categoryName)
    await categoryDialog.getByLabel("Prefix").fill("PW")
    await categoryDialog.getByLabel("Description").fill("Playwright category")
    await categoryDialog.getByLabel("Color").fill("#2563EB")
    await page.getByRole("button", { name: "Create Category" }).click()
    await expect(page.getByText(categoryName)).toBeVisible()

    await page.goto("/tags")
    await page.getByRole("button", { name: "Add Tag" }).click()
    const tagDialog = page.getByRole("dialog")
    await tagDialog.getByLabel("Name").fill(tagName)
    await tagDialog.getByLabel("Color").fill("#E11D48")
    await page.getByRole("button", { name: "Create Tag" }).click()
    await expect(page.getByText(tagName)).toBeVisible()

    await page.goto("/locations")
    await page.getByRole("button", { name: "Add root location" }).click()
    let locationDialog = page.getByRole("dialog")
    await locationDialog.getByLabel("Name").fill(rootName)
    await page.getByRole("button", { name: "Create location" }).click()
    await expect(page.getByText(rootName)).toBeVisible()

    await page.getByRole("button", { name: `Actions for ${rootName}` }).click()
    await page.getByRole("menuitem", { name: "Add child" }).click()
    locationDialog = page.getByRole("dialog")
    await locationDialog.getByLabel("Name").fill(childName)
    await page.getByRole("button", { name: "Create location" }).click()
    await expect(page.getByText(`${rootName} / ${childName}`)).toBeVisible()

    await page.getByRole("button", { name: `Actions for ${childName}` }).click()
    await page.getByRole("menuitem", { name: "Add child" }).click()
    locationDialog = page.getByRole("dialog")
    await locationDialog.getByLabel("Name").fill(grandchildName)
    await page.getByRole("button", { name: "Create location" }).click()
    await expect(page.getByText(`${rootName} / ${childName} / ${grandchildName}`)).toBeVisible()
  })
})
