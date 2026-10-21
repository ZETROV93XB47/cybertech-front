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
  // Feature 004: the categories added by the backend.
  { name: "catalog-desktops", path: "/products?category=DESKTOP" },
  { name: "catalog-smartphones", path: "/products?category=SMARTPHONE" },
  { name: "catalog-smartwatches", path: "/products?category=SMARTWATCH" },
  { name: "cart", path: "/cart" },
];

test.skip(CAPTURE_DIR === undefined, "Set CAPTURE_DIR to capture the audit screenshots");

/** Time to capture every page (one full-page screenshot each, on a dev server). */
const CAPTURE_TIMEOUT_MS = 120_000;

test("captures the audit pages", async ({ page }) => {
  test.setTimeout(CAPTURE_TIMEOUT_MS);
  await captureScreens(page, CAPTURE_DIR ?? "", TARGETS);
  await page.goto("/products?category=COMPUTER");
  const href = await page
    .getByRole("list", { name: "Produits" })
    .getByRole("link")
    .first()
    .getAttribute("href");
  expect(href).toMatch(/^\/products\/[0-9a-f-]{36}$/);
  await captureScreens(page, CAPTURE_DIR ?? "", [{ name: "product", path: href ?? "" }]);
  await page.goto("/products?category=SMARTWATCH");
  const watch = await page
    .getByRole("list", { name: "Produits" })
    .getByRole("link")
    .first()
    .getAttribute("href");
  await captureScreens(page, CAPTURE_DIR ?? "", [
    { name: "product-smartwatch", path: watch ?? "" },
  ]);
});
