/**
 * Smoothness of the signature effects (constitution IX): during 5 s of cursor movement over the
 * home page with every effect on, the main thread never blocks more than 50 ms (no `longtask`
 * entry). Meaningful on a production build (`next build && next start`); `next dev` adds its own
 * development work.
 */
import { expect, test } from "@playwright/test";

/** Front to measure: a production build when given (`E2E_PERF_URL`), else the default one. */
const PERF_URL = process.env.E2E_PERF_URL;

if (PERF_URL) {
  test.use({ baseURL: PERF_URL });
}

/** Length of the cursor movement. */
const MOVEMENT_DURATION_MS = 5_000;

/** Delay between two cursor positions (~60 moves per second). */
const MOVE_INTERVAL_MS = 16;

test("moving the cursor over the home page causes no long task", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium", "Effects are static with reduced motion");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => {
    const entries: number[] = [];
    Object.assign(window, { longTasks: entries });
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => entries.push(entry.duration));
    }).observe({ type: "longtask" });
  });
  const start = Date.now();
  let step = 0;
  while (Date.now() - start < MOVEMENT_DURATION_MS) {
    step += 1;
    const angle = step / 10;
    await page.mouse.move(720 + Math.cos(angle) * 500, 450 + Math.sin(angle) * 300);
    await page.waitForTimeout(MOVE_INTERVAL_MS);
  }
  const longTasks = await page.evaluate(
    () => (window as unknown as { longTasks: number[] }).longTasks,
  );
  expect(longTasks).toEqual([]);
});
