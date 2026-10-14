/**
 * Feature 003 US2 — apply a discount campaign on the cart and the checkout (quickstart §3 US2).
 *
 * Runs against the real local backend and Keycloak, on port 3000, in the `chromium` project only
 * (fresh users, 5 registrations per minute and per IP). The starter campaigns of the backend
 * (`DiscountCampaignInitializer`) are seeded disabled: a journey that needs an active campaign
 * is skipped, and reported « non testable », when none is offered.
 */
import { expect, test, type Page } from "@playwright/test";

import { expectNoBlockingViolations } from "./support/a11y";
import { firstProductPaths, registerUser, signIn } from "./support/account";

/** Longest wait for the payment outcome on the confirmation page (SC-005: 15 s). */
const PAYMENT_OUTCOME_TIMEOUT_MS = 20_000;

/** Campaign preferred when it is active (spec, independent test of US2). */
const PREFERRED_CAMPAIGN = "BLACK_FRIDAY";

/** Key no campaign uses. */
const UNKNOWN_KEY = "NOPE";

/** Products added to the cart, so that most campaign minimums are reached. */
const PRODUCT_COUNT = 2;

test.beforeEach(() => {
  test.skip(
    test.info().project.name !== "chromium",
    "Discount journeys register users: run them once, in the chromium project",
  );
});

/**
 * Signs a fresh user in (with a test card) and fills the cart.
 *
 * @param page - Page.
 * @param context - Browser context.
 */
async function signedInCart(
  page: Page,
  context: Parameters<typeof registerUser>[0],
): Promise<void> {
  const email = await registerUser(context, { withBankCard: true });
  await signIn(page, email, "/");
  for (const path of await firstProductPaths(page, PRODUCT_COUNT)) {
    await page.goto(path);
    await page.getByRole("button", { name: "Ajouter au panier" }).first().click();
    await expect(page.getByRole("status").filter({ hasText: "ajouté à ton panier" })).toBeVisible();
  }
  await page.goto("/cart");
}

/**
 * Opens the discount block and lists the keys of the campaigns offered.
 *
 * @param page - Cart or checkout page.
 * @returns The campaign keys, in display order.
 */
async function openCampaigns(page: Page): Promise<string[]> {
  await page.getByRole("button", { name: "Appliquer une réduction" }).click();
  const list = page.getByRole("list", { name: "Réductions en cours" });
  if ((await list.count()) === 0) {
    return [];
  }
  const labels = await list.getByRole("button").allTextContents();
  return labels.map((label) => /^[A-Z0-9_]+/.exec(label)?.[0] ?? "");
}

test("a campaign applied on the cart follows the order to the confirmation", async ({
  page,
  context,
}) => {
  await signedInCart(page, context);
  const keys = await openCampaigns(page);
  test.skip(keys.length === 0, "No active campaign on the local backend (non testable)");
  const key = keys.includes(PREFERRED_CAMPAIGN) ? PREFERRED_CAMPAIGN : (keys[0] ?? "");

  await page.getByRole("button", { name: new RegExp(`^${key}`) }).click();
  await expect(page.getByText(`Réduction choisie : ${key}`)).toBeVisible();
  await expect(page.getByText("Livraison et total calculés à l'étape suivante.")).toBeVisible();
  await expect(page.getByTestId("cart-total")).toBeVisible();
  const missing = page.getByText(new RegExp(`Il te manque .* pour profiter de ${key}`));
  test.skip(await missing.isVisible(), `Minimum of ${key} not reached by the test cart`);
  const discount = (await page.getByTestId("discount-amount").textContent()) ?? "";
  await expectNoBlockingViolations(page);

  await page.getByRole("link", { name: "Passer commande" }).click();
  await page.waitForURL(/\/checkout$/);
  await expect(page.getByText(`Réduction choisie : ${key}`)).toBeVisible();
  await expect(page.getByText(`Remise ${key}`)).toBeVisible();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("radio", { name: /Livraison standard.*DHL/ }).check();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("radio", { name: "Visa" }).check();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByTestId("checkout-total")).not.toHaveAttribute("aria-busy", "true");
  const quoted = (await page.getByTestId("checkout-total").textContent()) ?? "";

  await page.getByRole("button", { name: "Valider la commande" }).click();
  await page.waitForURL(/\/checkout\/confirmation\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Paiement accepté")).toBeVisible({
    timeout: PAYMENT_OUTCOME_TIMEOUT_MS,
  });
  await expect(page.getByTestId("confirmation-discount")).toHaveText(discount);
  await expect(page.getByText(`Remise ${key}`)).toBeVisible();
  await expect(page.getByTestId("confirmation-total")).toHaveText(quoted);
});

test("an unknown key is refused and a minimum not reached is explained", async ({
  page,
  context,
}) => {
  await signedInCart(page, context);
  const keys = await openCampaigns(page);
  await page.getByLabel("Tu as une clé de réduction ?").fill(UNKNOWN_KEY);
  await page.getByRole("button", { name: "Tester la clé" }).click();
  await expect(page.getByRole("alert").filter({ hasText: UNKNOWN_KEY })).toContainText(
    `La clé ${UNKNOWN_KEY} n'existe pas`,
  );
  await expect(page.getByText(/Réduction choisie/)).toHaveCount(0);
  await expectNoBlockingViolations(page);

  const withMinimum = page
    .getByRole("list", { name: "Réductions en cours" })
    .getByRole("button")
    .filter({ hasText: "Dès" });
  test.skip(
    keys.length === 0 || (await withMinimum.count()) === 0,
    "No active campaign with a minimum order (non testable, quickstart §5)",
  );
  await withMinimum.first().click();
  await expect(page.getByText(/Réduction choisie/)).toBeVisible();
  const missing = page.getByText(/Il te manque .* pour profiter de/);
  const discount = page.getByTestId("discount-amount");
  await expect(missing.or(discount)).toBeVisible();
});
