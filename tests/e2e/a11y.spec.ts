/**
 * Accessibility audit of every lot 1 page (constitution, WCAG 2.1 AA): axe-core finds no serious
 * or critical violation on the home page, the list, a product page, the cart (empty and filled)
 * and the registration page, with the default accent and with the cyan one. Feature 002 adds
 * the filtered catalog, the comparison modal and the product page with its compare button;
 * feature 004 adds the header with the « Catalogue » menu open. Feature 003 (Phase 8, T077) adds
 * every signed-in page: each checkout step, the confirmation, « Mes commandes » (empty and
 * filled), the order detail and edit, the profile and « Ma carte »; it signs in through
 * Keycloak, so it runs on port 3000, in the chromium project only (registration rate limit).
 */
import { expect, test } from "@playwright/test";

import { expectNoBlockingViolations, NAVIGATION_MENU_FOCUS_PROXY } from "./support/a11y";
import { firstProductPaths, placePaidOrder, registerUser, signIn } from "./support/account";

/** Time budget of the signed-in pages journey (registration, sign-in, payment). */
const ACCOUNT_JOURNEY_TIMEOUT_MS = 180_000;

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

  test("header with the « Catalogue » menu open", async ({ page }) => {
    await page.goto("/products?category=SMARTPHONE");
    const trigger = page
      .getByRole("navigation", { name: "Navigation principale" })
      .getByRole("button", { name: "Catalogue" });
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expectNoBlockingViolations(page, [NAVIGATION_MENU_FOCUS_PROXY]);
  });

  test("checkout, confirmation and account pages", async ({ page, context }) => {
    test.skip(test.info().project.name !== "chromium", "Registers a user: chromium project only");
    test.setTimeout(ACCOUNT_JOURNEY_TIMEOUT_MS);
    const email = await registerUser(context, { withBankCard: true });
    await signIn(page, email, "/account/orders");
    await expectNoBlockingViolations(page);
    const [productPath = ""] = await firstProductPaths(page, 1);
    const orderUuid = await placePaidOrder(page, productPath.split("/").pop() ?? "");
    for (const path of [
      "/account/orders",
      `/account/orders/${orderUuid}`,
      `/account/orders/${orderUuid}/edit`,
      `/checkout/confirmation/${orderUuid}`,
      "/account/profile",
      "/account/card",
    ]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoBlockingViolations(page);
    }
    await page.goto(productPath);
    await page.getByRole("button", { name: "Ajouter au panier" }).click();
    await page.getByRole("status").filter({ hasText: "ajouté à ton panier" }).waitFor();
    await page.goto("/checkout");
    await expectNoBlockingViolations(page);
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByRole("radio", { name: /Livraison standard.*DHL/ }).check();
    await expectNoBlockingViolations(page);
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByRole("radio", { name: "Visa" }).check();
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(page.getByTestId("checkout-total")).not.toHaveAttribute("aria-busy", "true");
    await expectNoBlockingViolations(page);
  });
});
