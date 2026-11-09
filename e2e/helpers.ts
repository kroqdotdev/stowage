import { expect, type Page } from "@playwright/test";

export type Landing = "login" | "setup";

export async function ensureSchedulingEnabled(page: Page) {
  await page.goto("/settings");
  const schedulingSwitch = page.getByRole("switch", {
    name: "Toggle service scheduling",
  });
  await expect(schedulingSwitch).toBeVisible();
  if ((await schedulingSwitch.getAttribute("aria-checked")) === "false") {
    await schedulingSwitch.click();
    await expect(page.getByText("Service scheduling enabled")).toBeVisible();
  }
}

export function getLeafPathSegment(urlString: string) {
  const segments = new URL(urlString).pathname.split("/").filter(Boolean);
  return segments.at(-1) ?? "";
}

export async function getLanding(
  page: Page,
  route = "/dashboard",
): Promise<Landing> {
  await page.goto(route);
  await page.waitForURL(
    (url) => {
      const leaf = url.pathname.split("/").filter(Boolean).at(-1);
      return leaf === "login" || leaf === "setup";
    },
    { timeout: 15_000 },
  );
  return getLeafPathSegment(page.url()) === "setup" ? "setup" : "login";
}

/*
  In dev, Next.js draws its dev-tools badge in a corner of the page. On a
  phone it sits on top of the top bar's user menu and swallows taps, so tests
  hide it. Production builds have no badge.
*/
export async function hideNextDevTools(page: Page) {
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal { display: none !important; }";
    document.addEventListener("DOMContentLoaded", () =>
      document.head.appendChild(style),
    );
  });
  // The page that is already open (client-side navigations keep it).
  await page
    .addStyleTag({ content: "nextjs-portal { display: none !important; }" })
    .catch(() => undefined);
}

/*
  A page's name: the h1 on tablet and desktop, the top bar title on phones
  (where the page header is hidden). Only one of them is visible.
*/
export function pageTitle(page: Page, name: string | RegExp) {
  return page
    .getByRole("heading", { level: 1, name })
    .or(page.getByTestId("mobile-top-bar-controls").getByText(name))
    .filter({ visible: true });
}

export async function signIn(page: Page, email: string, password: string) {
  await hideNextDevTools(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(
    (url) => getLeafPathSegment(url.toString()) === "dashboard",
    {
      timeout: 20_000,
    },
  );
}

export async function fillRequiredFields(page: Page) {
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
