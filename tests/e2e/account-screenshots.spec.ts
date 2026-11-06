/**
 * Visual audit captures of feature 003 (T002 « before », T071 audit, T078 « after »), skipped
 * unless `CAPTURE_DIR` is set. Signs in through Keycloak, so it runs against port 3000:
 * `CAPTURE_DIR=specs/003-account-orders/screenshots/audit npx playwright test account-screenshots --project=chromium --workers=1`.
 *
 * Covers the states listed by T071: cart (guest, signed in, discount, issue banners), each
 * checkout step, the confirmation (pending, paid, refused), « Mes commandes » (empty, filled,
 * filtered), the detail (paid, canceled, refused), the edit form, the profile and « Ma carte »
 * (with and without a card). The payment timeout and an order too old to edit cannot be produced
 * against the real backend; they are covered by unit tests.
 *
 * @see specs/003-account-orders/tasks.md T071, T078
 */
import { expect, test, type Page } from "@playwright/test";

import { firstProductPaths, registerUser, signIn } from "./support/account";
import { CAPTURE_VIEWPORT, captureScreens } from "./support/capture-screens";

/** Output directory, from the environment. */
const CAPTURE_DIR = process.env.CAPTURE_DIR;

/** Accessible name of the add-to-cart button of a product page. */
const ADD_TO_CART = /Ajouter au panier/;

/** Card that pays (backend `docs/test-cards.md`: only 1s pay). */
const PAYING_CARD = "1111111111111111";

/** Card that is declined at payment. */
const DECLINED_CARD = "4242424242424242";

/** Longest wait for a payment outcome (backend webhook). */
const PAYMENT_OUTCOME_TIMEOUT_MS = 30_000;

/** Delay between two status reads while waiting for the payment. */
const STATUS_POLL_MS = 1_000;

/** Time left to the reveal animations before a shot taken without navigation. */
const SETTLE_DELAY_MS = 1_500;

/** Time budget of the longest capture journey. */
const JOURNEY_TIMEOUT_MS = 240_000;

const ORDERS_PATH = "/account/orders";

/** Body shared by the placements made through the BFF. */
const PLACE_BODY = {
  paymentType: "VISA",
  shippingType: "STANDARD",
  shippingProvider: "DHL",
  address: { street: "1 rue du Test", zipCode: "75001", city: "Paris", country: "France" },
};

test.skip(CAPTURE_DIR === undefined, "Set CAPTURE_DIR to capture the audit screenshots");

test.beforeEach(() => {
  test.skip(
    test.info().project.name !== "chromium",
    "Captures register users: run them once, in the chromium project",
  );
});

/**
 * Shoots the current page once its animations settled.
 *
 * @param page - Page to shoot.
 * @param name - File name without extension.
 */
async function shoot(page: Page, name: string): Promise<void> {
  await page.setViewportSize(CAPTURE_VIEWPORT);
  await page.waitForTimeout(SETTLE_DELAY_MS);
  await page.screenshot({ path: `${CAPTURE_DIR ?? ""}/${name}.png`, fullPage: true });
}

/**
 * Adds one unit of each product through its page.
 *
 * @param page - Page (guest or signed in).
 * @param paths - Product page paths.
 */
async function addProducts(page: Page, paths: readonly string[]): Promise<void> {
  for (const path of paths) {
    await page.goto(path);
    await page.getByRole("button", { name: ADD_TO_CART }).first().click();
    await page.getByRole("status").filter({ hasText: "ajouté à ton panier" }).waitFor();
  }
}

/**
 * Saves a card through the BFF, replacing the current one.
 *
 * @param page - Signed-in page.
 * @param cardNumber - Test card number.
 */
async function saveCard(page: Page, cardNumber: string): Promise<void> {
  const response = await page.request.post("/api/bank-card", {
    data: {
      cardHolderName: "Camille Testeur",
      cardNumber,
      expiryDate: "12/2030",
      cardType: "VISA",
      replace: true,
    },
  });
  expect(response.status()).toBe(201);
}

/**
 * Places an order of one product through the BFF and waits for its payment outcome.
 *
 * @param page - Signed-in page.
 * @param productUuid - Product to order.
 * @param outcome - Expected status once the payment is settled.
 * @returns The order UUID.
 */
async function placeOrder(page: Page, productUuid: string, outcome: string): Promise<string> {
  const cart = await page.request.post("/api/cart", { data: { productUuid, quantity: 1 } });
  expect(cart.ok()).toBe(true);
  const response = await page.request.post("/api/checkout/place", { data: PLACE_BODY });
  expect(response.status()).toBe(201);
  const { orderUuid } = (await response.json()) as { orderUuid: string };
  await expect
    .poll(
      async () => {
        const status = await page.request.get(`/api/orders/${orderUuid}/status`);
        return ((await status.json()) as { status: string }).status;
      },
      { timeout: PAYMENT_OUTCOME_TIMEOUT_MS, intervals: [STATUS_POLL_MS] },
    )
    .toBe(outcome);
  return orderUuid;
}

test("captures the cart, guest then signed in, with its banners", async ({ page, context }) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);
  const dir = CAPTURE_DIR ?? "";
  await captureScreens(page, dir, [{ name: "cart-guest-empty", path: "/cart" }]);
  await addProducts(page, await firstProductPaths(page, 2));
  await captureScreens(page, dir, [{ name: "cart-guest-filled", path: "/cart" }]);
  const email = await registerUser(context);
  await signIn(page, email, "/cart");
  await captureScreens(page, dir, [
    { name: "cart-account-filled", path: "/cart" },
    { name: "cart-issue-stock", path: "/cart?issue=stock" },
    { name: "cart-issue-empty", path: "/cart?issue=empty" },
  ]);
  await page.getByRole("button", { name: "Appliquer une réduction" }).click();
  await shoot(page, "cart-discount-open");
  await page.getByRole("list", { name: "Réductions en cours" }).getByRole("button").first().click();
  await page.getByText(/Réduction choisie/).waitFor();
  await shoot(page, "cart-discount-applied");
});

test("captures the checkout steps and the confirmation", async ({ page, context }) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);
  const dir = CAPTURE_DIR ?? "";
  const email = await registerUser(context, { withBankCard: true });
  await signIn(page, email, "/");
  await addProducts(page, await firstProductPaths(page, 2));
  await captureScreens(page, dir, [{ name: "checkout-address", path: "/checkout" }]);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("radio", { name: /Livraison express.*FedEx/ }).check();
  await shoot(page, "checkout-shipping");
  await page.getByRole("button", { name: "Continuer" }).click();
  await shoot(page, "checkout-payment");
  await page.getByRole("radio", { name: "Visa" }).check();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByTestId("checkout-total")).not.toHaveAttribute("aria-busy", "true");
  await shoot(page, "checkout-ready");
  await page.getByRole("button", { name: "Valider la commande" }).click();
  await page.waitForURL(/\/checkout\/confirmation\//);
  await page.screenshot({ path: `${dir}/confirmation-pending.png`, fullPage: true });
  await page.getByText("Paiement accepté").waitFor({ timeout: PAYMENT_OUTCOME_TIMEOUT_MS });
  await shoot(page, "confirmation-paid");
});

test("captures the account pages, the orders and their outcomes", async ({ page, context }) => {
  test.setTimeout(JOURNEY_TIMEOUT_MS);
  const dir = CAPTURE_DIR ?? "";
  const email = await registerUser(context);
  await signIn(page, email, ORDERS_PATH);
  await captureScreens(page, dir, [
    { name: "orders-empty", path: ORDERS_PATH },
    { name: "card-none", path: "/account/card" },
    { name: "profile", path: "/account/profile" },
  ]);

  const [pathA = "", pathB = ""] = await firstProductPaths(page, 2);
  const uuidOf = (path: string): string => path.split("/").pop() ?? "";
  await saveCard(page, PAYING_CARD);
  const paid = await placeOrder(page, uuidOf(pathA), "PAID");
  const canceled = await placeOrder(page, uuidOf(pathB), "PAID");
  await saveCard(page, DECLINED_CARD);
  const failed = await placeOrder(page, uuidOf(pathA), "PAYMENT_FAILED");
  expect((await page.request.post(`/api/orders/${canceled}/cancel`)).ok()).toBe(true);

  await captureScreens(page, dir, [
    { name: "orders-list", path: ORDERS_PATH },
    { name: "orders-filtered", path: `${ORDERS_PATH}?status=PAID` },
    { name: "order-detail-paid", path: `${ORDERS_PATH}/${paid}` },
    { name: "order-edit", path: `${ORDERS_PATH}/${paid}/edit` },
    { name: "order-detail-canceled", path: `${ORDERS_PATH}/${canceled}` },
    { name: "order-detail-failed", path: `${ORDERS_PATH}/${failed}` },
    { name: "confirmation-failed", path: `/checkout/confirmation/${failed}` },
    { name: "card", path: "/account/card" },
  ]);
});
