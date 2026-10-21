/**
 * Feature 002, US3 — one navigation bar on every page (quickstart scenarios 18 and 19, SC-005).
 * Feature 004, US2 — the « Catalogue » menu lists every active category (quickstart §3 US2).
 *
 * Runs against the real local backend. `/login?error=…` is used instead of `/login`, which
 * starts the Keycloak flow by itself.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Entries of the bar, in order: « Accueil », the « Catalogue » menu trigger, which groups the
 * categories (feature 004, US2), and « Promotions » (US4).
 */
const NAV_LINKS = ["Accueil", "Catalogue", "Promotions"];

/** Upper bound of Tab presses to reach a header control (avoids an endless loop). */
const MAX_TABS = 20;

/**
 * Presses Tab until the focused element's name matches.
 *
 * @param page - Playwright page.
 * @param matches - Test on the focused element's name.
 */
async function tabUntil(page: Page, matches: (name: string) => boolean): Promise<void> {
  for (let presses = 0; presses < MAX_TABS; presses += 1) {
    if (matches(await focusedName(page))) {
      return;
    }
    await page.keyboard.press("Tab");
  }
  throw new Error("Focus target not reached with Tab");
}

/**
 * Main navigation landmark.
 *
 * @param page - Playwright page.
 * @returns The navigation locator.
 */
function mainNav(page: Page): Locator {
  return page.getByRole("navigation", { name: "Navigation principale" });
}

/**
 * Entries of the bar (links and menu trigger), panel closed.
 *
 * @param page - Playwright page.
 * @returns The entries locator.
 */
function navEntries(page: Page): Locator {
  return mainNav(page).locator(":is(a, button)");
}

/**
 * « Catalogue » menu trigger.
 *
 * @param page - Playwright page.
 * @returns The trigger locator.
 */
function catalogTrigger(page: Page): Locator {
  return mainNav(page).getByRole("button", { name: "Catalogue" });
}

/**
 * Path of the first product of a category.
 *
 * @param page - Playwright page.
 * @param category - Category key.
 * @returns The product path.
 */
async function firstProductPath(page: Page, category: string): Promise<string> {
  await page.goto(`/products?category=${category}`);
  const href = await page
    .getByRole("list", { name: "Produits" })
    .getByRole("heading")
    .getByRole("link")
    .first()
    .getAttribute("href");
  return href ?? "";
}

/**
 * Name of the focused element, as a sighted keyboard user would identify it.
 *
 * @param page - Playwright page.
 * @returns Its `aria-label`, else its text.
 */
async function focusedName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const element = document.activeElement;
    return element?.getAttribute("aria-label") ?? element?.textContent.trim() ?? "";
  });
}

test.describe("navigation bar", () => {
  test("the same links on every page, with the expected current section", async ({ page }) => {
    const computer = await firstProductPath(page, "COMPUTER");
    const pages: readonly (readonly [string, string | null])[] = [
      ["/", "Accueil"],
      ["/products", "Catalogue"],
      ["/products?category=COMPUTER", "Catalogue"],
      [computer, "Catalogue"],
      ["/promotions", "Promotions"],
      ["/cart", null],
      ["/register", null],
      ["/login?error=Configuration", null],
    ];
    for (const [path, current] of pages) {
      await page.goto(path);
      await expect(navEntries(page)).toHaveText(NAV_LINKS);
      const currentLinks = mainNav(page).locator('[aria-current="page"]');
      if (current === null) {
        await expect(currentLinks).toHaveCount(0);
      } else {
        await expect(currentLinks).toHaveText([current]);
      }
    }
  });

  test("the first Tab shows « Aller au contenu », which moves the focus to the content", async ({
    page,
  }) => {
    await page.goto("/products");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Aller au contenu" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
  });

  test("every header control is reachable with Tab", async ({ page }) => {
    await page.goto("/");
    // The account slot shows a placeholder until the session is known.
    await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
    const expected = [
      "Aller au contenu",
      "Accueil de cybertech",
      ...NAV_LINKS,
      "Rechercher",
      "Préférences",
      "Créer un compte",
      "Se connecter",
      "panier",
    ];
    const reached: string[] = [];
    while (reached.length < expected.length) {
      await page.keyboard.press("Tab");
      reached.push(await focusedName(page));
    }
    expected.forEach((name, index) => {
      expect(reached[index]?.toLowerCase()).toContain(name.toLowerCase());
    });
  });
});

test.describe("catalog menu", () => {
  test("hover « Catalogue », then click « Montres connectées »", async ({ page }) => {
    await page.goto("/");
    await expect(mainNav(page).getByRole("link", { name: "Ordinateurs" })).toHaveCount(0);
    await expect(mainNav(page).getByRole("link", { name: "Écrans" })).toHaveCount(0);
    await catalogTrigger(page).hover();
    await expect(catalogTrigger(page)).toHaveAttribute("aria-expanded", "true");
    await mainNav(page)
      .getByRole("link", { name: /Montres connectées/ })
      .click();
    await expect(page).toHaveURL(/\/products\?category=SMARTWATCH$/);
    await expect(catalogTrigger(page)).toHaveAttribute("aria-current", "page");
  });

  test("keyboard only: Tab to « Catalogue », Enter, Tab to « Smartphones », Enter", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Se connecter" })).toBeVisible();
    await tabUntil(page, (name) => name === "Catalogue");
    await page.keyboard.press("Enter");
    await expect(catalogTrigger(page)).toHaveAttribute("aria-expanded", "true");
    await tabUntil(page, (name) => name.startsWith("Smartphones"));
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/products\?category=SMARTPHONE$/);
  });

  test("Escape closes the panel and the focus goes back to « Catalogue »", async ({ page }) => {
    await page.goto("/");
    await catalogTrigger(page).focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await expect(mainNav(page).getByRole("link", { name: "Tout le catalogue" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(catalogTrigger(page)).toHaveAttribute("aria-expanded", "false");
    await expect(catalogTrigger(page)).toBeFocused();
  });

  test("on a smartphone page, « Catalogue » is current and « Smartphones » marked", async ({
    page,
  }) => {
    const smartphone = await firstProductPath(page, "SMARTPHONE");
    await page.goto(smartphone);
    await expect(catalogTrigger(page)).toHaveAttribute("aria-current", "page");
    await catalogTrigger(page).click();
    const current = mainNav(page).locator('a[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toContainText("Smartphones");
  });
});
