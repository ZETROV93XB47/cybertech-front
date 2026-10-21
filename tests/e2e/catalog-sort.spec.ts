/**
 * « Trier par » on the catalog (backend prompt §16, `14252d5`): the backend sorts the whole result
 * before pagination, the order survives the pages and the filters.
 *
 * Runs against the real local backend.
 */
import { expect, test, type Page } from "@playwright/test";

/**
 * Prices of the products shown, in grid order.
 *
 * @param page - Catalog page.
 * @returns The prices in euros.
 */
async function gridPrices(page: Page): Promise<number[]> {
  const texts = await page
    .getByRole("list", { name: "Produits" })
    .locator(".price")
    .allTextContents();
  return texts.map((text) => Number(text.replace(/[^\d,]/g, "").replace(",", ".")));
}

/**
 * Whether the numbers are in the given order.
 *
 * @param values - Numbers.
 * @param direction - `1` ascending, `-1` descending.
 * @returns `true` when sorted.
 */
function isSorted(values: readonly number[], direction: 1 | -1): boolean {
  return values.every(
    (value, index) => index === 0 || (value - (values[index - 1] ?? value)) * direction >= 0,
  );
}

/**
 * The « Trier par » select.
 *
 * @param page - Catalog page.
 * @returns Its locator.
 */
function sortSelect(page: Page) {
  return page.getByRole("combobox", { name: "Trier par" });
}

test.describe("catalog sort", () => {
  test("« Prix croissant » sorts the whole result, also on page 2", async ({ page }) => {
    await page.goto("/products?category=SMARTPHONE");
    await expect(sortSelect(page)).toHaveValue("relevance");
    await sortSelect(page).selectOption({ label: "Prix croissant" });
    await expect(page).toHaveURL(/\/products\?category=SMARTPHONE&sort=price-asc$/);
    // The URL changes before the client navigation renders the new grid: wait for the order.
    await expect.poll(async () => isSorted(await gridPrices(page), 1)).toBe(true);
    const first = await gridPrices(page);
    expect(first.length).toBeGreaterThan(1);

    await page
      .getByRole("navigation", { name: "Pagination" })
      .getByRole("link", { name: "Page suivante" })
      .click();
    await expect(page).toHaveURL(/sort=price-asc&page=2$/);
    await expect(sortSelect(page)).toHaveValue("price-asc");
    const lastOfFirst = first.at(-1) ?? 0;
    await expect
      .poll(async () => {
        const second = await gridPrices(page);
        return isSorted(second, 1) && (second[0] ?? 0) >= lastOfFirst;
      })
      .toBe(true);
  });

  test("« Prix décroissant » puts the most expensive first", async ({ page }) => {
    await page.goto("/products?category=SMARTPHONE&sort=price-desc");
    expect(isSorted(await gridPrices(page), -1)).toBe(true);
  });

  test("applying a filter keeps the order", async ({ page }) => {
    await page.goto("/products?sort=price-asc");
    await page
      .getByRole("form", { name: "Filtres" })
      .getByRole("radio", { name: "Écrans" })
      .check();
    await expect(page).toHaveURL(/category=MONITOR/);
    await expect(page).toHaveURL(/sort=price-asc/);
    await expect.poll(async () => isSorted(await gridPrices(page), 1)).toBe(true);
  });
});
