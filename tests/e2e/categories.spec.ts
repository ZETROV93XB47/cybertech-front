/**
 * Feature 004 US1 (T014) — every category of the backend in the catalog: exact count, own
 * filters, French name on the product page and on the home tiles (quickstart §3 US1).
 *
 * Runs against the real local backend; the expected counts are read from the backend facets
 * during the test, never hard-coded (they change at every reseed).
 *
 * @see specs/004-catalog-promos-reviews/spec.md US1
 */
import { expect, test, type APIRequestContext } from "@playwright/test";

import { expectNoBlockingViolations } from "./support/a11y";

/** Backend of the local stack. */
const BACKEND_URL = process.env.E2E_BACKEND_URL ?? "http://localhost:8081";

/** Facets endpoint of the backend, read to know the expected counts. */
const FACETS_URL = `${BACKEND_URL}/api/v1/services/product/search/facets`;

/** Each category, its French name and one filter that only its schema offers. */
const CATEGORIES: readonly { key: string; name: string; filter: string }[] = [
  { key: "COMPUTER", name: "Ordinateurs portables", filter: "Écran tactile" },
  { key: "DESKTOP", name: "Ordinateurs de bureau", filter: "Format du boîtier" },
  { key: "MONITOR", name: "Écrans", filter: "Type de dalle" },
  { key: "SMARTPHONE", name: "Smartphones", filter: "Double SIM" },
  { key: "SMARTWATCH", name: "Montres connectées", filter: "Taille du boîtier" },
];

/**
 * Number of products of a category, as the backend counts it.
 *
 * @param request - Playwright request context.
 * @param category - Category key.
 * @returns `totalHits` of the facets.
 */
async function backendCount(request: APIRequestContext, category: string): Promise<number> {
  const response = await request.post(FACETS_URL, {
    headers: { "X-API-VERSION": "1.0" },
    data: { category },
  });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { totalHits: number }).totalHits;
}

/**
 * The count as the page writes it (« 1 234 produits », narrow no-break space).
 *
 * @param count - Number of products.
 * @returns A pattern matching the French formatting.
 */
function countPattern(count: number): RegExp {
  const digits = count.toLocaleString("fr-FR").replace(/\s/g, "\\s");
  return new RegExp(`^${digits} produits?$`);
}

test.describe("five categories", () => {
  for (const { key, name, filter } of CATEGORIES) {
    test(`${name}: exact count and own filters`, async ({ page, request }) => {
      const expected = await backendCount(request, key);
      await page.goto(`/products?category=${key}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
      await expect(page.getByText(countPattern(expected)).first()).toBeVisible();
      const form = page.getByRole("form", { name: "Filtres" });
      await expect(form.getByRole("radio", { name, exact: true })).toBeChecked();
      await expect(form.getByRole("group", { name: filter })).toBeVisible();
    });
  }

  test("a smartwatch page names its category in the breadcrumb and next to the brand", async ({
    page,
  }) => {
    await page.goto("/products?category=SMARTWATCH");
    const href = await page
      .getByRole("list", { name: "Produits" })
      .getByRole("heading")
      .getByRole("link")
      .first()
      .getAttribute("href");
    await page.goto(href ?? "");
    await expect(
      page.getByRole("navigation", { name: "Fil d'Ariane" }).getByText("Montres connectées"),
    ).toBeVisible();
    await expect(page.getByTestId("category-tag").first()).toHaveText("Montres connectées");
  });

  test("the home page shows one tile per category with its count", async ({ page }) => {
    await page.goto("/");
    const tiles = page.getByRole("region", { name: "Catégories" }).getByRole("link");
    await expect(tiles).toHaveCount(CATEGORIES.length);
    for (const { name } of CATEGORIES) {
      await expect(tiles.filter({ hasText: name })).toContainText(/produits?/);
    }
  });

  test("the smartphone catalog has no blocking accessibility violation", async ({ page }) => {
    await page.goto("/products?category=SMARTPHONE");
    await expectNoBlockingViolations(page);
  });
});
