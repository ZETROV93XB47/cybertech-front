/**
 * Feature 002, US1 — filter on every category attribute (quickstart scenarios 1 to 9).
 *
 * Runs against the real local backend. Counts are asserted only when the facets endpoint
 * answers; with an older backend the same journey checks that the values come without counts.
 * Values used here (« AMD Ryzen 7 », « Intel Core Ultra 7 », « OLED ») are present in the seeded
 * computers of 2026-10-13.
 */
import { expect, test, type Page, type Request } from "@playwright/test";

import { expectNoBlockingViolations } from "./support/a11y";

/** Seeded processor values. */
const AMD = "AMD Ryzen 7";
const INTEL = "Intel Core Ultra 7";

/**
 * Accessible name of a value checkbox, with or without its count: exact, since « AMD Ryzen 7 »
 * and « AMD Ryzen 7 Pro » both exist.
 *
 * @param value - Displayed value.
 * @returns A pattern matching « value » and « value (12) » only.
 */
function valueName(value: string): RegExp {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}( \\(\\d+\\))?$`);
}

/** Backend facets endpoint, to know whether counts are expected. */
const FACETS_URL = "http://localhost:8081/api/v1/services/product/search/facets";

/**
 * Tells whether the backend exposes the facets endpoint.
 *
 * @param page - Playwright page (its request context is used).
 * @returns `true` when counts are expected.
 */
async function hasFacetsEndpoint(page: Page): Promise<boolean> {
  const response = await page.request.post(FACETS_URL, {
    headers: { "X-API-VERSION": "1.0" },
    data: { category: "COMPUTER" },
  });
  return response.ok();
}

/**
 * Group of one filter in the filter form.
 *
 * @param page - Playwright page.
 * @param name - Legend of the filter.
 * @returns The fieldset locator.
 */
function filterGroup(page: Page, name: string): ReturnType<Page["getByRole"]> {
  return page.getByRole("form", { name: "Filtres" }).getByRole("group", { name });
}

test.describe("catalog attribute filters", () => {
  test("computers offer every attribute filter except connectivity", async ({ page }) => {
    await page.goto("/products?category=COMPUTER");
    for (const name of ["Processeur", "Carte graphique", "Système", "Type d'écran"]) {
      await expect(filterGroup(page, name).getByRole("checkbox").first()).toBeVisible();
    }
    await expect(filterGroup(page, "Mémoire vive (Go)").getByRole("spinbutton")).toHaveCount(2);
    await expect(filterGroup(page, "Stockage (Go)").getByRole("spinbutton")).toHaveCount(2);
    await expect(filterGroup(page, "Connectique")).toHaveCount(0);
    await expectNoBlockingViolations(page);
  });

  test("ticking two processors filters the grid, shows pills and survives a reload", async ({
    page,
  }) => {
    await page.goto("/products?category=COMPUTER");
    const cpu = filterGroup(page, "Processeur");
    await cpu.getByRole("checkbox", { name: valueName(AMD) }).check();
    await expect(page).toHaveURL(/a\.cpu=AMD/);
    await filterGroup(page, "Processeur")
      .getByRole("checkbox", { name: valueName(INTEL) })
      .check();
    await expect(page).toHaveURL(/a\.cpu=AMD.*a\.cpu=Intel/);

    const pills = page.getByRole("navigation", { name: "Filtres actifs" });
    await expect(
      pills.getByRole("link", { name: `Retirer le filtre Processeur : ${AMD}` }),
    ).toBeVisible();
    await expect(
      pills.getByRole("link", { name: `Retirer le filtre Processeur : ${INTEL}` }),
    ).toBeVisible();

    const count = await page.getByText(/\d+ produits?$/).textContent();
    await page.reload();
    await expect(page.getByText(/\d+ produits?$/)).toHaveText(count ?? "");
    await expect(
      filterGroup(page, "Processeur").getByRole("checkbox", { name: valueName(AMD) }),
    ).toBeChecked();
  });

  test("pills remove one filter, « Tout effacer » keeps the keyword", async ({ page }) => {
    await page.goto(
      `/products?q=portable&category=COMPUTER&a.cpu=${encodeURIComponent(AMD)}&a.cpu=${encodeURIComponent(INTEL)}`,
    );
    const pills = page.getByRole("navigation", { name: "Filtres actifs" });
    await pills.getByRole("link", { name: `Retirer le filtre Processeur : ${AMD}` }).click();
    await expect(page).not.toHaveURL(/AMD/);
    await expect(page).toHaveURL(/a\.cpu=Intel/);

    await pills.getByRole("link", { name: "Tout effacer" }).click();
    await expect(page).toHaveURL("/products?q=portable");
  });

  test("« Voir tout » unfolds the graphics cards", async ({ page }) => {
    await page.goto("/products?category=COMPUTER");
    const gpu = filterGroup(page, "Carte graphique");
    const before = await gpu.getByRole("checkbox").filter({ visible: true }).count();
    await gpu.getByText(/^Voir tout/).click();
    await expect
      .poll(() => gpu.getByRole("checkbox").filter({ visible: true }).count())
      .toBeGreaterThan(before);
  });

  test("counts follow the other filters when the facets endpoint is live", async ({ page }) => {
    await page.goto("/products?category=COMPUTER&brand=LENOVO");
    const firstCpu = filterGroup(page, "Processeur").getByRole("checkbox").first();
    if (await hasFacetsEndpoint(page)) {
      await expect(firstCpu).toHaveAccessibleName(/\(\d+\)$/);
      await expect(
        filterGroup(page, "Marques").getByRole("checkbox", { name: /^HP/ }),
      ).toBeVisible();
    } else {
      await expect(firstCpu).not.toHaveAccessibleName(/\(\d+\)$/);
    }
  });

  test("an out-of-bounds memory is refused on the field", async ({ page }) => {
    await page.goto("/products?category=COMPUTER");
    const requests: Request[] = [];
    page.on("request", (request) => requests.push(request));
    const min = page.getByRole("spinbutton", { name: "Mémoire vive (Go) minimum" });
    await min.fill("9999");
    await page.getByRole("button", { name: "Appliquer les filtres" }).click();
    const message = await min.evaluate((input: HTMLInputElement) => input.validationMessage);
    expect(message).toMatch(/^Choisis une valeur entre/);
    await expect(page).toHaveURL("/products?category=COMPUTER");
  });

  test("a range chosen before ticking a value never blocks the form", async ({ page }) => {
    await page.goto("/products?category=COMPUTER&r.ram=8-");
    await filterGroup(page, "Processeur")
      .getByRole("checkbox", { name: valueName(INTEL) })
      .check();
    await expect(page).toHaveURL(/a\.cpu=Intel.*r\.ram=8-/);
    await filterGroup(page, "Type d'écran")
      .getByRole("checkbox", { name: valueName("OLED") })
      .check();
    await expect(page).toHaveURL(/a\.displayType=OLED/);
  });

  test("SC-002: computers with one processor and OLED in 4 actions from home", async ({ page }) => {
    await page.goto("/");
    let actions = 0;
    await page
      .getByRole("main")
      .getByRole("link", { name: /catalogue/i })
      .first()
      .click();
    actions += 1;
    await page.getByRole("radio", { name: "Ordinateurs" }).check();
    actions += 1;
    await filterGroup(page, "Processeur")
      .getByRole("checkbox", { name: valueName(AMD) })
      .check();
    actions += 1;
    await filterGroup(page, "Type d'écran")
      .getByRole("checkbox", { name: valueName("OLED") })
      .check();
    actions += 1;
    await expect(page).toHaveURL(/a\.cpu=AMD.*a\.displayType=OLED/);
    expect(actions).toBeLessThanOrEqual(4);
  });
});

test.describe("catalog attribute filters without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the form, the pills and « Voir tout » work by page reloads", async ({ page }) => {
    await page.goto("/products?category=COMPUTER");
    await filterGroup(page, "Processeur")
      .getByRole("checkbox", { name: valueName(AMD) })
      .check();
    await page.getByRole("button", { name: "Appliquer les filtres" }).click();
    await expect(page).toHaveURL(/category=COMPUTER&a\.cpu=AMD/);
    await page
      .getByRole("navigation", { name: "Filtres actifs" })
      .getByRole("link", { name: `Retirer le filtre Processeur : ${AMD}` })
      .click();
    await expect(page).toHaveURL("/products?category=COMPUTER");
    const gpu = filterGroup(page, "Carte graphique");
    await gpu.getByText(/^Voir tout/).click();
    await expect(gpu.getByRole("checkbox").last()).toBeVisible();
  });
});
