/**
 * Feature 003 US3 — « Mes commandes »: list and status filter, detail with breakdown and
 * timeline, edit (lower a quantity, add a product found by search), cancellation, and a foreign
 * order UUID (quickstart §3 US3).
 *
 * Runs against the real local backend and Keycloak, on port 3000, in the `chromium` project only
 * (fresh users, 5 registrations per minute and per IP). The two orders are placed through the
 * BFF (`/api/cart`, `/api/checkout/place`) with the session of the browser; the test user saves
 * the card `1111…`, the only test number that pays (backend `docs/test-cards.md`).
 */
import { expect, test, type Page } from "@playwright/test";

import { expectNoBlockingViolations } from "./support/a11y";
import { firstProductPaths, registerUser, signIn } from "./support/account";

/** Longest wait for an order to leave the payment states. */
const PAYMENT_OUTCOME_TIMEOUT_MS = 20_000;

/** Delay between two status reads while waiting for the payment. */
const STATUS_POLL_MS = 1_000;

/** Campaign tried first for the edited order, kept only if the local backend accepts it. */
const PREFERRED_CAMPAIGN = "BLACK_FRIDAY";

const ORDERS_PATH = "/account/orders";

/** Body shared by the placements. */
const PLACE_BODY = {
  paymentType: "VISA",
  shippingType: "STANDARD",
  shippingProvider: "DHL",
  address: { street: "1 rue du Test", zipCode: "75001", city: "Paris", country: "France" },
};

test.beforeEach(() => {
  test.skip(
    test.info().project.name !== "chromium",
    "Order journeys register users: run them once, in the chromium project",
  );
});

/**
 * Tells whether a campaign key is accepted by the quote of the current cart.
 *
 * @param page - Signed-in page.
 * @param discountKey - Campaign key.
 * @returns `true` when the backend accepts it.
 */
async function acceptsCampaign(page: Page, discountKey: string): Promise<boolean> {
  const response = await page.request.post("/api/checkout/quote", {
    data: { shippingType: "STANDARD", shippingProvider: "DHL", discountKey },
  });
  return response.ok();
}

/**
 * Places an order of one product through the BFF and waits for its payment outcome.
 *
 * @param page - Signed-in page (its cookies carry the session).
 * @param productUuid - Product to order.
 * @param quantity - Quantity.
 * @param discountKey - Campaign to try, if any.
 * @returns The order UUID.
 */
async function placeOrder(
  page: Page,
  productUuid: string,
  quantity: number,
  discountKey?: string,
): Promise<string> {
  expect((await page.request.post("/api/cart", { data: { productUuid, quantity } })).ok()).toBe(
    true,
  );
  const withKey = discountKey !== undefined && (await acceptsCampaign(page, discountKey));
  const response = await page.request.post("/api/checkout/place", {
    data: { ...PLACE_BODY, ...(withKey ? { discountKey } : {}) },
  });
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
    .toBe("PAID");
  return orderUuid;
}

/**
 * Rows of the order list.
 *
 * @param page - Orders page.
 * @returns The row links.
 */
function orderRows(page: Page): ReturnType<Page["getByRole"]> {
  return page.getByRole("list", { name: "Liste de tes commandes" }).getByRole("link");
}

test("orders are listed, filtered, edited and cancelled", async ({ page, context }) => {
  test.setTimeout(120_000);
  const email = await registerUser(context, { withBankCard: true });
  await signIn(page, email, ORDERS_PATH);
  await expect(page.getByRole("heading", { name: "Pas encore de commande" })).toBeVisible();
  await expectNoBlockingViolations(page);

  const [pathA = "", pathB = "", pathC = ""] = await firstProductPaths(page, 3);
  await page.goto(pathC);
  const productName = (await page.getByRole("heading", { level: 1 }).textContent()) ?? "";
  const uuidOf = (path: string): string => path.split("/").pop() ?? "";
  const first = await placeOrder(page, uuidOf(pathA), 1);
  const second = await placeOrder(page, uuidOf(pathB), 2, PREFERRED_CAMPAIGN);

  // List, newest first, and the status filter kept in the address.
  await page.goto(ORDERS_PATH);
  await expect(orderRows(page)).toHaveCount(2);
  await expect(orderRows(page).first()).toHaveAttribute("href", `${ORDERS_PATH}/${second}`);
  await page.getByRole("checkbox", { name: "Payée" }).check();
  await page.getByRole("button", { name: "Filtrer" }).click();
  await expect(page).toHaveURL(/status=PAID/);
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Payée" })).toBeChecked();
  await expect(orderRows(page)).toHaveCount(2);
  await expectNoBlockingViolations(page);

  // Detail of the second order: breakdown and timeline.
  await orderRows(page).first().click();
  // A paid order is shown as being prepared (« Payée » done).
  await expect(page.locator(`li[aria-current="step"]`)).toContainText("En préparation");
  await expect(page.getByText("Sous-total")).toBeVisible();
  const totalBefore = (await page.getByTestId("order-total").textContent()) ?? "";
  const discountRow = page.getByText(/^Remise [A-Z_]+$/);
  const discountLabel = (await discountRow.count()) > 0 ? await discountRow.textContent() : null;
  await expectNoBlockingViolations(page);

  // Edit: lower the quantity, add a product found by search, save.
  await page.getByRole("link", { name: "Modifier la commande" }).click();
  await expect(page.getByRole("heading", { name: "Modifier ma commande" })).toBeVisible();
  await expectNoBlockingViolations(page);
  await page.getByRole("button", { name: "Retirer une unité" }).first().click();
  await page.getByLabel("Ajouter un produit").fill(productName.split(" ").slice(0, 2).join(" "));
  await page
    .getByRole("button", { name: `Ajouter ${productName}` })
    .first()
    .click();
  await page.getByRole("radio", { name: "Visa" }).check();
  await page.getByRole("button", { name: "Enregistrer les modifications" }).click();
  await expect(page.getByRole("heading", { name: "Modifications enregistrées" })).toBeVisible();
  await expect(page.getByTestId("edit-previous-total")).toHaveText(totalBefore);
  await page.getByRole("link", { name: "Voir ma commande" }).click();
  await page.waitForURL(new RegExp(`${ORDERS_PATH}/${second}$`));
  await expect(page.getByRole("link", { name: productName, exact: true })).toBeVisible();
  if (discountLabel !== null) {
    await expect(page.getByText(discountLabel)).toBeVisible();
  }

  // Cancel the first order.
  await page.goto(`${ORDERS_PATH}/${first}`);
  await page.getByRole("button", { name: "Annuler la commande" }).click();
  await page.getByRole("button", { name: "Oui, annuler" }).click();
  await expect(page.getByText("Ta commande est annulée.")).toBeVisible();
  await expect(page.getByTestId("order-outcome")).toContainText("Commande annulée");
});

test("another user's order is not found", async ({ page, context }) => {
  const email = await registerUser(context);
  await signIn(page, email, ORDERS_PATH);
  await page.goto(`${ORDERS_PATH}/01a13b2d-0000-7000-8000-000000000000`);
  await expect(page.getByRole("heading", { name: "Commande introuvable" })).toBeVisible();
});
