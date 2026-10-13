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

/** Runs axe on the current page and fails on serious or critical violations. */
export async function expectNoBlockingViolations(page: Page): Promise<void> {
  await settleAnimations(page);
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations
    .filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ""))
    .map(
      (violation) =>
        `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`,
    );
  expect(blocking).toEqual([]);
}
