/**
 * Visual audit captures of feature 003 (T002 « before », T071 audit, T078 « after »), skipped
 * unless `CAPTURE_DIR` is set. Signs in through Keycloak, so it runs against port 3000:
 * `CAPTURE_DIR=specs/003-account-orders/screenshots/before npx playwright test account-screenshots --project=chromium`.
 */
import { test } from "@playwright/test";

import { firstProductPaths, registerUser, signIn } from "./support/account";
import { captureScreens } from "./support/capture-screens";

/** Output directory, from the environment. */
const CAPTURE_DIR = process.env.CAPTURE_DIR;

/** Accessible name of the add-to-cart button of a product page. */
const ADD_TO_CART = /Ajouter au panier/;

test.skip(CAPTURE_DIR === undefined, "Set CAPTURE_DIR to capture the audit screenshots");

test("captures the cart, guest then signed in", async ({ page, context }) => {
  const dir = CAPTURE_DIR ?? "";
  await captureScreens(page, dir, [{ name: "cart-guest-empty", path: "/cart" }]);
  const [first, second] = await firstProductPaths(page, 2);
  for (const path of [first, second]) {
    await page.goto(path ?? "/");
    await page.getByRole("button", { name: ADD_TO_CART }).first().click();
  }
  await captureScreens(page, dir, [{ name: "cart-guest-filled", path: "/cart" }]);
  const email = await registerUser(context);
  await signIn(page, email, "/cart");
  await captureScreens(page, dir, [{ name: "cart-account-filled", path: "/cart" }]);
});

test("captures the checkout steps and the confirmation", async ({ page, context }) => {
  const dir = CAPTURE_DIR ?? "";
  const email = await registerUser(context, { withBankCard: true });
  await signIn(page, email, "/");
  const [first = "", second = ""] = await firstProductPaths(page, 2);
  for (const path of [first, second]) {
    await page.goto(path);
    await page.getByRole("button", { name: ADD_TO_CART }).first().click();
    await page.getByRole("status").filter({ hasText: "ajouté à ton panier" }).waitFor();
  }
  await captureScreens(page, dir, [{ name: "cart-account-checkout", path: "/cart" }]);
  await captureScreens(page, dir, [{ name: "checkout-address", path: "/checkout" }]);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("radio", { name: /Livraison express.*FedEx/ }).check();
  await page.screenshot({ path: `${dir}/checkout-shipping.png`, fullPage: true });
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("radio", { name: "Visa" }).check();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByTestId("checkout-total").waitFor();
  await page.screenshot({ path: `${dir}/checkout-ready.png`, fullPage: true });
  await page.getByRole("button", { name: "Valider la commande" }).click();
  await page.waitForURL(/\/checkout\/confirmation\//);
  await page.getByText("Paiement accepté").waitFor({ timeout: 20_000 });
  await page.screenshot({ path: `${dir}/confirmation-paid.png`, fullPage: true });
});
