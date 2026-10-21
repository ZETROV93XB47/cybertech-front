/**
 * Photo of each discount campaign, served by the site (static imports: `next/image` knows their
 * size and blur placeholder, no third-party origin).
 *
 * Campaign keys are free text on the backend: the four keys of `DiscountTypeResolver` have their
 * own photo, any other campaign gets the generic one.
 *
 * @see specs/004-catalog-promos-reviews/research.md R5
 * @see docs/credits.md
 */
import type { StaticImageData } from "next/image";
import { z } from "zod";

import { CampaignImageKey } from "@/lib/enums/promotions";
import blackFriday from "@/public/images/promotions/black-friday.jpg";
import buyOneGetOneFree from "@/public/images/promotions/buy-one-get-one-free.jpg";
import generic from "@/public/images/promotions/generic.jpg";
import springSales from "@/public/images/promotions/spring-sales.jpg";
import winterSales from "@/public/images/promotions/winter-sales.jpg";

import { CAMPAIGN_IMAGE_ALTS, GENERIC_CAMPAIGN_IMAGE_ALT } from "./messages";

/** Photo of each known campaign. */
export const CAMPAIGN_IMAGES: Readonly<Record<CampaignImageKey, StaticImageData>> = {
  [CampaignImageKey.BLACK_FRIDAY]: blackFriday,
  [CampaignImageKey.WINTER_SALES]: winterSales,
  [CampaignImageKey.SPRING_SALES]: springSales,
  [CampaignImageKey.BUY_ONE_GET_ONE_FREE]: buyOneGetOneFree,
};

/** Photo of a campaign without a dedicated one. */
export const GENERIC_CAMPAIGN_IMAGE: StaticImageData = generic;

/** Campaign keys with a dedicated photo, derived from the enum. */
const CampaignImageKeySchema = z.enum(CampaignImageKey);

/** A campaign photo and its text alternative. */
export interface CampaignImage {
  readonly src: StaticImageData;
  readonly alt: string;
}

/**
 * Narrows a campaign key to a key with a dedicated photo.
 *
 * @param key - Campaign key, as sent by the backend.
 * @returns The known key, or `undefined`.
 */
export function toCampaignImageKey(key: string): CampaignImageKey | undefined {
  return CampaignImageKeySchema.safeParse(key).data;
}

/**
 * Photo of a campaign.
 *
 * @param key - Campaign key, as sent by the backend.
 * @returns Its dedicated photo and alt text, or the generic ones.
 */
export function campaignImage(key: string): CampaignImage {
  const known = toCampaignImageKey(key);
  return known === undefined
    ? { src: GENERIC_CAMPAIGN_IMAGE, alt: GENERIC_CAMPAIGN_IMAGE_ALT }
    : { src: CAMPAIGN_IMAGES[known], alt: CAMPAIGN_IMAGE_ALTS[known] };
}
