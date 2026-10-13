/**
 * Active discount campaigns, shown on the home page.
 *
 * @see docs/backend/api-map.md §5
 * @see DiscountController#getActiveCampaigns (backend)
 */
import "server-only";

import { z } from "zod";

import { backendFetch } from "@/lib/api/client";
import { BACKEND_PATHS } from "@/lib/constants/api";
import { DISCOUNTS_REVALIDATE_SECONDS } from "@/lib/constants/catalog";
import {
  ActiveDiscountSchema,
  isDisplayableDiscount,
  type ActiveDiscount,
} from "@/lib/schemas/discount";

/** Cache tag of the discount campaigns. */
const DISCOUNTS_CACHE_TAG = "discounts";

/**
 * Loads the campaigns that give an actual reduction.
 *
 * @returns The displayable active campaigns (the `NONE` campaign is left out).
 * @throws {ApiError} When the backend is unavailable.
 */
export async function getActiveDiscounts(): Promise<ActiveDiscount[]> {
  const discounts = await backendFetch(BACKEND_PATHS.activeDiscounts, {
    schema: z.array(ActiveDiscountSchema),
    nextCache: { revalidate: DISCOUNTS_REVALIDATE_SECONDS, tags: [DISCOUNTS_CACHE_TAG] },
  });
  return discounts.filter(isDisplayableDiscount);
}
