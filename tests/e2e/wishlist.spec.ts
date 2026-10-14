/**
 * Feature 003 US6 — wishlist: hearts on the product pages and « Ma wishlist » (quickstart §3
 * US6, FR-035 to FR-038).
 *
 * Runs against the real local backend and Keycloak, on port 3000 (only redirect URI of the
 * Keycloak client), in the `chromium` project only: every journey registers a fresh user
 * (5 registrations per minute and per IP).
 */
import { expect, test, type Page } from "@playwright/test";

import { expectNoBlockingViolations } from "./support/a11y";
import { fillKeycloakForm, firstProductPaths, registerUser, signIn } from "./support/account";

/** Path of « Ma wishlist ». */
const WISHLIST_PATH = "/account/wishlist";

test.beforeEach(() => {
  test.skip(
    test.info().project.name !== "chromium",
    "Wishlist journeys register users: run them once, in the chromium project",
  );
});

/**
 * Hearts the product of a product page and returns its name.
 *
 * @param page - Page.
 * @param path - Product page path.
 * @returns The product name.
 */
async function heartProduct(page: Page, path: string): Promise<string> {
  await page.goto(path);
  const name = (await page.getByRole("heading", { level: 1 }).textContent()) ?? "";
  await page.getByRole("button", { name: "Ajouter à ma wishlist" }).click();
  await expect(page.getByRole("button", { name: "Retirer de ma wishlist" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  return name.trim();
}

/**
 * Rows of « Ma wishlist ».
 *
 * @param page - Page.
 * @returns The list items locator.
 */
function rows(page: Page) {
  return page.getByRole("list", { name: "Produits de ma wishlist" }).getByRole("listitem");
}

test("hearted products are listed newest first, removed and added to the cart", async ({
  page,
  context,
}) => {
  const email = await registerUser(context);
  await signIn(page, email, WISHLIST_PATH);
  await expect(page.getByRole("heading", { name: "Ta wishlist est vide" })).toBeVisible();
  await expectNoBlockingViolations(page);

  const [firstPath = "", secondPath = ""] = await firstProductPaths(page, 2);
  const firstName = await heartProduct(page, firstPath);
  const secondName = await heartProduct(page, secondPath);

  await page.goto(WISHLIST_PATH);
  await expect(rows(page)).toHaveCount(2);
  await expect(rows(page).first()).toContainText(secondName);
  await expectNoBlockingViolations(page);

  await page.getByRole("button", { name: `Retirer ${secondName} de ma wishlist` }).click();
  await expect(rows(page)).toHaveCount(1);
  await page.getByRole("button", { name: `Ajouter ${firstName} au panier` }).click();
  await expect(page.getByRole("link", { name: /^Panier/ })).toHaveAccessibleName(
    "Panier, 1 article",
  );

  await page.reload();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText(firstName);
  await page.goto(firstPath);
  await expect(page.getByRole("button", { name: "Retirer de ma wishlist" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("a visitor signs in and the hearted product is added on return", async ({ page, context }) => {
  const email = await registerUser(context);
  const [path = ""] = await firstProductPaths(page, 1);
  await page.goto(path);
  await page.getByRole("button", { name: "Ajouter à ma wishlist" }).click();
  await fillKeycloakForm(page, email);
  await page.waitForURL((url) => url.pathname === path && url.port === "3000");
  await expect(page.getByRole("button", { name: "Retirer de ma wishlist" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.goto(WISHLIST_PATH);
  await expect(rows(page)).toHaveCount(1);
});
