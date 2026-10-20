/**
 * Feature 003 US5 — « Ajouter une carte » (T088): an account without card is sent from the
 * checkout to « Ma carte », adds the paying test card and comes back to order (« Payée »); the
 * card is replaced by a declined one (« Paiement refusé »), then by the paying one again and the
 * payment is retried (« Payée »). Every request to the site is recorded: the full number only
 * appears in the body of `POST /api/bank-card` (SC-008).
 *
 * The backend decides the payment by number (`docs/test-cards.md`): only 1s pay.
 *
 * @see specs/003-account-orders/quickstart.md §3 US5 (51 bis, 51 ter)
 */
import { expect, test, type Page, type Request } from "@playwright/test";

import { expectNoBlockingViolations } from "./support/a11y";
import { firstProductPaths, registerUser, signIn } from "./support/account";

/** Card that pays. */
const PAYING = "1111111111111111";

/** Card that is declined at payment. */
const DECLINED = "4242424242424242";

/** Payment outcome delay (webhook of the backend). */
const PAYMENT_OUTCOME_TIMEOUT_MS = 30_000;

test.beforeEach(() => {
  test.skip(
    test.info().project.name !== "chromium",
    "Card journeys register users: run them once, in the chromium project",
  );
});

/**
 * Fills and sends « Ajouter une carte ».
 *
 * @param page - Page on « Ma carte ».
 * @param number - Card number.
 * @param replace - Whether a card is already saved (confirmation expected).
 */
async function addCard(page: Page, number: string, replace: boolean): Promise<void> {
  if (replace) {
    await page.getByRole("button", { name: "Remplacer ma carte" }).click();
  }
  const form = page.getByRole("form", { name: "Ajouter une carte" });
  await form.getByLabel("Titulaire de la carte").fill("Camille Testeur");
  await form.getByLabel("Numéro de carte").fill(number);
  await form.getByLabel("Mois d'expiration").selectOption("12");
  await form.getByLabel("Année d'expiration").selectOption({ index: 4 });
  await form.getByRole("button", { name: "Enregistrer la carte" }).click();
  if (replace) {
    await page.getByRole("button", { name: "Oui, remplacer" }).click();
  }
  await expect(form.getByLabel("Numéro de carte")).toHaveValue("");
}

/**
 * Adds one unit of a product to the cart.
 *
 * @param page - Signed-in page.
 * @param path - Product page path.
 */
async function addToCart(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.getByRole("button", { name: "Ajouter au panier" }).first().click();
  await expect(page.getByRole("status").filter({ hasText: "ajouté à ton panier" })).toBeVisible();
}

/**
 * Validates the address and shipping steps of the checkout (address prefilled, standard DHL).
 *
 * @param page - Page on the checkout.
 */
async function chooseShipping(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("radio", { name: /Livraison standard.*DHL/ }).check();
  await page.getByRole("button", { name: "Continuer" }).click();
}

/**
 * Pays with Visa and places the order from the payment step.
 *
 * @param page - Page on the checkout, payment step open.
 */
async function placeOrder(page: Page): Promise<void> {
  await page.getByRole("radio", { name: "Visa" }).check();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByTestId("checkout-total")).not.toHaveAttribute("aria-busy", "true");
  await page.getByRole("button", { name: "Valider la commande" }).click();
  await page.waitForURL(/\/checkout\/confirmation\/[0-9a-f-]{36}$/);
}

test("a card added from the checkout pays, a declined one fails, and the retry pays", async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  const leaks: string[] = [];
  page.on("request", (request: Request) => {
    const url = new URL(request.url());
    if (url.host !== "localhost:3000") {
      return;
    }
    const isAdd = url.pathname === "/api/bank-card" && request.method() === "POST";
    const carried = `${request.url()} ${request.postData() ?? ""}`;
    if (!isAdd && (carried.includes(PAYING) || carried.includes(DECLINED))) {
      leaks.push(`${request.method()} ${url.pathname}`);
    }
  });

  const email = await registerUser(context);
  await signIn(page, email, "/");
  const [path = ""] = await firstProductPaths(page, 1);
  await addToCart(page, path);
  await page.goto("/checkout");
  await chooseShipping(page);
  await page.getByRole("link", { name: "Ajouter une carte" }).first().click();
  await page.waitForURL(/\/account\/card\?returnTo=%2Fcheckout$/);
  await expectNoBlockingViolations(page);

  await addCard(page, PAYING, false);
  await page.waitForURL(/\/checkout$/);
  await chooseShipping(page);
  await placeOrder(page);
  await expect(page.getByText("Paiement accepté")).toBeVisible({
    timeout: PAYMENT_OUTCOME_TIMEOUT_MS,
  });

  await page.goto("/account/card");
  await addCard(page, DECLINED, true);
  await expect(page.getByTestId("card-visual")).toContainText("4242");
  await addToCart(page, path);
  await page.goto("/checkout");
  await chooseShipping(page);
  await placeOrder(page);
  await expect(page.getByText(/Ton paiement a été refusé/)).toBeVisible({
    timeout: PAYMENT_OUTCOME_TIMEOUT_MS,
  });
  const confirmation = page.url();

  await page.goto("/account/card");
  await addCard(page, PAYING, true);
  await expect(page.getByTestId("card-visual")).toContainText("1111");
  await page.goto(confirmation);
  await page.getByRole("button", { name: "Relancer le paiement" }).click();
  await expect(page.getByText(/Paiement accepté|déjà été accepté/)).toBeVisible({
    timeout: PAYMENT_OUTCOME_TIMEOUT_MS,
  });

  expect(leaks).toEqual([]);
});
