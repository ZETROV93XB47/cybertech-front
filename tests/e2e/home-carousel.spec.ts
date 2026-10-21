/**
 * Feature 004, US3 — home carousel (quickstart §3 US3, rows 10 to 15).
 *
 * Runs against the real local backend. The BLACK_FRIDAY journey is skipped, and reported « non
 * testable », when that campaign is not active locally.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoBlockingViolations } from "./support/a11y";

/** Time a slide stays on screen at full effects (`THEME.effects.full.carousel.intervalMs`). */
const INTERVAL_MS = 6_000;

/** Margin over the interval before checking that the slide changed. */
const ROTATION_MARGIN_MS = 1_500;

/** Upper bound of « Suivant » presses to reach a slide (avoids an endless loop). */
const MAX_NEXT_PRESSES = 12;

/**
 * The carousel region.
 *
 * @param page - Page.
 * @returns Its locator.
 */
function carousel(page: Page): Locator {
  return page.getByRole("region", { name: "À la une" });
}

/**
 * The slide shown (the only one not inert).
 *
 * @param page - Page.
 * @returns Its locator.
 */
function shownSlide(page: Page): Locator {
  return carousel(page).locator('[aria-roledescription="diapositive"]:not([inert])');
}

/**
 * Presses « Diapositive suivante » until the shown slide has the given title.
 *
 * @param page - Page.
 * @param title - Title of the slide to reach.
 * @returns Whether the slide was found.
 */
async function nextUntil(page: Page, title: string | RegExp): Promise<boolean> {
  for (let presses = 0; presses < MAX_NEXT_PRESSES; presses += 1) {
    if ((await shownSlide(page).getByRole("heading", { name: title }).count()) > 0) {
      return true;
    }
    await carousel(page).getByRole("button", { name: "Diapositive suivante" }).click();
  }
  return false;
}

test.describe("home carousel", () => {
  test("shows one slide and advances by itself", async ({ page }) => {
    await page.goto("/");
    await expect(shownSlide(page)).toHaveCount(1);
    const first = await shownSlide(page).getAttribute("aria-label");
    await page.mouse.move(0, 0);
    await expect(shownSlide(page)).not.toHaveAttribute("aria-label", first ?? "", {
      timeout: INTERVAL_MS + ROTATION_MARGIN_MS,
    });
    await expectNoBlockingViolations(page);
  });

  test("hovering pauses it", async ({ page }) => {
    await page.goto("/");
    await carousel(page).hover();
    const label = await shownSlide(page).getAttribute("aria-label");
    await page.waitForTimeout(INTERVAL_MS + ROTATION_MARGIN_MS);
    await expect(shownSlide(page)).toHaveAttribute("aria-label", label ?? "");
  });

  test("« Suivant » up to « Smartphones », then its image opens the filtered catalog", async ({
    page,
  }) => {
    await page.goto("/");
    expect(await nextUntil(page, "Smartphones")).toBe(true);
    await shownSlide(page).getByRole("img").click();
    await expect(page).toHaveURL(/\/products\?category=SMARTPHONE$/);
  });

  test("the BLACK_FRIDAY slide opens the campaign page", async ({ page }) => {
    await page.goto("/");
    const found = await nextUntil(page, /sur ta commande$/);
    test.skip(!found, "No active campaign locally (non testable)");
    await shownSlide(page).getByRole("link", { name: "Voir la promotion" }).click();
    await expect(page).toHaveURL(/\/promotions\/BLACK_FRIDAY$/);
    await expect(page.getByRole("heading", { level: 1, name: "Black Friday" })).toBeVisible();
  });

  test("the pause button stops it", async ({ page }) => {
    await page.goto("/");
    await carousel(page).getByRole("button", { name: "Mettre en pause le défilement" }).click();
    await expect(
      carousel(page).getByRole("button", { name: "Lancer le défilement" }),
    ).toBeVisible();
    const label = await shownSlide(page).getAttribute("aria-label");
    await page.mouse.move(0, 0);
    await page.locator("body").evaluate((body) => {
      (body.ownerDocument.activeElement as HTMLElement | null)?.blur();
    });
    await page.waitForTimeout(INTERVAL_MS + ROTATION_MARGIN_MS);
    await expect(shownSlide(page)).toHaveAttribute("aria-label", label ?? "");
  });
});

test.describe("home carousel with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("does not change slide by itself, and has no pause button", async ({ page }) => {
    await page.goto("/");
    const label = await shownSlide(page).getAttribute("aria-label");
    await page.mouse.move(0, 0);
    await page.waitForTimeout(INTERVAL_MS + ROTATION_MARGIN_MS);
    await expect(shownSlide(page)).toHaveAttribute("aria-label", label ?? "");
    await expect(
      carousel(page).getByRole("button", { name: "Mettre en pause le défilement" }),
    ).toHaveCount(0);
    await carousel(page).getByRole("button", { name: "Diapositive suivante" }).click();
    await expect(shownSlide(page)).toHaveAttribute(
      "aria-label",
      `2 sur ${label?.split(" sur ")[1] ?? ""}`,
    );
  });
});
