/**
 * A discount campaign as the promotions pages and the home carousel show it: name, benefit,
 * conditions, photo and address.
 *
 * The benefit and the conditions come from `describeDiscountOffer` (feature 003 discount block),
 * so the cart and the promotions pages word a campaign the same way. Amounts are the backend's,
 * formatted, never computed (FR-014, constitution V).
 *
 * @see specs/004-catalog-promos-reviews/data-model.md §4
 */
import type { StaticImageData } from "next/image";

import { describeDiscountOffer } from "@/features/checkout/discount-offer";
import { promotionRoute } from "@/lib/constants/routes";
import type { ActiveDiscount } from "@/lib/schemas/discount";

import { campaignImage, toCampaignImageKey } from "./campaign-images";
import { CAMPAIGN_MESSAGES, CAMPAIGN_NAMES } from "./messages";

/** Separator of the words of a campaign key (`SPRING_SALES`). */
const KEY_WORD_SEPARATOR = "_";

/** A campaign, ready to show. */
export interface CampaignView {
  /** Campaign key, as sent by the backend and stored by « Appliquer à mon panier ». */
  readonly key: string;
  /** « Black Friday », or the key put in words for an unknown campaign. */
  readonly name: string;
  /** « −20 % », « −10,00 € », « 1 acheté = 1 offert ». */
  readonly benefit: string;
  /** Minimum order, cap, then end date or « Sans date de fin », in display order. */
  readonly conditions: readonly string[];
  readonly image: StaticImageData;
  readonly imageAlt: string;
  /** Address of the campaign page. */
  readonly href: string;
}

/**
 * Puts a campaign key in words: `SPRING_SALES` → « Spring sales ».
 *
 * @param key - Campaign key.
 * @returns The key, lower case with a capital first letter and spaces.
 */
export function formatCampaignKey(key: string): string {
  const words = key.toLowerCase().split(KEY_WORD_SEPARATOR).filter(Boolean).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Display name of a campaign.
 *
 * @param key - Campaign key.
 * @returns The French name of a known campaign, else the key put in words.
 */
export function campaignName(key: string): string {
  const known = toCampaignImageKey(key);
  return known === undefined ? formatCampaignKey(key) : CAMPAIGN_NAMES[known];
}

/**
 * Builds the view of a displayable campaign (never `NONE`: `getActiveDiscounts` leaves it out).
 *
 * @param discount - Campaign, validated by `ActiveDiscountSchema`.
 * @returns Its name, benefit, conditions, photo and page address.
 */
export function toCampaignView(discount: ActiveDiscount): CampaignView {
  const offer = describeDiscountOffer(discount);
  const image = campaignImage(discount.discountKey);
  const conditions =
    discount.endsAt === null
      ? [...offer.conditions, CAMPAIGN_MESSAGES.noEndDate]
      : offer.conditions;
  return {
    key: discount.discountKey,
    name: campaignName(discount.discountKey),
    benefit: offer.advantage,
    conditions,
    image: image.src,
    imageAlt: image.alt,
    href: promotionRoute(discount.discountKey),
  };
}
