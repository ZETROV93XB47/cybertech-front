/**
 * US1 — browse the catalog (spec acceptance scenarios 1 to 6, FR-010).
 *
 * Runs against the real local backend. The out-of-stock case mocks the browser call to
 * `/api/availability`, because the seeded catalog has no product without stock.
 */
import { expect, test, type Page } from "@playwright/test";

import { expectNoBlockingViolations } from "./support/a11y";

/** A UUID that no product uses. */
const UNKNOWN_UUID = "00000000-0000-4000-8000-000000000000";

async function firstProductPath(page: Page): Promise<string> {
  await page.goto("/products");
  const href = await page
    .getByRole("list", { name: "Produits" })
    .getByRole("link")
    .first()
    .getAttribute("href");
  expect(href).toMatch(/^\/products\/[0-9a-f-]{36}$/);
  return href ?? "";
}

test.describe("catalog", () => {
  test("a typo still finds LENOVO products", async ({ page }) => {
    await page.goto("/products");
    await page.getByRole("searchbox", { name: "Mot-clé" }).fill("lenvo");
    await page.getByRole("button", { name: "Appliquer les filtres" }).click();

    await expect(page).toHaveURL(/\/products\?q=lenvo$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Résultats pour « lenvo »");
    const results = page.getByRole("list", { name: "Produits" });
    await expect(results.getByText("Lenovo", { exact: true }).first()).toBeVisible();
  });

  test("combined filters are kept in the URL and survive a reload", async ({ page }) => {
    await page.goto("/products");
    await page.getByRole("radio", { name: "Ordinateurs" }).check();
    await expect(page).toHaveURL(/category=COMPUTER/);
    await page.getByRole("checkbox", { name: "Lenovo" }).check();
    await expect(page).toHaveURL(/brand=LENOVO/);
    await page.getByRole("spinbutton", { name: "Prix minimum en euros" }).fill("500");
    await page.getByRole("button", { name: "Appliquer les filtres" }).click();
    await expect(page).toHaveURL("/products?category=COMPUTER&brand=LENOVO&min=500");

    const count = await page.getByText(/\d+ produits?$/).textContent();
    await page.reload();
    await expect(page).toHaveURL("/products?category=COMPUTER&brand=LENOVO&min=500");
    await expect(page.getByText(/\d+ produits?$/)).toHaveText(count ?? "");
    await expect(page.getByRole("radio", { name: "Ordinateurs" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Lenovo" })).toBeChecked();
  });

  test("an empty result offers to reset the filters", async ({ page }) => {
    await page.goto("/products?q=zzzzqqqqxxxx");
    await expect(
      page.getByRole("heading", { name: "Aucun produit ne correspond à ces filtres" }),
    ).toBeVisible();
    await page
      .getByRole("main")
      .getByRole("link", { name: "Réinitialiser les filtres" })
      .first()
      .click();
    await expect(page).toHaveURL("/products");
  });

  test("an unknown product shows « produit introuvable » with a way back", async ({ page }) => {
    const response = await page.goto(`/products/${UNKNOWN_UUID}`);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Produit introuvable" })).toBeVisible();
    await page.getByRole("link", { name: "Retour au catalogue" }).click();
    await expect(page).toHaveURL("/products");
  });

  test("an out-of-stock product shows « Rupture »", async ({ page }) => {
    const path = await firstProductPath(page);
    const uuid = path.split("/").at(-1) ?? "";
    await page.route("**/api/availability?*", (route) =>
      route.fulfill({
        json: { items: [{ productUuid: uuid, availableStock: 0, inStock: false }] },
      }),
    );
    await page.goto(path);
    // The similar products below share the mocked stock: check the product's own badge.
    await expect(page.getByRole("status").filter({ hasText: "Rupture" }).first()).toBeVisible();
  });

  test("the command palette opens with Ctrl+K and leads to a product", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Control+k");
    await page.getByRole("combobox").fill("thinkpad");
    const option = page.getByRole("option").first();
    await expect(option).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/products\/[0-9a-f-]{36}$/);
  });

  test("home, list and product page have no serious accessibility violation", async ({ page }) => {
    await page.goto("/");
    await expectNoBlockingViolations(page);
    const path = await firstProductPath(page);
    await expectNoBlockingViolations(page);
    await page.goto(path);
    await expectNoBlockingViolations(page);
  });
});

test.describe("without JavaScript (FR-010)", () => {
  test.use({ javaScriptEnabled: false });

  test("home, filtered list and product page stay readable", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bienvenue");
    await expect(
      page.getByRole("list", { name: "Les plus demandés" }).getByRole("link").first(),
    ).toBeVisible();

    await page.goto("/products");
    await page.getByRole("radio", { name: "Écrans" }).check();
    await page.getByRole("searchbox", { name: "Mot-clé" }).fill("dell");
    await page.getByRole("button", { name: "Appliquer les filtres" }).click();
    await expect(page).toHaveURL("/products?q=dell&category=MONITOR");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Résultats pour « dell »");

    const path = await firstProductPath(page);
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Caractéristiques" })).toBeVisible();
  });
});
