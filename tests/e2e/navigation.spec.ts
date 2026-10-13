/**
 * Feature 002, US3 — one navigation bar on every page (quickstart scenarios 18 and 19, SC-005).
 *
 * Runs against the real local backend. `/login?error=…` is used instead of `/login`, which
 * starts the Keycloak flow by itself.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";

/** Links of the bar, in order. */
const NAV_LINKS = ["Accueil", "Catalogue", "Ordinateurs", "Écrans"];

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
 * Path of the first computer of the catalog.
 *
 * @param page - Playwright page.
 * @returns The product path.
 */
async function firstComputerPath(page: Page): Promise<string> {
  await page.goto("/products?category=COMPUTER");
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
    const computer = await firstComputerPath(page);
    const pages: readonly (readonly [string, string | null])[] = [
      ["/", "Accueil"],
      ["/products", "Catalogue"],
      ["/products?category=COMPUTER", "Ordinateurs"],
      [computer, "Ordinateurs"],
      ["/cart", null],
      ["/register", null],
      ["/login?error=Configuration", null],
    ];
    for (const [path, current] of pages) {
      await page.goto(path);
      await expect(mainNav(page).getByRole("link")).toHaveText(NAV_LINKS);
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
