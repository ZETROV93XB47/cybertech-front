/**
 * Product page blocks added on 2026-10-13: delivery (fees read from the backend, indicative
 * delays) and customer reviews (empty until the backend can list them).
 *
 * Runs against the real local backend.
 */
import { expect, test } from "@playwright/test";

import { expectNoBlockingViolations } from "./support/a11y";
import { firstProductPaths } from "./support/account";

/** Backend route of the shipping options, read first to know the expected fees. */
const SHIPPING_OPTIONS_URL = "http://localhost:8081/api/v1/services/shipping/options";

/** One backend shipping option. */
interface ShippingOption {
  readonly type: string;
  readonly cost: number;
}

/**
 * Formats a fee the way the page does.
 *
 * @param amount - Amount in euros.
 * @returns E.g. « 15,00 € ».
 */
function euros(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

test.describe("product page", () => {
  test("shows the delivery speeds with the backend fees and indicative delays", async ({
    page,
  }) => {
    const response = await page.request.get(SHIPPING_OPTIONS_URL, {
      headers: { "X-API-VERSION": "1.0" },
    });
    const options = (await response.json()) as ShippingOption[];
    const [path = ""] = await firstProductPaths(page, 1);
    await page.goto(path);
    const delivery = page.getByRole("region", { name: "Livraison" });
    await expect(delivery).toBeVisible();
    const standard = Math.min(
      ...options.filter((option) => option.type === "STANDARD").map((option) => option.cost),
    );
    await expect(delivery.getByRole("listitem").first()).toContainText(euros(standard));
    await expect(delivery).toContainText("Livraison express");
    await expect(delivery).toContainText("Délais indicatifs");
  });

  test("shows the customer reviews section, with real reviews or the empty state", async ({
    page,
  }) => {
    const [path = ""] = await firstProductPaths(page, 1);
    await page.goto(path);
    const reviews = page.getByRole("region", { name: "Avis clients" });
    await expect(reviews).toBeVisible();
    // Feature 004 US5: the reviews are read from the backend; earlier runs may have left some.
    await expect(
      reviews.getByText(/^(Aucun avis pour l'instant|1 avis|\d[\d\s ]* avis)$/),
    ).toBeVisible();
    await expect(reviews.getByRole("list", { name: "Répartition des notes" })).toBeVisible();
    await expectNoBlockingViolations(page);
  });
});
