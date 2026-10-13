/**
 * Visual audit captures (feature 002, T002 / T066 / T076), skipped unless `CAPTURE_DIR` is set:
 * `CAPTURE_DIR=specs/002-catalog-refresh/screenshots/before npx playwright test screenshots`.
 */
import { expect, test } from "@playwright/test";

import { captureScreens, type CaptureTarget } from "./support/capture-screens";

/** Output directory, from the environment. */
const CAPTURE_DIR = process.env.CAPTURE_DIR;

/** Pages of the « before » / « after » comparison. */
const TARGETS: readonly CaptureTarget[] = [
  { name: "home", path: "/" },
  { name: "catalog", path: "/products" },
  { name: "catalog-computers", path: "/products?category=COMPUTER" },
  { name: "cart", path: "/cart" },
];

test.skip(CAPTURE_DIR === undefined, "Set CAPTURE_DIR to capture the audit screenshots");

test("captures the audit pages", async ({ page }) => {
  await captureScreens(page, CAPTURE_DIR ?? "", TARGETS);
  await page.goto("/products?category=COMPUTER");
  const href = await page
    .getByRole("list", { name: "Produits" })
    .getByRole("link")
    .first()
    .getAttribute("href");
  expect(href).toMatch(/^\/products\/[0-9a-f-]{36}$/);
  await captureScreens(page, CAPTURE_DIR ?? "", [{ name: "product", path: href ?? "" }]);
});
