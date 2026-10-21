/**
 * Slides of the home carousel: one per active category and one per running campaign, alternated
 * while both lists have slides left, then completed with the rest (FR-007, research R6).
 *
 * Built on the server and passed to the carousel as props: only the rotation runs in the
 * browser. Campaign texts reuse the promotions view (`toCampaignView`), so a campaign reads the
 * same on the home page, its page and the cart.
 *
 * @see specs/004-catalog-promos-reviews/data-model.md §3
 */
import type { StaticImageData } from "next/image";

import { CATEGORY_LABELS } from "@/features/catalog/messages";
import { buildSearchUrl } from "@/features/catalog/search-params";
import { toCampaignView } from "@/features/promotions/campaign-view";
import { CATEGORY_ORDER } from "@/lib/constants/categories";
import { HOME_CAMPAIGN_SLIDES_MAX } from "@/lib/constants/home";
import type { CategoryKey } from "@/lib/enums/category-key";
import { SlideKind } from "@/lib/enums/home";
import { isDisplayableDiscount, type ActiveDiscount } from "@/lib/schemas/discount";
import { EMPTY_SEARCH_FILTERS } from "@/lib/schemas/search";

import {
  CAROUSEL_MESSAGES,
  CATEGORY_CTAS,
  CATEGORY_IMAGE_ALTS,
  CATEGORY_TAGLINES,
} from "./messages";
import { CATEGORY_IMAGES } from "./slide-images";

/** Separator of the name and conditions summed up in a campaign tagline. */
const TAGLINE_SEPARATOR = " · ";

/** What every slide shows. */
interface SlideBase {
  /** `category:{key}` or `campaign:{discountKey}`, unique. */
  readonly id: string;
  readonly title: string;
  readonly tagline: string;
  readonly cta: string;
  readonly href: string;
  readonly image: StaticImageData;
  readonly imageAlt: string;
}

/** A category slide, opening the filtered catalog. */
export interface CategorySlide extends SlideBase {
  readonly kind: SlideKind.CATEGORY;
  /** Number of products of the category, `null` when unknown. */
  readonly count: number | null;
}

/** A campaign slide, opening the campaign page. */
export interface CampaignSlide extends SlideBase {
  readonly kind: SlideKind.CAMPAIGN;
}

/** One slide of the home carousel. */
export type HomeSlide = CategorySlide | CampaignSlide;

/** Number of products of each category, when known. */
export type HomeCategoryCounts = Readonly<Partial<Record<CategoryKey, number | null>>>;

/**
 * Slide of a category.
 *
 * @param category - Active category.
 * @param count - Its number of products, `null` when unknown.
 * @returns The slide.
 */
function categorySlide(category: CategoryKey, count: number | null): CategorySlide {
  return {
    kind: SlideKind.CATEGORY,
    id: `${SlideKind.CATEGORY}:${category}`,
    title: CATEGORY_LABELS[category],
    tagline: CATEGORY_TAGLINES[category],
    cta: CATEGORY_CTAS[category],
    href: buildSearchUrl({ ...EMPTY_SEARCH_FILTERS, category }),
    image: CATEGORY_IMAGES[category],
    imageAlt: CATEGORY_IMAGE_ALTS[category],
    count,
  };
}

/**
 * Slide of a campaign.
 *
 * @param discount - Displayable campaign.
 * @returns The slide.
 */
function campaignSlide(discount: ActiveDiscount): CampaignSlide {
  const view = toCampaignView(discount);
  return {
    kind: SlideKind.CAMPAIGN,
    id: `${SlideKind.CAMPAIGN}:${view.key}`,
    title: CAROUSEL_MESSAGES.campaignTitle(view.benefit),
    tagline: [view.name, ...view.conditions].join(TAGLINE_SEPARATOR),
    cta: CAROUSEL_MESSAGES.campaignCta,
    href: view.href,
    image: view.image,
    imageAlt: view.imageAlt,
  };
}

/**
 * Alternates two lists (a, b, a, b…) then appends what is left of the longer one.
 *
 * @param first - List starting the alternation.
 * @param second - Other list.
 * @returns The merged list.
 */
function alternate<T>(first: readonly T[], second: readonly T[]): T[] {
  const merged: T[] = [];
  const length = Math.max(first.length, second.length);
  for (let index = 0; index < length; index += 1) {
    merged.push(...first.slice(index, index + 1), ...second.slice(index, index + 1));
  }
  return merged;
}

/**
 * Builds the slides of the home carousel.
 *
 * @param categories - Active categories (`getActiveCategories`), shown in `CATEGORY_ORDER`.
 * @param counts - Number of products of each category, when known.
 * @param campaigns - Active campaigns in the backend order; `NONE` ones are left out and at most
 *   `HOME_CAMPAIGN_SLIDES_MAX` are kept.
 * @returns Category and campaign slides, alternated.
 * @see specs/004-catalog-promos-reviews/research.md R6
 */
export function buildHomeSlides(
  categories: readonly CategoryKey[],
  counts: HomeCategoryCounts,
  campaigns: readonly ActiveDiscount[],
): readonly HomeSlide[] {
  const categorySlides = CATEGORY_ORDER.filter((key) => categories.includes(key)).map((key) =>
    categorySlide(key, counts[key] ?? null),
  );
  const campaignSlides = campaigns
    .filter(isDisplayableDiscount)
    .slice(0, HOME_CAMPAIGN_SLIDES_MAX)
    .map(campaignSlide);
  return alternate<HomeSlide>(categorySlides, campaignSlides);
}
