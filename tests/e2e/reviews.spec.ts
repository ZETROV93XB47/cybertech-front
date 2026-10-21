/**
 * Feature 004, US5 — reviews of bought products (quickstart §3 US5, rows 21 to 29).
 *
 * Runs against the real local backend and Keycloak, on port 3000, in the `chromium` project only
 * (fresh users with a test card, 5 registrations per minute and per IP). Each journey places and
 * pays an order through the BFF, as `orders.spec.ts` does.
 */
import { expect, test, type Page } from "@playwright/test";

import { expectNoBlockingViolations } from "./support/a11y";
import { firstProductPaths, registerUser, signIn } from "./support/account";

/** Longest wait for the payment outcome (SC-005: 15 s). */
const PAYMENT_OUTCOME_TIMEOUT_MS = 20_000;

/** Delay between two reads of the order status. */
const STATUS_POLL_MS = 1_000;

/** « Mes avis ». */
const REVIEWS_PATH = "/account/reviews";

/** First name of the registered users (`registerUser`). */
const FIRST_NAME = "Camille";

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
    "Review journeys register users: run them once, in the chromium project",
  );
});

/**
 * Places an order of one product and waits until it is paid.
 *
 * @param page - Signed-in page.
 * @param productUuid - Product to buy.
 * @returns The order UUID.
 */
async function placePaidOrder(page: Page, productUuid: string): Promise<string> {
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
    .toBe("PAID");
  return orderUuid;
}

/**
 * Registers a user with a card, signs in and buys one product.
 *
 * @param page - Page.
 * @param context - Browser context.
 * @returns The product page path and the order UUID.
 */
async function customerWithPaidOrder(
  page: Page,
  context: Parameters<typeof registerUser>[0],
): Promise<{ productPath: string; orderUuid: string }> {
  const email = await registerUser(context, { withBankCard: true });
  await signIn(page, email, "/");
  const [productPath = ""] = await firstProductPaths(page, 1);
  const orderUuid = await placePaidOrder(page, productPath.split("/").pop() ?? "");
  return { productPath, orderUuid };
}

/**
 * Picks the stars and types the comment in the open review form.
 *
 * @param page - « Mes avis ».
 * @param stars - Accessible name of the star (« 4 étoiles »).
 * @param comment - Comment, empty for a rating only.
 */
async function fillReview(page: Page, stars: string, comment: string): Promise<void> {
  await page.getByRole("radio", { name: stars }).click();
  await page.getByRole("textbox", { name: "Ton commentaire (facultatif)" }).fill(comment);
}

test("publish, edit and delete a review from « Mes avis »", async ({ page, context }) => {
  test.setTimeout(120_000);
  const { productPath } = await customerWithPaidOrder(page, context);

  // « Mes avis » from the avatar menu: the bought product is listed with its order date.
  await page.goto("/");
  await page.getByRole("button", { name: /^Compte de / }).click();
  await page.getByRole("link", { name: "Mes avis" }).click();
  await expect(page).toHaveURL(REVIEWS_PATH);
  const toReview = page.getByRole("list", { name: "Produits à noter" });
  await expect(toReview.getByText(/^Commandé le /)).toBeVisible();
  await expectNoBlockingViolations(page);

  // Publish 4 stars with a comment. The backend refuses every comment while its moderation
  // service is unreachable (fails closed): the input must then be kept, and the rating alone
  // published.
  const comment = "Très bon produit, livré vite.";
  await toReview.getByRole("button", { name: /^Donner ton avis sur / }).click();
  await fillReview(page, "4 étoiles", comment);
  await page.getByRole("button", { name: "Publier mon avis" }).click();
  const published = page.getByText("Merci ! Ton avis est publié.");
  const refused = page.getByRole("status").filter({ hasText: /reformule-le/ });
  await expect(published.or(refused)).toBeVisible();
  const commentAccepted = await published.isVisible();
  if (!commentAccepted) {
    test.info().annotations.push({
      type: "moderation",
      description: "Comment refused: the moderation service is unreachable locally",
    });
    const box = page.getByRole("textbox", { name: "Ton commentaire (facultatif)" });
    await expect(box).toHaveValue(comment);
    await expect(page.getByRole("radio", { name: "4 étoiles" })).toBeChecked();
    await box.fill("");
    await page.getByRole("button", { name: "Publier mon avis" }).click();
    await expect(published).toBeVisible();
  }
  const publishedList = page.getByRole("list", { name: "Avis publiés" });
  await expect(publishedList.getByRole("img", { name: "Note : 4 sur 5" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Produits à noter" })).toHaveCount(0);

  // The product page shows it first (newest first), with the first name. Earlier test users may
  // have reviewed the same product.
  await page.goto(productPath);
  const newest = page.getByRole("list", { name: "Avis des clients" }).getByRole("listitem").first();
  await expect(newest.getByText(FIRST_NAME)).toBeVisible();
  await expect(newest.getByRole("img", { name: "Note : 4 sur 5" })).toBeVisible();
  if (commentAccepted) {
    await expect(newest.getByText(comment)).toBeVisible();
  }

  // Edit to 3 stars, rating only: « Mes avis » and the product page follow.
  await page.goto(REVIEWS_PATH);
  await page.getByRole("button", { name: /^Modifier ton avis sur / }).click();
  await fillReview(page, "3 étoiles", "");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Ton avis est mis à jour.")).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Avis publiés" }).getByRole("img", { name: "Note : 3 sur 5" }),
  ).toBeVisible();
  await page.goto(productPath);
  await expect(newest.getByRole("img", { name: "Note : 3 sur 5" })).toBeVisible();

  // Delete after confirmation: the product can be reviewed again.
  await page.goto(REVIEWS_PATH);
  await page.getByRole("button", { name: /^Supprimer ton avis sur / }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer mon avis" }).click();
  await expect(page.getByText(/Ton avis a été supprimé/)).toBeVisible();
  await expect(page.getByRole("list", { name: "Produits à noter" })).toBeVisible();
});

test("a rating without comment is accepted, from the order detail link", async ({
  page,
  context,
}) => {
  test.setTimeout(120_000);
  const { orderUuid } = await customerWithPaidOrder(page, context);

  // The order detail offers « Donner mon avis », which opens the form in « Mes avis ».
  await page.goto(`/account/orders/${orderUuid}`);
  await page.getByRole("link", { name: /^Donner ton avis sur / }).click();
  await expect(page).toHaveURL(new RegExp(`${REVIEWS_PATH}\\?product=.+&order=${orderUuid}$`));
  await expect(page.getByRole("form", { name: /^Donner ton avis sur / })).toBeVisible();

  await page.getByRole("radio", { name: "5 étoiles" }).click();
  await page.getByRole("button", { name: "Publier mon avis" }).click();
  await expect(page.getByText("Merci ! Ton avis est publié.")).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Avis publiés" }).getByRole("img", { name: "Note : 5 sur 5" }),
  ).toBeVisible();

  // The link leaves the order detail once the product is reviewed.
  await page.goto(`/account/orders/${orderUuid}`);
  await expect(page.getByRole("link", { name: /^Donner ton avis sur / })).toHaveCount(0);
});
