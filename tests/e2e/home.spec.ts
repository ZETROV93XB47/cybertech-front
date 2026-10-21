/**
 * Feature 002, US4 — home page and catalog share one template (quickstart scenario 20).
 *
 * Runs against the real local backend.
 */
import { expect, test, type Page } from "@playwright/test";

/** Backend route of the active campaigns, read first to know whether an offer is expected. */
const DISCOUNTS_URL = "http://localhost:8081/api/v1/services/discounts/active";

/** Campaign key meaning « no campaign ». */
const NO_DISCOUNT = "NO_DISCOUNT";

/** Viewport wide enough for the catalog page (site width plus the filter column). */
const WIDE_VIEWPORT = { width: 1_600, height: 900 } as const;

/** Layout values compared between the two pages. */
interface ShellMetrics {
  /** Width of the first product card of the page. */
  readonly cardWidth: number;
  readonly paddingLeft: string;
  readonly paddingRight: string;
  readonly headingClass: string;
}

/**
 * Measures the first product card, the page shell padding and the main heading.
 *
 * @param page - Playwright page.
 * @returns The card width, horizontal padding and heading classes.
 */
async function shellMetrics(page: Page): Promise<ShellMetrics> {
  return page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>("[data-page-shell]");
    const card = document.querySelector<HTMLElement>("main ul li .product-card");
    const heading = document.querySelector("h1");
    const style = shell ? getComputedStyle(shell) : null;
    return {
      cardWidth: Math.round(card?.getBoundingClientRect().width ?? 0),
      paddingLeft: style?.paddingLeft ?? "",
      paddingRight: style?.paddingRight ?? "",
      headingClass: heading?.getAttribute("class") ?? "",
    };
  });
}

test.describe("home and catalog", () => {
  test("share the same card size, padding and heading style", async ({ page }) => {
    await page.setViewportSize(WIDE_VIEWPORT);
    await page.goto("/");
    const home = await shellMetrics(page);
    await page.goto("/products");
    const catalog = await shellMetrics(page);
    expect(home.cardWidth).toBeGreaterThan(0);
    expect(catalog).toEqual(home);
  });

  test("the home page opens on the greeting and the carousel", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "À la une" })).toBeVisible();
  });

  test("the « Ordinateurs portables » tile leads to the filtered catalog", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("region", { name: "Catégories" })
      .getByRole("link", { name: /Ordinateurs portables/ })
      .click();
    await expect(page).toHaveURL("/products?category=COMPUTER");
  });

  test("no offer block without an active campaign", async ({ page }) => {
    const response = await page.request.get(DISCOUNTS_URL, {
      headers: { "X-API-VERSION": "1.0" },
    });
    const campaigns = (await response.json()) as { discountKey?: string }[];
    const hasCampaign = campaigns.some((campaign) => campaign.discountKey !== NO_DISCOUNT);
    await page.goto("/");
    const offers = page.getByRole("complementary", { name: "Offres en cours" });
    if (hasCampaign) {
      await expect(offers).toBeVisible();
    } else {
      await expect(offers).toHaveCount(0);
    }
  });
});
