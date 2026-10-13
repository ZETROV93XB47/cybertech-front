/**
 * Feature 002, US2 — compare 2 or 3 products of one category (quickstart scenarios 10 to 17).
 *
 * Runs against the real local backend. MONITOR products are missing from the local search index
 * (2026-10-13), so the « other category » refusal is covered by the component tests only.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoBlockingViolations } from "./support/a11y";

/** `sessionStorage` key of the selection. */
const COMPARE_KEY = "ct_compare_v1";

/** Well-formed UUID that no product has. */
const UNKNOWN_UUID = "00000000-0000-4000-8000-000000000999";

/** Message shown when a selected product disappeared from the catalog. */
const REMOVED_MESSAGE = "Un produit de ta comparaison n'est plus disponible, on l'a retiré.";

/**
 * Cards of the catalog results.
 *
 * @param page - Playwright page.
 * @returns The list items of the results grid.
 */
function cards(page: Page): Locator {
  return page.getByRole("list", { name: "Produits" }).getByRole("listitem");
}

/**
 * « Comparer » checkbox of a card.
 *
 * @param card - Card locator.
 * @returns The checkbox.
 */
function compareBox(card: Locator): Locator {
  return card.getByRole("checkbox", { name: /^Comparer / });
}

/**
 * The comparison bar.
 *
 * @param page - Playwright page.
 * @returns The bar region.
 */
function bar(page: Page): Locator {
  return page.getByRole("region", { name: "Comparaison" });
}

/**
 * Reads the stored selection.
 *
 * @param page - Playwright page.
 * @returns The raw stored value.
 */
async function storedSelection(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.sessionStorage.getItem(key), COMPARE_KEY);
}

/**
 * Product UUID of a card, read from its title link.
 *
 * @param card - Card locator.
 * @returns The UUID.
 */
async function cardUuid(card: Locator): Promise<string> {
  const href = await card.getByRole("heading").getByRole("link").getAttribute("href");
  return href?.split("/").pop() ?? "";
}

test.describe("product comparison", () => {
  test("three computers from two pages, compared in at most 5 actions (SC-003)", async ({
    page,
  }) => {
    let actions = 0;
    await page.goto("/products?category=COMPUTER");
    await compareBox(cards(page).nth(0)).check();
    actions += 1;
    await expect(bar(page).getByText("Choisis un autre produit à comparer.")).toBeVisible();

    await compareBox(cards(page).nth(1)).check();
    actions += 1;
    await expect(bar(page).getByRole("button", { name: /^Comparer/ })).toBeVisible();

    await page.getByRole("link", { name: "Page suivante" }).click();
    actions += 1;
    await expect(page).toHaveURL(/page=/);
    await compareBox(cards(page).nth(0)).check();
    actions += 1;
    const other = compareBox(cards(page).nth(1));
    await expect(other).toHaveAttribute("aria-disabled", "true");
    await expect(other).toHaveAccessibleDescription(/3 produits maximum/);

    await page.goto("/products?category=COMPUTER&brand=LENOVO");
    await page.reload();
    await expect(bar(page).getByRole("listitem")).toHaveCount(3);

    const open = bar(page).getByRole("button", { name: /^Comparer/ });
    await open.click();
    actions += 1;
    const dialog = page.getByRole("dialog", { name: "Comparer les produits" });
    await expect(dialog.getByRole("table")).toBeVisible();
    await expect(dialog.getByRole("columnheader")).toHaveCount(4);
    for (const label of ["Processeur", "Mémoire vive", "Connectique"]) {
      await expect(dialog.getByRole("rowheader", { name: new RegExp(label) })).toBeVisible();
    }
    await expect(dialog.getByRole("button", { name: /au panier/ }).first()).toBeVisible();
    expect(actions).toBeLessThanOrEqual(5);
    await expectNoBlockingViolations(page);

    const allRows = await dialog.getByRole("rowheader").count();
    await dialog.getByRole("switch", { name: "Afficher seulement les différences" }).click();
    const differing = await dialog.getByRole("rowheader").count();
    expect(differing).toBeLessThanOrEqual(allRows);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
  });

  test("the product page adds a third computer and toggles its button", async ({ page }) => {
    await page.goto("/products?category=COMPUTER");
    await compareBox(cards(page).nth(0)).check();
    await compareBox(cards(page).nth(1)).check();
    const third = await cardUuid(cards(page).nth(2));

    await page.goto(`/products/${third}`);
    await expect(bar(page).getByRole("listitem")).toHaveCount(2);
    await page.getByRole("button", { name: "Ajouter à la comparaison" }).click();
    await expect(page.getByRole("button", { name: "Retirer de la comparaison" })).toBeVisible();
    await expect(bar(page).getByRole("listitem")).toHaveCount(3);
  });

  test("a corrupted selection is cleaned silently", async ({ page }) => {
    await page.goto("/products?category=COMPUTER");
    await page.evaluate((key) => {
      window.sessionStorage.setItem(key, "{broken");
    }, COMPARE_KEY);
    await page.reload();
    await expect(compareBox(cards(page).nth(0))).toBeVisible();
    expect(await storedSelection(page)).toBeNull();
    await expect(bar(page)).toBeHidden();
  });

  test("an unknown product leaves the selection as soon as the catalog loads", async ({ page }) => {
    await page.goto("/products?category=COMPUTER");
    const known = await cardUuid(cards(page).nth(0));
    await page.evaluate(
      ({ key, uuids }) => {
        window.sessionStorage.setItem(key, JSON.stringify({ category: "COMPUTER", uuids }));
      },
      { key: COMPARE_KEY, uuids: [known, UNKNOWN_UUID] },
    );
    await page.reload();
    await expect(page.getByText(REMOVED_MESSAGE)).toBeVisible();
    await expect(bar(page).getByRole("listitem")).toHaveCount(1);
    expect(await storedSelection(page)).not.toContain(UNKNOWN_UUID);
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("a new tab starts with an empty selection", async ({ page, browser, baseURL }) => {
    await page.goto("/products?category=COMPUTER");
    await compareBox(cards(page).nth(0)).check();
    await expect(bar(page)).toBeVisible();

    const context = await browser.newContext(baseURL ? { baseURL } : {});
    const fresh = await context.newPage();
    await fresh.goto("/products?category=COMPUTER");
    await expect(compareBox(cards(fresh).nth(0))).not.toBeChecked();
    await expect(bar(fresh)).toBeHidden();
    await context.close();
  });
});
