/**
 * Feature 004, US3 (T038) — slides of the home carousel: order, alternation, campaign cap,
 * `NONE` campaign left out, photos, destinations and counts.
 */
import { describe, expect, it } from "vitest";

import { buildHomeSlides } from "@/features/home/home-slides";
import { CATEGORY_IMAGES } from "@/features/home/slide-images";
import { GENERIC_CAMPAIGN_IMAGE } from "@/features/promotions/campaign-images";
import { CATEGORY_ORDER } from "@/lib/constants/categories";
import { HOME_CAMPAIGN_SLIDES_MAX } from "@/lib/constants/home";
import { CategoryKey } from "@/lib/enums/category-key";
import { DiscountCalculationType } from "@/lib/enums/discount-calculation-type";
import { SlideKind } from "@/lib/enums/home";
import type { ActiveDiscount } from "@/lib/schemas/discount";

/**
 * A −20 % campaign.
 *
 * @param discountKey - Campaign key.
 * @returns The campaign as the backend sends it.
 */
function campaign(discountKey: string): ActiveDiscount {
  return {
    discountKey,
    calculationType: DiscountCalculationType.PERCENTAGE,
    percentage: 20,
    fixedAmount: null,
    minOrderAmount: null,
    maxDiscountAmount: null,
    startsAt: null,
    endsAt: null,
  };
}

/** The « aucune remise » campaign. */
const NO_DISCOUNT: ActiveDiscount = {
  ...campaign("NO_DISCOUNT"),
  calculationType: DiscountCalculationType.NONE,
  percentage: null,
};

/** Every category, in an order different from `CATEGORY_ORDER`. */
const CATEGORIES = [...CATEGORY_ORDER].reverse();

/**
 * Kinds of the slides, « C » for a category and « P » for a campaign.
 *
 * @param campaigns - Campaigns given to the builder.
 * @returns The sequence, e.g. `CPCCCC`.
 */
function sequence(campaigns: readonly ActiveDiscount[]): string {
  return buildHomeSlides(CATEGORIES, {}, campaigns)
    .map((slide) => (slide.kind === SlideKind.CATEGORY ? "C" : "P"))
    .join("");
}

describe("buildHomeSlides", () => {
  it("shows the categories in CATEGORY_ORDER without campaign", () => {
    const slides = buildHomeSlides(CATEGORIES, {}, []);
    expect(slides.map((slide) => slide.id)).toEqual(CATEGORY_ORDER.map((key) => `category:${key}`));
  });

  it.each([
    [1, "CPCCCC"],
    [4, "CPCPCPCPC"],
  ])("alternates categories and %i campaign(s)", (count, expected) => {
    const campaigns = Array.from({ length: count }, (_, index) => campaign(`PROMO_${index}`));
    expect(sequence(campaigns)).toBe(expected);
  });

  it(`keeps at most ${HOME_CAMPAIGN_SLIDES_MAX} campaigns`, () => {
    const campaigns = Array.from({ length: 6 }, (_, index) => campaign(`PROMO_${index}`));
    const slides = buildHomeSlides(CATEGORIES, {}, campaigns);
    expect(slides.filter((slide) => slide.kind === SlideKind.CAMPAIGN)).toHaveLength(
      HOME_CAMPAIGN_SLIDES_MAX,
    );
  });

  it("never turns « aucune remise » into a slide", () => {
    expect(sequence([NO_DISCOUNT])).toBe("CCCCC");
  });

  it("links each slide to its destination, with its photo", () => {
    const slides = buildHomeSlides([CategoryKey.SMARTPHONE], {}, [
      campaign("BLACK_FRIDAY"),
      campaign("CYBER_MONDAY"),
    ]);
    expect(slides.map((slide) => slide.href)).toEqual([
      "/products?category=SMARTPHONE",
      "/promotions/BLACK_FRIDAY",
      "/promotions/CYBER_MONDAY",
    ]);
    expect(slides[0]?.image).toBe(CATEGORY_IMAGES[CategoryKey.SMARTPHONE]);
    expect(slides[2]?.image).toBe(GENERIC_CAMPAIGN_IMAGE);
    expect(slides[1]?.title).toBe("−20 % sur ta commande");
    expect(slides[1]?.cta).toBe("Voir la promotion");
  });

  it("gives unique ids", () => {
    const slides = buildHomeSlides(CATEGORIES, {}, [campaign("A"), campaign("B")]);
    expect(new Set(slides.map((slide) => slide.id)).size).toBe(slides.length);
  });

  it("carries the product count of a category, or null", () => {
    const slides = buildHomeSlides(
      [CategoryKey.COMPUTER, CategoryKey.MONITOR],
      { [CategoryKey.COMPUTER]: 576, [CategoryKey.MONITOR]: null },
      [],
    );
    expect(slides.map((slide) => (slide.kind === SlideKind.CATEGORY ? slide.count : -1))).toEqual([
      576,
      null,
    ]);
  });
});
