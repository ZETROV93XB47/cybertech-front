/**
 * Accessibility audit of every lot 1 page (constitution, WCAG 2.1 AA): axe-core finds no serious
 * or critical violation on the home page, the list, a product page, the cart (empty and filled)
 * and the registration page, with the default accent and with the cyan one. Feature 002 adds
 * the filtered catalog, the comparison modal and the product page with its compare button.
 */
import { test } from "@playwright/test";

import { expectNoBlockingViolations } from "./support/a11y";
import { firstProductPaths } from "./support/account";

test.describe("accessibility", () => {
  test("home, list, product, cart and registration pages", async ({ page }) => {
    const [productPath = ""] = await firstProductPaths(page, 1);
    for (const path of ["/", "/products", productPath, "/cart", "/register"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoBlockingViolations(page);
    }
  });

  test("filtered catalog, comparison modal and product page with the compare button", async ({
    page,
  }) => {
    await page.goto("/products?category=COMPUTER&brand=LENOVO");
    await expectNoBlockingViolations(page);
    const cards = page.getByRole("list", { name: "Produits" }).getByRole("listitem");
    await cards
      .nth(0)
      .getByRole("checkbox", { name: /^Comparer / })
      .check();
    await cards
      .nth(1)
      .getByRole("checkbox", { name: /^Comparer / })
      .check();
    const productPath = await cards
      .nth(2)
      .getByRole("heading")
      .getByRole("link")
      .getAttribute("href");
    await page
      .getByRole("region", { name: "Comparaison" })
      .getByRole("button", { name: /^Comparer/ })
      .click();
    await page.getByRole("dialog").getByRole("table").waitFor();
    await expectNoBlockingViolations(page);
    await page.keyboard.press("Escape");
    await page.goto(productPath ?? "/products");
    await page.getByRole("button", { name: "Ajouter à la comparaison" }).waitFor();
    await expectNoBlockingViolations(page);
  });

  test("filled cart and cyan accent", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "ct_prefs_v1",
        value: encodeURIComponent(
          JSON.stringify({
            version: 1,
            effects: "full",
            motion: "normal",
            accent: "cyan",
            sound: "off",
          }),
        ),
        url: "http://localhost:3000",
      },
    ]);
    const [productPath = ""] = await firstProductPaths(page, 1);
    await page.goto(productPath);
    await page.getByRole("button", { name: "Ajouter au panier" }).click();
    await page.getByRole("status").filter({ hasText: "ajouté à ton panier" }).waitFor();
    await page.goto("/cart");
    await page.getByRole("list", { name: "Articles du panier" }).waitFor();
    await expectNoBlockingViolations(page);
  });
});
