/**
 * Backend unreachable (spec edge case « backend indisponible », FR-029): the shop shows a
 * friendly message with « Réessayer », never a blank page.
 *
 * Needs a front whose `API_BASE_URL` points to a closed port, at `E2E_BACKEND_DOWN_URL`
 * (default `http://localhost:3123`), e.g.:
 * `API_BASE_URL=http://127.0.0.1:9 npx next start -p 3123` after `npx next build`.
 * Skipped when that front is not running.
 */
import { expect, test } from "@playwright/test";

const DOWN_FRONT_URL = process.env.E2E_BACKEND_DOWN_URL ?? "http://localhost:3123";

test.use({ baseURL: DOWN_FRONT_URL });

test.beforeEach(async ({ request }) => {
  const reachable = await request
    .get(DOWN_FRONT_URL, { timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!reachable, `Start a front with an unreachable backend on ${DOWN_FRONT_URL}`);
});

for (const path of ["/", "/products"]) {
  test(`${path} shows a friendly message with « Réessayer »`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "La boutique ne répond pas" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
  });
}

test("the cart explains that the shop cannot be reached", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "ct_guest_cart_v1",
      JSON.stringify({
        items: [{ productUuid: "01a0fcee-0000-7000-8000-00000000000a", quantity: 1 }],
        updatedAt: new Date().toISOString(),
      }),
    );
  });
  await page.goto("/cart");
  await expect(page.getByText("On n'arrive pas à charger ton panier.")).toBeVisible();
});
