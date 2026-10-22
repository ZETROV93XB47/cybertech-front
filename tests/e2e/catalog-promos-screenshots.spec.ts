/**
 * « After » captures of feature 004 (T063), skipped unless `CAPTURE_DIR` is set. The signed-in
 * journey goes through Keycloak, so it runs against port 3000:
 * `CAPTURE_DIR=specs/004-catalog-promos-reviews/screenshots/after npx playwright test catalog-promos-screenshots --project=chromium`.
 *
 * Covers every surface the feature adds or changes: header menu, home carousel and tiles, the
 * catalog per category, promotions list and page, product reviews and « Mes avis » (empty, form
 * open, one review published).
 *
 * @see specs/004-catalog-promos-reviews/tasks.md T063
 */
import { test, type Page } from "@playwright/test";

import { firstProductPaths, placePaidOrder, registerUser, signIn } from "./support/account";
import { CAPTURE_VIEWPORT, captureScreens } from "./support/capture-screens";

/** Output directory, from the environment. */
const CAPTURE_DIR = process.env.CAPTURE_DIR ?? "";

/** Time left to the panel and form animations before a viewport shot. */
const SETTLE_DELAY_MS = 1_200;

/** Time to capture every guest page (one full-page screenshot each, on a dev server). */
const GUEST_CAPTURE_TIMEOUT_MS = 180_000;

/** Time of the signed-in journey: registration, sign-in, paid order and captures. */
const ACCOUNT_CAPTURE_TIMEOUT_MS = 150_000;

/** « Mes avis ». */
const REVIEWS_PATH = "/account/reviews";

/**
 * Takes a viewport screenshot once the animations settled.
 *
 * @param page - Playwright page.
 * @param name - File name without extension.
 */
async function shoot(page: Page, name: string): Promise<void> {
  await page.waitForTimeout(SETTLE_DELAY_MS);
  await page.screenshot({ path: `${CAPTURE_DIR}/${name}.png` });
}

test.skip(CAPTURE_DIR === "", "Set CAPTURE_DIR to capture the audit screenshots");

test("captures the guest surfaces", async ({ page }) => {
  test.setTimeout(GUEST_CAPTURE_TIMEOUT_MS);
  await captureScreens(page, CAPTURE_DIR, [
    { name: "home", path: "/" },
    { name: "catalog", path: "/products" },
    { name: "catalog-computers", path: "/products?category=COMPUTER" },
    { name: "catalog-desktops", path: "/products?category=DESKTOP" },
    { name: "catalog-monitors", path: "/products?category=MONITOR" },
    { name: "catalog-smartphones", path: "/products?category=SMARTPHONE" },
    { name: "catalog-smartwatches", path: "/products?category=SMARTWATCH" },
    { name: "promotions", path: "/promotions" },
    { name: "campaign", path: "/promotions/BLACK_FRIDAY" },
    { name: "campaign-not-found", path: "/promotions/UNKNOWN_CAMPAIGN" },
  ]);
  await page.setViewportSize(CAPTURE_VIEWPORT);
  await page.goto("/");
  await page.getByRole("button", { name: "Catalogue" }).click();
  await page.getByRole("list", { name: "Catégories du catalogue" }).waitFor();
  await shoot(page, "menu-open");
  const [product = ""] = await firstProductPaths(page, 1);
  await captureScreens(page, CAPTURE_DIR, [{ name: "product-reviews", path: product }]);
});

test("captures « Mes avis »", async ({ page, context }) => {
  test.skip(test.info().project.name !== "chromium", "Registers a user: chromium project only");
  test.setTimeout(ACCOUNT_CAPTURE_TIMEOUT_MS);
  const email = await registerUser(context, { withBankCard: true });
  await signIn(page, email, "/");
  await captureScreens(page, CAPTURE_DIR, [{ name: "reviews-empty", path: REVIEWS_PATH }]);
  const [product = ""] = await firstProductPaths(page, 1);
  await placePaidOrder(page, product.split("/").pop() ?? "");
  await captureScreens(page, CAPTURE_DIR, [{ name: "reviews-to-review", path: REVIEWS_PATH }]);
  await page.getByRole("button", { name: /^Donner ton avis sur / }).click();
  await page.getByRole("radio", { name: "4 étoiles" }).click();
  await shoot(page, "reviews-form");
  await page.getByRole("button", { name: "Publier mon avis" }).click();
  await page.getByText("Merci ! Ton avis est publié.").waitFor();
  await captureScreens(page, CAPTURE_DIR, [
    { name: "reviews-published", path: REVIEWS_PATH },
    { name: "product-with-review", path: product },
  ]);
});
