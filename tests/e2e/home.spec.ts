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

/** Layout values compared between the two pages. */
interface ShellMetrics {
  readonly width: number;
  readonly paddingLeft: string;
  readonly paddingRight: string;
  readonly headingClass: string;
}

/**
 * Measures the page shell and the main heading.
 *
 * @param page - Playwright page.
 * @returns The width, horizontal padding and heading classes.
 */
async function shellMetrics(page: Page): Promise<ShellMetrics> {
  return page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>("[data-page-shell]");
    const heading = document.querySelector("h1");
    const style = shell ? getComputedStyle(shell) : null;
    return {
      width: shell?.getBoundingClientRect().width ?? 0,
      paddingLeft: style?.paddingLeft ?? "",
      paddingRight: style?.paddingRight ?? "",
      headingClass: heading?.getAttribute("class") ?? "",
    };
  });
}

test.describe("home and catalog", () => {
  test("share the same width, padding and heading style", async ({ page }) => {
    await page.goto("/");
    const home = await shellMetrics(page);
    await page.goto("/products");
    const catalog = await shellMetrics(page);
    expect(home.width).toBeGreaterThan(0);
    expect(catalog).toEqual(home);
  });

  test("the « Ordinateurs » tile leads to the filtered catalog", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("region", { name: "Catégories" })
      .getByRole("link", { name: /Ordinateurs/ })
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
