/**
 * Smoothness of the signature effects (constitution IX): during 5 s of cursor movement over the
 * home page with every effect on, the main thread never blocks more than 50 ms (no `longtask`
 * entry). Feature 002 adds the catalog with three products compared, the modal opened and
 * closed. Feature 004 adds the home carousel rotating by itself and the « Promotions » page with
its tilting campaign cards. Meaningful on a production build (`next build && next start`); `next dev` adds its own
 * development work.
 */
import { expect, test, type Page } from "@playwright/test";

/** Front to measure: a production build when given (`E2E_PERF_URL`), else the default one. */
const PERF_URL = process.env.E2E_PERF_URL;

if (PERF_URL) {
  test.use({ baseURL: PERF_URL });
}

/** Length of the cursor movement. */
const MOVEMENT_DURATION_MS = 5_000;

/** Delay between two cursor positions (~60 moves per second). */
const MOVE_INTERVAL_MS = 16;

/**
 * Time the home carousel is watched while it rotates: two slide changes at the full level
 * (`CAROUSEL_AUTOPLAY_INTERVAL_MS` is 6 s) plus their cross-fades.
 */
const CAROUSEL_WATCH_MS = 13_000;

/**
 * Starts recording the long tasks of the page in `window.longTasks`.
 *
 * @param page - Playwright page.
 */
async function recordLongTasks(page: Page): Promise<void> {
  await page.evaluate(() => {
    const entries: number[] = [];
    Object.assign(window, { longTasks: entries });
    new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => entries.push(entry.duration));
    }).observe({ type: "longtask" });
  });
}

/**
 * Reads the recorded long tasks.
 *
 * @param page - Playwright page.
 * @returns Their durations.
 */
async function longTasksOf(page: Page): Promise<number[]> {
  return page.evaluate(() => (window as unknown as { longTasks: number[] }).longTasks);
}

/**
 * Moves the cursor in circles over the viewport for {@link MOVEMENT_DURATION_MS}.
 *
 * @param page - Playwright page, at a 1440 × 900 viewport.
 */
async function circleCursor(page: Page): Promise<void> {
  const start = Date.now();
  let step = 0;
  while (Date.now() - start < MOVEMENT_DURATION_MS) {
    step += 1;
    const angle = step / 10;
    await page.mouse.move(720 + Math.cos(angle) * 500, 450 + Math.sin(angle) * 300);
    await page.waitForTimeout(MOVE_INTERVAL_MS);
  }
}

test("moving the cursor over the home page causes no long task", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium", "Effects are static with reduced motion");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await recordLongTasks(page);
  await circleCursor(page);
  expect(await longTasksOf(page)).toEqual([]);
});

test("the home carousel rotating by itself causes no long task", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium", "Effects are static with reduced motion");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  // Keep the pointer away from the carousel: hovering it pauses the rotation.
  await page.mouse.move(0, 0);
  const carousel = page.getByRole("region", { name: "À la une" });
  await expect(carousel).toHaveAttribute("data-playback", "playing");
  await recordLongTasks(page);
  await page.waitForTimeout(CAROUSEL_WATCH_MS);
  expect(await longTasksOf(page)).toEqual([]);
});

test("moving the cursor over the campaign cards causes no long task", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium", "Effects are static with reduced motion");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/promotions");
  await page.waitForLoadState("networkidle");
  await recordLongTasks(page);
  await circleCursor(page);
  expect(await longTasksOf(page)).toEqual([]);
});

test("comparing three products causes no long task", async ({ page }) => {
  test.skip(test.info().project.name !== "chromium", "Effects are static with reduced motion");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/products?category=COMPUTER");
  await page.waitForLoadState("networkidle");
  await recordLongTasks(page);
  const cards = page.getByRole("list", { name: "Produits" }).getByRole("listitem");
  for (const index of [0, 1, 2]) {
    await cards
      .nth(index)
      .getByRole("checkbox", { name: /^Comparer / })
      .check();
  }
  const open = page.getByRole("region", { name: "Comparaison" }).getByRole("button", {
    name: /^Comparer/,
  });
  await open.click();
  await page.getByRole("dialog").getByRole("table").waitFor();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(await longTasksOf(page)).toEqual([]);
});
