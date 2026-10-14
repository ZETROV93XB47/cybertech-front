/**
 * Feature 003 US1 — place an order from the cart (quickstart §3 US1, SC-001, SC-002, SC-003).
 *
 * Runs against the real local backend and Keycloak, on port 3000 (only redirect URI of the
 * Keycloak client), in the `chromium` project only: every journey registers a fresh user
 * (5 registrations per minute and per IP). Payment is simulated by the backend: the « Payée »
 * outcome needs its Stripe test configuration.
 */
import { expect, test, type Page } from "@playwright/test";

import { expectNoBlockingViolations } from "./support/a11y";
import { fillKeycloakForm, firstProductPaths, registerUser, signIn } from "./support/account";

/** Longest wait for the payment outcome on the confirmation page (SC-005: 15 s). */
const PAYMENT_OUTCOME_TIMEOUT_MS = 20_000;

/** Largest delay between a shipping change and the new amounts (SC-003). */
const QUOTE_REFRESH_BUDGET_MS = 1_000;

/** Most interactions from « Passer commande » to the confirmation (SC-001). */
const MAX_CHECKOUT_INTERACTIONS = 6;

test.beforeEach(() => {
  test.skip(
    test.info().project.name !== "chromium",
    "Checkout journeys register users: run them once, in the chromium project",
  );
});

/**
 * Adds one unit of a product from its page.
 *
 * @param page - Page.
 * @param path - Product page path.
 */
async function addToCart(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.getByRole("button", { name: "Ajouter au panier" }).first().click();
  await expect(page.getByRole("status").filter({ hasText: "ajouté à ton panier" })).toBeVisible();
}

/**
 * Validates the address step (prefilled) and opens the shipping step.
 *
 * @param page - Checkout page.
 */
async function confirmAddress(page: Page): Promise<void> {
  await expect(page.getByLabel("Ville")).not.toHaveValue("");
  await page.getByRole("button", { name: "Continuer" }).click();
}

/**
 * Reads the total shown by the checkout summary.
 *
 * @param page - Checkout page.
 * @returns The total text.
 */
async function summaryTotal(page: Page): Promise<string> {
  return (await page.getByTestId("checkout-total").textContent()) ?? "";
}

test("a visitor is sent to the sign-in page and comes back to the checkout", async ({
  page,
  context,
}) => {
  const email = await registerUser(context, { withBankCard: true });
  await page.goto("/checkout");
  await fillKeycloakForm(page, email);
  await page.waitForURL((url) => url.pathname === "/checkout" || url.pathname === "/cart");
  // An empty cart sends the customer back to the cart page.
  await expect(page).toHaveURL(/\/cart$/);
});

test("a guest cart follows the customer into the checkout after sign-in", async ({
  page,
  context,
}) => {
  const email = await registerUser(context, { withBankCard: true });
  const [path = ""] = await firstProductPaths(page, 1);
  await addToCart(page, path);
  await page.goto("/cart");
  await page.getByRole("link", { name: "Passer commande" }).click();
  await fillKeycloakForm(page, email);
  await page.waitForURL((url) => url.pathname === "/checkout");
  await expect(page.getByRole("list", { name: "Articles de la commande" })).toBeVisible();
});

test("an order is placed with the quoted total and paid", async ({ page, context }) => {
  const email = await registerUser(context, { withBankCard: true });
  await signIn(page, email, "/");
  const [first = "", second = ""] = await firstProductPaths(page, 2);
  await addToCart(page, first);
  await addToCart(page, second);
  await page.goto("/cart");

  let interactions = 0;
  await page.getByRole("link", { name: "Passer commande" }).click();
  interactions += 1;
  await page.waitForURL(/\/checkout$/);
  await confirmAddress(page);
  interactions += 1;

  await page.getByRole("radio", { name: /Livraison standard.*DHL/ }).check();
  await expect(page.getByTestId("checkout-total")).not.toHaveAttribute("aria-busy", "true");
  const before = await summaryTotal(page);
  const started = Date.now();
  await page.getByRole("radio", { name: /Livraison express.*FedEx/ }).check();
  await expect.poll(() => summaryTotal(page)).not.toBe(before);
  expect(Date.now() - started).toBeLessThan(QUOTE_REFRESH_BUDGET_MS);
  await page.getByRole("button", { name: "Continuer" }).click();
  interactions += 1;

  await page.getByRole("radio", { name: "Visa" }).check();
  await page.getByRole("button", { name: "Continuer" }).click();
  interactions += 1;
  await expectNoBlockingViolations(page);
  const quoted = await summaryTotal(page);

  await page.getByRole("button", { name: "Valider la commande" }).click();
  interactions += 1;
  await page.waitForURL(/\/checkout\/confirmation\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Paiement accepté")).toBeVisible({
    timeout: PAYMENT_OUTCOME_TIMEOUT_MS,
  });
  interactions += 1;
  expect(interactions).toBeLessThanOrEqual(MAX_CHECKOUT_INTERACTIONS);
  await expect(page.getByTestId("confirmation-total")).toHaveText(quoted);
  await expect(page.getByRole("link", { name: /^Panier/ })).toHaveAccessibleName("Panier vide");
  await expectNoBlockingViolations(page);

  // Going back never lands on a checkout ready to place the same order again.
  await page.goBack();
  await expect(page).not.toHaveURL(/\/checkout$/);
});

test("an expired session keeps the choices and never places by itself", async ({
  page,
  context,
}) => {
  const email = await registerUser(context, { withBankCard: true });
  await signIn(page, email, "/");
  const [path = ""] = await firstProductPaths(page, 1);
  await addToCart(page, path);
  await page.goto("/checkout");
  await confirmAddress(page);
  await page.getByRole("radio", { name: /Livraison express.*DHL/ }).check();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("radio", { name: "Google Pay" }).check();
  await page.getByRole("button", { name: "Continuer" }).click();

  await page.waitForLoadState("networkidle");
  const expired = await page.request.post("/api/test/expire-session?mode=all");
  test.skip(expired.status() === 404, "Start the front with E2E=true to run this journey");
  await page.getByRole("button", { name: "Valider la commande" }).click();
  await fillKeycloakForm(page, email);
  await page.waitForURL(/\/checkout$/);
  await expect(page.getByRole("button", { name: "Valider la commande" })).toBeVisible();
  await expect(page.getByText(/Livraison express/).first()).toBeVisible();
  await expect(page.getByText("Google Pay").first()).toBeVisible();
  // Nothing was placed: the cart still holds the product.
  await expect(page.getByRole("link", { name: /^Panier/ })).not.toHaveAccessibleName("Panier vide");
});
