/**
 * Visual audit of the « Interface vivante et cohérente » phase (feature 002, T066), skipped
 * unless `CAPTURE_DIR` is set:
 * `CAPTURE_DIR=specs/002-catalog-refresh/screenshots/audit npx playwright test audit-screenshots`.
 *
 * Captures the states the before / after set does not cover: filtered catalog, no result,
 * comparison bar with one and three products, comparison modal, product page with the compare
 * button. Guest only: the signed-in header needs Keycloak on port 3000.
 */
import { test, type Page } from "@playwright/test";

import { CAPTURE_VIEWPORT, captureScreens } from "./support/capture-screens";

/** Output directory, from the environment. */
const CAPTURE_DIR = process.env.CAPTURE_DIR ?? "";

/** Time left to the bar and modal animations before shooting. */
const SETTLE_DELAY_MS = 1_200;

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

test("captures the audit states", async ({ page }) => {
  await captureScreens(page, CAPTURE_DIR, [
    { name: "home", path: "/" },
    { name: "catalog", path: "/products" },
    { name: "catalog-filtered", path: "/products?category=COMPUTER&brand=LENOVO&a.os=Sans+OS" },
    { name: "catalog-no-result", path: "/products?q=zzzzqqqqxxxx" },
    { name: "cart", path: "/cart" },
  ]);
  await page.setViewportSize(CAPTURE_VIEWPORT);
  await page.goto("/products?category=COMPUTER");
  const cards = page.getByRole("list", { name: "Produits" }).getByRole("listitem");
  await cards
    .nth(0)
    .getByRole("checkbox", { name: /^Comparer / })
    .check();
  await shoot(page, "compare-bar-one");
  await cards
    .nth(1)
    .getByRole("checkbox", { name: /^Comparer / })
    .check();
  await cards
    .nth(2)
    .getByRole("checkbox", { name: /^Comparer / })
    .check();
  await shoot(page, "compare-bar-three");
  await page
    .getByRole("region", { name: "Comparaison" })
    .getByRole("button", { name: /^Comparer/ })
    .click();
  await page.getByRole("dialog").getByRole("table").waitFor();
  await shoot(page, "compare-modal");
  await page.keyboard.press("Escape");
  const href = await cards.nth(3).getByRole("heading").getByRole("link").getAttribute("href");
  await page.goto(href ?? "/products");
  await shoot(page, "product-compare-button");
});
