/**
 * Accessibility check shared by the Playwright journeys: axe-core, failing on serious and
 * critical violations only (constitution, WCAG 2.1 AA).
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** axe impacts that fail the test. */
const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

/** Runs axe on the current page and fails on serious or critical violations. */
export async function expectNoBlockingViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations
    .filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ""))
    .map(
      (violation) =>
        `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`,
    );
  expect(blocking).toEqual([]);
}
