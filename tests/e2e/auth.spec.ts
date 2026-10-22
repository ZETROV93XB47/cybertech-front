/**
 * US3 — sign in, stay signed in, sign out (spec acceptance scenarios 1 to 4, FR-015 to FR-019,
 * FR-027).
 *
 * Runs against the real local backend and Keycloak, on port 3000 (the only redirect URI allowed
 * by the Keycloak client). The session expiry journeys need the front started with `E2E=true`
 * (test-only route `POST /api/test/expire-session`); they are skipped otherwise. Users are
 * registered through the backend (5 per minute and per IP): the journeys that leave the account
 * cart untouched share one user, the two cart journeys get their own. Everything runs once, in
 * the `chromium` project.
 */
import { expect, test, type Page } from "@playwright/test";

import {
  fillKeycloakForm,
  firstProductPaths,
  loginUrl,
  registerUser,
  signIn,
} from "./support/account";

const GUEST_CART_KEY = "ct_guest_cart_v1";

const signOutButton = (page: Page) => page.getByRole("button", { name: "Se déconnecter" });
/** Avatar of the header account menu, present only once signed in (FR-040). */
const accountAvatar = (page: Page) => page.getByRole("button", { name: /^Compte de / });
const signInLink = (page: Page) => page.getByRole("link", { name: "Se connecter" });

/** Damages the session through the test-only route; skips the test when it is not enabled. */
async function expireSession(page: Page, mode: "access" | "all"): Promise<void> {
  // A session request still in flight would write the previous cookie back after this one.
  await page.waitForLoadState("networkidle");
  const response = await page.request.post(`/api/test/expire-session?mode=${mode}`);
  test.skip(response.status() === 404, "Start the front with E2E=true to run this journey");
  expect(response.status()).toBe(204);
}

/** User shared by the journeys that do not change the account cart. */
let sharedEmail = "";

test.beforeAll(async ({ browser }, testInfo) => {
  if (testInfo.project.name !== "chromium") {
    return;
  }
  const context = await browser.newContext();
  sharedEmail = await registerUser(context);
  await context.close();
});

test.beforeEach(() => {
  test.skip(
    test.info().project.name !== "chromium",
    "Auth journeys register users: run them once, in the chromium project",
  );
});

test("signing in from the header comes back to the page of origin", async ({ page }) => {
  const email = sharedEmail;
  await page.goto("/cart");
  await signInLink(page).click();
  await fillKeycloakForm(page, email);
  await page.waitForURL((url) => url.pathname === "/cart");
  await expect(accountAvatar(page)).toBeVisible();
});

test("a signed-in user is welcomed by first name", async ({ page }) => {
  const email = sharedEmail;
  await signIn(page, email, "/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Content de te revoir, Camille");
});

test("an unsafe callback URL falls back to the home page", async ({ page }) => {
  const email = sharedEmail;
  await page.goto(loginUrl("https://evil.example/steal"));
  await fillKeycloakForm(page, email);
  await page.waitForURL((url) => url.origin === "http://localhost:3000" && url.pathname === "/");
});

test("signing out closes both sessions and leaves nothing private behind", async ({
  page,
  context,
}) => {
  const email = await registerUser(context);
  await signIn(page, email, "/");
  const [path = ""] = await firstProductPaths(page, 1);
  await page.goto(path);
  await page.getByRole("button", { name: "Ajouter au panier" }).click();
  await expect(page.getByRole("link", { name: "Panier, 1 article" })).toBeVisible();

  await accountAvatar(page).click();
  await expect(page.getByTestId("account-name")).toContainText("Camille");
  await signOutButton(page).click();
  await page.waitForURL((url) => url.port === "3000" && url.pathname === "/");
  await expect(signInLink(page)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).not.toContainText("Camille");

  await page.goBack();
  // Only the header can show the signed-in user: the product page may list public reviews
  // signed « Camille » by earlier test users (feature 004).
  await expect(page.getByRole("banner").getByText("Camille")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Panier, 1 article" })).toHaveCount(0);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), GUEST_CART_KEY)).toBeNull();

  await page.goto(loginUrl("/"));
  await expect(page.locator("#username")).toBeVisible();
});

test("an expired access token is renewed without the user noticing", async ({ page }) => {
  const email = sharedEmail;
  await signIn(page, email, "/");
  await expireSession(page, "access");
  await page.goto("/cart");
  await expect(page).toHaveURL(/\/cart$/);
  await expect(accountAvatar(page)).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Content de te revoir, Camille");
});

test("a cart action with an unrecoverable session is replayed after sign-in", async ({
  page,
  context,
}) => {
  const email = await registerUser(context);
  await signIn(page, email, "/");
  const [path = ""] = await firstProductPaths(page, 1);
  await expireSession(page, "all");
  await page.goto(path);
  await page.getByRole("spinbutton", { name: "Quantité" }).fill("2");
  await page.getByRole("button", { name: "Ajouter au panier" }).click();

  // Keycloak still has its SSO session: the sign-in completes without the form.
  await page.waitForURL((url) => url.pathname === path);
  await expect(page.getByText(/On a repris ce que tu faisais/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Panier, 2 articles" })).toBeVisible();
});
