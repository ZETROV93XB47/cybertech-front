/**
 * Accessibility check shared by the Playwright journeys: axe-core, failing on serious and
 * critical violations only (constitution, WCAG 2.1 AA).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** axe impacts that fail the test. */
const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

/**
 * Waits for the entrance animations: axe measuring a block mid-fade reports a false contrast
 * failure. Endless animations (aurora drift) and decorative layers are ignored.
 */
async function settleAnimations(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
  // Motion animates the reveal on the main thread: wait until no visible element is faded.
  await page.waitForFunction(() =>
    [...document.querySelectorAll<HTMLElement>("[style*='opacity']")]
      .filter((element) => element.closest("[aria-hidden='true']") === null)
      .every((element) => getComputedStyle(element).opacity === "1"),
  );
}

/**
 * Focus proxy that Radix `NavigationMenu` renders after an open trigger: an `aria-hidden` span
 * with `tabindex="0"` that hands the focus straight to the panel when Tab reaches it, so it never
 * keeps the focus. axe reports it as `aria-hidden-focus`; it belongs to the library, not to us.
 *
 * @see components/layout/CatalogMenu.tsx
 */
export const NAVIGATION_MENU_FOCUS_PROXY =
  'nav[aria-label="Navigation principale"] button[aria-expanded="true"] + span[aria-hidden="true"][tabindex="0"]';

/**
 * Runs axe on the current page and fails on serious or critical violations.
 *
 * @param page - Playwright page.
 * @param exclude - CSS selectors left out of the audit (third-party markup only).
 */
export async function expectNoBlockingViolations(
  page: Page,
  exclude: readonly string[] = [],
): Promise<void> {
  await settleAnimations(page);
  const builder = new AxeBuilder({ page });
  exclude.forEach((selector) => builder.exclude(selector));
  const results = await builder.analyze();
  const blocking = results.violations
    .filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ""))
    .map(
      (violation) =>
        `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`,
    );
  expect(blocking).toEqual([]);
}
