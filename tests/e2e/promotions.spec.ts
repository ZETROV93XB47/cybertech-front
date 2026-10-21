/**
 * Feature 004, US4 — promotions pages and « Appliquer à mon panier » (quickstart §3 US4, rows
 * 16 to 20).
 *
 * Runs against the real local backend and Keycloak, on port 3000. The journeys that apply the
 * campaign register users: they run once, in the `chromium` project (5 registrations per minute
 * and per IP). Everything needs BLACK_FRIDAY to be active on the local backend; the tests are
 * skipped, and reported « non testable », otherwise.
 */
import { expect, test, type Page } from "@playwright/test";

import { expectNoBlockingViolations } from "./support/a11y";
import { fillKeycloakForm, firstProductPaths, registerUser, signIn } from "./support/account";

/** Campaign of the independent test of US4. */
const CAMPAIGN_KEY = "BLACK_FRIDAY";

/** Its page. */
const CAMPAIGN_PATH = `/promotions/${CAMPAIGN_KEY}`;

/** Text of the cart discount block once the campaign is chosen (feature 003). */
const CHOSEN_TEXT = `Réduction choisie : ${CAMPAIGN_KEY}`;

/**
 * Skips the test when BLACK_FRIDAY is not active on the local backend.
 *
 * @param page - Page.
 */
async function requireCampaign(page: Page): Promise<void> {
  await page.goto("/promotions");
  const card = page.getByRole("link", { name: "Black Friday" });
  test.skip((await card.count()) === 0, "BLACK_FRIDAY is not active locally (non testable)");
}

/**
 * Adds the first product in stock to the cart (guest or account).
 *
 * @param page - Page.
 */
async function addOneProduct(page: Page): Promise<void> {
  const [path = ""] = await firstProductPaths(page, 1);
  await page.goto(path);
  await page.getByRole("button", { name: "Ajouter au panier" }).first().click();
  await expect(page.getByRole("status").filter({ hasText: "ajouté à ton panier" })).toBeVisible();
}

/**
 * Clicks « Appliquer à mon panier » on the campaign page.
 *
 * @param page - Page.
 * @returns The polite live region with the outcome.
 */
async function applyCampaign(page: Page): Promise<ReturnType<Page["getByRole"]>> {
  await page.goto(CAMPAIGN_PATH);
  await page.getByRole("button", { name: "Appliquer à mon panier" }).click();
  return page.getByRole("status").filter({ hasText: "Black Friday" });
}

test.describe("promotions pages", () => {
  test("« Promotions » in the header lists BLACK_FRIDAY, which opens its page", async ({
    page,
  }) => {
    await requireCampaign(page);
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await nav.getByRole("link", { name: "Promotions" }).click();
    await expect(page).toHaveURL(/\/promotions$/);
    await expect(nav.getByRole("link", { name: "Promotions" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const list = page.getByRole("list", { name: "Campagnes en cours" });
    await expect(list.getByRole("heading")).not.toContainText(["Aucune remise", "No discount"]);
    const card = list.getByRole("article").filter({ hasText: "Black Friday" });
    await expect(card.getByTestId("campaign-benefit")).toHaveText("−20 %");
    await expectNoBlockingViolations(page);

    await card.getByRole("link", { name: "Black Friday" }).click();
    await expect(page).toHaveURL(new RegExp(`${CAMPAIGN_PATH}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Black Friday" })).toBeVisible();
    await expect(page.getByTestId("campaign-benefit")).toHaveText("−20 %");
    await expect(page.getByText("Sans date de fin")).toBeVisible();
    await expect(page.getByRole("button", { name: "Appliquer à mon panier" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir le catalogue" })).toBeVisible();
    await expectNoBlockingViolations(page);
  });

  test("an unknown campaign shows « introuvable ou terminée » with a link back", async ({
    page,
  }) => {
    await page.goto("/promotions/INCONNUE");
    await expect(
      page.getByRole("heading", { level: 1, name: "Campagne introuvable ou terminée" }),
    ).toBeVisible();
    await expectNoBlockingViolations(page);
    await page.getByRole("link", { name: "Voir les promotions en cours" }).click();
    await expect(page).toHaveURL(/\/promotions$/);
  });
});

test.describe("apply a campaign to the cart", () => {
  test.beforeEach(() => {
    test.skip(
      test.info().project.name !== "chromium",
      "These journeys register users: run them once, in the chromium project",
    );
  });

  test("signed in: the cart shows the campaign as chosen", async ({ page, context }) => {
    await requireCampaign(page);
    const email = await registerUser(context);
    await signIn(page, email, "/");
    await addOneProduct(page);
    const status = await applyCampaign(page);
    await expect(status).toContainText("Black Friday est sélectionnée");
    await status.getByRole("link", { name: "Voir mon panier" }).click();
    await expect(page.getByText(CHOSEN_TEXT)).toBeVisible();
  });

  test("visitor: the key is kept and the cart offers it after sign-in", async ({
    page,
    context,
  }) => {
    await requireCampaign(page);
    const email = await registerUser(context);
    await addOneProduct(page);
    const status = await applyCampaign(page);
    await expect(status).toContainText("Black Friday est gardée pour toi");
    await status.getByRole("link", { name: "Me connecter" }).click();
    await fillKeycloakForm(page, email);
    await page.waitForURL((url) => url.pathname === "/cart" && url.port === "3000");
    await expect(page.getByText(CHOSEN_TEXT)).toBeVisible();
  });
});
