/**
 * Screenshot capture shared by the visual audits of feature 002 (tasks T002, T066, T076):
 * one full-page PNG per page, at a fixed desktop size, once the entrance animations settled.
 *
 * @see specs/002-catalog-refresh/tasks.md Phase 1 and Phase 7
 */
import type { Page } from "@playwright/test";

/** Desktop viewport of every capture, so before / after images compare one to one. */
export const CAPTURE_VIEWPORT = { width: 1_440, height: 900 } as const;

/** Time left to the reveal animations before shooting. */
const SETTLE_DELAY_MS = 1_500;

/** One page to capture. */
export interface CaptureTarget {
  /** File name without extension. */
  readonly name: string;
  /** Path relative to the base URL. */
  readonly path: string;
}

/**
 * Captures every target as `<dir>/<name>.png`.
 *
 * @param page - Playwright page.
 * @param dir - Output directory.
 * @param targets - Pages to capture.
 */
export async function captureScreens(
  page: Page,
  dir: string,
  targets: readonly CaptureTarget[],
): Promise<void> {
  await page.setViewportSize(CAPTURE_VIEWPORT);
  for (const target of targets) {
    await page.goto(target.path);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(SETTLE_DELAY_MS);
    await page.screenshot({ path: `${dir}/${target.name}.png`, fullPage: true });
  }
}
