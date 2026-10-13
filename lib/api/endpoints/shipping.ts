/**
 * Shipping options endpoint: carriers, speeds and fees, read for the product page.
 *
 * Public and cached for {@link SHIPPING_OPTIONS_REVALIDATE_SECONDS}. A failure is not fatal for
 * the product page: the delivery block then shows the speeds without their fees.
 *
 * @see docs/backend/api-map.md §7b
 * @see ShippingController#getShippingOptions (backend)
 */
import "server-only";

import { z } from "zod";

import { backendFetch } from "@/lib/api/client";
import { BACKEND_PATHS } from "@/lib/constants/api";
import { SHIPPING_OPTIONS_REVALIDATE_SECONDS } from "@/lib/constants/shipping";
import { createModuleLogger } from "@/lib/logger";
import { ShippingOptionSchema, type ShippingOption } from "@/lib/schemas/shipping";

/** Cache tag of the shipping options. */
const SHIPPING_CACHE_TAG = "shipping-options";

const log = createModuleLogger("shipping.options");

/**
 * Loads every shipping option.
 *
 * @returns The options, or `null` when the backend could not give them (logged).
 */
export async function getShippingOptions(): Promise<readonly ShippingOption[] | null> {
  try {
    return await backendFetch(BACKEND_PATHS.shippingOptions, {
      schema: z.array(ShippingOptionSchema),
      nextCache: { revalidate: SHIPPING_OPTIONS_REVALIDATE_SECONDS, tags: [SHIPPING_CACHE_TAG] },
    });
  } catch (error) {
    log.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "Shipping options not loaded; the delivery block shows no fee",
    );
    return null;
  }
}
