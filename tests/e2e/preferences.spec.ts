/**
 * US5 — customise the interface (spec acceptance scenarios, FR-033 to FR-038, SC-011).
 *
 * The `reduced-motion` project replays every journey with `prefers-reduced-motion: reduce`.
 */
import { expect, test, type Page } from "@playwright/test";

import { firstProductPaths } from "./support/account";

/** Longest accepted delay between a click on an accent and the change of `<html>` (SC-011). */
const ACCENT_SWITCH_BUDGET_MS = 200;

async function openPanel(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Préférences" }).click();
  const dialog = page.getByRole("dialog", { name: "Préférences" });
  await expect(dialog).toBeVisible();
  // The panel moves the focus inside itself at the end of its opening animation.
  await dialog.evaluate((element) =>
    Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished)),
  );
}

async function priceColor(page: Page): Promise<string> {
  return page
    .locator(".price")
    .first()
    .evaluate((element) => getComputedStyle(element).color);
}

test("the accent changes at once, prices stay gold, and the choice survives a reload", async ({
  page,
}) => {
  await page.goto("/");
  const goldBefore = await priceColor(page);
  await openPanel(page);
  await page.getByRole("radio", { name: "Violet" }).click();
  await page.keyboard.press("ArrowRight");
  await page.getByRole("radio", { name: "Bleu" }).press("Space");
  await expect(page.getByRole("radio", { name: "Bleu" })).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "blue");
  expect(await priceColor(page)).toBe(goldBefore);

  const html = await (await page.request.get("/")).text();
  expect(html).toMatch(/<html[^>]*data-accent="blue"/);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "blue");
});

test("switching the accent reacts within 200 ms (SC-011)", async ({ page }) => {
  await page.goto("/");
  await openPanel(page);
  const elapsed = await page.evaluate(async () => {
    const radio = [...document.querySelectorAll<HTMLElement>('[role="radio"]')].find(
      (element) => element.parentElement?.textContent.trim() === "Cyan",
    );
    const changed = new Promise<number>((resolve) => {
      new MutationObserver(() => {
        resolve(performance.now());
      }).observe(document.documentElement, { attributeFilter: ["data-accent"] });
    });
    const start = performance.now();
    radio?.click();
    return (await changed) - start;
  });
  expect(elapsed).toBeLessThan(ACCENT_SWITCH_BUDGET_MS);
});

test("the reset button restores the defaults", async ({ page }) => {
  await page.goto("/");
  await openPanel(page);
  await page.getByRole("radio", { name: "Désactivés" }).click();
  await page.getByRole("radio", { name: "Douce" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-effects", "off");
  await page.getByRole("button", { name: "Réinitialiser" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-effects", "full");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "normal");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "violet");
});

test("the panel tells when the system asks for less motion", async ({ page }) => {
  test.skip(test.info().project.name !== "reduced-motion", "Needs prefers-reduced-motion");
  await page.goto("/");
  await openPanel(page);
  await expect(
    page.getByText("Ton système demande moins d'animations, on les garde figées."),
  ).toBeVisible();
});

test("with sounds on, adding to the cart plays a sound", async ({ page }) => {
  await page.addInitScript(() => {
    const counter = { oscillators: 0 };
    Object.assign(window, { soundCounter: counter });
    class CountingAudioContext extends window.AudioContext {
      public override createOscillator(): OscillatorNode {
        counter.oscillators += 1;
        return super.createOscillator();
      }
    }
    window.AudioContext = CountingAudioContext;
  });
  const [path = ""] = await firstProductPaths(page, 1);
  await page.goto(path);
  await openPanel(page);
  await page.getByRole("switch", { name: "Sons d'interface" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Préférences" })).toBeHidden();
  await page.getByRole("button", { name: "Ajouter au panier" }).click();
  await expect(page.getByRole("status").filter({ hasText: "ajouté à ton panier" })).toBeVisible();
  const played = await page.evaluate(
    () => (window as unknown as { soundCounter: { oscillators: number } }).soundCounter.oscillators,
  );
  expect(played).toBeGreaterThan(0);
});
